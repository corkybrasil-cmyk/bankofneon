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
    
    console.log('[PackOpening-Sort] 🎲 Iniciando sorteio de cartas...');
    
    // Buscar configurações de probabilidade
    const configDoc = await this.getPackConfig();
    const chanceRaraCarta4 = configDoc?.chanceRaraCarta4 || 30;
    const chanceEpicaCarta5 = configDoc?.chanceEpicaCarta5 || 15;
    const chanceLendariaCarta5 = configDoc?.chanceLendariaCarta5 || 5;
    const chanceRaraCarta5 = 100 - chanceEpicaCarta5 - chanceLendariaCarta5;

    console.log('[PackOpening-Sort] 🎯 Probabilidades configuradas:', {
      chanceRaraCarta4: chanceRaraCarta4 + '%',
      chanceEpicaCarta5: chanceEpicaCarta5 + '%',
      chanceLendariaCarta5: chanceLendariaCarta5 + '%',
      chanceRaraCarta5: chanceRaraCarta5 + '%'
    });

    // Buscar todas as cartas por raridade
    console.log('[PackOpening-Sort] 📚 Buscando cartas por raridade...');
    const cartasComuns = await this.buscarCartasPorRaridade('Comum');
    const cartasRaras = await this.buscarCartasPorRaridade('Rara');
    const cartasEpicas = await this.buscarCartasPorRaridade('Épica');
    const cartasLendarias = await this.buscarCartasPorRaridade('Lendária');

    console.log('[PackOpening-Sort] 📊 Cartas disponíveis:', {
      comuns: cartasComuns.length,
      raras: cartasRaras.length,
      epicas: cartasEpicas.length,
      lendarias: cartasLendarias.length
    });

    // Verificar se há cartas suficientes
    if (cartasComuns.length === 0) {
      console.error('[PackOpening-Sort] ❌ Nenhuma carta comum encontrada!');
      return null;
    }

    const cartasSorteadas = [];

    // Cartas 1, 2, 3: sempre comuns
    console.log('[PackOpening-Sort] 🃏 Sorteando cartas 1-3 (comuns)...');
    for (let i = 0; i < 3; i++) {
      const carta = this.sortearCartaAleatoria(cartasComuns);
      cartasSorteadas.push(carta);
      console.log(`[PackOpening-Sort] Carta ${i + 1}: ${carta.nome} (${carta.raridade})`);
    }

    // Carta 4: comum ou rara
    console.log(`[PackOpening-Sort] 🎲 Sorteando carta 4 (${chanceRaraCarta4}% chance de rara)...`);
    const isRaraCarta4 = Math.random() * 100 < chanceRaraCarta4;
    console.log(`[PackOpening-Sort] Resultado carta 4: ${isRaraCarta4 ? 'RARA' : 'COMUM'}`);
    
    if (isRaraCarta4 && cartasRaras.length > 0) {
      const carta = this.sortearCartaAleatoria(cartasRaras);
      cartasSorteadas.push(carta);
      console.log(`[PackOpening-Sort] Carta 4: ${carta.nome} (${carta.raridade})`);
    } else {
      // Sortear uma comum que não foi sorteada nas posições 1-3
      const cartasComunsDisponiveis = cartasComuns.filter(carta => 
        !cartasSorteadas.some(sorteada => sorteada.id === carta.id)
      );
      const carta = this.sortearCartaAleatoria(cartasComunsDisponiveis.length > 0 ? cartasComunsDisponiveis : cartasComuns);
      cartasSorteadas.push(carta);
      console.log(`[PackOpening-Sort] Carta 4: ${carta.nome} (${carta.raridade})`);
    }

    // Carta 5: rara, épica ou lendária
    console.log(`[PackOpening-Sort] 🎲 Sorteando carta 5 (${chanceLendariaCarta5}% lendária, ${chanceEpicaCarta5}% épica, ${chanceRaraCarta5}% rara)...`);
    const random5 = Math.random() * 100;
    console.log(`[PackOpening-Sort] Random carta 5: ${random5.toFixed(2)}%`);
    
    let carta5;
    
    if (random5 < chanceLendariaCarta5 && cartasLendarias.length > 0) {
      console.log(`[PackOpening-Sort] Resultado carta 5: LENDÁRIA`);
      carta5 = this.sortearCartaAleatoria(cartasLendarias);
    } else if (random5 < chanceLendariaCarta5 + chanceEpicaCarta5 && cartasEpicas.length > 0) {
      console.log(`[PackOpening-Sort] Resultado carta 5: ÉPICA`);
      carta5 = this.sortearCartaAleatoria(cartasEpicas);
    } else if (cartasRaras.length > 0) {
      console.log(`[PackOpening-Sort] Resultado carta 5: RARA`);
      // Garantir que não seja a mesma rara da carta 4
      const cartasRarasDisponiveis = cartasRaras.filter(carta => 
        !cartasSorteadas.some(sorteada => sorteada.id === carta.id)
      );
      carta5 = this.sortearCartaAleatoria(cartasRarasDisponiveis.length > 0 ? cartasRarasDisponiveis : cartasRaras);
    } else {
      console.log(`[PackOpening-Sort] Resultado carta 5: COMUM (fallback)`);
      carta5 = this.sortearCartaAleatoria(cartasComuns);
    }
    
    cartasSorteadas.push(carta5);
    console.log(`[PackOpening-Sort] Carta 5: ${carta5.nome} (${carta5.raridade})`);

    console.log('[PackOpening-Sort] ✅ Sorteio concluído!');
    console.log('[PackOpening-Sort] 🎁 Cartas sorteadas:', cartasSorteadas.map(c => `${c.nome} (${c.raridade})`));
    return cartasSorteadas;
  }

  // Buscar cartas por raridade
  async buscarCartasPorRaridade(raridade) {
    const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js");
    
    try {
      const produtosRef = collection(this.db, 'loja', 'config', 'produtos');
      
      // Tentar várias variações da subcategoria
      const subcategoriaVariacoes = [
        `Cartas ${raridade}s`,
        `Carta ${raridade}`,
        `cartas ${raridade.toLowerCase()}s`,
        `carta ${raridade.toLowerCase()}`,
        raridade
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
          console.log(`[PackOpening] Encontradas ${cartas.length} cartas ${raridade}s com subcategoria: ${subcategoria}`);
          break;
        }
      }
      
      // Se não encontrou nada, tentar busca mais ampla
      if (cartas.length === 0) {
        console.warn(`[PackOpening] Nenhuma carta ${raridade} encontrada com busca específica. Tentando busca geral...`);
        
        const qGeral = query(produtosRef, where('categoria', '==', 'Colecionáveis'));
        const snapshotGeral = await getDocs(qGeral);
        
        snapshotGeral.forEach(doc => {
          const data = doc.data();
          const subcategoria = (data.subcategoria || '').toLowerCase();
          
          if (subcategoria.includes(raridade.toLowerCase())) {
            cartas.push({
              id: doc.id,
              raridade: raridade,
              ...data
            });
          }
        });
        
        console.log(`[PackOpening] Busca geral encontrou ${cartas.length} cartas ${raridade}s`);
      }
      
      return cartas;
    } catch (error) {
      console.error(`[PackOpening] Erro ao buscar cartas ${raridade}:`, error);
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
      console.log('[PackOpening-Config] 📂 Buscando configurações de probabilidades...');
      const configRef = doc(this.db, 'loja', 'config', 'packOpeningConfig', 'probabilidades');
      console.log('[PackOpening-Config] 🔗 Document reference:', configRef);
      console.log('[PackOpening-Config] 📍 Caminho: loja/config/packOpeningConfig/probabilidades');
      
      const configSnap = await getDoc(configRef);
      console.log('[PackOpening-Config] 📊 Snapshot obtido:', configSnap);
      console.log('[PackOpening-Config] 🔍 Documento existe?', configSnap.exists());
      
      if (configSnap.exists()) {
        const config = configSnap.data();
        console.log('[PackOpening-Config] ✅ Configurações carregadas:', config);
        return config;
      } else {
        console.log('[PackOpening-Config] ⚠️ Nenhuma configuração encontrada, usando valores padrão');
        const defaultConfig = {
          chanceRaraCarta4: 30,
          chanceEpicaCarta5: 15,
          chanceLendariaCarta5: 5
        };
        console.log('[PackOpening-Config] 🔧 Valores padrão:', defaultConfig);
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
    
    for (const carta of cartas) {
      try {
        const inventarioRef = doc(this.db, 'inventario', this.currentUser.user, 'inventarioAluno', carta.nome);
        const inventarioSnap = await getDoc(inventarioRef);
        
        if (inventarioSnap.exists()) {
          // Se já existe, aumentar quantidade
          const dados = inventarioSnap.data();
          await updateDoc(inventarioRef, {
            quantity: (dados.quantity || 1) + 1
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
        
        console.log(`[PackOpening] Carta adicionada ao inventário: ${carta.nome}`);
      } catch (error) {
        console.error(`[PackOpening] Erro ao adicionar carta ${carta.nome}:`, error);
      }
    }
  }

  // Mostrar animação de abertura
  async mostrarAnimacaoAbertura(item, cartas) {
    return new Promise((resolve) => {
      // Criar overlay de animação
      const animationOverlay = document.createElement('div');
      animationOverlay.className = 'pack-animation-overlay';
      animationOverlay.innerHTML = `
        <div class="pack-animation-container">
          <div class="light-beams"></div>
          <div class="pack-image">
            <img src="${item.imageUrl || '../assets/semfoto.png'}" alt="Pack" />
          </div>
          <div class="cards-reveal" style="display: none;">
            ${cartas.map(carta => `
              <div class="revealed-card">
                <img src="${carta.imagem || '../assets/semfoto.png'}" alt="${carta.nome}" />
                <div class="card-name">${carta.nome}</div>
                <div class="card-rarity ${carta.raridade.toLowerCase()}">${carta.raridade}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      
      document.body.appendChild(animationOverlay);
      
      // Sequência de animação
      setTimeout(() => {
        // Começar animação dos feixes de luz
        animationOverlay.querySelector('.light-beams').classList.add('active');
        animationOverlay.querySelector('.pack-image').classList.add('shaking');
        
        setTimeout(() => {
          // Clarão e revelação das cartas
          animationOverlay.querySelector('.pack-image').style.display = 'none';
          animationOverlay.querySelector('.light-beams').classList.add('flash');
          animationOverlay.querySelector('.cards-reveal').style.display = 'flex';
          animationOverlay.querySelector('.cards-reveal').classList.add('revealed');
          
          // Fechar automaticamente após 5 segundos ou ao clicar
          const autoClose = setTimeout(() => {
            document.body.removeChild(animationOverlay);
            resolve();
          }, 5000);
          
          animationOverlay.onclick = () => {
            clearTimeout(autoClose);
            document.body.removeChild(animationOverlay);
            resolve();
          };
        }, 3000); // 3 segundos de animação do pack
      }, 500); // Delay inicial
    });
  }

  // Função principal para abrir pack
  async openPack(item) {
    try {
      console.log('[PackOpening] Iniciando abertura do pack:', item);
      
      // 1. Mostrar confirmação
      const confirmed = await this.showConfirmationPopup(item);
      if (!confirmed) {
        console.log('[PackOpening] Abertura cancelada pelo usuário');
        return;
      }
      
      // 2. Verificar se há quantidade suficiente
      if (item.quantity <= 0) {
        console.error('[PackOpening] Quantidade insuficiente');
        return;
      }
      
      // 3. Sortear cartas
      const cartas = await this.sortearCartasPack();
      if (!cartas || cartas.length !== 5) {
        console.error('[PackOpening] Erro ao sortear cartas');
        return;
      }
      
      // 4. Decrementar pack do inventário
      await this.decrementarPackInventario(item);
      
      // 5. Adicionar cartas ao inventário
      await this.adicionarCartasAoInventario(cartas);
      
      // 6. Mostrar animação
      await this.mostrarAnimacaoAbertura(item, cartas);
      
      // 7. Atualizar inventário na tela
      this.inventarioManager.loadData();
      
      console.log('[PackOpening] Pack aberto com sucesso!');
      
    } catch (error) {
      console.error('[PackOpening] Erro ao abrir pack:', error);
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
        const novaQuantidade = (dados.quantity || 1) - 1;
        
        if (novaQuantidade <= 0) {
          // Se quantidade chegou a 0, remover item
          await deleteDoc(inventarioRef);
          console.log(`[PackOpening] Pack removido do inventário: ${item.nome}`);
        } else {
          // Atualizar quantidade
          await updateDoc(inventarioRef, {
            quantity: novaQuantidade
          });
          console.log(`[PackOpening] Quantidade atualizada para ${novaQuantidade}: ${item.nome}`);
        }
      } else {
        console.error(`[PackOpening] Item não encontrado no inventário: ${item.nome}`);
      }
    } catch (error) {
      console.error(`[PackOpening] Erro ao decrementar pack:`, error);
      throw error;
    }
  }
}

// Exportar para uso no inventario-scripts.js
window.PackOpeningManager = PackOpeningManager;
