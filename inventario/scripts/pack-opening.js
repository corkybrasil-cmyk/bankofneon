// Sistema de Pack Opening - Banco da Neon
// Funcionalidades para abrir packs de cartas e revelar conteúdo

class PackOpeningManager {
  constructor(inventarioManager) {
    this.inventarioManager = inventarioManager;
    this.db = inventarioManager.db;
    this.currentUser = inventarioManager.currentUser;
  }

  // Mostrar popup de confirmação
  async showConfirmationPopup(item) {
    return new Promise((resolve) => {
      // Criar popup de confirmação
      const popup = document.createElement('div');
      popup.className = 'pack-confirmation-overlay';
      popup.innerHTML = `
        <div class="pack-confirmation-modal">
          <h3>Confirmar Abertura do Pack</h3>
          <p>Tem certeza que deseja abrir o <strong>${item.productName || item.nome}</strong>?</p>
          <p>Esta ação não pode ser desfeita.</p>
          <div class="confirmation-buttons">
            <button id="confirmNo">Não</button>
            <button id="confirmYes">Sim</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(popup);
      
      // Event listeners
      document.getElementById('confirmYes').onclick = () => {
        document.body.removeChild(popup);
        resolve(true);
      };
      
      document.getElementById('confirmNo').onclick = () => {
        document.body.removeChild(popup);
        resolve(false);
      };
      
      // Fechar ao clicar fora
      popup.onclick = (e) => {
        if (e.target === popup) {
          document.body.removeChild(popup);
          resolve(false);
        }
      };
    });
  }

  // Sortear cartas do pack
  async sortearCartasPack() {
    const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js");
    
    console.log('[PackOpening] Sorteando cartas...');
    
    // Buscar configurações de probabilidade
    const configDoc = await this.getPackConfig();
    const chanceRaraCarta4 = configDoc?.chanceRaraCarta4 || 90;
    const chanceEpicaCarta5 = configDoc?.chanceEpicaCarta5 || 9;
    const chanceLendariaCarta5 = configDoc?.chanceLendariaCarta5 || 1;
    const chanceRaraCarta5 = 100 - chanceEpicaCarta5 - chanceLendariaCarta5;

    // Buscar todas as cartas por raridade
    const cartasComuns = await this.buscarCartasPorRaridade('Comum');
    const cartasRaras = await this.buscarCartasPorRaridade('Rara');
    const cartasEpicas = await this.buscarCartasPorRaridade('Épica');
    const cartasLendarias = await this.buscarCartasPorRaridade('Lendária');

    console.log('[PackOpening] Cartas disponíveis:', {
      comuns: cartasComuns.length,
      raras: cartasRaras.length,
      epicas: cartasEpicas.length,
      lendarias: cartasLendarias.length
    });

    // Verificar se há cartas suficientes
    if (cartasComuns.length === 0) {
      console.error('[PackOpening] ❌ Nenhuma carta comum encontrada!');
      return null;
    }

    const cartasSorteadas = [];

    // Cartas 1, 2, 3: sempre comuns
    for (let i = 0; i < 3; i++) {
      const carta = this.sortearCartaAleatoria(cartasComuns);
      cartasSorteadas.push(carta);
    }

    // Carta 4: comum ou rara
    const isRaraCarta4 = Math.random() * 100 < chanceRaraCarta4;
    
    if (isRaraCarta4 && cartasRaras.length > 0) {
      const carta = this.sortearCartaAleatoria(cartasRaras);
      cartasSorteadas.push(carta);
    } else {
      // Sortear uma comum que não foi sorteada nas posições 1-3
      const cartasComunsDisponiveis = cartasComuns.filter(carta => 
        !cartasSorteadas.some(sorteada => sorteada.id === carta.id)
      );
      const carta = this.sortearCartaAleatoria(cartasComunsDisponiveis.length > 0 ? cartasComunsDisponiveis : cartasComuns);
      cartasSorteadas.push(carta);
    }

    // Carta 5: rara, épica ou lendária
    const random5 = Math.random() * 100;
    
    let carta5;
    
    if (random5 < chanceLendariaCarta5 && cartasLendarias.length > 0) {
      carta5 = this.sortearCartaAleatoria(cartasLendarias);
    } else if (random5 < chanceLendariaCarta5 + chanceEpicaCarta5 && cartasEpicas.length > 0) {
      carta5 = this.sortearCartaAleatoria(cartasEpicas);
    } else if (cartasRaras.length > 0) {
      // Garantir que não seja a mesma rara da carta 4
      const cartasRarasDisponiveis = cartasRaras.filter(carta => 
        !cartasSorteadas.some(sorteada => sorteada.id === carta.id)
      );
      carta5 = this.sortearCartaAleatoria(cartasRarasDisponiveis.length > 0 ? cartasRarasDisponiveis : cartasRaras);
    } else {
      carta5 = this.sortearCartaAleatoria(cartasComuns);
    }
    
    cartasSorteadas.push(carta5);

    console.log('[PackOpening] Pack sorteado:', cartasSorteadas.map(c => `${c.nome} (${c.raridade})`));
    return cartasSorteadas;
  }

  // Buscar cartas por raridade
  async buscarCartasPorRaridade(raridade) {
    const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js");
    
    try {
      const produtosRef = collection(this.db, 'loja', 'config', 'produtos');
      
      // Tentar várias variações da subcategoria
      const subcategoriaVariacoes = [
        `Cartas ${raridade}s`,      // Cartas Comuns, Cartas Raras, etc.
        `Carta ${raridade}`,        // Carta Comum, Carta Rara, etc.
        `cartas ${raridade.toLowerCase()}s`, // cartas comuns, cartas raras, etc.
        `carta ${raridade.toLowerCase()}`,   // carta comum, carta rara, etc.
        `Cartas ${raridade}`,       // Cartas Comum, Cartas Rara (sem 's' no final)
        raridade                    // Comum, Rara, Épica, Lendária
      ];
      
      let cartas = [];
      
      // Tentar cada variação
      for (const subcategoria of subcategoriaVariacoes) {
        const q = query(produtosRef, 
          where('categoria', '==', 'Colecionáveis'), 
          where('subcategoria', '==', subcategoria)
        );
        const snapshot = await getDocs(q);
        
        snapshot.forEach(doc => {
          const data = doc.data();
          cartas.push({
            id: doc.id,
            raridade: raridade,
            ...data
          });
        });
        
        if (cartas.length > 0) {
          break;
        }
      }
      
      // Se não encontrou nada, tentar busca mais ampla
      if (cartas.length === 0) {
        const qGeral = query(produtosRef, where('categoria', '==', 'Colecionáveis'));
        const snapshotGeral = await getDocs(qGeral);
        
        snapshotGeral.forEach(doc => {
          const data = doc.data();
          const subcategoria = (data.subcategoria || '').toLowerCase();
          const raridades = raridade.toLowerCase();
          
          // Melhor lógica de match - verificar se a subcategoria contém a raridade
          let isMatch = false;
          
          if (subcategoria.includes(raridades)) {
            isMatch = true;
          } else if (raridades === 'comum' && subcategoria.includes('comuns')) {
            isMatch = true;
          } else if (raridades === 'rara' && subcategoria.includes('raras')) {
            isMatch = true;
          } else if (raridades === 'épica' && subcategoria.includes('épicas')) {
            isMatch = true;
          } else if (raridades === 'lendária' && subcategoria.includes('lendárias')) {
            isMatch = true;
          }
          
          if (isMatch) {
            cartas.push({
              id: doc.id,
              raridade: raridade,
              ...data
            });
          }
        });
      }
      
      return cartas;
    } catch (error) {
      console.error(`❌ [PackOpening] Erro ao buscar cartas ${raridade}:`, error);
      return [];
    }
  }

  // Sortear carta aleatória de um array
  sortearCartaAleatoria(cartas) {
    if (cartas.length === 0) return null;
    const index = Math.floor(Math.random() * cartas.length);
    return cartas[index];
  }

  // Buscar configurações do pack
  async getPackConfig() {
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js");
    
    try {
      const configRef = doc(this.db, 'loja', 'config', 'packOpeningConfig', 'probabilidades');
      const configSnap = await getDoc(configRef);
      
      if (configSnap.exists()) {
        return configSnap.data();
      } else {
        return null;
      }
    } catch (error) {
      console.error('[PackOpening-Config] ❌ Erro ao buscar configurações:', error);
      console.error('[PackOpening-Config] 🔍 Detalhes do erro:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      return null;
    }
  }

  // Adicionar cartas ao inventário
  async adicionarCartasAoInventario(cartas) {
    const { doc, setDoc, getDoc, updateDoc } = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js");
    
    for (let i = 0; i < cartas.length; i++) {
      const carta = cartas[i];
      try {
        const inventarioRef = doc(this.db, 'inventario', this.currentUser.user, 'inventarioAluno', carta.nome);
        const inventarioSnap = await getDoc(inventarioRef);
        
        if (inventarioSnap.exists()) {
          // Se já existe, aumentar quantidade
          const dados = inventarioSnap.data();
          const quantidadeAtual = dados.quantity || 1;
          const novaQuantidade = quantidadeAtual + 1;
          
          await updateDoc(inventarioRef, {
            quantity: novaQuantidade
          });
        } else {
          // Se não existe, criar novo
          
          const cartaInventario = {
            category: carta.categoria,
            subcategory: carta.subcategoria,
            description: carta.descricao,
            firstPurchaseDate: new Date(),
            lastPurchaseDate: new Date(),
            imageUrl: carta.imagem,
            nome: carta.nome,
            price: 0, // Carta obtida por pack, sem custo direto
            productId: carta.id,
            productName: carta.nome,
            quantity: 1,
            status: 'active',
            totalSpent: 0,
            raridade: carta.raridade
          };
          
          await setDoc(inventarioRef, cartaInventario);
        }
        
      } catch (error) {
        console.error(`❌ [PackOpening] Erro ao processar carta ${carta.nome}:`, error);
      }
    }
  }

  // Mostrar animação de abertura
  async mostrarAnimacaoAbertura(item, cartas) {
    return new Promise((resolve) => {
      console.log('[PackOpening] Iniciando animação...');
      
      // Criar overlay principal com fundo preto
      const overlay = document.createElement('div');
      overlay.className = 'pack-opening-overlay active';
      
      // Forçar estilos inline para garantir funcionamento
      overlay.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: rgba(0, 0, 0, 0.95) !important;
        z-index: 9999 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        opacity: 1 !important;
        visibility: visible !important;
      `;
      
      // Estado inicial: loading
      overlay.innerHTML = `
        <div class="pack-loading">
          <div class="pack-spinner"></div>
          <div class="pack-loading-text">Preparando abertura do pack...</div>
        </div>
      `;
      
      document.body.appendChild(overlay);
      
      // Após 1.5s, mostrar o pack
      setTimeout(() => {
        overlay.innerHTML = `
          <div class="pack-animation" style="
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: 20px;
          ">
            <div class="pack-container" style="position: relative; z-index: 10;">
              <img src="${item.imageUrl || '../assets/semfoto.png'}" alt="Pack" class="pack-item" style="
                width: 200px !important;
                height: 280px !important;
                border-radius: 20px;
                cursor: pointer;
                filter: drop-shadow(0 10px 30px rgba(90, 3, 154, 0.3));
                transition: all 0.6s ease;
              " />
            </div>
            <div class="pack-loading-text" style="
              font-size: 18px;
              font-weight: 500;
              text-align: center;
              color: white;
            ">Clique no pack para abrir!</div>
          </div>
        `;
        
        // Evento de clique no pack
        const packElement = overlay.querySelector('.pack-item');
        
        packElement.onclick = () => {
          // Animar abertura do pack
          packElement.classList.add('pack-opening');
          overlay.querySelector('.pack-loading-text').textContent = 'Abrindo pack...';
          
          // Após animação do pack, mostrar cartas
          setTimeout(() => {
            
            overlay.innerHTML = `
              <div class="pack-animation" style="
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                gap: 20px;
              ">
                <div class="pack-reveal active" style="
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  flex-wrap: wrap;
                  gap: 20px;
                  opacity: 1;
                  transform: scale(1);
                  transition: all 0.8s ease;
                ">
                  ${cartas.map((carta, index) => {
                    // Fallback para imagem - usar URL do Firebase se não tiver imagem válida
                    let imagemUrl = carta.imagem;
                    if (!imagemUrl || imagemUrl.includes('via.placeholder.com')) {
                      imagemUrl = "https://firebasestorage.googleapis.com/v0/b/crmdaneon.firebasestorage.app/o/imagemLoja%2Fcarta_teste_1755543322647.svg?alt=media&token=dc319a7e-c6e0-438a-bccf-0a9258b4622d";
                    }
                    
                    // Cores das bordas por raridade
                    const rarityColors = {
                      'comum': '#888',
                      'rara': '#4a9eff', 
                      'épica': '#a335ee',
                      'lendária': '#ff8000'
                    };
                    
                    const borderColor = rarityColors[carta.raridade.toLowerCase()] || '#888';
                    
                    return `
                      <div class="card-reveal ${carta.raridade.toLowerCase()}" style="
                        width: 180px;
                        height: 252px;
                        background: linear-gradient(145deg, #2a2a2a, #1a1a1a);
                        border-radius: 15px;
                        border: 3px solid ${borderColor};
                        position: relative;
                        cursor: pointer;
                        transition: all 0.4s ease;
                        overflow: hidden;
                        animation-delay: ${index * 0.2}s;
                        box-shadow: 0 0 20px ${borderColor}40;
                      ">
                        <img src="${imagemUrl}" alt="${carta.nome}" onerror="this.src='../assets/semfoto.png'" style="
                          width: 100%;
                          height: 70%;
                          object-fit: cover;
                          border-radius: 12px 12px 0 0;
                        " />
                        <div class="card-info" style="
                          position: absolute;
                          bottom: 0;
                          left: 0;
                          right: 0;
                          background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
                          padding: 15px 10px 10px;
                          color: white;
                        ">
                          <div class="card-name" style="
                            font-size: 14px;
                            font-weight: 600;
                            margin-bottom: 5px;
                            text-align: center;
                          ">${carta.nome}</div>
                          <div class="card-rarity" style="
                            font-size: 11px;
                            text-align: center;
                            text-transform: uppercase;
                            font-weight: 500;
                            opacity: 0.8;
                          ">${carta.raridade}</div>
                        </div>
                        ${carta.raridade.toLowerCase() === 'lendária' ? '<div class="legendary-particles"></div>' : ''}
                      </div>
                    `;
                  }).join('')}
                </div>
                <button class="pack-return-btn" style="
                  position: absolute;
                  bottom: 40px;
                  left: 50%;
                  transform: translateX(-50%);
                  background: linear-gradient(135deg, #5a039a, #7c4dff);
                  color: white;
                  border: none;
                  padding: 15px 30px;
                  border-radius: 25px;
                  font-size: 16px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.3s ease;
                  z-index: 100;
                  opacity: 1;
                ">Voltar ao Inventário</button>
              </div>
            `;
            
            // Animar entrada das cartas
            setTimeout(() => {
              const cards = overlay.querySelectorAll('.card-reveal');
              cards.forEach(card => card.classList.add('animate'));
              console.log(`� [PackOpening-Animation] ${cards.length} cartas animadas`);
              
              // Adicionar partículas para cartas lendárias
              const legendaryCards = overlay.querySelectorAll('.card-reveal.lendária');
              legendaryCards.forEach(card => {
                this.addLegendaryParticles(card);
              });
              
            }, 100);
            
            // Evento do botão voltar
            const returnBtn = overlay.querySelector('.pack-return-btn');
            returnBtn.onclick = () => {
              console.log('[PackOpening] Voltando ao inventário...');
              document.body.removeChild(overlay);
              resolve();
            };
            
          }, 2000); // Duração da animação de abertura do pack
        };
        
      }, 1500); // Tempo do loading inicial
    });
  }

  // Adicionar partículas para cartas lendárias
  addLegendaryParticles(cardElement) {
    const particlesContainer = cardElement.querySelector('.legendary-particles');
    if (!particlesContainer) return;
    
    // Criar 20 partículas
    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 2 + 's';
        particle.style.animationDuration = (2 + Math.random() * 2) + 's';
        particlesContainer.appendChild(particle);
        
        // Remover partícula após animação
        setTimeout(() => {
          if (particle.parentNode) {
            particle.parentNode.removeChild(particle);
          }
        }, 4000);
      }, i * 100);
    }
  }

  // Função principal para abrir pack
  async openPack(item) {
    try {
      console.log('🚀 [PackOpening] Iniciando abertura do pack:', item.nome);
      
      // 1. Mostrar confirmação
      const confirmed = await this.showConfirmationPopup(item);
      if (!confirmed) {
        console.log('❌ [PackOpening] Abertura cancelada pelo usuário');
        return;
      }
      
      // 2. Verificar quantidade
      if (item.quantity <= 0) {
        console.error('❌ [PackOpening] Quantidade insuficiente:', item.quantity);
        return;
      }
      
      // 3. Sortear cartas
      const cartas = await this.sortearCartasPack();
      if (!cartas || cartas.length !== 5) {
        console.error('❌ [PackOpening] Erro ao sortear cartas - quantidade:', cartas?.length);
        return;
      }
      
      // 4. Decrementar pack
      await this.decrementarPackInventario(item);
      
      // 5. Adicionar cartas ao inventário
      await this.adicionarCartasAoInventario(cartas);
      
      // 6. Mostrar animação
      await this.mostrarAnimacaoAbertura(item, cartas);
      
      // 7. Atualizar inventário
      this.inventarioManager.loadData();
      
      console.log('✅ [PackOpening] Pack aberto com sucesso!');
      cartas.forEach((carta, index) => {
        console.log(`   ${index + 1}. ${carta.nome} (${carta.raridade})`);
      });
      
    } catch (error) {
      console.error('💥 [PackOpening] ERRO:', error);
    }
  }

  // Decrementar pack do inventário
  async decrementarPackInventario(item) {
    const { doc, updateDoc, deleteDoc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js");
    
    try {
      const inventarioRef = doc(this.db, 'inventario', this.currentUser.user, 'inventarioAluno', item.nome);
      const inventarioSnap = await getDoc(inventarioRef);
      
      if (inventarioSnap.exists()) {
        const dados = inventarioSnap.data();
        const quantidadeAtual = dados.quantity || 1;
        const novaQuantidade = quantidadeAtual - 1;
        
        if (novaQuantidade <= 0) {
          await deleteDoc(inventarioRef);
        } else {
          await updateDoc(inventarioRef, {
            quantity: novaQuantidade
          });
        }
      } else {
        console.error(`❌ [PackOpening] Item não encontrado no inventário: ${item.nome}`);
      }
    } catch (error) {
      console.error(`💥 [PackOpening] Erro ao decrementar pack:`, error);
      throw error;
    }
  }
}

// Exportar para uso no inventario-scripts.js
window.PackOpeningManager = PackOpeningManager;
