// Sistema de abertura de packs - Versão corrigida

class PackOpeningManager {
  constructor() {
    this.db = null;
    this.currentUser = null;
    this.initFirebase();
  }

  async initFirebase() {
    try {
      // Importar Firebase modules
      const { initializeApp } = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js");
      const { getAuth, signInAnonymously } = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js");
      const { getFirestore } = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js");

      const firebaseConfig = {
        apiKey: "AIzaSyBHU6yFDCKp9jm9tPGyRqQJFS3amewuuQY",
        authDomain: "crmdaneon.firebaseapp.com",
        projectId: "crmdaneon",
        storageBucket: "crmdaneon.firebasestorage.app",
        messagingSenderId: "564595832938",
        appId: "1:564595832938:web:16fb660d8d433ae5f3f213",
        measurementId: "G-D3G4M9F17R"
      };

      const app = initializeApp(firebaseConfig);
      
      try {
        await signInAnonymously(getAuth(app));
      } catch (error) {
        console.warn('Auth anônimo falhou:', error);
      }

      this.db = getFirestore(app, 'bancodaneondb');
      console.log('[PackOpening] Firebase inicializado');
    } catch (error) {
      console.error('[PackOpening] Erro ao inicializar Firebase:', error);
    }
  }

  // Sortear cartas do pack
  async sortearCartasPack(packNome) {
    const cartasSorteadas = [];
    
    try {
      console.log('[PackOpening] 🎲 Sorteando cartas para pack:', packNome);
      
      const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js");
      
      const cartasRef = collection(this.db, 'produtos');
      const cartasSnap = await getDocs(cartasRef);
      
      const cartasDisponiveis = [];
      cartasSnap.forEach((doc) => {
        const carta = doc.data();
        if (carta.categoria === 'carta') {
          cartasDisponiveis.push(carta);
        }
      });
      
      if (cartasDisponiveis.length === 0) {
        console.warn('[PackOpening] ⚠️ Nenhuma carta encontrada!');
        return [];
      }
      
      // Sortear 5 cartas
      for (let i = 0; i < 5; i++) {
        const indiceAleatorio = Math.floor(Math.random() * cartasDisponiveis.length);
        const cartaSorteada = cartasDisponiveis[indiceAleatorio];
        
        const cartaNova = {
          nome: cartaSorteada.nome || `Carta ${i + 1}`,
          raridade: cartaSorteada.raridade || 'comum',
          imagem: cartaSorteada.imageUrl || '../assets/semfoto.png',
          categoria: 'carta'
        };
        
        cartasSorteadas.push(cartaNova);
        console.log(`[PackOpening] 🎴 Carta ${i + 1}: ${cartaNova.nome} (${cartaNova.raridade})`);
      }
      
    } catch (error) {
      console.error('[PackOpening] ❌ Erro ao sortear cartas:', error);
      
      // Cartas de fallback
      for (let i = 0; i < 5; i++) {
        cartasSorteadas.push({
          nome: `Carta de Teste ${i + 1}`,
          raridade: ['comum', 'rara', 'épica', 'lendária'][Math.floor(Math.random() * 4)],
          imagem: '../assets/semfoto.png',
          categoria: 'carta'
        });
      }
    }
    
    return cartasSorteadas;
  }

  // Adicionar cartas ao inventário
  async adicionarCartasAoInventario(cartas) {
    try {
      const { doc, getDoc, setDoc, updateDoc } = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js");
      
      for (const carta of cartas) {
        const inventarioRef = doc(this.db, 'inventario', this.currentUser.user, 'inventarioAluno', carta.nome);
        const inventarioSnap = await getDoc(inventarioRef);
        
        if (inventarioSnap.exists()) {
          const dados = inventarioSnap.data();
          await updateDoc(inventarioRef, {
            quantidade: dados.quantidade + 1
          });
        } else {
          await setDoc(inventarioRef, {
            nome: carta.nome,
            categoria: carta.categoria,
            raridade: carta.raridade,
            imagem: carta.imagem,
            quantidade: 1,
            dataAdicao: new Date().toISOString()
          });
        }
        
        console.log(`[PackOpening] ✅ Carta ${carta.nome} adicionada ao inventário`);
      }
    } catch (error) {
      console.error('[PackOpening] ❌ Erro ao adicionar cartas ao inventário:', error);
    }
  }

  // Decrementar pack do inventário
  async decrementarPack(item) {
    try {
      const { doc, getDoc, updateDoc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js");
      
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
      
      document.body.appendChild(overlay);
      
      // Após 1.5s, mostrar a animação do pack
      setTimeout(() => {
        
        // Criar HTML da animação
        overlay.innerHTML = `
          <style>
            @keyframes packShake {
              0% { transform: translate(0, 0) rotate(0deg); }
              10% { transform: translate(-2px, -2px) rotate(-1deg); }
              20% { transform: translate(-4px, 0px) rotate(1deg); }
              30% { transform: translate(4px, 2px) rotate(0deg); }
              40% { transform: translate(2px, -1px) rotate(1deg); }
              50% { transform: translate(-1px, 2px) rotate(-1deg); }
              60% { transform: translate(-4px, 1px) rotate(0deg); }
              70% { transform: translate(4px, 1px) rotate(-1deg); }
              80% { transform: translate(-2px, -1px) rotate(1deg); }
              90% { transform: translate(2px, 2px) rotate(0deg); }
              100% { transform: translate(1px, -2px) rotate(-1deg); }
            }
            
            @keyframes packShakeIntense {
              0% { transform: translate(0, 0) rotate(0deg); }
              10% { transform: translate(-4px, -4px) rotate(-2deg); }
              20% { transform: translate(-8px, 0px) rotate(2deg); }
              30% { transform: translate(8px, 4px) rotate(0deg); }
              40% { transform: translate(4px, -2px) rotate(2deg); }
              50% { transform: translate(-2px, 4px) rotate(-2deg); }
              60% { transform: translate(-8px, 2px) rotate(0deg); }
              70% { transform: translate(8px, 2px) rotate(-2deg); }
              80% { transform: translate(-4px, -2px) rotate(2deg); }
              90% { transform: translate(4px, 4px) rotate(0deg); }
              100% { transform: translate(3px, -6px) rotate(-1deg); }
            }
            
            @keyframes lightBeams {
              0% { 
                transform: rotate(0deg); 
                margin-top: -50vh;
                margin-left: -50vw;
                opacity: 0.7; 
              }
              25% { 
                transform: rotate(90deg); 
                margin-top: -50vh;
                margin-left: -50vw;
                opacity: 1; 
              }
              50% { 
                transform: rotate(180deg); 
                margin-top: -50vh;
                margin-left: -50vw;
                opacity: 0.7; 
              }
              75% { 
                transform: rotate(270deg); 
                margin-top: -50vh;
                margin-left: -50vw;
                opacity: 1; 
              }
              100% { 
                transform: rotate(360deg); 
                margin-top: -50vh;
                margin-left: -50vw;
                opacity: 0.7; 
              }
            }
            
            @keyframes flash {
              0% { 
                opacity: 0; 
                transform: scale(0.1); 
                background: rgba(255,255,255,0.9);
              }
              50% { 
                opacity: 1; 
                transform: scale(1); 
                background: rgba(255,255,255,1);
              }
              100% { 
                opacity: 0; 
                transform: scale(1.2); 
                background: rgba(255,255,255,0.9);
              }
            }
            
            @keyframes fullScreenFlash {
              0% { opacity: 0; }
              20% { opacity: 1; }
              100% { opacity: 0; }
            }
            
            @keyframes slideInCard {
              0% { 
                opacity: 0; 
                transform: translateY(50px) scale(0.8); 
              }
              100% { 
                opacity: 1; 
                transform: translateY(0) scale(1); 
              }
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
            <!-- Raios de sol girando - CENTRO em 50% 50% -->
            <div class="light-beams" style="
              position: fixed !important;
              top: 50% !important;
              left: 50% !important;
              width: 100vw !important;
              height: 100vh !important;
              background: 
                linear-gradient(0deg, transparent 49%, rgba(255, 255, 255, 0.1) 50%, transparent 51%),
                linear-gradient(45deg, transparent 49%, rgba(255, 255, 255, 0.08) 50%, transparent 51%),
                linear-gradient(90deg, transparent 49%, rgba(255, 255, 255, 0.1) 50%, transparent 51%),
                linear-gradient(135deg, transparent 49%, rgba(255, 255, 255, 0.08) 50%, transparent 51%),
                linear-gradient(22.5deg, transparent 49%, rgba(255, 255, 255, 0.06) 50%, transparent 51%),
                linear-gradient(67.5deg, transparent 49%, rgba(255, 255, 255, 0.06) 50%, transparent 51%),
                linear-gradient(112.5deg, transparent 49%, rgba(255, 255, 255, 0.06) 50%, transparent 51%),
                linear-gradient(157.5deg, transparent 49%, rgba(255, 255, 255, 0.06) 50%, transparent 51%),
                radial-gradient(circle at center, transparent 20%, rgba(255, 255, 255, 0.05) 40%, transparent 60%);
              background-position: center center !important;
              background-repeat: no-repeat !important;
              background-size: 100% 100% !important;
              transform-origin: 50% 50% !important;
              animation: lightBeams 4s linear infinite !important;
              z-index: 1 !important;
              opacity: 0 !important;
              pointer-events: none !important;
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
            
            <!-- Flash de clarão - tela inteira -->
            <div class="flash-overlay" style="
              position: fixed;
              top: 0;
              left: 0;
              width: 100vw;
              height: 100vh;
              background: linear-gradient(45deg, #ffffff, #f0f0f0, #ffffff);
              z-index: 9999;
              opacity: 0;
              pointer-events: none;
            "></div>
            
            <!-- Flash interno do pack -->
            <div class="pack-flash" style="
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
        const packFlash = overlay.querySelector('.pack-flash');
        
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
        }, 2300);
        
        setTimeout(() => {
          // Flash interno do pack
          if (packFlash) {
            packFlash.style.animation = 'flash 0.6s ease-out';
          }
        }, 2500);
        
        setTimeout(() => {
          // Clarão final que ocupa toda a tela
          flashOverlay.style.animation = 'fullScreenFlash 1s ease-out';
        }, 2800);
        
        // Após 3.5 segundos total (reduzido de 5s), mostrar cartas
        setTimeout(() => {
          
          // DEBUG: Verificar dados das cartas antes de exibir
          console.log('[PackOpening] 🎴 DEBUG - Cartas recebidas para exibição:', cartas);
          console.log('[PackOpening] 🎴 DEBUG - Número de cartas:', cartas?.length);
          
          // Se não houver cartas, criar cartas de teste
          if (!cartas || cartas.length === 0) {
            console.warn('[PackOpening] ⚠️ Nenhuma carta encontrada, criando cartas de teste...');
            cartas = [
              { nome: 'Carta Teste 1', raridade: 'Comum', imagem: '../assets/semfoto.png' },
              { nome: 'Carta Teste 2', raridade: 'Rara', imagem: '../assets/semfoto.png' },
              { nome: 'Carta Teste 3', raridade: 'Épica', imagem: '../assets/semfoto.png' },
              { nome: 'Carta Teste 4', raridade: 'Lendária', imagem: '../assets/semfoto.png' },
              { nome: 'Carta Teste 5', raridade: 'Comum', imagem: '../assets/semfoto.png' }
            ];
          }
          
          // FORÇAR REMOÇÃO DO OVERLAY ORIGINAL E CRIAR UM NOVO
          console.log('[PackOpening] 🔥 REMOVENDO OVERLAY ORIGINAL E CRIANDO NOVO...');
          
          // Remover overlay original
          if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
          
          // Criar overlay completamente novo
          const newOverlay = document.createElement('div');
          newOverlay.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(0, 0, 0, 0.95) !important;
            z-index: 99999 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex-direction: column !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            outline: none !important;
            overflow: hidden !important;
          `;
          
          // HTML das cartas com posicionamento absoluto forçado
          newOverlay.innerHTML = `
            <div style="
              position: absolute !important;
              top: 50% !important;
              left: 50% !important;
              transform: translate(-50%, -50%) !important;
              display: flex !important;
              flex-wrap: wrap !important;
              gap: 30px !important;
              justify-content: center !important;
              align-items: center !important;
              max-width: 90vw !important;
              max-height: 90vh !important;
              overflow-y: auto !important;
              z-index: 100000 !important;
            ">
              ${cartas.map((carta, index) => {
                const nomeCartaVal = carta.nome || 'Carta Teste';
                const raridadeVal = carta.raridade || 'comum';
                const imagemUrl = carta.imagem || '../assets/semfoto.png';
                
                const rarityColors = {
                  'comum': '#888',
                  'rara': '#4a9eff', 
                  'épica': '#a335ee',
                  'lendária': '#ff8000'
                };
                const borderColor = rarityColors[raridadeVal.toLowerCase()] || '#888';
                
                return `
                  <div style="
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    gap: 15px !important;
                    z-index: 100001 !important;
                    position: relative !important;
                    margin: 10px !important;
                  ">
                    <div style="
                      width: 200px !important;
                      height: 280px !important;
                      background: linear-gradient(145deg, #2a2a2a, #1a1a1a) !important;
                      border-radius: 15px !important;
                      border: 3px solid ${borderColor} !important;
                      position: relative !important;
                      overflow: hidden !important;
                      box-shadow: 0 0 20px ${borderColor}60 !important;
                      display: flex !important;
                      align-items: center !important;
                      justify-content: center !important;
                    ">
                      <img src="${imagemUrl}" 
                           alt="${nomeCartaVal}" 
                           style="
                        width: 90% !important;
                        height: 90% !important;
                        object-fit: contain !important;
                        border-radius: 10px !important;
                      " />
                    </div>
                    <div style="
                      text-align: center !important;
                      color: white !important;
                    ">
                      <div style="
                        font-size: 16px !important;
                        font-weight: 600 !important;
                        margin-bottom: 5px !important;
                        color: ${borderColor} !important;
                      ">${nomeCartaVal}</div>
                      <div style="
                        font-size: 12px !important;
                        text-transform: uppercase !important;
                        color: ${borderColor} !important;
                      ">${raridadeVal}</div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
            
            <button onclick="this.parentElement.remove(); if(window.carregarInventario) window.carregarInventario();" style="
              position: fixed !important;
              bottom: 30px !important;
              left: 50% !important;
              transform: translateX(-50%) !important;
              background: linear-gradient(135deg, #5a039a, #7c4dff) !important;
              color: white !important;
              border: none !important;
              padding: 15px 30px !important;
              border-radius: 25px !important;
              font-size: 16px !important;
              font-weight: 600 !important;
              cursor: pointer !important;
              z-index: 100002 !important;
              box-shadow: 0 5px 15px rgba(90, 3, 154, 0.3) !important;
            ">✖ Fechar</button>
          `;
          
          // Adicionar ao body
          document.body.appendChild(newOverlay);
          console.log('[PackOpening] ✅ NOVO OVERLAY CRIADO E ADICIONADO!');
          
          resolve();
          
        }, 3500); // 3.5 segundos total de animação (reduzido de 5s)
        
      }, 1500);
    });
  }

  // Abrir pack
  async abrirPack(item) {
    console.log('[PackOpening] 🎁 Iniciando abertura do pack:', item.nome);
    
    try {
      // Verificar se usuário está logado
      const userEmail = localStorage.getItem('currentUser');
      if (!userEmail) {
        alert('Usuário não encontrado. Faça login novamente.');
        return;
      }
      
      this.currentUser = { user: userEmail };
      
      // Criar overlay preto de loading
      const blackOverlay = this.createBlackOverlay();
      document.body.appendChild(blackOverlay);
      
      // Aguardar 2s para mostrar loading
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Sortear cartas
      const cartas = await this.sortearCartasPack(item.nome);
      console.log('[PackOpening] 🎴 Cartas sorteadas:', cartas);
      
      // Adicionar cartas ao inventário
      await this.adicionarCartasAoInventario(cartas);
      
      // Decrementar pack do inventário
      await this.decrementarPack(item);
      
      // Mostrar animação
      await this.mostrarAnimacaoAbertura(item, cartas, blackOverlay);
      
      console.log('[PackOpening] ✅ Pack aberto com sucesso!');
      
    } catch (error) {
      console.error('[PackOpening] ❌ Erro ao abrir pack:', error);
      alert('Erro ao abrir pack. Tente novamente.');
    }
  }

  // Criar overlay preto de loading
  createBlackOverlay() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #000;
      z-index: 9998;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
    `;
    overlay.innerHTML = '<div>Carregando...</div>';
    return overlay;
  }
}

// Instância global
window.packManager = new PackOpeningManager();

// Função global para abrir pack
window.abrirPack = function(item) {
  console.log('[PackOpening] 🎯 Função global abrirPack chamada com:', item);
  
  if (!window.packManager) {
    console.error('[PackOpening] ❌ PackManager não inicializado!');
    return;
  }
  
  window.packManager.abrirPack(item);
};

console.log('[PackOpening] ✅ Sistema de abertura de packs carregado!');
