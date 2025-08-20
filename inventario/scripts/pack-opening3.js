// Sistema de abertura de packs - Versão corrigida
import { db, auth } from './firebase-config.js';

class PackOpeningManager {
  constructor() {
    this.db = db;
    this.currentUser = null;
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

    if (cartasComuns.length === 0) {
      console.error('[PackOpening] ❌ Nenhuma carta comum encontrada!');
      return [];
    }

    const cartasSorteadas = [];

    // Sortear 3 cartas comuns (slots 1, 2, 3)
    for (let i = 0; i < 3; i++) {
      const cartaComum = this.sortearCartaAleatoria(cartasComuns);
      if (cartaComum) {
        cartasSorteadas.push(cartaComum);
      }
    }

    // Slot 4: 30% chance de ser rara, 70% comum
    const randomSlot4 = Math.random() * 100;
    if (randomSlot4 <= chanceRaraCarta4 && cartasRaras.length > 0) {
      const cartaRara = this.sortearCartaAleatoria(cartasRaras);
      if (cartaRara) {
        cartasSorteadas.push(cartaRara);
      }
    } else {
      const cartaComum = this.sortearCartaAleatoria(cartasComuns);
      if (cartaComum) {
        cartasSorteadas.push(cartaComum);
      }
    }

    // Slot 5: Baseado nas probabilidades configuradas
    const randomSlot5 = Math.random() * 100;
    if (randomSlot5 <= chanceLendariaCarta5 && cartasLendarias.length > 0) {
      const cartaLendaria = this.sortearCartaAleatoria(cartasLendarias);
      if (cartaLendaria) {
        cartasSorteadas.push(cartaLendaria);
      }
    } else if (randomSlot5 <= chanceLendariaCarta5 + chanceEpicaCarta5 && cartasEpicas.length > 0) {
      const cartaEpica = this.sortearCartaAleatoria(cartasEpicas);
      if (cartaEpica) {
        cartasSorteadas.push(cartaEpica);
      }
    } else if (cartasRaras.length > 0) {
      const cartaRara = this.sortearCartaAleatoria(cartasRaras);
      if (cartaRara) {
        cartasSorteadas.push(cartaRara);
      }
    } else {
      const cartaComum = this.sortearCartaAleatoria(cartasComuns);
      if (cartaComum) {
        cartasSorteadas.push(cartaComum);
      }
    }

    console.log('[PackOpening] ✅ Cartas sorteadas:', cartasSorteadas.map(c => c.nome));
    return cartasSorteadas;
  }

  // Buscar cartas por raridade
  async buscarCartasPorRaridade(raridade) {
    const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js");
    
    try {
      const cartasRef = collection(this.db, 'loja', 'config', 'produtos');
      const q = query(cartasRef, where('raridade', '==', raridade));
      const querySnapshot = await getDocs(q);
      
      const cartas = [];
      
      if (!querySnapshot.empty) {
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.type === 'carta') {
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
          const dadosExistentes = inventarioSnap.data();
          await updateDoc(inventarioRef, {
            quantidade: dadosExistentes.quantidade + 1
          });
        } else {
          await setDoc(inventarioRef, {
            ...carta,
            quantidade: 1,
            dateAdded: new Date()
          });
        }
        
      } catch (error) {
        console.error('[PackOpening] ❌ Erro ao adicionar carta ao inventário:', error);
      }
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
        const novaQuantidade = dados.quantidade - 1;
        
        if (novaQuantidade <= 0) {
          await deleteDoc(inventarioRef);
        } else {
          await updateDoc(inventarioRef, {
            quantidade: novaQuantidade
          });
        }
      }
    } catch (error) {
      console.error('[PackOpening] ❌ Erro ao decrementar pack:', error);
    }
  }

  // Mostrar animação de abertura do pack
  async mostrarAnimacaoAbertura(item, cartas, blackOverlay) {
    return new Promise((resolve) => {
      console.log('[PackOpening] Iniciando animação...');
      
      // Remover o overlay preto antes de começar a animação
      if (blackOverlay && blackOverlay.parentNode) {
        blackOverlay.parentNode.removeChild(blackOverlay);
      }
      
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
                width: 300px !important;
                height: 420px !important;
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
          // Criar animação de abertura com tremor e feixes de luz
          overlay.innerHTML = `
            <style>
              @keyframes packShake {
                0% { transform: translate(0px, 0px) rotate(0deg); }
                10% { transform: translate(-1px, -2px) rotate(-0.5deg); }
                20% { transform: translate(-3px, 0px) rotate(0.5deg); }
                30% { transform: translate(3px, 2px) rotate(0deg); }
                40% { transform: translate(1px, -1px) rotate(0.5deg); }
                50% { transform: translate(-1px, 2px) rotate(-0.5deg); }
                60% { transform: translate(-3px, 1px) rotate(0deg); }
                70% { transform: translate(3px, 1px) rotate(-0.5deg); }
                80% { transform: translate(-1px, -1px) rotate(0.5deg); }
                90% { transform: translate(1px, 2px) rotate(0deg); }
                100% { transform: translate(1px, -2px) rotate(-0.5deg); }
              }
              
              @keyframes packShakeIntense {
                0% { transform: translate(0px, 0px) rotate(0deg); }
                10% { transform: translate(-3px, -6px) rotate(-1deg); }
                20% { transform: translate(-8px, 0px) rotate(1deg); }
                30% { transform: translate(8px, 6px) rotate(0deg); }
                40% { transform: translate(3px, -3px) rotate(1deg); }
                50% { transform: translate(-3px, 6px) rotate(-1deg); }
                60% { transform: translate(-8px, 3px) rotate(0deg); }
                70% { transform: translate(8px, 3px) rotate(-1deg); }
                80% { transform: translate(-3px, -3px) rotate(1deg); }
                90% { transform: translate(3px, 6px) rotate(0deg); }
                100% { transform: translate(3px, -6px) rotate(-1deg); }
              }
              
              @keyframes lightBeams {
                0% { transform: rotate(0deg); opacity: 0.7; }
                25% { opacity: 1; }
                50% { opacity: 0.7; }
                75% { opacity: 1; }
                100% { transform: rotate(360deg); opacity: 0.7; }
              }
              
              @keyframes flash {
                0% { opacity: 0; transform: scale(0.5); }
                50% { opacity: 1; transform: scale(1.2); }
                100% { opacity: 0; transform: scale(1.5); }
              }
            </style>
            <div class="pack-opening-animation" style="
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-direction: column;
              position: relative;
            ">
              <!-- Feixes de luz rotacionando -->
              <div class="light-beams" style="
                position: absolute;
                width: 400px;
                height: 400px;
                background: radial-gradient(circle, transparent 40%, rgba(255,255,255,0.1) 45%, transparent 50%),
                           radial-gradient(circle, transparent 40%, rgba(255,255,255,0.15) 45%, transparent 50%);
                background-size: 100% 100%, 70% 70%;
                background-position: center, center;
                border-radius: 50%;
                animation: lightBeams 2s linear infinite;
                z-index: 1;
                opacity: 0;
              "></div>
              
              <!-- Pack tremendo -->
              <div class="pack-container" style="
                position: relative;
                z-index: 2;
              ">
                <img src="${item.imageUrl || '../assets/semfoto.png'}" alt="Pack" class="pack-shaking" style="
                  width: 300px !important;
                  height: 420px !important;
                  border-radius: 20px;
                  filter: drop-shadow(0 10px 30px rgba(90, 3, 154, 0.5));
                  animation: packShake 0.1s linear infinite;
                " />
              </div>
              
              <!-- Texto -->
              <div style="
                color: white;
                font-size: 24px;
                font-weight: bold;
                margin-top: 30px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
                z-index: 3;
              ">Abrindo pack...</div>
              
              <!-- Flash de clarão -->
              <div class="flash-overlay" style="
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.3) 50%, transparent 100%);
                z-index: 10;
                opacity: 0;
                pointer-events: none;
              "></div>
            </div>
          `;
          
          const packImg = overlay.querySelector('.pack-shaking');
          const lightBeams = overlay.querySelector('.light-beams');
          const flashOverlay = overlay.querySelector('.flash-overlay');
          
          // Sequência da animação
          setTimeout(() => {
            // Iniciar feixes de luz
            lightBeams.style.opacity = '1';
          }, 500);
          
          setTimeout(() => {
            // Intensificar tremor
            packImg.style.animation = 'packShakeIntense 0.05s linear infinite';
          }, 1500);
          
          setTimeout(() => {
            // Pack desaparece
            packImg.style.opacity = '0';
            packImg.style.transform = 'scale(0.8)';
          }, 2800);
          
          setTimeout(() => {
            // Clarão final
            flashOverlay.style.animation = 'flash 0.8s ease-out';
          }, 3000);
          
          // Após 5 segundos total, mostrar cartas
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
                padding: 20px;
                box-sizing: border-box;
                overflow-y: auto;
              ">
                <div class="pack-reveal active" style="
                  display: flex;
                  align-items: flex-start;
                  justify-content: center;
                  flex-wrap: wrap;
                  gap: 30px;
                  opacity: 1;
                  transform: scale(1);
                  transition: all 0.8s ease;
                  max-width: 100%;
                  padding: 20px 0;
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
                      <div class="card-container" style="
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 15px;
                        animation-delay: ${index * 0.2}s;
                      ">
                        <div class="card-reveal ${carta.raridade.toLowerCase()}" style="
                          width: 280px;
                          height: 390px;
                          background: linear-gradient(145deg, #2a2a2a, #1a1a1a);
                          border-radius: 15px;
                          border: 4px solid ${borderColor};
                          position: relative;
                          cursor: pointer;
                          transition: all 0.4s ease;
                          overflow: hidden;
                          box-shadow: 0 0 25px ${borderColor}60, 0 0 50px ${borderColor}30;
                        ">
                          <img src="${imagemUrl}" alt="${carta.nome}" onerror="this.src='../assets/semfoto.png'" style="
                            width: 100%;
                            height: 100%;
                            object-fit: contain;
                            border-radius: 11px;
                          " />
                          ${carta.raridade.toLowerCase() === 'lendária' ? '<div class="legendary-particles"></div>' : ''}
                        </div>
                        <div class="card-info" style="
                          text-align: center;
                          color: white;
                          max-width: 280px;
                        ">
                          <div class="card-name" style="
                            font-size: 18px;
                            font-weight: 600;
                            margin-bottom: 8px;
                            color: ${borderColor};
                            text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
                          ">${carta.nome}</div>
                          <div class="card-rarity" style="
                            font-size: 14px;
                            text-transform: uppercase;
                            font-weight: 500;
                            opacity: 0.9;
                            color: ${borderColor};
                          ">${carta.raridade}</div>
                        </div>
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
                  box-shadow: 0 5px 15px rgba(90, 3, 154, 0.3);
                ">Voltar ao Inventário</button>
              </div>
            `;
            
            const returnBtn = overlay.querySelector('.pack-return-btn');
            returnBtn.onclick = () => {
              document.body.removeChild(overlay);
              resolve();
            };
            
          }, 5000); // 5 segundos total de animação
        };
        
      }, 1500);
    });
  }

  // Abrir pack
  async openPack(item) {
    try {
      this.currentUser = JSON.parse(localStorage.getItem('user'));
      if (!this.currentUser || !this.currentUser.user) {
        alert('❌ Usuário não autenticado. Faça login novamente.');
        return;
      }

      // Mostrar popup de confirmação
      const confirmed = await this.showConfirmationPopup(item);
      if (!confirmed) return;

      // Criar overlay preto imediatamente
      const blackOverlay = this.createBlackOverlay();

      // Sortear cartas
      const cartas = await this.sortearCartasPack();
      
      if (cartas.length === 0) {
        console.error('❌ Nenhuma carta foi sorteada!');
        if (blackOverlay && blackOverlay.parentNode) {
          document.body.removeChild(blackOverlay);
        }
        return;
      }

      // Decrementar pack do inventário
      await this.decrementarPackInventario(item);

      // Adicionar cartas ao inventário
      await this.adicionarCartasAoInventario(cartas);

      // Mostrar animação
      await this.mostrarAnimacaoAbertura(item, cartas, blackOverlay);

      // Recarregar inventário
      if (window.carregarInventario) {
        window.carregarInventario();
      }
      
    } catch (error) {
      console.error('💥 [PackOpening] ERRO:', error);
      // Remover overlay em caso de erro
      const blackOverlay = document.querySelector('.pack-black-overlay');
      if (blackOverlay) {
        document.body.removeChild(blackOverlay);
      }
    }
  }

  // Criar overlay preto para bloquear a tela
  createBlackOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'pack-black-overlay';
    overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background: rgba(0, 0, 0, 0.95) !important;
      z-index: 9998 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      opacity: 1 !important;
      visibility: visible !important;
    `;
    
    // Adicionar spinner de loading com animação CSS
    overlay.innerHTML = `
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 20px; color: white;">
        <div style="width: 50px; height: 50px; border: 4px solid #333; border-top: 4px solid #5a039a; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <div style="font-size: 16px; font-weight: 500;">Processando abertura do pack...</div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    return overlay;
  }
}

// Instanciar e exportar
const packOpeningManager = new PackOpeningManager();
window.packOpeningManager = packOpeningManager;

export { packOpeningManager };
