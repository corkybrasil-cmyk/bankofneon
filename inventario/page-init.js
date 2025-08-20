/**
 * Coordenador de Inicialização da Página de Inventário
 * Gerencia a ordem de carregamento e inicialização dos sistemas
 */

console.log('[PageInit] Iniciando coordenador de inicialização...');

class PageInitManager {
  constructor() {
    this.firebaseManager = null;
    this.inventarioManager = null;
    this.exclusaoSystem = null;
    this.isInitialized = false;
  }

  async init() {
    try {
      console.log('[PageInit] === INÍCIO DA INICIALIZAÇÃO ===');
      
      // 1. Aguardar DOM estar pronto
      await this.waitForDOM();
      
      // 2. Inicializar Firebase Manager primeiro
      await this.initFirebaseManager();
      
      // 3. Aguardar outros sistemas estarem carregados
      await this.waitForOtherSystems();
      
      // 4. Coordenar inicialização dos sistemas
      await this.initSystems();
      
      console.log('[PageInit] ✅ Inicialização completa!');
      this.isInitialized = true;
      
    } catch (error) {
      console.error('[PageInit] ❌ Erro na inicialização:', error);
    }
  }

  async waitForDOM() {
    if (document.readyState === 'loading') {
      console.log('[PageInit] Aguardando DOM estar pronto...');
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve);
      });
    }
    console.log('[PageInit] ✅ DOM pronto');
  }

  async initFirebaseManager() {
    console.log('[PageInit] Inicializando Firebase Manager...');
    
    // Aguardar FirebaseManager estar disponível
    await this.waitForGlobal('FirebaseManager');
    
    // Usar instância global ou criar nova
    if (!window.firebaseManager || !window.firebaseManager.isInitialized) {
      console.log('[PageInit] Criando nova instância do FirebaseManager...');
      window.firebaseManager = new window.FirebaseManager();
      await window.firebaseManager.initialize();
    } else {
      console.log('[PageInit] Usando instância global já inicializada');
    }
    
    this.firebaseManager = window.firebaseManager;
    console.log('[PageInit] ✅ Firebase Manager pronto');
  }

  async waitForOtherSystems() {
    console.log('[PageInit] Aguardando outros sistemas...');
    
    // Aguardar InventarioManager
    await this.waitForGlobal('InventarioManager');
    
    // Aguardar ExclusaoStandalone
    await this.waitForGlobal('ExclusaoStandalone');
    
    console.log('[PageInit] ✅ Todos os sistemas carregados');
  }

  async initSystems() {
    console.log('[PageInit] Inicializando sistemas dependentes...');
    
    // Os sistemas já devem ter se auto-inicializado
    // Apenas verificar se estão funcionando
    
    if (window.inventarioManager) {
      console.log('[PageInit] ✅ InventarioManager ativo');
    }
    
    if (window.exclusaoStandalone) {
      console.log('[PageInit] ✅ ExclusaoStandalone ativo');
    }
  }

  async waitForGlobal(variableName, timeout = 10000) {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const check = () => {
        if (window[variableName] || window[variableName.toLowerCase()]) {
          console.log(`[PageInit] ✅ ${variableName} disponível`);
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout aguardando ${variableName}`));
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }
}

// Criar instância global e inicializar
window.pageInitManager = new PageInitManager();
window.pageInitManager.init();

console.log('[PageInit] Coordenador criado e inicialização agendada');
