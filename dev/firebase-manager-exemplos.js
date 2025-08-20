/**
 * Exemplo de Uso do FirebaseManager
 * Este arquivo mostra como usar o FirebaseManager centralizado em qualquer página
 */

// ==================================================================
// MÉTODO 1: Uso Básico em qualquer página HTML
// ==================================================================

/*
<!-- No HTML, adicione o script do FirebaseManager -->
<script src="../scripts/firebase-manager.js"></script>

<script>
  document.addEventListener('DOMContentLoaded', async function() {
    try {
      // Inicializar o Firebase
      const fm = await window.firebaseManager.initialize();
      
      // Verificar se usuário está logado (opcional - redireciona automaticamente se não estiver)
      fm.requireAuth();
      
      // Agora você pode usar as funcionalidades
      const items = await fm.getInventarioItems();
      console.log('Itens do inventário:', items);
      
    } catch (error) {
      console.error('Erro ao inicializar Firebase:', error);
    }
  });
</script>
*/

// ==================================================================
// MÉTODO 2: Uso como módulo ES6
// ==================================================================

/*
<script type="module">
  import firebaseManager from '../scripts/firebase-manager.js';
  
  async function initPage() {
    await firebaseManager.initialize();
    firebaseManager.requireAuth();
    
    // Suas operações aqui
    const items = await firebaseManager.getInventarioItems();
    console.log(items);
  }
  
  initPage();
</script>
*/

// ==================================================================
// MÉTODO 3: Dentro de uma classe (recomendado para código complexo)
// ==================================================================

class MinhaClasseComFirebase {
  constructor() {
    this.fm = null;
    this.init();
  }

  async init() {
    try {
      // Inicializar Firebase
      this.fm = await window.firebaseManager.initialize();
      
      // Verificar autenticação
      this.fm.requireAuth();
      
      // Continuar com a inicialização da sua classe
      await this.loadData();
      
    } catch (error) {
      console.error('Erro na inicialização:', error);
    }
  }

  async loadData() {
    try {
      // Buscar itens do inventário
      const items = await this.fm.getInventarioItems();
      
      // Buscar dados personalizados
      const customData = await this.getCustomData();
      
      this.processData(items, customData);
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }

  async getCustomData() {
    // Importar funções específicas do Firestore
    const { collection, getDocs, query, where } = await this.fm.importFirestoreModules([
      'collection', 'getDocs', 'query', 'where'
    ]);

    // Fazer query personalizada
    const db = this.fm.getFirestore();
    const userId = this.fm.getCurrentUserId();
    
    const ocorrenciasRef = collection(db, 'ocorrencias');
    const q = query(ocorrenciasRef, where('usuario', '==', userId));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async deleteItem(itemId) {
    try {
      await this.fm.deleteInventarioItem(itemId);
      console.log('Item excluído com sucesso');
      
      // Recarregar dados
      await this.loadData();
      
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      throw error;
    }
  }

  processData(items, customData) {
    // Processar e exibir dados
    console.log('Itens processados:', items);
    console.log('Dados customizados:', customData);
  }
}

// ==================================================================
// EXEMPLOS ESPECÍFICOS DE OPERAÇÕES
// ==================================================================

// Exemplo: Buscar produtos da loja
async function buscarProdutosLoja() {
  const fm = await window.firebaseManager.initialize();
  const { collection, getDocs } = await fm.importFirestoreModules(['collection', 'getDocs']);
  
  const db = fm.getFirestore();
  const produtosRef = collection(db, 'loja', 'config', 'produtos');
  const snapshot = await getDocs(produtosRef);
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Exemplo: Adicionar ocorrência
async function adicionarOcorrencia(tipo, valor, descricao) {
  const fm = await window.firebaseManager.initialize();
  const { collection, addDoc } = await fm.importFirestoreModules(['collection', 'addDoc']);
  
  const db = fm.getFirestore();
  const userId = fm.getCurrentUserId();
  
  const ocorrenciaData = {
    tipo: tipo,
    valor: valor,
    descricao: descricao,
    usuario: userId,
    data: new Date(),
    timestamp: Date.now()
  };
  
  const ocorrenciasRef = collection(db, 'ocorrencias');
  const docRef = await addDoc(ocorrenciasRef, ocorrenciaData);
  
  return docRef.id;
}

// Exemplo: Atualizar quantidade de item no inventário
async function atualizarQuantidadeItem(itemId, novaQuantidade) {
  const fm = await window.firebaseManager.initialize();
  const { doc, updateDoc } = await fm.importFirestoreModules(['doc', 'updateDoc']);
  
  const db = fm.getFirestore();
  const userId = fm.getCurrentUserId();
  
  const itemRef = doc(db, 'inventario', userId, 'inventarioAluno', itemId);
  await updateDoc(itemRef, {
    quantidade: novaQuantidade,
    ultimaAtualizacao: new Date()
  });
}

// ==================================================================
// TRATAMENTO DE ERROS PADRONIZADO
// ==================================================================

class ErrorHandler {
  static handle(error, context = '') {
    console.error(`[${context}] Erro:`, error);
    
    let userMessage = 'Ocorreu um erro inesperado.';
    
    if (error.code) {
      switch (error.code) {
        case 'permission-denied':
          userMessage = 'Acesso negado. Verifique suas permissões.';
          break;
        case 'unavailable':
          userMessage = 'Serviço temporariamente indisponível. Tente novamente.';
          break;
        case 'not-found':
          userMessage = 'Dados não encontrados.';
          break;
        case 'already-exists':
          userMessage = 'Este item já existe.';
          break;
        default:
          userMessage = `Erro: ${error.message}`;
      }
    }
    
    // Mostrar erro para o usuário (você pode personalizar isso)
    alert(userMessage);
    
    return userMessage;
  }
}

// ==================================================================
// INICIALIZAÇÃO RECOMENDADA PARA PÁGINAS
// ==================================================================

/*
// Adicione isso no final do seu HTML ou em um arquivo JS separado
document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Inicializar Firebase
    window.fm = await window.firebaseManager.initialize();
    
    // Verificar autenticação (opcional)
    window.fm.requireAuth();
    
    // Inicializar sua aplicação
    if (typeof initApp === 'function') {
      await initApp();
    }
    
    console.log('Página inicializada com sucesso');
    
  } catch (error) {
    ErrorHandler.handle(error, 'Inicialização da Página');
  }
});

// Sua função de inicialização personalizada
async function initApp() {
  // Coloque aqui o código específico da sua página
}
*/
