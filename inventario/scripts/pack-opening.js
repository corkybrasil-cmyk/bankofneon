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
      console.log('[PackOpening] Projeto Firebase:', app.options.projectId);
      console.log('[PackOpening] Database ID:', this.db._delegate?._databaseId?.database || 'default');
      console.log('[PackOpening] Database path completo:', this.db._delegate?._databaseId);
    } catch (error) {
      console.error('[PackOpening] Erro ao inicializar Firebase:', error);
    }
  }

  // Debug: Listar todos os produtos
  async debugListarTodosProdutos() {
    const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js");
    
    try {
      console.log('[PackOpening] 🔍 DEBUG: Listando todos os produtos...');
      
      // Verificar múltiplas localizações possíveis
      const localizacoes = [
        'loja/config/produtos',
        'produtos',
        'cartas',
        'loja/produtos'
      ];
      
      for (const path of localizacoes) {
        console.log(`[PackOpening] 🔍 Verificando localização: ${path}`);
        try {
          const ref = collection(this.db, ...path.split('/'));
          const querySnapshot = await getDocs(ref);
          console.log(`[PackOpening] 📊 ${path}: ${querySnapshot.size} documentos encontrados`);
          
          if (querySnapshot.size > 0) {
            console.log(`[PackOpening] ✅ ENCONTRADA COLEÇÃO COM DADOS: ${path}`);
            querySnapshot.forEach((doc) => {
              const data = doc.data();
              console.log(`[PackOpening] 📄 Documento em ${path}:`, {
                id: doc.id,
                nome: data.nome || data.productName,
                type: data.type,
                raridade: data.raridade,
                categoria: data.categoria || data.category
              });
            });
            break; // Parar no primeiro local com dados
          }
        } catch (error) {
          console.log(`[PackOpening] ❌ Erro ao acessar ${path}:`, error.message);
        }
      }
    } catch (error) {
      console.error('[PackOpening] ❌ Erro geral ao listar produtos:', error);
    }
  }


  // Aguardar inicialização do Firebase
  async waitForFirebase() {
    let attempts = 0;
    const maxAttempts = 50; // 5 segundos
    
    while (!this.db && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!this.db) {
      throw new Error('Firebase não foi inicializado');
    }
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

    // DEBUG: Ver o que está sendo retornado
    console.log('[PackOpening] DEBUG - Primeira carta comum:', cartasComuns[0]);
    console.log('[PackOpening] DEBUG - Primeira carta rara:', cartasRaras[0]);

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
      console.log(`[DEBUG] Buscando raridade: "${raridade}"`);
      
      // PRIMEIRO: Listar TODOS os documentos da coleção
      if (raridade === 'Comum') { // Só fazer uma vez
        const todosRef = collection(this.db, 'loja', 'config', 'produtos');
        const todosSnapshot = await getDocs(todosRef);
        console.log(`[DEBUG] TOTAL de documentos na coleção produtos: ${todosSnapshot.size}`);
        
        todosSnapshot.forEach((doc) => {
          const data = doc.data();
          console.log(`[DEBUG] DOCUMENTO:`, {
            id: doc.id,
            nome: data.nome,
            raridade: data.raridade,
            categoria: data.categoria,
            subcategoria: data.subcategoria
          });
        });
      }
      
      const cartasRef = collection(this.db, 'loja', 'config', 'produtos');
      const q = query(cartasRef, where('raridade', '==', raridade));
      const querySnapshot = await getDocs(q);
      
      console.log(`[DEBUG] Documentos encontrados para ${raridade}: ${querySnapshot.size}`);
      
      const cartas = [];
      
      if (!querySnapshot.empty) {
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          console.log(`[DEBUG] Doc encontrado:`, { id: doc.id, raridade: data.raridade, categoria: data.categoria });
          // Verificar se é carta pela presença dos campos de carta ou categoria
          if (data.categoria === 'Colecionáveis' || data.raridade) {
            cartas.push({
              id: doc.id,
              raridade: raridade,
              ...data
            });
            console.log(`[DEBUG] Carta adicionada: ${data.nome}`);
          } else {
            console.log(`[DEBUG] Documento rejeitado - não é carta`);
          }
        });
      } else {
        console.log(`[DEBUG] Nenhum documento encontrado para raridade ${raridade}`);
      }
      
      console.log(`[DEBUG] Total de cartas ${raridade}: ${cartas.length}`);
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
                0% { 
                  transform: rotate(0deg); 
                  margin-top: -250vh;
                  margin-left: -250vw;
                  opacity: 0.7; 
                }
                25% { 
                  transform: rotate(90deg); 
                  margin-top: -250vh;
                  margin-left: -250vw;
                  opacity: 1; 
                }
                50% { 
                  transform: rotate(180deg); 
                  margin-top: -250vh;
                  margin-left: -250vw;
                  opacity: 0.7; 
                }
                75% { 
                  transform: rotate(270deg); 
                  margin-top: -250vh;
                  margin-left: -250vw;
                  opacity: 1; 
                }
                100% { 
                  transform: rotate(360deg); 
                  margin-top: -250vh;
                  margin-left: -250vw;
                  opacity: 0.7; 
                }
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
              <!-- Raios de sol girando - CENTRO em 50% 50% (5x maior) -->
              <div class="light-beams" style="
                position: fixed !important;
                top: 50% !important;
                left: 50% !important;
                width: 500vw !important;
                height: 500vh !important;
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
        };
        
      }, 1500);
    });
  }

  // Abrir pack
  async openPack(item) {
    try {
      // Aguardar inicialização do Firebase se necessário
      if (!this.db) {
        console.log('[PackOpening] Aguardando inicialização do Firebase...');
        await this.waitForFirebase();
      }

      this.currentUser = JSON.parse(localStorage.getItem('bn.currentUser'));
      if (!this.currentUser || !this.currentUser.user) {
        console.log('[PackOpening] Dados do usuário:', this.currentUser);
        alert('❌ Usuário não autenticado. Faça login novamente.');
        return;
      }

      console.log('[PackOpening] Usuário autenticado:', this.currentUser.user);

      // Mostrar popup de confirmação
      const confirmed = await this.showConfirmationPopup(item);
      if (!confirmed) return;

      // Criar overlay preto imediatamente
      const blackOverlay = this.createBlackOverlay();

      // Sortear cartas do pack
      console.log('[PackOpening] Sorteando cartas do pack...');
      const cartas = await this.sortearCartasPack();
      
      if (!cartas || cartas.length === 0) {
        console.error('[PackOpening] ❌ Erro ao sortear cartas do pack');
        blackOverlay.remove();
        alert('❌ Erro ao abrir o pack. Tente novamente.');
        return;
      }
      
      console.log('[PackOpening] ✅ Cartas sorteadas:', cartas.length);
      
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
console.log('[PackOpening] Criando instância do PackOpeningManager...');
const packOpeningManager = new PackOpeningManager();
window.packOpeningManager = packOpeningManager;
window.PackOpeningManager = PackOpeningManager;
console.log('[PackOpening] PackOpeningManager disponível no window:', !!window.PackOpeningManager);
