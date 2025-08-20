/**
 * FirebaseManager - Sistema Centralizado de Autenticação e Configuração Firebase
 * Banco da Neon - Versão 1.0
 * 
 * Este módulo centraliza toda a configuração do Firebase/Firestore para reutilização
 * em todas as páginas que precisam acessar o banco de dados.
 */

console.log('[FirebaseManager] Script carregado, definindo classe...');

class FirebaseManager {
  constructor() {
    console.log('[FirebaseManager] Constructor chamado');
    this.app = null;
    this.db = null;
    this.auth = null;
    this.storage = null;
    this.currentUser = null;
    this.isInitialized = false;
    this.initPromise = null;
    console.log('[FirebaseManager] Constructor concluído');
  }

  /**
   * Inicializa o Firebase e retorna uma Promise
   * Se já foi inicializado, retorna a Promise existente
   */
  async initialize() {
    if (this.isInitialized) {
      return this;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  async _doInitialize() {
    try {
      console.log('[FirebaseManager] Iniciando configuração do Firebase...');

      // Importar módulos do Firebase
      const { initializeApp } = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js");
      const { getAuth, signInAnonymously } = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js");
      const { getFirestore } = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js");
      const { getStorage } = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js");

      // Configuração do Firebase
      const firebaseConfig = {
        apiKey: "AIzaSyBHU6yFDCKp9jm9tPGyRqQJFS3amewuuQY",
        authDomain: "crmdaneon.firebaseapp.com",
        projectId: "crmdaneon",
        storageBucket: "crmdaneon.firebasestorage.app",
        messagingSenderId: "564595832938",
        appId: "1:564595832938:web:16fb660d8d433ae5f3f213",
        measurementId: "G-D3G4M9F17R"
      };

      // Inicializar Firebase App
      this.app = initializeApp(firebaseConfig);
      console.log('[FirebaseManager] Firebase App inicializado');

      // Configurar Auth
      this.auth = getAuth(this.app);
      try {
        await signInAnonymously(this.auth);
        console.log('[FirebaseManager] Autenticação anônima realizada');
      } catch (authError) {
        console.warn('[FirebaseManager] Falha na autenticação anônima:', authError);
      }

      // Configurar Firestore
      try {
        this.db = getFirestore(this.app, "bancodaneondb");
        console.log('[FirebaseManager] Firestore conectado (bancodaneondb)');
      } catch (dbError) {
        console.warn('[FirebaseManager] Erro ao conectar bancodaneondb, usando default:', dbError);
        this.db = getFirestore(this.app);
        console.log('[FirebaseManager] Firestore conectado (default)');
      }

      // Configurar Storage
      try {
        this.storage = getStorage(this.app, "gs://crmdaneon.firebasestorage.app");
        console.log('[FirebaseManager] Storage configurado');
      } catch (storageError) {
        console.warn('[FirebaseManager] Erro ao configurar storage:', storageError);
        this.storage = getStorage(this.app);
      }

      // Verificar e carregar sessão do usuário
      await this.loadUserSession();

      this.isInitialized = true;
      console.log('[FirebaseManager] Inicialização completa');

      return this;
    } catch (error) {
      console.error('[FirebaseManager] Erro na inicialização:', error);
      throw error;
    }
  }

  /**
   * Carrega a sessão do usuário do localStorage
   */
  async loadUserSession() {
    try {
      const sessRaw = localStorage.getItem("bn.currentUser");
      if (!sessRaw) {
        console.warn('[FirebaseManager] Nenhuma sessão encontrada');
        this.currentUser = null;
        return false;
      }

      this.currentUser = JSON.parse(sessRaw);
      if (!this.currentUser || !this.currentUser.user) {
        console.warn('[FirebaseManager] Sessão inválida');
        this.currentUser = null;
        return false;
      }

      console.log('[FirebaseManager] Sessão carregada para usuário:', this.currentUser.user);
      return true;
    } catch (error) {
      console.error('[FirebaseManager] Erro ao carregar sessão:', error);
      this.currentUser = null;
      return false;
    }
  }

  /**
   * Verifica se o usuário está logado e redireciona se necessário
   */
  requireAuth(redirectUrl = '/dashboard/dashboard.html') {
    if (!this.currentUser) {
      console.warn('[FirebaseManager] Usuário não autenticado, redirecionando...');
      window.location.href = redirectUrl;
      return false;
    }
    return true;
  }

  /**
   * Retorna a instância do Firestore
   */
  getFirestore() {
    if (!this.isInitialized) {
      throw new Error('FirebaseManager não foi inicializado. Chame initialize() primeiro.');
    }
    return this.db;
  }

  /**
   * Retorna a instância do Storage
   */
  getStorage() {
    if (!this.isInitialized) {
      throw new Error('FirebaseManager não foi inicializado. Chame initialize() primeiro.');
    }
    return this.storage;
  }

  /**
   * Retorna a instância do Auth
   */
  getAuth() {
    if (!this.isInitialized) {
      throw new Error('FirebaseManager não foi inicializado. Chame initialize() primeiro.');
    }
    return this.auth;
  }

  /**
   * Retorna o usuário atual
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Retorna o ID do usuário atual
   */
  getCurrentUserId() {
    return this.currentUser ? this.currentUser.user : null;
  }

  /**
   * Retorna informações do projeto Firebase
   */
  getProjectInfo() {
    return {
      projectId: 'crmdaneon',
      databaseName: 'bancodaneondb',
      authDomain: 'crmdaneon.firebaseapp.com',
      storageBucket: 'crmdaneon.firebasestorage.app'
    };
  }

  /**
   * Retorna lista das principais coleções
   */
  getMainCollections() {
    return [
      'inventario',
      'loja',
      'alunos',
      'ocorrencias',
      'pix',
      'users'
    ];
  }

  /**
   * Helper para importar funções específicas do Firestore
   */
  async importFirestoreModules(modules = []) {
    const defaultModules = [
      'collection',
      'doc',
      'getDocs',
      'getDoc',
      'addDoc',
      'updateDoc',
      'deleteDoc',
      'query',
      'where',
      'orderBy',
      'limit'
    ];

    const modulesToImport = modules.length > 0 ? modules : defaultModules;
    const importString = modulesToImport.join(', ');
    
    return await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js")
      .then(module => {
        const result = {};
        modulesToImport.forEach(moduleName => {
          if (module[moduleName]) {
            result[moduleName] = module[moduleName];
          }
        });
        return result;
      });
  }

  /**
   * Helper para operações comuns do inventário
   */
  async getInventarioRef(userId = null) {
    const user = userId || this.getCurrentUserId();
    if (!user) {
      throw new Error('Usuário não identificado para acessar inventário');
    }

    const { collection } = await this.importFirestoreModules(['collection']);
    return collection(this.db, 'inventario', user, 'inventarioAluno');
  }

  /**
   * Helper para buscar itens do inventário
   */
  async getInventarioItems(userId = null) {
    const { getDocs } = await this.importFirestoreModules(['getDocs']);
    const inventarioRef = await this.getInventarioRef(userId);
    const snapshot = await getDocs(inventarioRef);
    
    const items = [];
    snapshot.forEach(doc => {
      items.push({
        id: doc.id,
        nome: doc.id,
        ...doc.data()
      });
    });

    return items;
  }

  /**
   * Helper para excluir item do inventário
   */
  async deleteInventarioItem(itemId, userId = null) {
    const user = userId || this.getCurrentUserId();
    if (!user) {
      throw new Error('Usuário não identificado para excluir item');
    }

    const { doc, deleteDoc } = await this.importFirestoreModules(['doc', 'deleteDoc']);
    const itemRef = doc(this.db, 'inventario', user, 'inventarioAluno', itemId);
    await deleteDoc(itemRef);
  }

  /**
   * Helper para log com prefixo
   */
  log(...args) {
    console.log('[FirebaseManager]', ...args);
  }

  /**
   * Helper para erro com prefixo
   */
  error(...args) {
    console.error('[FirebaseManager]', ...args);
  }
}

// Criar instância global
window.firebaseManager = new FirebaseManager();

// Log para debug
console.log('[FirebaseManager] Instância criada e disponível em window.firebaseManager');

// Não usar export quando carregado via script tag
// export default window.firebaseManager;
