/**
 * Inicializador de Página - Sistema simplificado para garantir carregamento correto
 * Este arquivo deve ser carregado após o firebase-manager.js
 */

console.log('[PageInit] Iniciando sistema de inicialização...');

class PageInitializer {
  constructor() {
    this.firebaseReady = false;
    this.componentsReady = [];
    this.initCallbacks = [];
  }

  // Aguarda o Firebase estar pronto
  async waitForFirebase() {
    return new Promise((resolve, reject) => {
      if (window.firebaseManager && typeof window.firebaseManager.initialize === 'function') {
        console.log('[PageInit] FirebaseManager já disponível');
        resolve(window.firebaseManager);
        return;
      }

      console.log('[PageInit] Aguardando FirebaseManager...');
      let attempts = 0;
      const maxAttempts = 50; // 5 segundos

      const checkFirebase = () => {
        attempts++;
        if (window.firebaseManager && typeof window.firebaseManager.initialize === 'function') {
          console.log('[PageInit] FirebaseManager encontrado após', attempts * 100, 'ms');
          resolve(window.firebaseManager);
        } else if (attempts < maxAttempts) {
          setTimeout(checkFirebase, 100);
        } else {
          console.error('[PageInit] Timeout aguardando FirebaseManager');
          reject(new Error('Firebase Manager não carregou em tempo hábil'));
        }
      };

      checkFirebase();
    });
  }

  // Inicializa o Firebase
  async initializeFirebase() {
    try {
      console.log('[PageInit] Inicializando Firebase...');
      const fm = await this.waitForFirebase();
      const initializedFM = await fm.initialize();
      this.firebaseReady = true;
      console.log('[PageInit] Firebase pronto!');
      return initializedFM;
    } catch (error) {
      console.error('[PageInit] Erro ao inicializar Firebase:', error);
      throw error;
    }
  }

  // Registra callback para quando tudo estiver pronto
  onReady(callback) {
    this.initCallbacks.push(callback);
  }

  // Executa todos os callbacks registrados
  async executeCallbacks(fm) {
    for (const callback of this.initCallbacks) {
      try {
        await callback(fm);
      } catch (error) {
        console.error('[PageInit] Erro em callback:', error);
      }
    }
  }

  // Método principal de inicialização
  async start() {
    try {
      console.log('[PageInit] Iniciando processo de inicialização...');
      
      // Inicializar Firebase
      const fm = await this.initializeFirebase();
      
      // Executar callbacks registrados
      await this.executeCallbacks(fm);
      
      console.log('[PageInit] Inicialização completa!');
      
    } catch (error) {
      console.error('[PageInit] Erro na inicialização:', error);
      alert('Erro ao carregar página. Verifique o console e recarregue se necessário.');
    }
  }
}

// Criar instância global
window.pageInit = new PageInitializer();

// Auto-inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  console.log('[PageInit] DOM carregado, iniciando...');
  window.pageInit.start();
});

console.log('[PageInit] Sistema de inicialização configurado');
