// botaoExcluir.js - Sistema de Exclusão de Itens do Inventário
// Versão 3.0 - Usando PageInitializer para carregamento seguro

console.log('[ExclusaoManager] Script carregado');

class ExclusaoInventarioManager {
  constructor(firebaseManager) {
    console.log('[ExclusaoManager] Constructor chamado');
    this.fm = firebaseManager; // FirebaseManager já inicializado
    this.inventarioItems = [];
    this.selectedItems = [];
    this.init();
  }

  async init() {
    try {
      console.log('[ExclusaoManager] Iniciando init...');
      
      // Firebase já está inicializado via PageInitializer
      console.log('[ExclusaoManager] Firebase já pronto, verificando autenticação...');
      this.fm.requireAuth();
      console.log('[ExclusaoManager] Autenticação OK');
      
      // Configurar eventos
      console.log('[ExclusaoManager] Configurando eventos...');
      this.setupEventListeners();
      console.log('[ExclusaoManager] Inicialização completa');
      
    } catch (error) {
      console.error('Erro na inicialização do ExclusaoInventarioManager:', error);
      console.error('Stack trace:', error.stack);
      alert('Erro ao inicializar sistema de exclusão. Verifique o console.');
    }
  }

  setupEventListeners() {
    const btnExcluir = document.getElementById('btn-excluir-item');
    if (btnExcluir) {
      btnExcluir.addEventListener('click', () => this.showFirstPopup());
    }
  }

  showFirstPopup() {
    // Obter informações do projeto usando o FirebaseManager
    const projectInfo = this.fm.getProjectInfo();
    const collections = this.fm.getMainCollections();

    // Criar o modal de informações do projeto
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
              <p><strong>Project ID:</strong> ${projectInfo.projectId}</p>
              <p><strong>Auth Domain:</strong> ${projectInfo.authDomain}</p>
            </div>
            
            <div class="info-section">
              <h3>Nome do Banco de Dados:</h3>
              <p><strong>Database:</strong> ${projectInfo.databaseName}</p>
            </div>
            
            <div class="info-section">
              <h3>Coleções no Banco de Dados:</h3>
              <ul class="collections-list">
                ${collections.map(col => `<li>${col}</li>`).join('')}
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

    // Adicionar ao body
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Configurar eventos do primeiro popup
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
    // Carregar itens do inventário usando o FirebaseManager
    await this.loadInventarioItems();

    const projectInfo = this.fm.getProjectInfo();
    const currentUser = this.fm.getCurrentUser();

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
              <p><strong>Banco:</strong> ${projectInfo.databaseName}</p>
              <p><strong>Coleção:</strong> inventario</p>
              <p><strong>Documento:</strong> ${currentUser.user}</p>
              <p><strong>Sub-coleção:</strong> inventarioAluno</p>
            </div>
            
            <div class="items-section">
              <h3>Itens no Inventário:</h3>
              <div id="items-container">
                ${this.renderItemsList()}
              </div>
              <button id="btn-add-item" class="btn-add">+ Adicionar mais itens</button>
            </div>
          </div>
          <div class="popup-footer">
            <button id="btn-excluir-selecionados" class="btn-danger" ${this.selectedItems.length === 0 ? 'disabled' : ''}>
              Excluir Selecionados (${this.selectedItems.length})
            </button>
            <button id="btn-fechar-exclusao" class="btn-secondary">Fechar</button>
          </div>
        </div>
      </div>
    `;

    // Adicionar ao body
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Configurar eventos do segundo popup
    this.setupSecondPopupEvents();
  }

  async loadInventarioItems() {
    try {
      console.log('Carregando itens do inventário usando FirebaseManager...');
      
      // Usar o método helper do FirebaseManager
      this.inventarioItems = await this.fm.getInventarioItems();
      
      console.log('Total de itens carregados:', this.inventarioItems.length);
      console.log('Itens:', this.inventarioItems);

    } catch (error) {
      console.error('Erro ao carregar itens do inventário:', error);
      this.inventarioItems = [];
      alert('Erro ao carregar itens do inventário. Verifique o console.');
    }
  }

  renderItemsList() {
    if (this.inventarioItems.length === 0) {
      return '<p class="no-items">Nenhum item encontrado no inventário.</p>';
    }

    return `
      <div class="items-list">
        ${this.inventarioItems.map((item, index) => `
          <div class="item-row" data-index="${index}">
            <select class="item-select" data-item-id="${item.id}">
              <option value="">Selecionar item...</option>
              ${this.inventarioItems.map(invItem => `
                <option value="${invItem.id}" ${invItem.id === item.id ? 'selected' : ''}>
                  ${invItem.nome} (Qtd: ${invItem.quantidade})
                </option>
              `).join('')}
            </select>
            <button class="btn-remove-row" data-index="${index}">&times;</button>
          </div>
        `).join('')}
      </div>
    `;
  }

  setupSecondPopupEvents() {
    // Fechar popup
    document.getElementById('close-popup-exclusao').addEventListener('click', () => {
      this.closePopup('popup-exclusao-items');
    });

    document.getElementById('btn-fechar-exclusao').addEventListener('click', () => {
      this.closePopup('popup-exclusao-items');
    });

    // Adicionar nova linha de seleção
    document.getElementById('btn-add-item').addEventListener('click', () => {
      this.addItemSelectionRow();
    });

    // Excluir itens selecionados
    document.getElementById('btn-excluir-selecionados').addEventListener('click', () => {
      this.confirmAndDeleteItems();
    });

    // Configurar eventos dos selects existentes
    this.updateSelectEvents();
  }

  addItemSelectionRow() {
    const container = document.querySelector('#items-container .items-list');
    if (!container) {
      // Se não existe lista, criar uma
      const itemsContainer = document.getElementById('items-container');
      itemsContainer.innerHTML = `
        <div class="items-list"></div>
      `;
    }

    const itemsList = document.querySelector('#items-container .items-list');
    const newIndex = itemsList.children.length;
    
    const newRowHtml = `
      <div class="item-row" data-index="${newIndex}">
        <select class="item-select" data-item-id="">
          <option value="">Selecionar item...</option>
          ${this.inventarioItems.map(item => `
            <option value="${item.id}">
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
    // Remover eventos anteriores e adicionar novos
    const selects = document.querySelectorAll('.item-select');
    const removeButtons = document.querySelectorAll('.btn-remove-row');

    selects.forEach(select => {
      select.removeEventListener('change', this.handleSelectChange);
      select.addEventListener('change', this.handleSelectChange.bind(this));
    });

    removeButtons.forEach(button => {
      button.removeEventListener('click', this.handleRemoveRow);
      button.addEventListener('click', this.handleRemoveRow.bind(this));
    });
  }

  handleSelectChange(event) {
    const select = event.target;
    const itemId = select.value;
    
    // Atualizar array de itens selecionados
    this.updateSelectedItems();
    
    // Atualizar botão de exclusão
    this.updateDeleteButton();
  }

  handleRemoveRow(event) {
    const button = event.target;
    const row = button.closest('.item-row');
    row.remove();
    
    this.updateSelectedItems();
    this.updateDeleteButton();
  }

  updateSelectedItems() {
    const selects = document.querySelectorAll('.item-select');
    this.selectedItems = [];
    
    selects.forEach(select => {
      if (select.value) {
        this.selectedItems.push(select.value);
      }
    });

    // Remover duplicatas
    this.selectedItems = [...new Set(this.selectedItems)];
  }

  updateDeleteButton() {
    const deleteButton = document.getElementById('btn-excluir-selecionados');
    if (deleteButton) {
      deleteButton.disabled = this.selectedItems.length === 0;
      deleteButton.textContent = `Excluir Selecionados (${this.selectedItems.length})`;
    }
  }

  async confirmAndDeleteItems() {
    if (this.selectedItems.length === 0) {
      alert('Nenhum item selecionado para exclusão.');
      return;
    }

    const itemNames = this.selectedItems.map(id => {
      const item = this.inventarioItems.find(item => item.id === id);
      return item ? item.nome : id;
    }).join(', ');

    const confirmMessage = `Tem certeza que deseja excluir os seguintes itens?\n\n${itemNames}\n\nEsta ação não pode ser desfeita.`;
    
    if (confirm(confirmMessage)) {
      await this.deleteSelectedItems();
    }
  }

  async deleteSelectedItems() {
    try {
      console.log('Iniciando exclusão de itens:', this.selectedItems);
      
      // Usar o método helper do FirebaseManager para excluir itens
      for (const itemId of this.selectedItems) {
        try {
          console.log(`Excluindo item: ${itemId}`);
          await this.fm.deleteInventarioItem(itemId);
          console.log(`Item ${itemId} excluído com sucesso`);
        } catch (itemError) {
          console.error(`Erro ao excluir item ${itemId}:`, itemError);
          throw new Error(`Erro ao excluir item ${itemId}: ${itemError.message}`);
        }
      }
      
      alert(`${this.selectedItems.length} item(ns) excluído(s) com sucesso!`);
      
      // Fechar popup e recarregar a página
      this.closePopup('popup-exclusao-items');
      
      // Recarregar a página para atualizar o inventário
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Erro ao excluir itens:', error);
      alert(`Erro ao excluir itens: ${error.message}\nVerifique o console para mais detalhes.`);
    }
  }

  closePopup(popupId) {
    const popup = document.getElementById(popupId);
    if (popup) {
      popup.remove();
    }
  }
}

// CSS para os popups
const popupStyles = `
<style>
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.popup-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.popup-content.large {
  max-width: 700px;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e8e8ef;
}

.popup-header h2 {
  margin: 0;
  color: #5a039a;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #5d5d6a;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #f0f0f0;
  border-radius: 50%;
}

.popup-body {
  padding: 20px;
}

.info-section {
  margin-bottom: 20px;
}

.info-section h3 {
  margin: 0 0 10px 0;
  color: #5a039a;
  font-size: 16px;
}

.info-section p {
  margin: 5px 0;
  color: #1a1a1a;
}

.collections-list {
  list-style: none;
  padding: 0;
  margin: 10px 0;
}

.collections-list li {
  padding: 8px 12px;
  background: #f7f7fb;
  border-radius: 6px;
  margin: 4px 0;
  color: #5a039a;
  font-weight: 500;
}

.popup-footer {
  padding: 20px;
  border-top: 1px solid #e8e8ef;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn-primary {
  background: #5a039a;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.btn-primary:hover {
  background: #4a0280;
}

.btn-secondary {
  background: #e8e8ef;
  color: #5d5d6a;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.btn-secondary:hover {
  background: #d0d0d7;
}

.btn-danger {
  background: #dc3545;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.btn-danger:hover {
  background: #c82333;
}

.btn-danger:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.items-section {
  margin-top: 20px;
}

.item-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  align-items: center;
}

.item-select {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e8e8ef;
  border-radius: 6px;
  font-size: 14px;
}

.btn-remove-row {
  background: #dc3545;
  color: white;
  border: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.btn-remove-row:hover {
  background: #c82333;
}

.btn-add {
  background: #28a745;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  margin-top: 10px;
}

.btn-add:hover {
  background: #218838;
}

.no-items {
  color: #5d5d6a;
  font-style: italic;
  text-align: center;
  padding: 20px;
}

.items-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e8e8ef;
  border-radius: 6px;
  padding: 10px;
}
</style>
`;

// Adicionar estilos ao documento
document.head.insertAdjacentHTML('beforeend', popupStyles);

// Registrar inicialização usando o PageInitializer
if (window.pageInit) {
  console.log('[ExclusaoManager] Registrando com PageInitializer...');
  window.pageInit.onReady((firebaseManager) => {
    console.log('[ExclusaoManager] PageInitializer chamou callback, criando instância...');
    window.exclusaoManager = new ExclusaoInventarioManager(firebaseManager);
  });
} else {
  console.error('[ExclusaoManager] PageInitializer não encontrado!');
  
  // Fallback para o método antigo
  document.addEventListener('DOMContentLoaded', () => {
    console.log('[ExclusaoManager] Usando fallback, aguardando FirebaseManager...');
    
    const waitForFirebase = () => {
      if (window.firebaseManager && typeof window.firebaseManager.initialize === 'function') {
        window.firebaseManager.initialize().then(fm => {
          window.exclusaoManager = new ExclusaoInventarioManager(fm);
        }).catch(error => {
          console.error('[ExclusaoManager] Erro no fallback:', error);
        });
      } else {
        setTimeout(waitForFirebase, 100);
      }
    };
    
    waitForFirebase();
  });
}
