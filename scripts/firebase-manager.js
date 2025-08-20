/**
 * FirebaseManager - Sistema Centralizado de Autenticação e Configuração Firebase
 * Banco da Neon - Versão 1.0
 * 
 * Este módulo centraliza toda a configuração do Firebase/Firestore para reutilização
 * em todas as páginas que precisam acessar o banco de dados.
 * 
 * ========================================================================
 * IMPORTANTE: CONVENÇÕES DE ESTRUTURA DE DADOS
 * ========================================================================
 * 
 * INVENTÁRIO:
 * • Caminho: inventario/{userId}/inventarioAluno/{itemName}
 * • Document ID do usuário = userId (ex: "marcelrpg")
 * • Document ID do item = nome do item (ex: "Comum Card 07")
 * • Campo interno 'id' ≠ Document ID (usado para lógica interna)
 * 
 * ALUNOS:
 * • Caminho: alunos/{userId}
 * • Document ID = userId (ex: "marcelrpg")
 * • Campo 'user' deve ser igual ao Document ID (consistência)
 * • Busca: doc(db, 'alunos', userId) - DIRETA, sem query
 * • Campos: firstName, saldo, fotoUrl, user
 * 
 * EXTRATO (Subcoleção):
 * • Caminho: alunos/{userId}/extrato/{extratoId}
 * • Usa userId diretamente como docId
 * • Ordenação: orderBy('dateTime', 'desc')
 * • Campos: description, amount, isEarn, saldoInicial, saldoFinal, dateTime
 * 
 * OCORRÊNCIAS (Subcoleção):
 * • Caminho: ocorrencias/{userId}/ocorrenciaAluno/{ocorrenciaId}
 * • userId = mesmo userId usado como docId em alunos
 * • Campos: datahoraOcorrencia, falta, descricaoOcorrencia
 * 
 * LOJA (Estrutura fixa):
 * • Caminho: loja/config/produtos/{produtoId}
 * • Filtros: where('status', '==', 'active')
 * • Campos: name, imageUrl, status, categoria, preço
 * 
 * FIREBASE STORAGE:
 * • Bucket: gs://crmdaneon.firebasestorage.app
 * • Fotos alunos: imagemAlunos/{userId}
 * • URLs no Firestore: formato gs://... (convertidas para URLs públicas)
 * • Conversão: getDownloadURL(ref(storage, path))
 * 
 * EXEMPLOS:
 * • Usuário "marcelrpg" tem documento: inventario/marcelrpg/
 * • Item "Comum Card 07": inventario/marcelrpg/inventarioAluno/Comum Card 07
 * • Aluno "marcelrpg": alunos/marcelrpg (docId = userId)
 * • Extrato: alunos/marcelrpg/extrato/{extratoId}
 * • Ocorrência: ocorrencias/marcelrpg/ocorrenciaAluno/{ocorrenciaId}
 * • Produto: loja/config/produtos/{produtoId}
 * • Foto: gs://crmdaneon.firebasestorage.app/imagemAlunos/marcelrpg
 * • Para deletar inventário: usar NOME do item como Document ID, não o campo 'id' interno
 * 
 * MÉTODOS ÚTEIS:
 * • loadUserInventory() - Carrega inventário com estrutura correta
 * • deleteInventoryItem() - Deleta usando nome correto do documento
 * • getInventoryStructureInfo() - Retorna informações da estrutura
 * • loadStudentData() - Carrega dados do aluno da coleção 'alunos'
 * • loadStudentExtract() - Carrega extrato do aluno
 * • loadStudentOccurrences() - Carrega ocorrências do aluno
 * • loadStoreProducts() - Carrega produtos da loja
 * • convertStorageUrl() - Converte URLs gs:// para URLs públicas
 * • uploadStudentPhoto() - Upload de foto do aluno
 * • logStructureInfo() - Mostra informações no console
 * • debugUserInventory() - Lista todos os documentos de um usuário
 * ========================================================================
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

  /**
   * Aguarda a inicialização do Firebase Manager
   * Método de conveniência para aguardar inicialização
   */
  async waitForInitialization() {
    await this.initialize();
    return this;
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
   * Testa se o usuário tem permissão para acessar o Storage
   */
  async testStoragePermissions() {
    try {
      const { ref, listAll } = await this.importStorageModules(['ref', 'listAll']);
      
      // Tenta acessar uma pasta conhecida
      const testRef = ref(this.storage, 'imagemAlunos');
      await listAll(testRef);
      console.log('[FirebaseManager] Permissões do Storage OK');
      return true;
    } catch (error) {
      console.warn('[FirebaseManager] Sem permissão no Storage:', error);
      return false;
    }
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
   * Retorna serverTimestamp para uso em documentos
   */
  async serverTimestamp() {
    const { serverTimestamp } = await this.importFirestoreModules(['serverTimestamp']);
    return serverTimestamp();
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
   * ========================================================================
   * ESTRUTURA DE DADOS E CONVENÇÕES DO FIRESTORE
   * ========================================================================
   * 
   * IMPORTANTE: Entender a estrutura de documentos para operações corretas
   */

  /**
   * Retorna informações sobre a estrutura de dados do inventário
   * 
   * ESTRUTURA FIRESTORE:
   * inventario/{userId}/inventarioAluno/{itemName}
   * 
   * CONVENÇÕES:
   * - Document ID do aluno = userId (ex: "marcelrpg")
   * - Document ID do item = nome do item (ex: "Comum Card 07")
   * - Campo interno 'id' ≠ Document ID (usado para lógica interna)
   */
  getInventoryStructureInfo() {
    return {
      collection: 'inventario',
      userDocumentId: 'userId', // Document ID = userId do aluno
      itemsSubcollection: 'inventarioAluno',
      itemDocumentId: 'itemName', // Document ID = nome do item
      
      // Convenções importantes
      conventions: {
        userDocumentNaming: 'O Document ID do usuário é o próprio userId (ex: "marcelrpg")',
        itemDocumentNaming: 'O Document ID do item é o nome do item (ex: "Comum Card 07")',
        internalIdVsDocumentId: 'Campo interno "id" é diferente do Document ID do Firestore',
        pathExample: 'inventario/marcelrpg/inventarioAluno/Comum Card 07'
      },
      
      // Campos típicos de um item
      itemFields: {
        id: 'ID interno para lógica da aplicação',
        nome: 'Nome do item (igual ao Document ID)',
        categoria: 'Categoria do item',
        subcategoria: 'Subcategoria do item',
        quantidade: 'Quantidade em posse',
        preco: 'Preço do item',
        descricao: 'Descrição do item',
        imagem: 'URL da imagem'
      }
    };
  }

  /**
   * Constrói o caminho correto para um documento de inventário
   * @param {string} userId - ID do usuário/aluno
   * @param {string} itemName - Nome do item (será usado como Document ID)
   * @returns {string} Caminho completo do documento
   */
  buildInventoryItemPath(userId, itemName) {
    if (!userId || !itemName) {
      throw new Error('userId e itemName são obrigatórios para construir o caminho');
    }
    return `inventario/${userId}/inventarioAluno/${itemName}`;
  }

  /**
   * Constrói referência para coleção de inventário de um usuário
   * @param {string} userId - ID do usuário/aluno
   * @returns {string} Caminho da coleção
   */
  buildInventoryCollectionPath(userId) {
    if (!userId) {
      throw new Error('userId é obrigatório para construir o caminho da coleção');
    }
    return `inventario/${userId}/inventarioAluno`;
  }

  /**
   * Extrai informações de um documento de inventário
   * @param {DocumentSnapshot} doc - Snapshot do documento Firestore
   * @returns {object} Objeto com informações estruturadas
   */
  parseInventoryDocument(doc) {
    if (!doc || !doc.exists()) {
      return null;
    }

    const data = doc.data();
    const pathParts = doc.ref.path.split('/');
    
    return {
      // IDs importantes
      documentId: doc.id,           // Nome do item (Document ID)
      internalId: data.id,          // ID interno da aplicação
      userId: pathParts[1],         // Extraído do caminho
      
      // Dados do item
      ...data,
      
      // Metadados úteis
      firestorePath: doc.ref.path,
      isValidStructure: pathParts.length === 4 && pathParts[0] === 'inventario' && pathParts[2] === 'inventarioAluno'
    };
  }

  /**
   * Valida se um item tem a estrutura correta para ser salvo
   * @param {object} itemData - Dados do item
   * @returns {object} Resultado da validação
   */
  validateInventoryItem(itemData) {
    const required = ['nome', 'categoria', 'quantidade'];
    const missing = required.filter(field => !itemData[field]);
    
    return {
      isValid: missing.length === 0,
      missingFields: missing,
      warnings: [],
      suggestions: missing.length > 0 ? [`Campos obrigatórios faltando: ${missing.join(', ')}`] : []
    };
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
      'limit',
      'serverTimestamp',
      'updateDoc',
      'deleteField',
      'writeBatch',
      'listCollections'
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
   * Helper para importar funções específicas do Storage
   */
  async importStorageModules(modules = []) {
    const defaultModules = [
      'ref',
      'uploadBytes',
      'getDownloadURL',
      'deleteObject',
      'listAll',
      'getMetadata',
      'updateMetadata'
    ];

    const modulesToImport = modules.length > 0 ? modules : defaultModules;
    
    return await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js")
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

  /**
   * ========================================================================
   * MÉTODOS ESPECÍFICOS PARA OPERAÇÕES DE INVENTÁRIO
   * ========================================================================
   */

  /**
   * Carrega inventário de um usuário com estrutura correta
   * @param {string} userId - ID do usuário (opcional, usa current user se não informado)
   * @returns {Array} Array de itens com documentId e dados
   */
  async loadUserInventory(userId = null) {
    try {
      const user = userId || this.getCurrentUserId();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { collection, getDocs } = await this.importFirestoreModules(['collection', 'getDocs']);
      
      const inventarioRef = collection(this.db, 'inventario', user, 'inventarioAluno');
      const snapshot = await getDocs(inventarioRef);
      
      const items = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          documentId: doc.id,        // Nome do item (Document ID no Firestore)
          ...data,                   // Todos os campos do documento
          firestorePath: doc.ref.path // Caminho completo para debug
        });
      });

      this.log(`Inventário carregado: ${items.length} itens para usuário ${user}`);
      return items;

    } catch (error) {
      this.error('Erro ao carregar inventário:', error);
      throw error;
    }
  }

  /**
   * Deleta um item do inventário usando o nome correto do documento
   * @param {string} itemName - Nome do item (Document ID no Firestore)
   * @param {string} userId - ID do usuário (opcional)
   * @returns {boolean} True se deletado com sucesso
   */
  async deleteInventoryItem(itemName, userId = null) {
    try {
      const user = userId || this.getCurrentUserId();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { doc, deleteDoc, getDoc } = await this.importFirestoreModules(['doc', 'deleteDoc', 'getDoc']);
      
      // Construir referência usando nome do item como Document ID
      const itemRef = doc(this.db, 'inventario', user, 'inventarioAluno', itemName);
      
      // Verificar se existe antes de tentar deletar
      const itemDoc = await getDoc(itemRef);
      if (!itemDoc.exists()) {
        throw new Error(`Item "${itemName}" não encontrado no inventário de ${user}`);
      }

      // Deletar documento
      await deleteDoc(itemRef);
      
      this.log(`Item "${itemName}" deletado com sucesso do inventário de ${user}`);
      return true;

    } catch (error) {
      this.error(`Erro ao deletar item "${itemName}":`, error);
      throw error;
    }
  }

  /**
   * Deleta múltiplos itens do inventário
   * @param {Array<string>} itemNames - Array com nomes dos itens (Document IDs)
   * @param {string} userId - ID do usuário (opcional)
   * @returns {object} Resultado com sucessos e falhas
   */
  async deleteMultipleInventoryItems(itemNames, userId = null) {
    const results = {
      deleted: [],
      failed: [],
      total: itemNames.length
    };

    for (const itemName of itemNames) {
      try {
        await this.deleteInventoryItem(itemName, userId);
        results.deleted.push(itemName);
      } catch (error) {
        results.failed.push({ itemName, error: error.message });
      }
    }

    this.log(`Exclusão múltipla: ${results.deleted.length}/${results.total} itens deletados`);
    return results;
  }

  /**
   * Adiciona ou atualiza um item no inventário
   * @param {string} itemName - Nome do item (será usado como Document ID)
   * @param {object} itemData - Dados do item
   * @param {string} userId - ID do usuário (opcional)
   * @returns {boolean} True se salvo com sucesso
   */
  async saveInventoryItem(itemName, itemData, userId = null) {
    try {
      const user = userId || this.getCurrentUserId();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Validar dados
      const validation = this.validateInventoryItem(itemData);
      if (!validation.isValid) {
        throw new Error(`Dados inválidos: ${validation.missingFields.join(', ')}`);
      }

      const { doc, setDoc } = await this.importFirestoreModules(['doc', 'setDoc']);
      
      // Garantir que o nome no documento seja igual ao Document ID
      const finalData = {
        ...itemData,
        nome: itemName, // Garantir consistência
        lastUpdated: new Date().toISOString()
      };

      const itemRef = doc(this.db, 'inventario', user, 'inventarioAluno', itemName);
      await setDoc(itemRef, finalData);
      
      this.log(`Item "${itemName}" salvo no inventário de ${user}`);
      return true;

    } catch (error) {
      this.error(`Erro ao salvar item "${itemName}":`, error);
      throw error;
    }
  }

  /**
   * Busca um item específico no inventário
   * @param {string} itemName - Nome do item (Document ID)
   * @param {string} userId - ID do usuário (opcional)
   * @returns {object|null} Dados do item ou null se não encontrado
   */
  async getInventoryItem(itemName, userId = null) {
    try {
      const user = userId || this.getCurrentUserId();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { doc, getDoc } = await this.importFirestoreModules(['doc', 'getDoc']);
      
      const itemRef = doc(this.db, 'inventario', user, 'inventarioAluno', itemName);
      const itemDoc = await getDoc(itemRef);
      
      if (!itemDoc.exists()) {
        return null;
      }

      return this.parseInventoryDocument(itemDoc);

    } catch (error) {
      this.error(`Erro ao buscar item "${itemName}":`, error);
      throw error;
    }
  }

  /**
   * ========================================================================
   * MÉTODOS PARA COLEÇÃO ALUNOS
   * ========================================================================
   * 
   * IMPORTANTE: Na coleção 'alunos':
   * - Document ID é auto-gerado pelo Firestore (NÃO é o userId)
   * - Campo 'user' contém o userId real (ex: "marcelrpg")
   * - Busca sempre por: where('user', '==', userId)
   * - Depois usa o docId para acessar subcoleções
   */

  /**
   * Carrega dados do aluno da coleção 'alunos' usando Document ID direto
   * @param {string} userId - ID do usuário (usado como Document ID)
   * @returns {object|null} Dados do aluno com docId incluído
   */
  async loadStudentData(userId = null) {
    try {
      const user = userId || this.getCurrentUserId();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { doc, getDoc } = await this.importFirestoreModules(['doc', 'getDoc']);
      
      // Usar userId diretamente como Document ID
      const docRef = doc(this.db, 'alunos', user);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        this.log(`Aluno não encontrado para userId: ${user}`);
        return null;
      }

      const data = docSnap.data();
      
      const studentData = {
        docId: docSnap.id,       // Document ID = userId
        userId: user,            // userId = Document ID
        ...data,                 // Todos os outros campos
        firestorePath: docSnap.ref.path
      };

      this.log(`Dados do aluno carregados:`, {
        docId: studentData.docId,
        userId: studentData.userId,
        firstName: studentData.firstName,
        saldo: studentData.saldo,
        hasFotoUrl: !!studentData.fotoUrl
      });

      return studentData;

    } catch (error) {
      this.error('Erro ao carregar dados do aluno:', error);
      throw error;
    }
  }

  /**
   * Cria um novo aluno usando userId como Document ID
   * @param {object} studentData - Dados do aluno
   * @returns {Promise<boolean>} True se criado com sucesso
   */
  async createStudentWithUserId(studentData) {
    try {
      const { user, firstName, lastName, idAluno, password, periodo, ativo, classe, saldo } = studentData;
      
      if (!user) {
        throw new Error('Campo "user" é obrigatório');
      }

      // Verificar se já existe
      const existing = await this.loadStudentData(user);
      if (existing) {
        throw new Error(`Já existe um aluno com userId "${user}"`);
      }

      const { doc, setDoc, serverTimestamp, collection, addDoc } = await this.importFirestoreModules([
        'doc', 'setDoc', 'serverTimestamp', 'collection', 'addDoc'
      ]);

      // Criar payload com timestamp
      const payload = {
        firstName,
        lastName,
        idAluno,
        user,
        password,
        periodo,
        ativo: Boolean(ativo),
        classe: classe || "aluno",
        saldo: Number(saldo) || 1000,
        quandoRegistrou: serverTimestamp()
      };

      // Criar documento com userId como Document ID
      const alunoRef = doc(this.db, "alunos", user);
      await setDoc(alunoRef, payload);

      this.log(`Aluno criado: ${user}`, payload);

      // Criar registro de abertura de conta no extrato
      const extratoPath = collection(this.db, 'alunos', user, 'extrato');
      await addDoc(extratoPath, {
        amount: 0,
        dateTime: serverTimestamp(),
        description: 'Abertura de conta',
        isEarn: true,
        saldoInicial: payload.saldo,
        saldoFinal: payload.saldo
      });

      this.log(`Extrato de abertura criado para: ${user}`);
      return true;

    } catch (error) {
      this.error('Erro ao criar aluno:', error);
      throw error;
    }
  }

  /**
   * Atualiza dados do aluno
   * @param {object} updateData - Dados para atualizar
   * @param {string} userId - ID do usuário (opcional)
   * @returns {boolean} True se atualizado com sucesso
   */
  async updateStudentData(updateData, userId = null) {
    try {
      const studentData = await this.loadStudentData(userId);
      if (!studentData) {
        throw new Error('Aluno não encontrado para atualização');
      }

      const { doc, updateDoc } = await this.importFirestoreModules(['doc', 'updateDoc']);
      
      const studentRef = doc(this.db, 'alunos', studentData.docId);
      await updateDoc(studentRef, updateData);
      
      this.log(`Dados do aluno atualizados:`, updateData);
      return true;

    } catch (error) {
      this.error('Erro ao atualizar dados do aluno:', error);
      throw error;
    }
  }

  /**
   * ========================================================================
   * MÉTODOS PARA SUBCOLEÇÃO EXTRATO
   * ========================================================================
   * 
   * ESTRUTURA: alunos/{userId}/extrato/{extratoId}
   * - Usa userId diretamente como Document ID do aluno
   * - Depois acessa a subcoleção 'extrato'
   * - Ordenação padrão: orderBy('dateTime', 'desc')
   */

  /**
   * Carrega extrato do aluno
   * @param {string} userId - ID do usuário (opcional)
   * @param {number} limitItems - Limite de itens (padrão: 100)
   * @returns {Array} Array de transações do extrato
   */
  async loadStudentExtract(userId = null, limitItems = 100) {
    try {
      const studentData = await this.loadStudentData(userId);
      if (!studentData) {
        throw new Error('Aluno não encontrado para carregar extrato');
      }

      const { collection, query, orderBy, limit, getDocs } = await this.importFirestoreModules(['collection', 'query', 'orderBy', 'limit', 'getDocs']);
      
      // Acessar subcoleção usando userId diretamente
      const extratoCol = collection(this.db, 'alunos', studentData.userId, 'extrato');
      const q = query(extratoCol, orderBy('dateTime', 'desc'), limit(limitItems));
      const snap = await getDocs(q);
      
      const items = [];
      snap.forEach(doc => {
        const data = doc.data();
        items.push({
          id: doc.id,
          description: data?.description ?? '(sem descrição)',
          amount: Number(data?.amount ?? 0),
          isEarn: Boolean(data?.isEarn ?? false),
          saldoInicial: Number(data?.saldoInicial ?? 0),
          saldoFinal: Number(data?.saldoFinal ?? 0),
          dateTime: data?.dateTime?.toDate ? data.dateTime.toDate() : null,
          firestorePath: doc.ref.path
        });
      });

      this.log(`Extrato carregado: ${items.length} transações para ${studentData.userId}`);
      return items;

    } catch (error) {
      this.error('Erro ao carregar extrato:', error);
      throw error;
    }
  }

  /**
   * ========================================================================
   * MÉTODOS PARA SUBCOLEÇÃO OCORRÊNCIAS
   * ========================================================================
   * 
   * ESTRUTURA: ocorrencias/{userId}/ocorrenciaAluno/{ocorrenciaId}
   * - userId usado diretamente como Document ID
   * - Acesso direto sem busca prévia
   */

  /**
   * Carrega ocorrências do aluno
   * @param {string} userId - ID do usuário (opcional)
   * @returns {Array} Array de ocorrências
   */
  async loadStudentOccurrences(userId = null) {
    try {
      const studentData = await this.loadStudentData(userId);
      if (!studentData) {
        throw new Error('Aluno não encontrado para carregar ocorrências');
      }

      const { collection, getDocs } = await this.importFirestoreModules(['collection', 'getDocs']);
      
      // Usar userId diretamente como Document ID
      const ocorrenciasCol = collection(this.db, 'ocorrencias', studentData.userId, 'ocorrenciaAluno');
      const snap = await getDocs(ocorrenciasCol);
      
      const occurrences = [];
      snap.forEach(doc => {
        const data = doc.data();
        occurrences.push({
          id: doc.id,
          data: data.datahoraOcorrencia?.toDate ? data.datahoraOcorrencia.toDate() : new Date(),
          tipo: data.falta,
          descricao: data.descricaoOcorrencia,
          firestorePath: doc.ref.path
        });
      });

      // Ordenar por data (mais nova primeiro)
      occurrences.sort((a, b) => b.data - a.data);

      this.log(`Ocorrências carregadas: ${occurrences.length} para ${studentData.userId}`);
      return occurrences;

    } catch (error) {
      this.error('Erro ao carregar ocorrências:', error);
      throw error;
    }
  }

  /**
   * ========================================================================
   * MÉTODOS PARA LOJA
   * ========================================================================
   * 
   * ESTRUTURA: loja/config/produtos/{produtoId}
   * - Estrutura fixa: sempre loja/config/produtos
   * - Filtro padrão: where('status', '==', 'active')
   */

  /**
   * Carrega produtos da loja
   * @param {boolean} onlyActive - Se deve carregar apenas produtos ativos
   * @returns {Array} Array de produtos
   */
  async loadStoreProducts(onlyActive = true) {
    try {
      const { collection, query, where, getDocs } = await this.importFirestoreModules(['collection', 'query', 'where', 'getDocs']);
      
      const produtosCol = collection(this.db, 'loja', 'config', 'produtos');
      
      let q;
      if (onlyActive) {
        q = query(produtosCol, where('status', '==', 'active'));
      } else {
        q = produtosCol; // Todos os produtos
      }
      
      const snap = await getDocs(q);
      
      const products = [];
      snap.forEach(doc => {
        const data = doc.data();
        products.push({
          id: doc.id,
          name: data.name,
          imageUrl: data.imageUrl,
          status: data.status,
          categoria: data.categoria,
          preco: data.preco,
          ...data, // Outros campos que possam existir
          firestorePath: doc.ref.path
        });
      });

      this.log(`Produtos carregados: ${products.length} produtos${onlyActive ? ' ativos' : ''}`);
      return products;

    } catch (error) {
      this.error('Erro ao carregar produtos da loja:', error);
      throw error;
    }
  }

  /**
   * ========================================================================
   * MÉTODOS PARA FIREBASE STORAGE
   * ========================================================================
   * 
   * CONVENÇÕES:
   * - Bucket: gs://crmdaneon.firebasestorage.app
   * - Fotos de alunos: imagemAlunos/{docId}
   * - URLs no Firestore: formato gs://... (devem ser convertidas)
   */

  /**
   * Converte URL do Storage (gs://) para URL pública
   * @param {string} storageUrl - URL no formato gs://
   * @returns {string} URL pública para exibição
   */
  async convertStorageUrl(storageUrl) {
    try {
      if (!storageUrl || !storageUrl.startsWith('gs://')) {
        return storageUrl; // Retorna como está se não for URL do Storage
      }

      const { ref, getDownloadURL } = await this.importStorageModules(['ref', 'getDownloadURL']);
      
      // Extrair caminho relativo
      const path = storageUrl.replace('gs://crmdaneon.firebasestorage.app/', '');
      
      const storageRef = ref(this.storage, path);
      const publicUrl = await getDownloadURL(storageRef);
      
      this.log(`URL convertida: ${storageUrl} -> ${publicUrl}`);
      return publicUrl;

    } catch (error) {
      this.error('Erro ao converter URL do Storage:', error);
      return 'semfoto.png'; // Fallback
    }
  }

  /**
   * Upload de foto do aluno
   * @param {File} file - Arquivo de imagem
   * @param {string} userId - ID do usuário (opcional)
   * @returns {string} URL pública da foto
   */
  async uploadStudentPhoto(file, userId = null) {
    try {
      const studentData = await this.loadStudentData(userId);
      if (!studentData) {
        throw new Error('Aluno não encontrado para upload de foto');
      }

      const { ref, uploadBytes, getDownloadURL } = await this.importStorageModules(['ref', 'uploadBytes', 'getDownloadURL']);
      
      // Caminho da foto: imagemAlunos/{docId}
      const photoRef = ref(this.storage, `imagemAlunos/${studentData.docId}`);
      
      // Upload do arquivo
      await uploadBytes(photoRef, file, { contentType: file.type });
      
      // Obter URL pública
      const photoUrl = await getDownloadURL(photoRef);
      
      // Atualizar fotoUrl no documento do aluno
      await this.updateStudentData({ fotoUrl: photoUrl }, userId);
      
      this.log(`Foto do aluno enviada:`, {
        docId: studentData.docId,
        photoUrl,
        fileSize: file.size,
        fileType: file.type
      });

      return photoUrl;

    } catch (error) {
      this.error('Erro ao fazer upload da foto:', error);
      throw error;
    }
  }

  /**
   * Método de debug para mostrar informações da estrutura
   */
  logStructureInfo() {
    const info = this.getInventoryStructureInfo();
    
    console.group('🏗️ [FirebaseManager] Estrutura Completa do Banco de Dados');
    
    console.group('📦 INVENTÁRIO');
    console.log('📁 Coleção:', info.collection);
    console.log('👤 Document ID do usuário:', info.conventions.userDocumentNaming);
    console.log('📦 Document ID do item:', info.conventions.itemDocumentNaming);
    console.log('⚠️  Diferença importante:', info.conventions.internalIdVsDocumentId);
    console.log('🛤️  Exemplo:', info.conventions.pathExample);
    console.groupEnd();
    
    console.group('👨‍🎓 ALUNOS');
    console.log('📁 Coleção: alunos');
    console.log('🔑 Document ID: AUTO-GERADO (NÃO é o userId)');
    console.log('👤 Campo user: contém o userId real');
    console.log('🔍 Busca: where("user", "==", userId)');
    console.log('📋 Campos: firstName, saldo, fotoUrl, user');
    console.log('🛤️  Exemplo: alunos/{docId} onde user="marcelrpg"');
    console.groupEnd();
    
    console.group('💰 EXTRATO (Subcoleção)');
    console.log('📁 Caminho: alunos/{userId}/extrato/{extratoId}');
    console.log('🔗 Relação: usa docId da coleção alunos');
    console.log('📊 Ordenação: orderBy("dateTime", "desc")');
    console.log('📋 Campos: description, amount, isEarn, saldoInicial, saldoFinal, dateTime');
    console.groupEnd();
    
    console.group('⚠️ OCORRÊNCIAS (Subcoleção)');
    console.log('📁 Caminho: ocorrencias/{userId}/ocorrenciaAluno/{ocorrenciaId}');
    console.log('🔗 Relação: mesmo docId da coleção alunos');
    console.log('📋 Campos: datahoraOcorrencia, falta, descricaoOcorrencia');
    console.groupEnd();
    
    console.group('🛒 LOJA');
    console.log('📁 Caminho: loja/config/produtos/{produtoId}');
    console.log('🔍 Filtro: where("status", "==", "active")');
    console.log('📋 Campos: name, imageUrl, status, categoria, preco');
    console.groupEnd();
    
    console.group('📸 FIREBASE STORAGE');
    console.log('🪣 Bucket: gs://crmdaneon.firebasestorage.app');
    console.log('👤 Fotos alunos: imagemAlunos/{docId}');
    console.log('🔗 URLs: formato gs://... (convertidas para URLs públicas)');
    console.log('🔄 Conversão: getDownloadURL(ref(storage, path))');
    console.groupEnd();
    
    console.groupEnd();
  }

  /**
   * Método de debug para listar todos os documentos de um usuário
   */
  async debugUserInventory(userId = null) {
    try {
      const user = userId || this.getCurrentUserId();
      const items = await this.loadUserInventory(user);
      
      console.group(`🔍 [FirebaseManager] Debug - Inventário de ${user}`);
      console.log(`Total de itens: ${items.length}`);
      
      items.forEach((item, index) => {
        console.log(`${index + 1}. Document ID: "${item.documentId}" | Nome: "${item.nome}" | ID interno: "${item.id}"`);
      });
      
      console.groupEnd();
      return items;
      
    } catch (error) {
      this.error('Erro no debug do inventário:', error);
      throw error;
    }
  }

  /**
   * Método de debug completo para um usuário
   */
  async debugUserCompleteData(userId = null) {
    try {
      const user = userId || this.getCurrentUserId();
      
      console.group(`🔍 [FirebaseManager] Debug Completo - Usuário ${user}`);
      
      // Dados do aluno
      console.group('👨‍🎓 DADOS DO ALUNO');
      const studentData = await this.loadStudentData(user);
      if (studentData) {
        console.log('✅ Aluno encontrado:', {
          docId: studentData.docId,
          firstName: studentData.firstName,
          saldo: studentData.saldo,
          hasFoto: !!studentData.fotoUrl
        });
      } else {
        console.log('❌ Aluno não encontrado');
      }
      console.groupEnd();
      
      // Inventário
      console.group('📦 INVENTÁRIO');
      const inventory = await this.loadUserInventory(user);
      console.log(`${inventory.length} itens no inventário`);
      console.groupEnd();
      
      // Extrato
      console.group('💰 EXTRATO');
      const extract = await this.loadStudentExtract(user, 5);
      console.log(`${extract.length} transações recentes`);
      extract.forEach((trans, i) => {
        console.log(`${i + 1}. ${trans.description}: ${trans.isEarn ? '+' : '-'}N$ ${trans.amount}`);
      });
      console.groupEnd();
      
      // Ocorrências
      console.group('⚠️ OCORRÊNCIAS');
      const occurrences = await this.loadStudentOccurrences(user);
      console.log(`${occurrences.length} ocorrências`);
      occurrences.slice(0, 3).forEach((occ, i) => {
        console.log(`${i + 1}. ${occ.tipo}: ${occ.descricao}`);
      });
      console.groupEnd();
      
      console.groupEnd();
      
      return {
        studentData,
        inventory,
        extract,
        occurrences
      };
      
    } catch (error) {
      this.error('Erro no debug completo:', error);
      throw error;
    }
  }
}

// Disponibilizar a classe globalmente
window.FirebaseManager = FirebaseManager;

// Criar instância global
window.firebaseManager = new FirebaseManager();

// Adicionar método de teste global
window.testFirebaseStructure = async function() {
  try {
    if (!window.firebaseManager.isInitialized) {
      await window.firebaseManager.initialize();
    }
    
    console.log('🧪 [Teste] Testando FirebaseManager completo...');
    
    // Mostrar informações da estrutura
    window.firebaseManager.logStructureInfo();
    
    // Debug completo do usuário atual
    await window.firebaseManager.debugUserCompleteData();
    
    console.log('✅ [Teste] Teste completo! Verifique os logs acima.');
    
  } catch (error) {
    console.error('❌ [Teste] Erro:', error);
  }
};

// Adicionar métodos de teste específicos
window.testStudentData = async function() {
  try {
    if (!window.firebaseManager.isInitialized) {
      await window.firebaseManager.initialize();
    }
    
    console.log('👨‍🎓 [Teste] Testando dados do aluno...');
    const studentData = await window.firebaseManager.loadStudentData();
    console.log('Dados do aluno:', studentData);
    
  } catch (error) {
    console.error('❌ [Teste] Erro:', error);
  }
};

window.testExtract = async function() {
  try {
    if (!window.firebaseManager.isInitialized) {
      await window.firebaseManager.initialize();
    }
    
    console.log('💰 [Teste] Testando extrato...');
    const extract = await window.firebaseManager.loadStudentExtract();
    console.log('Extrato:', extract);
    
  } catch (error) {
    console.error('❌ [Teste] Erro:', error);
  }
};

window.testOccurrences = async function() {
  try {
    if (!window.firebaseManager.isInitialized) {
      await window.firebaseManager.initialize();
    }
    
    console.log('⚠️ [Teste] Testando ocorrências...');
    const occurrences = await window.firebaseManager.loadStudentOccurrences();
    console.log('Ocorrências:', occurrences);
    
  } catch (error) {
    console.error('❌ [Teste] Erro:', error);
  }
};

window.testStoreProducts = async function() {
  try {
    if (!window.firebaseManager.isInitialized) {
      await window.firebaseManager.initialize();
    }
    
    console.log('🛒 [Teste] Testando produtos da loja...');
    const products = await window.firebaseManager.loadStoreProducts();
    console.log('Produtos:', products);
    
  } catch (error) {
    console.error('❌ [Teste] Erro:', error);
  }
};

// Log para debug
console.log('[FirebaseManager] Classe e instância criadas e disponíveis globalmente');
console.log('[FirebaseManager] - Classe: window.FirebaseManager');
console.log('[FirebaseManager] - Instância: window.firebaseManager');
console.log('[FirebaseManager] - Teste completo: window.testFirebaseStructure()');
console.log('[FirebaseManager] - Teste aluno: window.testStudentData()');
console.log('[FirebaseManager] - Teste extrato: window.testExtract()');
console.log('[FirebaseManager] - Teste ocorrências: window.testOccurrences()');
console.log('[FirebaseManager] - Teste loja: window.testStoreProducts()');

// Não usar export quando carregado via script tag
// export default window.firebaseManager;
