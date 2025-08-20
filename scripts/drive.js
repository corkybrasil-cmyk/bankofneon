// Firebase Drive - Database Explorer
console.log('[Firebase Drive] Script iniciando...');

class FirebaseDrive {
  constructor() {
    this.currentPath = [];
    this.currentView = 'card'; // 'card' or 'list'
    this.currentItems = []; // Store current items for reference
    this.selectedItem = null;
    this.currentEditItem = null;
    this.clipboard = null;
    
    this.firebaseManager = null;
    this.isInitialized = false;
    
    // DOM Elements
    this.elements = {};
    
    console.log('[Firebase Drive] Instância criada');
  }

  async initialize() {
    try {
      console.log('[Firebase Drive] Inicializando...');
      
      // Firebase Manager já deve estar disponível e inicializado
      if (!window.firebaseManager) {
        throw new Error('Firebase Manager não está disponível');
      }
      
      this.firebaseManager = window.firebaseManager;
      console.log('[Firebase Drive] Firebase Manager conectado');
      
      // Inicializar DOM
      this.initializeDOM();
      this.bindEvents();
      
      // Carregar vista inicial
      await this.loadRootView();
      
      this.isInitialized = true;
      console.log('[Firebase Drive] Inicialização completa');
      
    } catch (error) {
      console.error('[Firebase Drive] Erro na inicialização:', error);
      this.showError('Erro ao inicializar Firebase Drive: ' + error.message);
    }
  }

  initializeDOM() {
    console.log('[Firebase Drive] Inicializando DOM...');
    // Cache DOM elements
    this.elements = {
      // Toolbar
      backBtn: document.getElementById('backBtn'),
      breadcrumb: document.getElementById('breadcrumb'),
      searchInput: document.getElementById('searchInput'),
      refreshBtn: document.getElementById('refreshBtn'),
      cardViewBtn: document.getElementById('cardViewBtn'),
      listViewBtn: document.getElementById('listViewBtn'),
      createBtn: document.getElementById('createBtn'),
      
      // Content
      contentTitle: document.getElementById('contentTitle'),
      contentInfo: document.getElementById('contentInfo'),
      contentGrid: document.getElementById('contentGrid'),
      loadingState: document.getElementById('loadingState'),
      emptyState: document.getElementById('emptyState'),
      
      // Details Panel
      detailsPanel: document.getElementById('detailsPanel'),
      detailsContent: document.getElementById('detailsContent'),
      closeDetailsBtn: document.getElementById('closeDetailsBtn'),
      
      // Modals
      createModal: document.getElementById('createModal'),
      editModal: document.getElementById('editModal'),
      deleteModal: document.getElementById('deleteModal'),
      
      // Form elements
      createType: document.getElementById('createType'),
      createName: document.getElementById('createName'),
      documentFieldsGroup: document.getElementById('documentFieldsGroup'),
      documentFields: document.getElementById('documentFields'),
      addFieldBtn: document.getElementById('addFieldBtn'),
      confirmCreateBtn: document.getElementById('confirmCreateBtn'),
      
      editFields: document.getElementById('editFields'),
      addEditFieldBtn: document.getElementById('addEditFieldBtn'),
      confirmEditBtn: document.getElementById('confirmEditBtn'),
      
      deleteMessage: document.getElementById('deleteMessage'),
      confirmDeleteBtn: document.getElementById('confirmDeleteBtn')
    };
    
    console.log('[Firebase Drive] DOM inicializado, elementos encontrados:', Object.keys(this.elements).length);
    
    // Check if essential elements exist and log their status
    console.log('[Firebase Drive] Verificando elementos essenciais:');
    console.log('- contentGrid:', this.elements.contentGrid ? 'ENCONTRADO' : 'NÃO ENCONTRADO');
    console.log('- contentTitle:', this.elements.contentTitle ? 'ENCONTRADO' : 'NÃO ENCONTRADO');
    console.log('- contentInfo:', this.elements.contentInfo ? 'ENCONTRADO' : 'NÃO ENCONTRADO');
    console.log('- loadingState:', this.elements.loadingState ? 'ENCONTRADO' : 'NÃO ENCONTRADO');
    console.log('- emptyState:', this.elements.emptyState ? 'ENCONTRADO' : 'NÃO ENCONTRADO');
    
    if (!this.elements.contentGrid) {
      console.error('[Firebase Drive] ERRO CRÍTICO: Elemento contentGrid não encontrado!');
    }
    if (!this.elements.contentTitle) {
      console.error('[Firebase Drive] ERRO CRÍTICO: Elemento contentTitle não encontrado!');
    }
  }

  bindEvents() {
    // Toolbar events
    this.elements.backBtn.addEventListener('click', () => this.navigateBack());
    this.elements.refreshBtn.addEventListener('click', () => this.refresh());
    
    // View toggle
    this.elements.cardViewBtn.addEventListener('click', () => this.setView('card'));
    this.elements.listViewBtn.addEventListener('click', () => this.setView('list'));
    
    // Create button
    this.elements.createBtn.addEventListener('click', () => this.showCreateModal());
    
    // Search
    this.elements.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
    
    // Details panel
    this.elements.closeDetailsBtn.addEventListener('click', () => this.hideDetailsPanel());
    
    // Modal events
    this.bindModalEvents();
    
    // Create form events
    this.elements.createType.addEventListener('change', () => this.toggleDocumentFields());
    this.elements.addFieldBtn.addEventListener('click', () => this.addDocumentField());
    this.elements.confirmCreateBtn.addEventListener('click', () => this.handleCreate());
    
    // Edit form events
    this.elements.addEditFieldBtn.addEventListener('click', () => this.addEditField());
    this.elements.confirmEditBtn.addEventListener('click', () => this.handleEdit());
    
    // Delete confirmation
    this.elements.confirmDeleteBtn.addEventListener('click', () => this.handleDelete());
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
  }

  bindModalEvents() {
    // Modal close events
    document.querySelectorAll('.modal-close, [data-modal]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modalId = btn.getAttribute('data-modal') || btn.closest('.modal').id;
        this.hideModal(modalId);
      });
    });
    
    // Click outside to close
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hideModal(modal.id);
        }
      });
    });
  }

  // Navigation
  async loadRootView() {
    console.log('[Firebase Drive] === INÍCIO loadRootView ===');
    console.log('[Firebase Drive] Carregando vista raiz...');
    this.currentPath = [];
    this.updateBreadcrumb();
    this.updateNavigationState();
    
    console.log('[Firebase Drive] Definindo título e info...');
    this.elements.contentTitle.textContent = 'Firebase Drive';
    this.elements.contentInfo.textContent = 'Selecione uma fonte de dados para explorar';
    console.log('[Firebase Drive] Título definido:', this.elements.contentTitle.textContent);
    
    const rootItems = [
      {
        id: 'database',
        type: 'database',
        name: 'Firestore Database',
        subtitle: 'bancodaneondb',
        icon: this.getIcon('database'),
        path: ['database']
      },
      {
        id: 'storage',
        type: 'storage',
        name: 'Firebase Storage',
        subtitle: 'crmdaneon.firebasestorage.app',
        icon: this.getIcon('storage'),
        path: ['storage']
      }
    ];
    
    console.log('[Firebase Drive] Items criados:', rootItems);
    console.log('[Firebase Drive] Verificando getIcon para database:', this.getIcon('database'));
    console.log('[Firebase Drive] Verificando getIcon para storage:', this.getIcon('storage'));
    console.log('[Firebase Drive] Renderizando items:', rootItems);
    this.renderItems(rootItems);
    console.log('[Firebase Drive] === FIM loadRootView ===');
  }

  async navigateToPath(path) {
    try {
      this.showLoading();
      this.currentPath = [...path];
      this.updateBreadcrumb();
      this.updateNavigationState();
      
      if (path.length === 0) {
        await this.loadRootView();
        return;
      }
      
      const [source, ...subPath] = path;
      
      if (source === 'database') {
        await this.loadDatabasePath(subPath);
      } else if (source === 'storage') {
        await this.loadStoragePath(subPath);
      }
      
    } catch (error) {
      console.error('[Firebase Drive] Erro na navegação:', error);
      this.showError('Erro ao navegar: ' + error.message);
    } finally {
      this.hideLoading();
    }
  }

  async loadDatabasePath(subPath) {
    if (subPath.length === 0) {
      // Root collections
      await this.loadCollections();
    } else if (subPath.length === 1) {
      // Documents in collection
      await this.loadDocuments(subPath[0]);
    } else if (subPath.length === 2) {
      // Document details with subcollections
      await this.loadDocumentDetails(subPath[0], subPath[1]);
    } else {
      // Nested subcollections
      await this.loadSubcollection(subPath);
    }
  }

  async loadCollections() {
    this.elements.contentTitle.textContent = 'Coleções do Firestore';
    this.elements.contentInfo.textContent = 'Coleções raiz do banco de dados';
    
    const collections = this.firebaseManager.getMainCollections();
    const items = collections.map(name => ({
      id: name,
      type: 'collection',
      name: name,
      subtitle: 'Coleção',
      icon: this.getIcon('collection'),
      path: ['database', name]
    }));
    
    this.renderItems(items);
  }

  async loadDocuments(collectionName) {
    this.elements.contentTitle.textContent = `Coleção: ${collectionName}`;
    this.elements.contentInfo.textContent = 'Documentos na coleção';
    
    try {
      const db = this.firebaseManager.getFirestore();
      const { collection, getDocs } = await this.firebaseManager.importFirestoreModules(['collection', 'getDocs']);
      
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      
      const items = [];
      snapshot.forEach(doc => {
        items.push({
          id: doc.id,
          type: 'document',
          name: doc.id,
          subtitle: 'Documento',
          icon: this.getIcon('document'),
          path: ['database', collectionName, doc.id],
          data: doc.data(),
          metadata: {
            size: JSON.stringify(doc.data()).length,
            fields: Object.keys(doc.data()).length
          }
        });
      });
      
      this.renderItems(items);
      
    } catch (error) {
      console.error('[Firebase Drive] Erro ao carregar documentos:', error);
      this.showEmptyState();
    }
  }

  async loadDocumentDetails(collectionName, documentId) {
    this.elements.contentTitle.textContent = `Documento: ${documentId}`;
    this.elements.contentInfo.textContent = `em ${collectionName}`;
    
    try {
      const db = this.firebaseManager.getFirestore();
      const { doc, getDoc, collection, listCollections } = await this.firebaseManager.importFirestoreModules([
        'doc', 'getDoc', 'collection', 'listCollections'
      ]);
      
      const docRef = doc(db, collectionName, documentId);
      const docSnapshot = await getDoc(docRef);
      
      if (!docSnapshot.exists()) {
        this.showEmptyState('Documento não encontrado');
        return;
      }
      
      const docData = docSnapshot.data();
      
      // Show document details in side panel
      this.showDocumentDetails({
        id: documentId,
        collection: collectionName,
        data: docData,
        path: docSnapshot.ref.path
      });
      
      // Try to load subcollections (this is a limitation in web SDK)
      const items = [];
      
      // Check for common subcollection patterns
      const commonSubcollections = ['extrato', 'ocorrenciaAluno', 'inventarioAluno'];
      
      for (const subcolName of commonSubcollections) {
        try {
          const subcolRef = collection(db, collectionName, documentId, subcolName);
          const { getDocs } = await this.firebaseManager.importFirestoreModules(['getDocs']);
          const subSnapshot = await getDocs(subcolRef);
          
          if (!subSnapshot.empty) {
            items.push({
              id: subcolName,
              type: 'collection',
              name: subcolName,
              subtitle: `Subcoleção (${subSnapshot.size} docs)`,
              icon: this.getIcon('subcollection'),
              path: ['database', collectionName, documentId, subcolName]
            });
          }
        } catch (error) {
          // Subcollection doesn't exist or no permission
        }
      }
      
      this.renderItems(items);
      
    } catch (error) {
      console.error('[Firebase Drive] Erro ao carregar detalhes do documento:', error);
      this.showEmptyState();
    }
  }

  async loadSubcollection(subPath) {
    const [collectionName, documentId, subcollectionName] = subPath;
    
    this.elements.contentTitle.textContent = `Subcoleção: ${subcollectionName}`;
    this.elements.contentInfo.textContent = `em ${collectionName}/${documentId}`;
    
    try {
      const db = this.firebaseManager.getFirestore();
      const { collection, getDocs } = await this.firebaseManager.importFirestoreModules(['collection', 'getDocs']);
      
      const subcolRef = collection(db, collectionName, documentId, subcollectionName);
      const snapshot = await getDocs(subcolRef);
      
      const items = [];
      snapshot.forEach(doc => {
        items.push({
          id: doc.id,
          type: 'document',
          name: doc.id,
          subtitle: 'Documento',
          icon: this.getIcon('document'),
          path: [...subPath, doc.id],
          data: doc.data(),
          metadata: {
            size: JSON.stringify(doc.data()).length,
            fields: Object.keys(doc.data()).length
          }
        });
      });
      
      this.renderItems(items);
      
    } catch (error) {
      console.error('[Firebase Drive] Erro ao carregar subcoleção:', error);
      this.showEmptyState();
    }
  }

  async loadStoragePath(subPath) {
    try {
      console.log('[Firebase Drive] Carregando Storage path:', subPath);
      this.showLoading();
      
      // Check if user is authenticated
      if (!this.firebaseManager.getCurrentUser()) {
        console.log('[Firebase Drive] Usuário não autenticado, tentando autenticação automática...');
        await this.firebaseManager.initialize(); // This should authenticate anonymously
      }
      
      // Test Storage permissions first
      const hasPermission = await this.firebaseManager.testStoragePermissions();
      if (!hasPermission) {
        this.showStoragePermissionError();
        return;
      }
      
      const storage = this.firebaseManager.getStorage();
      const { ref, listAll, getMetadata, getDownloadURL } = await this.firebaseManager.importStorageModules([
        'ref', 'listAll', 'getMetadata', 'getDownloadURL'
      ]);
      
      // Build storage path
      let storagePath = '';
      
      if (subPath.length === 0) {
        // Root level - try to list known folders
        this.elements.contentTitle.textContent = `Firebase Storage`;
        this.elements.contentInfo.textContent = 'Raiz do Storage';
        
        const storageRef = ref(storage, '');
        const result = await listAll(storageRef);
        
        const items = [];
        
        // Add folders (prefixes)
        for (const folderRef of result.prefixes) {
          const folderName = folderRef.name;
          items.push({
            id: folderName,
            type: 'folder',
            name: folderName,
            subtitle: 'Pasta',
            icon: this.getIcon('folder'),
            path: [...this.currentPath, folderName],
            isFolder: true
          });
        }
        
        // Add files at root level
        for (const fileRef of result.items) {
          try {
            const metadata = await getMetadata(fileRef);
            const downloadURL = await getDownloadURL(fileRef);
            
            const fileName = fileRef.name;
            const fileSize = this.formatFileSize(metadata.size);
            const fileType = this.getFileType(fileName);
            
            items.push({
              id: fileName,
              type: 'file',
              name: fileName,
              subtitle: `${fileSize} • ${fileType}`,
              icon: this.getIcon('file'),
              path: [...this.currentPath, fileName],
              isFile: true,
              metadata: {
                size: metadata.size,
                contentType: metadata.contentType,
                timeCreated: metadata.timeCreated,
                updated: metadata.updated,
                downloadURL: downloadURL,
                fullPath: fileRef.fullPath
              }
            });
          } catch (error) {
            console.warn('[Firebase Drive] Erro ao obter metadados do arquivo:', fileRef.name, error);
          }
        }
        
        if (items.length === 0) {
          this.showEmptyState('Nenhum arquivo ou pasta encontrado no Storage');
          return;
        }
        
        this.renderItems(items);
        return;
      } else {
        storagePath = subPath.join('/');
      }
      
      console.log('[Firebase Drive] Storage path construído:', storagePath);
      
      this.elements.contentTitle.textContent = `Firebase Storage`;
      this.elements.contentInfo.textContent = storagePath ? `Pasta: ${storagePath}` : 'Raiz do Storage';
      
      const storageRef = ref(storage, storagePath);
      const result = await listAll(storageRef);
      
      const items = [];
      
      // Add folders (prefixes)
      for (const folderRef of result.prefixes) {
        const folderName = folderRef.name;
        items.push({
          id: folderName,
          type: 'folder',
          name: folderName,
          subtitle: 'Pasta',
          icon: this.getIcon('folder'),
          path: [...this.currentPath, folderName],
          isFolder: true
        });
      }
      
      // Add files (items)
      for (const fileRef of result.items) {
        try {
          const metadata = await getMetadata(fileRef);
          const downloadURL = await getDownloadURL(fileRef);
          
          const fileName = fileRef.name;
          const fileSize = this.formatFileSize(metadata.size);
          const fileType = this.getFileType(fileName);
          
          items.push({
            id: fileName,
            type: 'file',
            name: fileName,
            subtitle: `${fileSize} • ${fileType}`,
            icon: this.getIcon('file'),
            path: [...this.currentPath, fileName],
            isFile: true,
            metadata: {
              size: metadata.size,
              contentType: metadata.contentType,
              timeCreated: metadata.timeCreated,
              updated: metadata.updated,
              downloadURL: downloadURL,
              fullPath: fileRef.fullPath
            }
          });
        } catch (error) {
          console.warn('[Firebase Drive] Erro ao obter metadados do arquivo:', fileRef.name, error);
          // Add file without metadata
          items.push({
            id: fileRef.name,
            type: 'file',
            name: fileRef.name,
            subtitle: 'Arquivo',
            icon: this.getIcon('file'),
            path: [...this.currentPath, fileRef.name],
            isFile: true,
            metadata: {
              fullPath: fileRef.fullPath
            }
          });
        }
      }
      
      console.log('[Firebase Drive] Storage items carregados:', items);
      this.renderItems(items);
      
    } catch (error) {
      console.error('[Firebase Drive] Erro ao carregar Storage:', error);
      
      if (error.code === 'storage/unauthorized') {
        this.showStoragePermissionError();
      } else {
        this.showError('Erro ao carregar Storage: ' + error.message);
      }
    }
  }

  showStoragePermissionError() {
    this.elements.contentTitle.textContent = 'Firebase Storage - Acesso Negado';
    this.elements.contentInfo.textContent = 'Sem permissão para acessar o Storage';
    
    const errorHTML = `
      <div style="text-align: center; padding: 40px; color: #666;">
        <h3>🔒 Acesso Negado ao Firebase Storage</h3>
        <p>As regras de segurança do Firebase Storage estão bloqueando o acesso.</p>
        <br>
        <h4>Para resolver este problema:</h4>
        <ol style="text-align: left; max-width: 500px; margin: 0 auto;">
          <li>Acesse o <strong>Firebase Console</strong></li>
          <li>Vá em <strong>Storage → Rules</strong></li>
          <li>Altere as regras para permitir leitura:
            <pre style="background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 4px;">
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}</pre>
          </li>
          <li>Clique em <strong>Publicar</strong></li>
          <li>Recarregue esta página</li>
        </ol>
      </div>
    `;
    
    this.elements.contentGrid.innerHTML = errorHTML;
    this.elements.contentGrid.style.display = 'block';
    this.hideLoading();
  }

  // Rendering
  renderItems(items) {
    console.log('[Firebase Drive] === INÍCIO renderItems ===');
    console.log('[Firebase Drive] renderItems chamado com:', items.length, 'items');
    console.log('[Firebase Drive] Items recebidos:', items);
    
    // Store current items for reference
    this.currentItems = items;
    
    this.hideLoading();
    this.hideEmptyState();
    
    if (items.length === 0) {
      console.log('[Firebase Drive] Nenhum item, mostrando estado vazio');
      this.showEmptyState();
      return;
    }
    
    console.log('[Firebase Drive] Verificando contentGrid:', this.elements.contentGrid);
    if (!this.elements.contentGrid) {
      console.error('[Firebase Drive] ERRO: contentGrid não encontrado!');
      return;
    }
    
    console.log('[Firebase Drive] Limpando contentGrid...');
    this.elements.contentGrid.innerHTML = '';
    this.elements.contentGrid.className = `content-grid ${this.currentView}-view`;
    console.log('[Firebase Drive] ContentGrid limpo, className:', this.elements.contentGrid.className);
    
    console.log('[Firebase Drive] Criando elementos para', items.length, 'items');
    items.forEach((item, index) => {
      console.log(`[Firebase Drive] Criando elemento ${index + 1}/${items.length}:`, item);
      const element = this.createItemElement(item);
      console.log(`[Firebase Drive] Elemento ${index + 1} criado:`, element);
      this.elements.contentGrid.appendChild(element);
      console.log(`[Firebase Drive] Elemento ${index + 1} adicionado ao DOM`);
    });
    
    console.log('[Firebase Drive] Verificando contentGrid final:');
    console.log('- childElementCount:', this.elements.contentGrid.childElementCount);
    console.log('- innerHTML length:', this.elements.contentGrid.innerHTML.length);
    console.log('[Firebase Drive] === FIM renderItems ===');
  }

  createItemElement(item) {
    console.log('[Firebase Drive] createItemElement iniciando para:', item);
    const card = document.createElement('div');
    card.className = 'content-card';
    card.dataset.itemId = item.id;
    card.dataset.itemType = item.type;
    
    const isListView = this.currentView === 'list';
    console.log('[Firebase Drive] isListView:', isListView, 'currentView:', this.currentView);
    
    if (isListView) {
      card.innerHTML = `
        <div class="card-icon">${item.icon}</div>
        <div class="card-content">
          <div class="card-info">
            <div class="card-title">${this.escapeHtml(item.name)}</div>
            <div class="card-subtitle">${this.escapeHtml(item.subtitle)}</div>
          </div>
          <div class="card-meta">
            <span class="type-badge ${item.type}">${item.type}</span>
            ${item.metadata ? `<span>${item.metadata.fields || 0} campos</span>` : ''}
          </div>
        </div>
        <div class="card-actions">
          ${this.getItemActions(item)}
        </div>
      `;
    } else {
      card.innerHTML = `
        <div class="card-icon">${item.icon}</div>
        <div class="card-title">${this.escapeHtml(item.name)}</div>
        <div class="card-subtitle">${this.escapeHtml(item.subtitle)}</div>
        <div class="card-meta">
          <span class="type-badge ${item.type}">${item.type}</span>
          ${item.metadata ? `<span>${item.metadata.fields || 0} campos</span>` : ''}
        </div>
        <div class="card-actions">
          ${this.getItemActions(item)}
        </div>
      `;
    }
    
    console.log('[Firebase Drive] Card HTML criado:', card.innerHTML.length, 'caracteres');
    
    // Event listeners
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.card-actions')) {
        this.handleItemClick(item);
      }
    });
    
    console.log('[Firebase Drive] createItemElement finalizado, retornando card');
    return card;
  }

  getItemActions(item) {
    const actions = [];
    
    if (item.type === 'document') {
      actions.push(`
        <button class="card-action" onclick="window.firebaseDrive.editItem('${item.id}')" title="Editar">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="m18.5 2.5 3 3L12 15l-4 1 1-4z"/>
          </svg>
        </button>
      `);
    }
    
    if (item.type === 'file' && item.metadata && item.metadata.downloadURL) {
      actions.push(`
        <button class="card-action" onclick="window.open('${item.metadata.downloadURL}', '_blank')" title="Baixar">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
      `);
    }
    
    if (item.type !== 'database' && item.type !== 'storage' && item.type !== 'folder') {
      actions.push(`
        <button class="card-action danger" onclick="window.firebaseDrive.deleteItem('${item.id}', '${item.type}')" title="Excluir">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m3 6 18 0"/>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
        </button>
      `);
    }
    
    return actions.join('');
  }

  handleItemClick(item) {
    this.selectItem(item);
    
    if (item.path) {
      this.navigateToPath(item.path);
    }
  }

  selectItem(item) {
    // Remove previous selection
    document.querySelectorAll('.content-card.selected').forEach(card => {
      card.classList.remove('selected');
    });
    
    // Add selection to current item
    const cardElement = document.querySelector(`[data-item-id="${item.id}"]`);
    if (cardElement) {
      cardElement.classList.add('selected');
    }
    
    this.selectedItem = item;
    
    if (item.type === 'document' && item.data) {
      this.showDocumentDetails(item);
    } else if (item.type === 'file' && item.metadata) {
      this.showFileDetails(item);
    } else {
      this.hideDetailsPanel();
    }
  }

  // Details Panel
  showFileDetails(item) {
    const content = this.elements.detailsContent;
    const metadata = item.metadata;
    
    content.innerHTML = `
      <div class="property-group">
        <h4>Informações do Arquivo</h4>
        <div class="property-item">
          <span class="property-label">Nome</span>
          <span class="property-value">${this.escapeHtml(item.name)}</span>
        </div>
        <div class="property-item">
          <span class="property-label">Caminho</span>
          <span class="property-value code">${this.escapeHtml(metadata.fullPath || 'N/A')}</span>
        </div>
        ${metadata.size ? `
        <div class="property-item">
          <span class="property-label">Tamanho</span>
          <span class="property-value">${this.formatFileSize(metadata.size)}</span>
        </div>
        ` : ''}
        ${metadata.contentType ? `
        <div class="property-item">
          <span class="property-label">Tipo</span>
          <span class="property-value">${this.escapeHtml(metadata.contentType)}</span>
        </div>
        ` : ''}
        ${metadata.timeCreated ? `
        <div class="property-item">
          <span class="property-label">Criado em</span>
          <span class="property-value">${new Date(metadata.timeCreated).toLocaleString()}</span>
        </div>
        ` : ''}
        ${metadata.updated ? `
        <div class="property-item">
          <span class="property-label">Atualizado em</span>
          <span class="property-value">${new Date(metadata.updated).toLocaleString()}</span>
        </div>
        ` : ''}
      </div>
      ${metadata.downloadURL ? `
      <div class="property-group">
        <h4>Ações</h4>
        <div class="property-item">
          <button class="btn-primary" onclick="window.open('${metadata.downloadURL}', '_blank')">
            Baixar Arquivo
          </button>
        </div>
        ${this.isImageFile(item.name) ? `
        <div class="property-item">
          <img src="${metadata.downloadURL}" alt="${item.name}" style="max-width: 200px; max-height: 200px; border-radius: 4px; margin-top: 8px;" onload="this.style.display='block'" onerror="this.style.display='none'">
        </div>
        ` : ''}
      </div>
      ` : ''}
    `;
    
    this.showDetailsPanel();
  }

  isImageFile(fileName) {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];
    const ext = fileName.split('.').pop().toLowerCase();
    return imageExtensions.includes(ext);
  }

  showDocumentDetails(item) {
    const content = this.elements.detailsContent;
    
    content.innerHTML = `
      <div class="property-group">
        <h4>Informações Gerais</h4>
        <div class="property-item">
          <span class="property-label">ID</span>
          <span class="property-value code">${this.escapeHtml(item.id)}</span>
        </div>
        <div class="property-item">
          <span class="property-label">Coleção</span>
          <span class="property-value">${this.escapeHtml(item.collection || 'N/A')}</span>
        </div>
        <div class="property-item">
          <span class="property-label">Caminho</span>
          <span class="property-value code">${this.escapeHtml(item.path || 'N/A')}</span>
        </div>
        <div class="property-item">
          <span class="property-label">Campos</span>
          <span class="property-value">${Object.keys(item.data || {}).length}</span>
        </div>
      </div>
      
      <div class="property-group">
        <h4>Campos do Documento</h4>
        ${this.renderDocumentFields(item.data || {})}
      </div>
    `;
    
    this.elements.detailsPanel.classList.remove('hidden');
  }

  renderDocumentFields(data) {
    return Object.entries(data).map(([key, value]) => {
      const type = this.getFieldType(value);
      const displayValue = this.formatFieldValue(value, type);
      
      return `
        <div class="property-item">
          <span class="property-label">${this.escapeHtml(key)}</span>
          <span class="property-value">
            <div class="type-badge">${type}</div>
            <div class="property-value code">${this.escapeHtml(displayValue)}</div>
          </span>
        </div>
      `;
    }).join('');
  }

  showDetailsPanel() {
    this.elements.detailsPanel.classList.remove('hidden');
  }

  hideDetailsPanel() {
    this.elements.detailsPanel.classList.add('hidden');
  }

  // UI State Management
  setView(viewType) {
    this.currentView = viewType;
    
    // Update button states
    this.elements.cardViewBtn.classList.toggle('active', viewType === 'card');
    this.elements.listViewBtn.classList.toggle('active', viewType === 'list');
    
    // Re-render current items
    const items = Array.from(this.elements.contentGrid.children).map(card => {
      // Extract item data from DOM (simplified)
      return {
        id: card.dataset.itemId,
        type: card.dataset.itemType,
        name: card.querySelector('.card-title').textContent,
        subtitle: card.querySelector('.card-subtitle').textContent
      };
    });
    
    if (items.length > 0) {
      // Re-render with new view
      this.navigateToPath(this.currentPath);
    }
  }

  showLoading() {
    this.elements.contentGrid.style.display = 'none';
    this.elements.emptyState.style.display = 'none';
    this.elements.loadingState.style.display = 'flex';
  }

  hideLoading() {
    this.elements.loadingState.style.display = 'none';
    this.elements.contentGrid.style.display = 'grid';
  }

  showEmptyState(message = 'Nenhum item encontrado') {
    this.elements.contentGrid.style.display = 'none';
    this.elements.loadingState.style.display = 'none';
    this.elements.emptyState.style.display = 'flex';
    this.elements.emptyState.querySelector('h3').textContent = message;
  }

  hideEmptyState() {
    this.elements.emptyState.style.display = 'none';
  }

  updateBreadcrumb() {
    const breadcrumb = this.elements.breadcrumb;
    breadcrumb.innerHTML = '';
    
    // Root item
    const rootItem = document.createElement('span');
    rootItem.className = 'breadcrumb-item';
    rootItem.textContent = 'Root';
    rootItem.addEventListener('click', () => this.navigateToPath([]));
    breadcrumb.appendChild(rootItem);
    
    // Path items
    this.currentPath.forEach((segment, index) => {
      const item = document.createElement('span');
      item.className = 'breadcrumb-item';
      item.textContent = segment;
      
      const pathToHere = this.currentPath.slice(0, index + 1);
      item.addEventListener('click', () => this.navigateToPath(pathToHere));
      
      breadcrumb.appendChild(item);
    });
    
    // Mark last item as active
    const lastItem = breadcrumb.lastElementChild;
    if (lastItem) {
      lastItem.classList.add('active');
    }
  }

  updateNavigationState() {
    this.elements.backBtn.disabled = this.currentPath.length === 0;
  }

  navigateBack() {
    if (this.currentPath.length > 0) {
      const newPath = this.currentPath.slice(0, -1);
      this.navigateToPath(newPath);
    }
  }

  refresh() {
    this.navigateToPath(this.currentPath);
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileType(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const types = {
      'jpg': 'Imagem JPEG',
      'jpeg': 'Imagem JPEG',
      'png': 'Imagem PNG',
      'gif': 'Imagem GIF',
      'svg': 'Imagem SVG',
      'pdf': 'Documento PDF',
      'txt': 'Arquivo de Texto',
      'doc': 'Documento Word',
      'docx': 'Documento Word',
      'mp4': 'Vídeo MP4',
      'mp3': 'Áudio MP3',
      'zip': 'Arquivo ZIP',
      'json': 'Arquivo JSON'
    };
    return types[ext] || 'Arquivo';
  }

  // Utility methods
  getIcon(type) {
    const icons = {
      database: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <ellipse cx="12" cy="5" rx="9" ry="3"/>
        <path d="m3 5 0 14c0 3 4 3 9 3s9 0 9-3V5"/>
        <path d="m3 12c0 3 4 3 9 3s9 0 9-3"/>
      </svg>`,
      storage: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14,2 14,8 20,8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10,9 9,9 8,9"/>
      </svg>`,
      collection: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>`,
      subcollection: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        <path d="M12 11v6"/>
        <path d="M9 14h6"/>
      </svg>`,
      folder: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>`,
      file: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14,2 14,8 20,8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10,9 9,9 8,9"/>
      </svg>`,
      document: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14,2 14,8 20,8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10,9 9,9 8,9"/>
      </svg>`
    };
    
    return icons[type] || icons.document;
  }

  getFieldType(value) {
    if (value === null) return 'null';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') return 'string';
    if (Array.isArray(value)) return 'array';
    if (value && typeof value.toDate === 'function') return 'timestamp';
    if (typeof value === 'object') return 'object';
    return 'unknown';
  }

  formatFieldValue(value, type) {
    switch (type) {
      case 'null':
        return 'null';
      case 'boolean':
        return value.toString();
      case 'number':
        return value.toString();
      case 'string':
        return value.length > 50 ? value.substring(0, 50) + '...' : value;
      case 'array':
        return `[${value.length} items]`;
      case 'timestamp':
        try {
          return value.toDate().toLocaleString();
        } catch {
          return value.toString();
        }
      case 'object':
        return `{${Object.keys(value).length} keys}`;
      default:
        return JSON.stringify(value).substring(0, 50) + '...';
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Modal management
  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('show');
    }
  }

  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('show');
    }
  }

  showError(message) {
    console.error('[Firebase Drive] Erro:', message);
    // Simple error display - could be enhanced with toast notifications
    alert('Erro: ' + message);
  }

  showSuccess(message) {
    console.log('[Firebase Drive] Sucesso:', message);
    // Simple success display - could be enhanced with toast notifications
    alert('Sucesso: ' + message);
  }

  // CRUD Operations (Placeholder methods - will implement in next part)
  
  showCreateModal() {
    this.resetCreateForm();
    this.showModal('createModal');
  }

  resetCreateForm() {
    this.elements.createType.value = 'collection';
    this.elements.createName.value = '';
    this.toggleDocumentFields();
    this.resetDocumentFields();
  }

  toggleDocumentFields() {
    const isDocument = this.elements.createType.value === 'document';
    this.elements.documentFieldsGroup.style.display = isDocument ? 'block' : 'none';
  }

  resetDocumentFields() {
    this.elements.documentFields.innerHTML = `
      <div class="field-row">
        <input type="text" placeholder="Nome do campo" class="field-name" />
        <select class="field-type">
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
          <option value="timestamp">Timestamp</option>
          <option value="array">Array</option>
          <option value="object">Object</option>
        </select>
        <input type="text" placeholder="Valor" class="field-value" />
        <button type="button" class="btn-remove-field" onclick="this.parentElement.remove()">×</button>
      </div>
    `;
  }

  addDocumentField() {
    const fieldRow = document.createElement('div');
    fieldRow.className = 'field-row';
    fieldRow.innerHTML = `
      <input type="text" placeholder="Nome do campo" class="field-name" />
      <select class="field-type">
        <option value="string">String</option>
        <option value="number">Number</option>
        <option value="boolean">Boolean</option>
        <option value="timestamp">Timestamp</option>
        <option value="array">Array</option>
        <option value="object">Object</option>
      </select>
      <input type="text" placeholder="Valor" class="field-value" />
      <button type="button" class="btn-remove-field" onclick="this.parentElement.remove()">×</button>
    `;
    
    this.elements.documentFields.appendChild(fieldRow);
  }

  addEditField() {
    const fieldRow = document.createElement('div');
    fieldRow.className = 'field-row';
    fieldRow.innerHTML = `
      <input type="text" placeholder="Nome do campo" class="field-name" />
      <select class="field-type">
        <option value="string">String</option>
        <option value="number">Number</option>
        <option value="boolean">Boolean</option>
        <option value="timestamp">Timestamp</option>
        <option value="array">Array</option>
        <option value="object">Object</option>
      </select>
      <input type="text" placeholder="Valor" class="field-value" />
      <button type="button" class="btn-remove-field" onclick="this.parentElement.remove()">×</button>
    `;
    
    this.elements.editFields.appendChild(fieldRow);
  }

  // CRUD Operations - Full Implementation
  
  showCreateModal() {
    this.resetCreateForm();
    this.showModal('createModal');
  }

  resetCreateForm() {
    this.elements.createType.value = 'collection';
    this.elements.createName.value = '';
    this.toggleDocumentFields();
    this.resetDocumentFields();
  }

  toggleDocumentFields() {
    const isDocument = this.elements.createType.value === 'document';
    this.elements.documentFieldsGroup.style.display = isDocument ? 'block' : 'none';
  }

  resetDocumentFields() {
    this.elements.documentFields.innerHTML = `
      <div class="field-row">
        <input type="text" placeholder="Nome do campo" class="field-name" />
        <select class="field-type">
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
          <option value="timestamp">Timestamp</option>
          <option value="array">Array</option>
          <option value="object">Object</option>
        </select>
        <input type="text" placeholder="Valor" class="field-value" />
        <button type="button" class="btn-remove-field" onclick="this.parentElement.remove()">×</button>
      </div>
    `;
  }

  addDocumentField() {
    const fieldRow = document.createElement('div');
    fieldRow.className = 'field-row';
    fieldRow.innerHTML = `
      <input type="text" placeholder="Nome do campo" class="field-name" />
      <select class="field-type">
        <option value="string">String</option>
        <option value="number">Number</option>
        <option value="boolean">Boolean</option>
        <option value="timestamp">Timestamp</option>
        <option value="array">Array</option>
        <option value="object">Object</option>
      </select>
      <input type="text" placeholder="Valor" class="field-value" />
      <button type="button" class="btn-remove-field" onclick="this.parentElement.remove()">×</button>
    `;
    
    this.elements.documentFields.appendChild(fieldRow);
  }

  addEditField() {
    const fieldRow = document.createElement('div');
    fieldRow.className = 'field-row';
    fieldRow.innerHTML = `
      <input type="text" placeholder="Nome do campo" class="field-name" />
      <select class="field-type">
        <option value="string">String</option>
        <option value="number">Number</option>
        <option value="boolean">Boolean</option>
        <option value="timestamp">Timestamp</option>
        <option value="array">Array</option>
        <option value="object">Object</option>
      </select>
      <input type="text" placeholder="Valor" class="field-value" />
      <button type="button" class="btn-remove-field" onclick="this.parentElement.remove()">×</button>
    `;
    
    this.elements.editFields.appendChild(fieldRow);
  }

  // CREATE Operations
  async handleCreate() {
    try {
      const type = this.elements.createType.value;
      const name = this.elements.createName.value.trim();
      
      if (type === 'collection') {
        await this.createCollection(name);
      } else if (type === 'document') {
        await this.createDocument(name);
      }
      
      this.hideModal('createModal');
      this.refresh(); // Reload current view
      
    } catch (error) {
      console.error('[Firebase Drive] Erro ao criar:', error);
      this.showError('Erro ao criar: ' + error.message);
    }
  }

  async createCollection(collectionName) {
    if (!collectionName) {
      throw new Error('Nome da coleção é obrigatório');
    }
    
    // In Firestore, collections are created implicitly when the first document is added
    // We'll create a placeholder document and then delete it
    const db = this.firebaseManager.getFirestore();
    const { collection, doc, setDoc, deleteDoc } = await this.firebaseManager.importFirestoreModules([
      'collection', 'doc', 'setDoc', 'deleteDoc'
    ]);
    
    const colRef = collection(db, collectionName);
    const placeholderRef = doc(colRef, '__placeholder__');
    
    await setDoc(placeholderRef, {
      __placeholder: true,
      created: await this.firebaseManager.serverTimestamp()
    });
    
    // Immediately delete the placeholder
    await deleteDoc(placeholderRef);
    
    this.showSuccess(`Coleção "${collectionName}" criada com sucesso`);
  }

  async createDocument(documentId = null) {
    const fields = await this.getDocumentFieldsFromForm();
    
    if (Object.keys(fields).length === 0) {
      throw new Error('Adicione pelo menos um campo ao documento');
    }
    
    const path = this.getCurrentCollectionPath();
    if (!path) {
      throw new Error('Navegue até uma coleção para criar documentos');
    }
    
    const db = this.firebaseManager.getFirestore();
    const { collection, doc, setDoc, addDoc } = await this.firebaseManager.importFirestoreModules([
      'collection', 'doc', 'setDoc', 'addDoc'
    ]);
    
    // Add creation timestamp
    fields.__createdAt = await this.firebaseManager.serverTimestamp();
    
    const colRef = collection(db, ...path);
    
    let docRef;
    if (documentId && documentId.trim()) {
      // Use specified ID
      docRef = doc(colRef, documentId.trim());
      await setDoc(docRef, fields);
    } else {
      // Auto-generate ID
      docRef = await addDoc(colRef, fields);
    }
    
    this.showSuccess(`Documento "${docRef.id}" criado com sucesso`);
  }

  async getDocumentFieldsFromForm() {
    const fields = {};
    const fieldRows = this.elements.documentFields.querySelectorAll('.field-row');
    
    for (const row of fieldRows) {
      const nameInput = row.querySelector('.field-name');
      const typeSelect = row.querySelector('.field-type');
      const valueInput = row.querySelector('.field-value');
      
      const fieldName = nameInput.value.trim();
      const fieldType = typeSelect.value;
      const fieldValue = valueInput.value.trim();
      
      if (fieldName && fieldValue) {
        fields[fieldName] = await this.convertFieldValue(fieldValue, fieldType);
      }
    }
    
    return fields;
  }

  getCurrentCollectionPath() {
    if (this.currentPath.length === 0) return null;
    
    const [source, ...path] = this.currentPath;
    if (source !== 'database') return null;
    
    // Build collection path for nested collections
    const collectionPath = [];
    for (let i = 0; i < path.length; i++) {
      collectionPath.push(path[i]);
      if (i % 2 === 0 && i < path.length - 1) {
        // This is a collection, next should be document ID
        continue;
      }
    }
    
    // Ensure we're at a collection level
    if (collectionPath.length % 2 === 0 && collectionPath.length > 0) {
      collectionPath.pop(); // Remove last document ID to get to collection
    }
    
    return collectionPath.length > 0 ? collectionPath : null;
  }

  async convertFieldValue(value, type) {
    switch (type) {
      case 'string':
        return value;
      case 'number':
        const num = Number(value);
        if (isNaN(num)) throw new Error(`"${value}" não é um número válido`);
        return num;
      case 'boolean':
        return value.toLowerCase() === 'true';
      case 'timestamp':
        if (value.toLowerCase() === 'now') {
          return await this.firebaseManager.serverTimestamp();
        }
        const date = new Date(value);
        if (isNaN(date.getTime())) throw new Error(`"${value}" não é uma data válida`);
        return date;
      case 'array':
        try {
          return JSON.parse(value);
        } catch {
          // Try to split by comma
          return value.split(',').map(v => v.trim());
        }
      case 'object':
        try {
          return JSON.parse(value);
        } catch {
          throw new Error(`"${value}" não é um objeto JSON válido`);
        }
      default:
        return value;
    }
  }

  // EDIT Operations
  async editItem(itemId) {
    try {
      console.log('[Firebase Drive] editItem chamado para ID:', itemId);
      console.log('[Firebase Drive] selectedItem atual:', this.selectedItem);
      console.log('[Firebase Drive] currentItems:', this.currentItems);
      
      // Find the item in current items or use selectedItem
      let itemToEdit = this.selectedItem;
      
      if (!itemToEdit || itemToEdit.id !== itemId) {
        // Try to find item in current view
        itemToEdit = this.currentItems.find(item => item.id === itemId);
      }
      
      if (!itemToEdit || itemToEdit.type !== 'document') {
        this.showError('Documento não encontrado ou não é editável');
        console.error('[Firebase Drive] Item não encontrado:', itemId, 'selectedItem:', this.selectedItem);
        return;
      }
      
      console.log('[Firebase Drive] Item a editar:', itemToEdit);
      
      // Ensure we have the document data
      if (!itemToEdit.data) {
        console.log('[Firebase Drive] Documento sem dados, carregando...');
        await this.loadDocumentData(itemToEdit);
      }
      
      this.currentEditItem = itemToEdit;
      this.populateEditForm(itemToEdit.data || {});
      this.showModal('editModal');
      
    } catch (error) {
      console.error('[Firebase Drive] Erro ao abrir editor:', error);
      this.showError('Erro ao abrir editor: ' + error.message);
    }
  }

  async loadDocumentData(item) {
    try {
      const db = this.firebaseManager.getFirestore();
      const { doc, getDoc } = await this.firebaseManager.importFirestoreModules(['doc', 'getDoc']);
      
      const docPath = this.getDocumentPath(item);
      console.log('[Firebase Drive] Carregando dados do documento:', docPath);
      
      const docRef = doc(db, ...docPath);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        item.data = docSnap.data();
        console.log('[Firebase Drive] Dados do documento carregados:', item.data);
      } else {
        throw new Error('Documento não encontrado');
      }
    } catch (error) {
      console.error('[Firebase Drive] Erro ao carregar dados do documento:', error);
      throw error;
    }
  }

  getCurrentViewItems() {
    // Return the items currently being displayed
    return this.currentItems || [];
  }

  populateEditForm(data) {
    this.elements.editFields.innerHTML = '';
    
    Object.entries(data).forEach(([key, value]) => {
      if (key.startsWith('__')) return; // Skip internal fields
      
      const type = this.getFieldType(value);
      const displayValue = this.getEditableValue(value, type);
      
      const fieldRow = document.createElement('div');
      fieldRow.className = 'field-row';
      fieldRow.innerHTML = `
        <input type="text" placeholder="Nome do campo" class="field-name" value="${this.escapeHtml(key)}" />
        <select class="field-type">
          <option value="string" ${type === 'string' ? 'selected' : ''}>String</option>
          <option value="number" ${type === 'number' ? 'selected' : ''}>Number</option>
          <option value="boolean" ${type === 'boolean' ? 'selected' : ''}>Boolean</option>
          <option value="timestamp" ${type === 'timestamp' ? 'selected' : ''}>Timestamp</option>
          <option value="array" ${type === 'array' ? 'selected' : ''}>Array</option>
          <option value="object" ${type === 'object' ? 'selected' : ''}>Object</option>
        </select>
        <input type="text" placeholder="Valor" class="field-value" value="${this.escapeHtml(displayValue)}" />
        <button type="button" class="btn-remove-field" onclick="this.parentElement.remove()">×</button>
      `;
      
      this.elements.editFields.appendChild(fieldRow);
    });
  }

  getEditableValue(value, type) {
    switch (type) {
      case 'timestamp':
        try {
          return value.toDate().toISOString().substring(0, 16);
        } catch {
          return value.toString();
        }
      case 'array':
      case 'object':
        return JSON.stringify(value);
      default:
        return value.toString();
    }
  }

  async handleEdit() {
    try {
      if (!this.currentEditItem) {
        throw new Error('Nenhum item selecionado para edição');
      }
      
      const fields = await this.getDocumentFieldsFromEditForm();
      await this.updateDocument(this.currentEditItem, fields);
      
      this.hideModal('editModal');
      this.refresh();
      
    } catch (error) {
      console.error('[Firebase Drive] Erro ao salvar:', error);
      this.showError('Erro ao salvar: ' + error.message);
    }
  }

  async getDocumentFieldsFromEditForm() {
    const fields = {};
    const fieldRows = this.elements.editFields.querySelectorAll('.field-row');
    
    for (const row of fieldRows) {
      const nameInput = row.querySelector('.field-name');
      const typeSelect = row.querySelector('.field-type');
      const valueInput = row.querySelector('.field-value');
      
      const fieldName = nameInput.value.trim();
      const fieldType = typeSelect.value;
      const fieldValue = valueInput.value.trim();
      
      if (fieldName) {
        if (fieldValue) {
          fields[fieldName] = await this.convertFieldValue(fieldValue, fieldType);
        } else {
          fields[fieldName] = null; // Will be deleted
        }
      }
    }
    
    return fields;
  }

  async updateDocument(item, newFields) {
    try {
      console.log('[Firebase Drive] Atualizando documento:', item.id);
      console.log('[Firebase Drive] Novos campos:', newFields);
      console.log('[Firebase Drive] Caminho atual:', this.currentPath);
      
      const db = this.firebaseManager.getFirestore();
      const { doc, updateDoc, deleteField } = await this.firebaseManager.importFirestoreModules([
        'doc', 'updateDoc', 'deleteField'
      ]);
      
      // Build document path from current navigation
      const docPath = this.getDocumentPath(item);
      console.log('[Firebase Drive] Caminho do documento:', docPath);
      
      const docRef = doc(db, ...docPath);
      
      // Prepare update object
      const updates = {};
      
      // Add update timestamp
      updates.__updatedAt = await this.firebaseManager.serverTimestamp();
      
      // Process field changes
      Object.entries(newFields).forEach(([key, value]) => {
        if (value === null) {
          updates[key] = deleteField();
        } else {
          updates[key] = value;
        }
      });
      
      console.log('[Firebase Drive] Updates a aplicar:', updates);
      
      await updateDoc(docRef, updates);
      console.log('[Firebase Drive] Documento atualizado com sucesso');
      this.showSuccess(`Documento "${item.id}" atualizado com sucesso`);
      
    } catch (error) {
      console.error('[Firebase Drive] Erro ao atualizar documento:', error);
      throw error;
    }
  }

  getDocumentPath(item) {
    // Extract path from current navigation, excluding 'database'
    const [source, ...pathSegments] = this.currentPath;
    
    if (source !== 'database') {
      throw new Error('Edição só é suportada no Firestore Database');
    }
    
    // Add the document ID to the path
    const fullPath = [...pathSegments, item.id];
    console.log('[Firebase Drive] Caminho construído:', fullPath);
    
    return fullPath;
  }

  // DELETE Operations
  async deleteItem(itemId, itemType) {
    this.currentDeleteItem = { id: itemId, type: itemType };
    
    let message = '';
    switch (itemType) {
      case 'collection':
        message = `Excluir a coleção "${itemId}" e todos os seus documentos?`;
        break;
      case 'document':
        message = `Excluir o documento "${itemId}"?`;
        break;
      default:
        message = `Excluir "${itemId}"?`;
    }
    
    this.elements.deleteMessage.textContent = message;
    this.showModal('deleteModal');
  }

  async handleDelete() {
    try {
      if (!this.currentDeleteItem) {
        throw new Error('Nenhum item selecionado para exclusão');
      }
      
      const { id, type } = this.currentDeleteItem;
      
      if (type === 'collection') {
        await this.deleteCollection(id);
      } else if (type === 'document') {
        await this.deleteDocument(id);
      }
      
      this.hideModal('deleteModal');
      this.refresh();
      
    } catch (error) {
      console.error('[Firebase Drive] Erro ao excluir:', error);
      this.showError('Erro ao excluir: ' + error.message);
    }
  }

  async deleteCollection(collectionName) {
    // Deleting a collection requires deleting all documents first
    const db = this.firebaseManager.getFirestore();
    const { collection, getDocs, doc, deleteDoc, writeBatch } = await this.firebaseManager.importFirestoreModules([
      'collection', 'getDocs', 'doc', 'deleteDoc', 'writeBatch'
    ]);
    
    const path = this.getCurrentCollectionPath() || [collectionName];
    const colRef = collection(db, ...path);
    const snapshot = await getDocs(colRef);
    
    if (snapshot.empty) {
      this.showSuccess(`Coleção "${collectionName}" já está vazia`);
      return;
    }
    
    // Delete documents in batches
    const batch = writeBatch(db);
    let deleteCount = 0;
    
    snapshot.forEach((docSnapshot) => {
      batch.delete(docSnapshot.ref);
      deleteCount++;
    });
    
    await batch.commit();
    this.showSuccess(`Coleção "${collectionName}" excluída (${deleteCount} documentos)`);
  }

  async deleteDocument(documentId) {
    const db = this.firebaseManager.getFirestore();
    const { doc, deleteDoc } = await this.firebaseManager.importFirestoreModules(['doc', 'deleteDoc']);
    
    const docPath = [...this.currentPath.slice(1), documentId]; // Remove 'database' prefix
    const docRef = doc(db, ...docPath);
    
    await deleteDoc(docRef);
    this.showSuccess(`Documento "${documentId}" excluído com sucesso`);
  }

  handleSearch(query) {
    console.log('[Firebase Drive] Search:', query);
    // Search functionality placeholder
  }

  handleKeyboard(e) {
    // Keyboard shortcuts placeholder
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'r':
          e.preventDefault();
          this.refresh();
          break;
        case 'n':
          e.preventDefault();
          this.showCreateModal();
          break;
      }
    }
    
    if (e.key === 'Escape') {
      // Close any open modals
      document.querySelectorAll('.modal.show').forEach(modal => {
        this.hideModal(modal.id);
      });
    }
  }
}

// Initialize when page loads
console.log('[Firebase Drive] Aguardando carregamento da página...');

async function initializeDrive() {
  console.log('[Firebase Drive] DOM carregado, inicializando Drive...');
  
  try {
    // Firebase Manager already loaded and initialized
    if (!window.firebaseManager) {
      throw new Error('Firebase Manager não está disponível');
    }
    
    window.firebaseDrive = new FirebaseDrive();
    await window.firebaseDrive.initialize();
    
    console.log('[Firebase Drive] Sistema inicializado com sucesso!');
  } catch (error) {
    console.error('[Firebase Drive] Erro na inicialização:', error);
    alert('Erro ao inicializar Firebase Drive: ' + error.message);
  }
}

// Check if DOM is already loaded or wait for it
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDrive);
} else {
  // DOM is already loaded
  console.log('[Firebase Drive] DOM já carregado, inicializando imediatamente...');
  initializeDrive();
}

export default FirebaseDrive;
