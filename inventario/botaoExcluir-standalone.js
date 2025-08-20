// botaoExcluir-standalone.js - Versão Standalone sem dependências externas
// Esta versão funciona independentemente de outros sistemas

console.log('[ExclusaoStandalone] Carregando sistema standalone...');

class ExclusaoStandalone {
  constructor() {
    this.app = null;
    this.db = null;
    this.currentUser = null;
    this.inventarioItems = [];
    this.selectedItems = [];
    
    // Aguardar DOM e inicializar
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  async init() {
    try {
      console.log('[ExclusaoStandalone] Inicializando...');
      
      // Verificar sessão
      await this.loadUserSession();
      
      // Inicializar Firebase
      await this.initFirebase();
      
      // Configurar eventos
      this.setupEventListeners();
      
      console.log('[ExclusaoStandalone] Inicialização completa');
      
    } catch (error) {
      console.error('[ExclusaoStandalone] Erro na inicialização:', error);
    }
  }

  async loadUserSession() {
    const sessRaw = localStorage.getItem("bn.currentUser");
    if (!sessRaw) {
      throw new Error('Usuário não autenticado');
    }
    
    this.currentUser = JSON.parse(sessRaw);
    if (!this.currentUser || !this.currentUser.user) {
      throw new Error('Sessão inválida');
    }
    
    console.log('[ExclusaoStandalone] Usuário logado:', this.currentUser.user);
  }

  async initFirebase() {
    console.log('[ExclusaoStandalone] Inicializando Firebase...');
    
    // Usar EXATAMENTE a mesma lógica do inventario-scripts.js
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
    console.log('[ExclusaoStandalone] App inicializado');
    
    try {
      await signInAnonymously(getAuth(app));
      console.log('[ExclusaoStandalone] Auth anônimo OK');
    } catch (error) {
      console.warn('[ExclusaoStandalone] Auth anônimo falhou:', error);
    }

    try {
      this.db = getFirestore(app, "bancodaneondb");
      console.log('[ExclusaoStandalone] Firestore OK (bancodaneondb)');
    } catch {
      this.db = getFirestore(app);
      console.log('[ExclusaoStandalone] Firestore OK (default)');
    }
    
    // Armazenar app para usar depois se necessário
    this.app = app;
  }

  setupEventListeners() {
    const btnExcluir = document.getElementById('btn-excluir-item');
    if (btnExcluir) {
      btnExcluir.addEventListener('click', () => this.showFirstPopup());
      console.log('[ExclusaoStandalone] Event listener configurado');
    } else {
      console.warn('[ExclusaoStandalone] Botão btn-excluir-item não encontrado');
    }

    // Adicionar botão de teste temporário para debug
    this.addTestButton();
  }

  addTestButton() {
    const btnExcluir = document.getElementById('btn-excluir-item');
    if (btnExcluir && !document.getElementById('btn-teste-firestore')) {
      const testButton = document.createElement('button');
      testButton.id = 'btn-teste-firestore';
      testButton.textContent = 'TESTE: Verificar Firestore';
      testButton.style.marginLeft = '10px';
      testButton.style.backgroundColor = '#28a745';
      testButton.style.color = 'white';
      testButton.style.border = 'none';
      testButton.style.padding = '8px 12px';
      testButton.style.borderRadius = '4px';
      testButton.style.cursor = 'pointer';
      
      testButton.addEventListener('click', () => this.testFirestoreAccess());
      
      // Adicionar botão de exclusão direta
      const deleteTestButton = document.createElement('button');
      deleteTestButton.id = 'btn-delete-direto';
      deleteTestButton.textContent = 'TESTE: Exclusão Direta';
      deleteTestButton.style.marginLeft = '10px';
      deleteTestButton.style.backgroundColor = '#dc3545';
      deleteTestButton.style.color = 'white';
      deleteTestButton.style.border = 'none';
      deleteTestButton.style.padding = '8px 12px';
      deleteTestButton.style.borderRadius = '4px';
      deleteTestButton.style.cursor = 'pointer';
      
      deleteTestButton.addEventListener('click', () => this.testDirectDelete());
      
      btnExcluir.parentNode.insertBefore(testButton, btnExcluir.nextSibling);
      btnExcluir.parentNode.insertBefore(deleteTestButton, testButton.nextSibling);
    }
  }

  async testDirectDelete() {
    try {
      console.log('[ExclusaoStandalone] === TESTE DE EXCLUSÃO DIRETA ===');
      
      // Primeiro, carregar inventário
      await this.loadInventarioItems();
      
      if (this.inventarioItems.length === 0) {
        alert('Nenhum item no inventário para testar exclusão');
        return;
      }
      
      // Pegar o primeiro item
      const firstItem = this.inventarioItems[0];
      console.log('[ExclusaoStandalone] Item a ser excluído:', firstItem);
      
      const confirmDelete = confirm(`TESTE: Excluir diretamente o item "${firstItem.nome}"?\n\nEsta é uma exclusão real, não um teste!`);
      
      if (!confirmDelete) {
        console.log('[ExclusaoStandalone] Usuário cancelou teste de exclusão direta');
        return;
      }
      
      // Forçar exclusão direta
      this.selectedItems = [firstItem.id];
      console.log('[ExclusaoStandalone] selectedItems forçado para:', this.selectedItems);
      
      await this.deleteSelectedItems();
      
    } catch (error) {
      console.error('[ExclusaoStandalone] Erro no teste de exclusão direta:', error);
      alert(`Erro no teste: ${error.message}`);
    }
  }

  async testFirestoreAccess() {
    try {
      console.log('[ExclusaoStandalone] === TESTE DE ACESSO AO FIRESTORE ===');
      
      const { collection, getDocs, doc, setDoc, deleteDoc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js");
      
      // 1. Testar leitura do inventário
      console.log('[ExclusaoStandalone] 1. Testando leitura do inventário...');
      const inventarioRef = collection(this.db, 'inventario', this.currentUser.user, 'inventarioAluno');
      const snapshot = await getDocs(inventarioRef);
      console.log('[ExclusaoStandalone] ✅ Leitura OK, documentos encontrados:', snapshot.size);
      
      // 2. Testar criação de documento de teste
      console.log('[ExclusaoStandalone] 2. Testando criação de documento de teste...');
      const testDocRef = doc(this.db, 'inventario', this.currentUser.user, 'inventarioAluno', 'TESTE_EXCLUSAO');
      await setDoc(testDocRef, {
        nome: 'Item de Teste',
        quantidade: 1,
        categoria: 'teste',
        timestamp: new Date()
      });
      console.log('[ExclusaoStandalone] ✅ Criação OK');
      
      // 3. Verificar se documento foi criado
      console.log('[ExclusaoStandalone] 3. Verificando se documento foi criado...');
      const testDocSnap = await getDoc(testDocRef);
      if (testDocSnap.exists()) {
        console.log('[ExclusaoStandalone] ✅ Documento existe:', testDocSnap.data());
      } else {
        console.log('[ExclusaoStandalone] ❌ Documento não foi criado');
      }
      
      // 4. Testar exclusão do documento de teste
      console.log('[ExclusaoStandalone] 4. Testando exclusão do documento de teste...');
      await deleteDoc(testDocRef);
      console.log('[ExclusaoStandalone] ✅ Exclusão OK');
      
      // 5. Verificar se documento foi realmente excluído
      console.log('[ExclusaoStandalone] 5. Verificando se documento foi excluído...');
      const deletedDocSnap = await getDoc(testDocRef);
      if (!deletedDocSnap.exists()) {
        console.log('[ExclusaoStandalone] ✅ Documento foi excluído com sucesso');
        alert('✅ TESTE FIRESTORE: Todas as operações funcionaram!\nLeitura: OK\nCriação: OK\nExclusão: OK');
      } else {
        console.log('[ExclusaoStandalone] ❌ Documento ainda existe após exclusão');
        alert('❌ TESTE FIRESTORE: Exclusão não funcionou!');
      }
      
    } catch (error) {
      console.error('[ExclusaoStandalone] ❌ Erro no teste:', error);
      alert(`❌ TESTE FIRESTORE FALHOU:\n${error.message}\nCódigo: ${error.code}\nVerifique o console.`);
    }
  }

  showFirstPopup() {
    console.log('[ExclusaoStandalone] Mostrando primeira popup...');
    console.log('[ExclusaoStandalone] Usuário atual:', this.currentUser);
    console.log('[ExclusaoStandalone] Database conectado:', !!this.db);
    
    const modalHtml = `
      <div id="popup-projeto-info" class="popup-overlay" style="display: flex;">
        <div class="popup-content">
          <div class="popup-header">
            <h2>Informações do Projeto Firebase</h2>
            <button id="close-popup-projeto" class="close-btn">&times;</button>
          </div>
          <div class="popup-body">
            <div class="info-section">
              <h3>Projeto Firebase Carregado:</h3>
              <p><strong>Project ID:</strong> crmdaneon</p>
              <p><strong>Auth Domain:</strong> crmdaneon.firebaseapp.com</p>
            </div>
            
            <div class="info-section">
              <h3>Nome do Banco de Dados:</h3>
              <p><strong>Database:</strong> bancodaneondb</p>
            </div>
            
            <div class="info-section">
              <h3>Coleções no Banco de Dados:</h3>
              <ul class="collections-list">
                <li>inventario</li>
                <li>loja</li>
                <li>alunos</li>
                <li>ocorrencias</li>
                <li>pix</li>
                <li>users</li>
              </ul>
            </div>
          </div>
          <div class="popup-footer">
            <button id="btn-prosseguir-exclusao" class="btn-primary">Prosseguir à Exclusão</button>
            <button id="btn-fechar-projeto" class="btn-secondary">Fechar</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Configurar eventos
    document.getElementById('close-popup-projeto').addEventListener('click', () => {
      this.closePopup('popup-projeto-info');
    });

    document.getElementById('btn-fechar-projeto').addEventListener('click', () => {
      this.closePopup('popup-projeto-info');
    });

    document.getElementById('btn-prosseguir-exclusao').addEventListener('click', () => {
      this.closePopup('popup-projeto-info');
      this.showSecondPopup();
    });
  }

  async showSecondPopup() {
    console.log('[ExclusaoStandalone] Carregando itens do inventário...');
    await this.loadInventarioItems();

    const modalHtml = `
      <div id="popup-exclusao-items" class="popup-overlay" style="display: flex;">
        <div class="popup-content large">
          <div class="popup-header">
            <h2>Exclusão de Itens do Inventário</h2>
            <button id="close-popup-exclusao" class="close-btn">&times;</button>
          </div>
          <div class="popup-body">
            <div class="info-section">
              <h3>Localização dos Dados:</h3>
              <p><strong>Banco:</strong> bancodaneondb</p>
              <p><strong>Coleção:</strong> inventario</p>
              <p><strong>Documento:</strong> ${this.currentUser.user}</p>
              <p><strong>Sub-coleção:</strong> inventarioAluno</p>
            </div>
            
            <div class="items-section">
              <h3>Itens no Inventário (${this.inventarioItems.length} itens):</h3>
              <div id="items-container">
                ${this.renderItemsList()}
              </div>
              <button id="btn-add-item" class="btn-add">+ Adicionar mais itens</button>
            </div>
          </div>
          <div class="popup-footer">
            <button id="btn-debug-selecao" class="btn-secondary" style="background: #ffc107; color: #000;">🔍 Debug Seleção</button>
            <button id="btn-excluir-selecionados" class="btn-danger" disabled>
              Excluir Selecionados (0)
            </button>
            <button id="btn-fechar-exclusao" class="btn-secondary">Fechar</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    this.setupSecondPopupEvents();
  }

  async loadInventarioItems() {
    try {
      console.log('[ExclusaoStandalone] === CARREGANDO ITENS DO INVENTÁRIO ===');
      console.log('[ExclusaoStandalone] Usuário:', this.currentUser.user);
      console.log('[ExclusaoStandalone] Database:', this.db);
      
      const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js");
      
      const inventarioPath = `inventario/${this.currentUser.user}/inventarioAluno`;
      console.log('[ExclusaoStandalone] Caminho da coleção:', inventarioPath);
      
      const inventarioRef = collection(this.db, 'inventario', this.currentUser.user, 'inventarioAluno');
      console.log('[ExclusaoStandalone] Referência criada:', inventarioRef.path);
      
      const snapshot = await getDocs(inventarioRef);
      console.log('[ExclusaoStandalone] Snapshot obtido, tamanho:', snapshot.size);
      console.log('[ExclusaoStandalone] Snapshot vazio?', snapshot.empty);
      
      this.inventarioItems = [];
      snapshot.forEach(doc => {
        console.log('[ExclusaoStandalone] Documento encontrado:');
        console.log('[ExclusaoStandalone] - ID do documento (chave):', doc.id);
        console.log('[ExclusaoStandalone] - Dados do documento:', doc.data());
        
        const data = doc.data();
        this.inventarioItems.push({
          documentId: doc.id, // O ID real do documento no Firestore
          id: data.id || doc.id, // O ID do item (campo interno)
          nome: doc.id, // O nome é o ID do documento
          quantidade: data.quantidade || 0,
          ...data
        });
      });

      console.log('[ExclusaoStandalone] Total de itens carregados:', this.inventarioItems.length);
      console.log('[ExclusaoStandalone] Lista de itens processada:', this.inventarioItems);

    } catch (error) {
      console.error('[ExclusaoStandalone] Erro ao carregar itens:', error);
      console.error('[ExclusaoStandalone] Stack trace:', error.stack);
      this.inventarioItems = [];
    }
  }

  renderItemsList() {
    if (this.inventarioItems.length === 0) {
      return '<p class="no-items">Nenhum item encontrado no inventário.</p>';
    }

    return `
      <div class="items-list">
        <div class="item-row" data-index="0">
          <select class="item-select" data-item-id="">
            <option value="">Selecionar item...</option>
            ${this.inventarioItems.map(item => `
              <option value="${item.documentId}">
                ${item.nome} (Qtd: ${item.quantidade})
              </option>
            `).join('')}
          </select>
          <button class="btn-remove-row" data-index="0">&times;</button>
        </div>
      </div>
    `;
  }

  setupSecondPopupEvents() {
    document.getElementById('close-popup-exclusao').addEventListener('click', () => {
      this.closePopup('popup-exclusao-items');
    });

    document.getElementById('btn-fechar-exclusao').addEventListener('click', () => {
      this.closePopup('popup-exclusao-items');
    });

    document.getElementById('btn-add-item').addEventListener('click', () => {
      this.addItemSelectionRow();
    });

    document.getElementById('btn-excluir-selecionados').addEventListener('click', () => {
      this.confirmAndDeleteItems();
    });

    // Botão de debug
    document.getElementById('btn-debug-selecao').addEventListener('click', () => {
      this.debugSelection();
    });

    this.updateSelectEvents();
  }

  debugSelection() {
    console.log('[ExclusaoStandalone] === DEBUG DA SELEÇÃO ===');
    
    const selects = document.querySelectorAll('.item-select');
    console.log('[ExclusaoStandalone] Selects encontrados:', selects.length);
    
    selects.forEach((select, index) => {
      console.log(`[ExclusaoStandalone] Select ${index}: value="${select.value}", options=${select.options.length}`);
    });
    
    console.log('[ExclusaoStandalone] Array selectedItems atual:', this.selectedItems);
    console.log('[ExclusaoStandalone] Itens disponíveis:', this.inventarioItems.map(item => item.id));
    
    // Forçar atualização
    this.updateSelectedItems();
    console.log('[ExclusaoStandalone] Após atualização forçada:', this.selectedItems);
    
    alert(`DEBUG:\n- Selects encontrados: ${selects.length}\n- Itens selecionados: ${this.selectedItems.length}\n- IDs: ${this.selectedItems.join(', ')}\n\nVerifique o console para mais detalhes.`);
  }

  addItemSelectionRow() {
    const itemsList = document.querySelector('#items-container .items-list');
    if (!itemsList) return;

    const newIndex = itemsList.children.length;
    const newRowHtml = `
      <div class="item-row" data-index="${newIndex}">
        <select class="item-select" data-item-id="">
          <option value="">Selecionar item...</option>
          ${this.inventarioItems.map(item => `
            <option value="${item.documentId}">
              ${item.nome} (Qtd: ${item.quantidade})
            </option>
          `).join('')}
        </select>
        <button class="btn-remove-row" data-index="${newIndex}">&times;</button>
      </div>
    `;

    itemsList.insertAdjacentHTML('beforeend', newRowHtml);
    this.updateSelectEvents();
  }

  updateSelectEvents() {
    const selects = document.querySelectorAll('.item-select');
    const removeButtons = document.querySelectorAll('.btn-remove-row');

    selects.forEach(select => {
      select.removeEventListener('change', this.handleSelectChange);
      select.addEventListener('change', (e) => this.handleSelectChange(e));
    });

    removeButtons.forEach(button => {
      button.removeEventListener('click', this.handleRemoveRow);
      button.addEventListener('click', (e) => this.handleRemoveRow(e));
    });
  }

  handleSelectChange(event) {
    console.log('[ExclusaoStandalone] Select mudou:', event.target.value);
    this.updateSelectedItems();
    this.updateDeleteButton();
  }

  handleRemoveRow(event) {
    console.log('[ExclusaoStandalone] Removendo linha');
    const row = event.target.closest('.item-row');
    row.remove();
    this.updateSelectedItems();
    this.updateDeleteButton();
  }

  updateSelectedItems() {
    const selects = document.querySelectorAll('.item-select');
    this.selectedItems = [];
    
    console.log('[ExclusaoStandalone] Atualizando itens selecionados...');
    console.log('[ExclusaoStandalone] Número de selects encontrados:', selects.length);
    
    selects.forEach((select, index) => {
      console.log('[ExclusaoStandalone] Select', index, 'value:', select.value);
      if (select.value) {
        this.selectedItems.push(select.value);
      }
    });

    this.selectedItems = [...new Set(this.selectedItems)];
    console.log('[ExclusaoStandalone] Itens selecionados após filtro:', this.selectedItems);
  }

  updateDeleteButton() {
    const deleteButton = document.getElementById('btn-excluir-selecionados');
    if (deleteButton) {
      const isDisabled = this.selectedItems.length === 0;
      deleteButton.disabled = isDisabled;
      deleteButton.textContent = `Excluir Selecionados (${this.selectedItems.length})`;
      
      console.log('[ExclusaoStandalone] Botão atualizado:', {
        disabled: isDisabled,
        selectedCount: this.selectedItems.length,
        selectedItems: this.selectedItems
      });
      
      // Adicionar visual feedback
      if (isDisabled) {
        deleteButton.style.opacity = '0.6';
        deleteButton.style.cursor = 'not-allowed';
      } else {
        deleteButton.style.opacity = '1';
        deleteButton.style.cursor = 'pointer';
      }
    }
  }

  async confirmAndDeleteItems() {
    console.log('[ExclusaoStandalone] === CONFIRMAÇÃO DE EXCLUSÃO ===');
    console.log('[ExclusaoStandalone] DocumentIds selecionados:', this.selectedItems);
    
    if (this.selectedItems.length === 0) {
      console.log('[ExclusaoStandalone] Nenhum item selecionado');
      alert('Nenhum item selecionado para exclusão.');
      return;
    }

    const itemNames = this.selectedItems.map(documentId => {
      const item = this.inventarioItems.find(item => item.documentId === documentId);
      console.log('[ExclusaoStandalone] Buscando item com documentId:', documentId, 'encontrado:', !!item);
      return item ? item.nome : documentId;
    }).join(', ');

    console.log('[ExclusaoStandalone] Nomes dos itens para confirmação:', itemNames);

    if (confirm(`Tem certeza que deseja excluir os seguintes itens?\n\n${itemNames}\n\nEsta ação não pode ser desfeita.`)) {
      console.log('[ExclusaoStandalone] Usuário confirmou exclusão');
      await this.deleteSelectedItems();
    } else {
      console.log('[ExclusaoStandalone] Usuário cancelou exclusão');
    }
  }

  async deleteSelectedItems() {
    try {
      console.log('[ExclusaoStandalone] === INICIANDO EXCLUSÃO ===');
      console.log('[ExclusaoStandalone] Itens selecionados (documentIds):', this.selectedItems);
      console.log('[ExclusaoStandalone] Usuário:', this.currentUser.user);
      console.log('[ExclusaoStandalone] Database:', this.db);
      
      const { doc, deleteDoc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js");
      
      for (const documentId of this.selectedItems) {
        console.log('[ExclusaoStandalone] --- Processando documento:', documentId);
        
        const docPath = `inventario/${this.currentUser.user}/inventarioAluno/${documentId}`;
        console.log('[ExclusaoStandalone] Caminho do documento:', docPath);
        
        const itemDocRef = doc(this.db, 'inventario', this.currentUser.user, 'inventarioAluno', documentId);
        console.log('[ExclusaoStandalone] Referência do documento:', itemDocRef.path);
        
        // Primeiro, verificar se o documento existe
        try {
          console.log('[ExclusaoStandalone] Verificando se documento existe...');
          const docSnap = await getDoc(itemDocRef);
          
          if (docSnap.exists()) {
            console.log('[ExclusaoStandalone] ✅ Documento existe, dados:', docSnap.data());
            
            // Agora tentar excluir
            console.log('[ExclusaoStandalone] Chamando deleteDoc...');
            await deleteDoc(itemDocRef);
            console.log('[ExclusaoStandalone] ✅ Documento excluído com sucesso:', documentId);
            
          } else {
            console.log('[ExclusaoStandalone] ❌ Documento não existe:', documentId);
            throw new Error(`Documento ${documentId} não encontrado`);
          }
          
        } catch (deleteError) {
          console.error('[ExclusaoStandalone] ❌ Erro ao processar documento:', documentId);
          console.error('[ExclusaoStandalone] Tipo do erro:', typeof deleteError);
          console.error('[ExclusaoStandalone] Erro completo:', deleteError);
          console.error('[ExclusaoStandalone] Código do erro:', deleteError.code);
          console.error('[ExclusaoStandalone] Mensagem do erro:', deleteError.message);
          
          // Se for erro de permissão, mostrar detalhes
          if (deleteError.code === 'permission-denied') {
            console.error('[ExclusaoStandalone] 🚫 ERRO DE PERMISSÃO - Usuário não tem acesso para excluir');
            alert('Erro de permissão: Você não tem acesso para excluir este item.');
            return;
          }
          
          throw deleteError;
        }
      }
      
      console.log('[ExclusaoStandalone] === EXCLUSÃO COMPLETA ===');
      alert(`${this.selectedItems.length} item(ns) excluído(s) com sucesso!`);
      this.closePopup('popup-exclusao-items');
      
      setTimeout(() => {
        console.log('[ExclusaoStandalone] Recarregando página...');
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('[ExclusaoStandalone] === ERRO NA EXCLUSÃO ===');
      console.error('[ExclusaoStandalone] Erro geral:', error);
      console.error('[ExclusaoStandalone] Stack trace:', error.stack);
      console.error('[ExclusaoStandalone] Código do erro:', error.code);
      console.error('[ExclusaoStandalone] Mensagem do erro:', error.message);
      
      let userMessage = `Erro ao excluir itens: ${error.message}`;
      
      if (error.code === 'permission-denied') {
        userMessage = 'Erro de permissão: Você não tem acesso para excluir itens do inventário.';
      } else if (error.code === 'unavailable') {
        userMessage = 'Serviço temporariamente indisponível. Tente novamente em alguns instantes.';
      }
      
      alert(userMessage + '\nVerifique o console para mais detalhes.');
    }
  }

  // === FUNÇÃO DE TESTE COMPLETO ===
  async testCompleteDeletionSystem() {
    console.log('\n🔬 === TESTE COMPLETO DO SISTEMA DE EXCLUSÃO ===');
    
    try {
      // 1. Testar carregamento
      console.log('\n📥 Testando carregamento de itens...');
      await this.loadInventarioItems();
      console.log(`✅ Carregados ${this.inventarioItems.length} itens`);
      
      // 2. Mostrar estrutura dos dados
      console.log('\n📊 Estrutura dos primeiros 3 itens:');
      this.inventarioItems.slice(0, 3).forEach((item, index) => {
        console.log(`Item ${index + 1}:`, {
          documentId: item.documentId,
          id: item.id,
          nome: item.nome,
          categoria: item.categoria
        });
      });
      
      // 3. Testar renderização
      console.log('\n🎨 Testando renderização...');
      this.renderItemsList();
      console.log('✅ Lista renderizada');
      
      // 4. Verificar seleções
      console.log('\n☑️ Verificando sistema de seleção...');
      const checkboxes = this.container.querySelectorAll('input[type="checkbox"]');
      console.log(`✅ ${checkboxes.length} checkboxes criados`);
      
      // 5. Simular seleção
      if (checkboxes.length > 0) {
        const firstCheckbox = checkboxes[0];
        const documentId = firstCheckbox.value;
        console.log(`\n🎯 Simulando seleção do item com documentId: ${documentId}`);
        
        firstCheckbox.checked = true;
        this.handleItemSelection({ target: firstCheckbox });
        
        console.log('✅ Seleção simulada, selectedItems:', this.selectedItems);
        
        // 6. Verificar se o item existe no Firestore
        console.log(`\n🔍 Verificando se documento existe no Firestore...`);
        const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js");
        const userId = this.getCurrentUserId();
        const docRef = doc(this.db, 'inventario', userId, 'inventarioAluno', documentId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          console.log('✅ Documento encontrado no Firestore:', docSnap.data());
        } else {
          console.log('❌ Documento NÃO encontrado no Firestore para documentId:', documentId);
        }
        
        // 7. Limpar seleção
        firstCheckbox.checked = false;
        this.selectedItems = [];
        console.log('🧹 Seleção limpa para teste');
      }
      
      console.log('\n🎉 TESTE COMPLETO FINALIZADO!');
      console.log('Sistema está pronto para uso.');
      
    } catch (error) {
      console.error('❌ Erro durante teste completo:', error);
    }
  }

  closePopup(popupId) {
    const popup = document.getElementById(popupId);
    if (popup) {
      popup.remove();
    }
  }
}

// CSS inline para garantir que funcione
const styles = `
<style>
.popup-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.5); display: flex; align-items: center;
  justify-content: center; z-index: 10000;
}
.popup-content {
  background: white; border-radius: 12px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;
}
.popup-content.large { max-width: 700px; }
.popup-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20px; border-bottom: 1px solid #e8e8ef;
}
.popup-header h2 { margin: 0; color: #5a039a; }
.close-btn {
  background: none; border: none; font-size: 24px; cursor: pointer;
  color: #5d5d6a; width: 30px; height: 30px; display: flex;
  align-items: center; justify-content: center;
}
.close-btn:hover { background: #f0f0f0; border-radius: 50%; }
.popup-body { padding: 20px; }
.info-section { margin-bottom: 20px; }
.info-section h3 { margin: 0 0 10px 0; color: #5a039a; font-size: 16px; }
.info-section p { margin: 5px 0; color: #1a1a1a; }
.collections-list {
  list-style: none; padding: 0; margin: 10px 0;
}
.collections-list li {
  padding: 8px 12px; background: #f7f7fb; border-radius: 6px;
  margin: 4px 0; color: #5a039a; font-weight: 500;
}
.popup-footer {
  padding: 20px; border-top: 1px solid #e8e8ef; display: flex;
  gap: 10px; justify-content: flex-end;
}
.btn-primary {
  background: #5a039a; color: white; border: none; padding: 12px 24px;
  border-radius: 8px; cursor: pointer; font-weight: 600;
}
.btn-primary:hover { background: #4a0280; }
.btn-secondary {
  background: #e8e8ef; color: #5d5d6a; border: none; padding: 12px 24px;
  border-radius: 8px; cursor: pointer; font-weight: 600;
}
.btn-secondary:hover { background: #d0d0d7; }
.btn-danger {
  background: #dc3545; color: white; border: none; padding: 12px 24px;
  border-radius: 8px; cursor: pointer; font-weight: 600;
}
.btn-danger:hover { background: #c82333; }
.btn-danger:disabled { background: #6c757d; cursor: not-allowed; }
.items-section { margin-top: 20px; }
.item-row {
  display: flex; gap: 10px; margin-bottom: 10px; align-items: center;
}
.item-select {
  flex: 1; padding: 8px 12px; border: 1px solid #e8e8ef;
  border-radius: 6px; font-size: 14px;
}
.btn-remove-row {
  background: #dc3545; color: white; border: none; width: 30px; height: 30px;
  border-radius: 50%; cursor: pointer; display: flex; align-items: center;
  justify-content: center; font-size: 18px;
}
.btn-remove-row:hover { background: #c82333; }
.btn-add {
  background: #28a745; color: white; border: none; padding: 8px 16px;
  border-radius: 6px; cursor: pointer; font-size: 14px; margin-top: 10px;
}
.btn-add:hover { background: #218838; }
.no-items {
  color: #5d5d6a; font-style: italic; text-align: center; padding: 20px;
}
.items-list {
  max-height: 300px; overflow-y: auto; border: 1px solid #e8e8ef;
  border-radius: 6px; padding: 10px;
}
</style>
`;

// Adicionar estilos
document.head.insertAdjacentHTML('beforeend', styles);

// Criar instância
console.log('[ExclusaoStandalone] Criando instância...');
window.exclusaoStandalone = new ExclusaoStandalone();
