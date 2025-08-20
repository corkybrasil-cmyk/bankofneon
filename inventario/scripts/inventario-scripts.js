// Inventário Scripts - Banco da Neon
class InventarioManager {
  constructor() {
    this.db = null;
    this.currentUser = null;
    this.inventarioData = [];
    this.filteredData = [];
    this.categorias = [];
    this.subcategorias = [];
    this.currentPage = 1;
    this.itemsPerPage = 15;
    this.init();
  }

  async init() {
    try {
      // Verificar sessão do usuário
      const sessRaw = localStorage.getItem("bn.currentUser");
      if (!sessRaw) {
        window.location.href = "../dashboard/dashboard.html";
        return;
      }
      
      this.currentUser = JSON.parse(sessRaw);
      if (!this.currentUser || !this.currentUser.user) {
        window.location.href = "../dashboard/dashboard.html";
        return;
      }

      // Inicializar Firebase
      await this.initFirebase();
      
      // Inicializar Pack Opening Manager
      await this.loadPackOpeningManager();
      
      // Carregar dados
      await this.loadData();
      
      // Configurar eventos
      this.setupEventListeners();
      
    } catch (error) {
      console.error('Erro na inicialização:', error);
      this.showError('Erro ao carregar o inventário. Tente novamente.');
    }
  }

  async loadPackOpeningManager() {
    return new Promise((resolve) => {
      // Verificar se o PackOpeningManager já foi carregado
      if (window.PackOpeningManager) {
        this.packOpeningManager = new window.PackOpeningManager(this);
        console.log('[InventarioManager] PackOpeningManager carregado');
        resolve();
      } else {
        // Aguardar carregamento com timeout
        let attempts = 0;
        const maxAttempts = 50; // 5 segundos
        
        const checkLoaded = () => {
          attempts++;
          if (window.PackOpeningManager) {
            this.packOpeningManager = new window.PackOpeningManager(this);
            console.log('[InventarioManager] PackOpeningManager carregado');
            resolve();
          } else if (attempts < maxAttempts) {
            setTimeout(checkLoaded, 100);
          } else {
            console.warn('[InventarioManager] PackOpeningManager não carregado - funcionalidade de packs não disponível');
            resolve();
          }
        };
        checkLoaded();
      }
    });
  }

  async initFirebase() {
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

    try {
      this.db = getFirestore(app, "bancodaneondb");
    } catch {
      this.db = getFirestore(app);
    }
  }

  async loadData() {
    try {
      // Mostrar loading
      this.showLoading(true);

      // Carregar dados em paralelo
      await Promise.all([
        this.loadInventario(),
        this.loadCategorias(),
        this.loadSubcategorias()
      ]);

      // Processar dados
      this.processInventarioData();
      this.updateKPIs();
      this.populateFilters();
      this.applyFilters();

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      this.showError('Erro ao carregar os dados do inventário.');
    } finally {
      this.showLoading(false);
    }
  }

  async loadInventario() {
    const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js");
    
    try {
      // Buscar inventário do usuário: inventario/<user>/inventarioAluno
      const inventarioRef = collection(this.db, 'inventario', this.currentUser.user, 'inventarioAluno');
      const snapshot = await getDocs(inventarioRef);
      
      this.inventarioData = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        this.inventarioData.push({
          id: doc.id,
          nome: doc.id, // O nome do produto é o ID do documento
          ...data
        });
      });

      console.log('Inventário carregado:', this.inventarioData);
    } catch (error) {
      console.error('Erro ao carregar inventário:', error);
      this.inventarioData = [];
    }
  }

  async loadCategorias() {
    const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js");
    
    try {
      const categoriasRef = collection(this.db, 'loja', 'config', 'categorias');
      const snapshot = await getDocs(categoriasRef);
      
      this.categorias = [];
      snapshot.forEach(doc => {
        this.categorias.push({
          id: doc.id,
          ...doc.data()
        });
      });
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      this.categorias = [];
    }
  }

  async loadSubcategorias() {
    const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js");
    
    try {
      const subcategoriasRef = collection(this.db, 'loja', 'config', 'subcategorias');
      const snapshot = await getDocs(subcategoriasRef);
      
      this.subcategorias = [];
      snapshot.forEach(doc => {
        this.subcategorias.push({
          id: doc.id,
          ...doc.data()
        });
      });
    } catch (error) {
      console.error('Erro ao carregar subcategorias:', error);
      this.subcategorias = [];
    }
  }

  async loadProdutoInfo(nomeProduto) {
    const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js");
    
    try {
      const produtosRef = collection(this.db, 'loja', 'config', 'produtos');
      const q = query(produtosRef, where('nome', '==', nomeProduto));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data()
        };
      }
      return null;
    } catch (error) {
      console.error('Erro ao carregar info do produto:', error);
      return null;
    }
  }

  processInventarioData() {
    // Enriquecer dados do inventário com informações de categoria/subcategoria
    this.inventarioData.forEach(item => {
      // Buscar categoria
      if (item.categoria) {
        const categoria = this.categorias.find(cat => cat.id === item.categoria);
        item.categoriaNome = categoria ? categoria.nome : item.categoria;
      }
      
      // Buscar subcategoria
      if (item.subcategoria) {
        const subcategoria = this.subcategorias.find(sub => sub.id === item.subcategoria);
        item.subcategoriaNome = subcategoria ? subcategoria.nome : item.subcategoria;
      }
    });
  }

  updateKPIs() {
    const quantidadeTotal = this.inventarioData.reduce((sum, item) => sum + (item.quantity || item.quantidade || 1), 0);
    // Se houver totalSpent, soma todos, senão calcula price * quantity
    let valorTotal = 0;
    if (this.inventarioData.some(item => item.totalSpent !== undefined)) {
      valorTotal = this.inventarioData.reduce((sum, item) => sum + (item.totalSpent || 0), 0);
    } else {
      valorTotal = this.inventarioData.reduce((sum, item) => sum + ((item.price || item.preco || 0) * (item.quantity || item.quantidade || 1)), 0);
    }
    const itensDiferentes = this.inventarioData.length;

    document.getElementById('kpiQuantidade').textContent = quantidadeTotal;
    document.getElementById('kpiValorTotal').textContent = `N$ ${valorTotal.toLocaleString('pt-BR')}`;
    document.getElementById('kpiItensDiferentes').textContent = itensDiferentes;
  }

  populateFilters() {
    const filtroCategoria = document.getElementById('filtroCategoria');
    const filtroSubcategoria = document.getElementById('filtroSubcategoria');

    // Limpar filtros
    filtroCategoria.innerHTML = '<option value="">Todas as categorias</option>';
    filtroSubcategoria.innerHTML = '<option value="">Todas as subcategorias</option>';

    // Adicionar categorias
    this.categorias.forEach(categoria => {
      const option = document.createElement('option');
      option.value = categoria.id;
      option.textContent = categoria.nome;
      filtroCategoria.appendChild(option);
    });

    // Adicionar subcategorias
    this.subcategorias.forEach(subcategoria => {
      const option = document.createElement('option');
      option.value = subcategoria.id;
      option.textContent = subcategoria.nome;
      filtroSubcategoria.appendChild(option);
    });
  }

  applyFilters() {
    const filtroCategoria = document.getElementById('filtroCategoria').value;
    const filtroSubcategoria = document.getElementById('filtroSubcategoria').value;
    const ordenacao = document.getElementById('ordenacao').value;

    // Filtrar dados
    this.filteredData = this.inventarioData.filter(item => {
      if (filtroCategoria && item.categoria !== filtroCategoria) return false;
      if (filtroSubcategoria && item.subcategoria !== filtroSubcategoria) return false;
      return true;
    });

    // Ordenar dados
    this.filteredData.sort((a, b) => {
      switch (ordenacao) {
        case 'nome':
          return a.nome.localeCompare(b.nome);
        case 'valor':
          return (b.preco || 0) - (a.preco || 0);
        case 'quantidade':
          return (b.quantidade || 1) - (a.quantidade || 1);
        default:
          return 0;
      }
    });

    // Resetar página
    this.currentPage = 1;
    this.renderInventario();
    this.updatePagination();
  }

  renderInventario() {
    const container = document.getElementById('inventarioGrid');
    
    if (this.filteredData.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">🎒</div>
          <div class="title">Inventário vazio</div>
          <div class="description">Você ainda não possui itens no seu inventário.<br>Visite a loja para adquirir produtos!</div>
        </div>
      `;
      container.style.display = 'block';
      return;
    }

    // Calcular paginação
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const pageItems = this.filteredData.slice(startIndex, endIndex);

    // Renderizar cards
    container.innerHTML = pageItems.map(item => this.createItemCard(item)).join('');
    container.style.display = 'grid';

    // Adicionar eventos de clique
    container.querySelectorAll('.item-card').forEach((card, index) => {
      card.addEventListener('click', () => {
        console.log('[Inventario] Card clicado:', pageItems[index]);
        this.openModal(pageItems[index]);
      });
    });
  }

  createItemCard(item) {
    const imagemUrl = item.imageUrl || item.imagem || '../assets/semfoto.png';
    const categoria = item.category || item.categoriaNome || item.categoria || 'Sem categoria';
    const subcategoria = item.subcategory || item.subcategoriaNome || item.subcategoria || '';
    const preco = (item.price !== undefined) ? `N$ ${item.price.toLocaleString('pt-BR')}` : (item.preco ? `N$ ${item.preco.toLocaleString('pt-BR')}` : 'Sem preço');
    const quantidade = item.quantity || item.quantidade || 1;

    return `
      <div class="item-card" data-item-id="${item.id}">
        <div class="item-image">
          <img src="${imagemUrl}" alt="${item.nome || item.productName || item.id}" onerror="this.src='../assets/semfoto.png'" />
        </div>
        <div class="item-info">
          <div class="item-name">${item.nome || item.productName || item.id}</div>
          <div class="item-category">${categoria}${subcategoria ? ` • ${subcategoria}` : ''}</div>
          <div class="item-details">
            <div class="item-price">${preco}</div>
            <div class="item-quantity">Qtd: ${quantidade}</div>
          </div>
        </div>
      </div>
    `;
  }

  updatePagination() {
    const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
    const paginacao = document.getElementById('paginacao');
    const btnPrevious = document.getElementById('btnPrevious');
    const btnNext = document.getElementById('btnNext');
    const paginaInfo = document.getElementById('paginaInfo');

    if (totalPages <= 1) {
      paginacao.style.display = 'none';
      return;
    }

    paginacao.style.display = 'flex';
    btnPrevious.disabled = this.currentPage === 1;
    btnNext.disabled = this.currentPage === totalPages;
    paginaInfo.textContent = `Página ${this.currentPage} de ${totalPages}`;
  }

  async openModal(item) {
    console.log('[Inventario] Abrindo modal para:', item);
    // Buscar informações completas do produto
    const produtoInfo = await this.loadProdutoInfo(item.nome || item.productName || item.id);
    console.log('[Inventario] Produto info:', produtoInfo);

    // Preencher modal com os campos corretos
    document.getElementById('modalNome').textContent = item.productName || item.nome || item.id;
    const categoria = item.category || item.categoriaNome || item.categoria || 'Sem categoria';
    document.getElementById('modalCategoria').textContent = categoria;
    document.getElementById('modalSubcategoria').textContent = item.subcategory || item.subcategoriaNome || item.subcategoria || 'Sem subcategoria';
    document.getElementById('modalPreco').textContent = (item.price !== undefined) ? `N$ ${item.price.toLocaleString('pt-BR')}` : (item.preco ? `N$ ${item.preco.toLocaleString('pt-BR')}` : 'Sem preço');
    document.getElementById('modalQuantidade').textContent = item.quantity || item.quantidade || 1;
    document.getElementById('modalDescricao').textContent = produtoInfo?.descricao || item.description || item.descricao || 'Sem descrição disponível';

    const modalImagem = document.getElementById('modalImagem');
    modalImagem.src = item.imageUrl || item.imagem || '../assets/semfoto.png';
    modalImagem.alt = item.productName || item.nome || item.id;
    modalImagem.onerror = () => {
      modalImagem.src = '../assets/semfoto.png';
      modalImagem.alt = 'Imagem não disponível';
    };

    // Exibir botão apenas se categoria for Consumíveis
    const actionBtn = document.getElementById('usar');
    console.log('🔍 [Inventario] Botão "usar" encontrado no DOM?', !!actionBtn);
    console.log('🏷️ [Inventario] Categoria detectada:', categoria);
    console.log('🏷️ [Inventario] Categoria normalizada:', categoria.toLowerCase().trim());
    
    const categoriaNormalizada = categoria.toLowerCase().trim();
    
    if (actionBtn) {
      const isConsumivel = categoriaNormalizada === 'consumíveis';
      
      console.log('🤔 [Inventario] É consumível?', isConsumivel);
      console.log('🔍 [Inventario] Comparação: "' + categoriaNormalizada + '" === "consumíveis"');
      
      if (isConsumivel) {
        actionBtn.style.display = 'block';
        console.log('✅ [Inventario] Botão de ação EXIBIDO (item consumível)');
      } else {
        actionBtn.style.display = 'none';
        console.log('❌ [Inventario] Botão de ação OCULTO (categoria:', categoriaNormalizada, ')');
      }
    } else {
      console.error('⚠️ [Inventario] Botão de ação não encontrado no DOM! Verificar HTML.');
    }

    // Mostrar modal com animação suave
    const modal = document.getElementById('modalItem');
    modal.classList.add('open');
    console.log('[Inventario] Modal aberto');

    // Adicionar listener para fechar ao clicar no overlay
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        console.log('[Inventario] Fechando modal por clique no overlay');
        this.closeModal();
      }
    });
    
    // Adicionar event listener para o botão "usar" se for consumível
    if (actionBtn && categoriaNormalizada === 'consumíveis') {
      console.log('🔗 [Inventario] Configurando event listener do botão "usar"...');
      actionBtn.onclick = () => {
        console.log('👆 [Inventario] Botão "usar" foi clicado!');
        this.handleUseItem(item);
      };
      console.log('✅ [Inventario] Event listener configurado com sucesso');
    } else {
      console.log('ℹ️ [Inventario] Event listener não configurado:', {
        temBotao: !!actionBtn,
        categoria: categoriaNormalizada,
        ehConsumivel: categoriaNormalizada === 'consumíveis'
      });
    }
  }

  closeModal() {
    document.getElementById('modalItem').classList.remove('open');
  }

  handleUseItem(item) {
    console.log('🎯 [Inventario] === INICIANDO USO DO ITEM ===');
    console.log('📦 [Inventario] Item recebido:', item);
    console.log('🔍 [Inventario] Propriedades do item:', {
      nome: item.nome,
      productName: item.productName,
      category: item.category,
      subcategory: item.subcategory,
      subcategoriaNome: item.subcategoriaNome,
      subcategoria: item.subcategoria,
      quantity: item.quantity
    });
    
    const subcategoria = item.subcategory || item.subcategoriaNome || item.subcategoria || '';
    console.log('🏷️ [Inventario] Subcategoria detectada:', subcategoria);
    console.log('🏷️ [Inventario] Subcategoria normalizada:', subcategoria.toLowerCase());
    
    if (subcategoria.toLowerCase() === 'pack de cartas') {
      console.log('🎁 [Inventario] ✅ ITEM IDENTIFICADO COMO PACK DE CARTAS!');
      console.log('🔗 [Inventario] Verificando PackOpeningManager...');
      
      // Verificar se o PackOpeningManager está disponível
      if (this.packOpeningManager) {
        console.log('✅ [Inventario] PackOpeningManager disponível');
        console.log('🚪 [Inventario] Fechando modal...');
        
        // Fechar modal antes de abrir pack
        this.closeModal();
        
        console.log('🚀 [Inventario] Iniciando abertura do pack...');
        // Abrir pack com animação
        this.packOpeningManager.openPack(item);
      } else {
        console.error('❌ [Inventario] PackOpeningManager não disponível');
        this.showError('Sistema de abertura de packs não disponível. Tente recarregar a página.');
      }
    } else {
      console.log('ℹ️ [Inventario] Item não é pack de cartas (subcategoria:', subcategoria, ')');
      console.log('🎯 [Inventario] Processando como consumível regular');
      // Lógica para outros consumíveis
      this.showSuccess(`Item "${item.productName || item.nome}" usado com sucesso!`);
    }
    console.log('🏁 [Inventario] === FIM DO PROCESSO DE USO ===');
  }

  setupEventListeners() {
    // Filtros
    document.getElementById('filtroCategoria').addEventListener('change', () => this.applyFilters());
    document.getElementById('filtroSubcategoria').addEventListener('change', () => this.applyFilters());
    document.getElementById('ordenacao').addEventListener('change', () => this.applyFilters());

    // Paginação
    document.getElementById('btnPrevious').addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.renderInventario();
        this.updatePagination();
      }
    });

    document.getElementById('btnNext').addEventListener('click', () => {
      const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
      if (this.currentPage < totalPages) {
        this.currentPage++;
        this.renderInventario();
        this.updatePagination();
      }
    });

    // Modal
    document.getElementById('btnCloseModal').addEventListener('click', () => this.closeModal());
    document.getElementById('modalItem').addEventListener('click', (e) => {
      if (e.target.id === 'modalItem') {
        this.closeModal();
      }
    });

    // ESC para fechar modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
      }
    });

    // Botão de teste do sistema de exclusão
    const btnTestarExclusao = document.getElementById('btn-testar-exclusao');
    if (btnTestarExclusao) {
      btnTestarExclusao.addEventListener('click', () => {
        if (window.exclusaoStandalone) {
          window.exclusaoStandalone.testCompleteDeletionSystem();
        } else {
          console.error('Sistema de exclusão não foi carregado ainda');
          alert('Sistema de exclusão não está carregado. Aguarde um momento e tente novamente.');
        }
      });
    }
  }

  showLoading(show) {
    const loading = document.getElementById('loading');
    const inventarioGrid = document.getElementById('inventarioGrid');
    const paginacao = document.getElementById('paginacao');

    if (show) {
      loading.style.display = 'block';
      inventarioGrid.style.display = 'none';
      paginacao.style.display = 'none';
    } else {
      loading.style.display = 'none';
    }
  }

  showError(message) {
    const container = document.getElementById('inventarioGrid');
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">⚠️</div>
        <div class="title">Erro</div>
        <div class="description">${message}</div>
      </div>
    `;
    container.style.display = 'block';
    this.showLoading(false);
  }

  showSuccess(message) {
    // Criar toast de sucesso
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.innerHTML = `
      <div class="toast-content">
        <div class="toast-icon">✅</div>
        <div class="toast-message">${message}</div>
      </div>
    `;
    
    // Estilos inline para o toast
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #28a745, #20c997);
      color: white;
      padding: 15px 20px;
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(40, 167, 69, 0.3);
      z-index: 10000;
      animation: toastSlideIn 0.3s ease-out;
      max-width: 300px;
    `;
    
    const toastContent = toast.querySelector('.toast-content');
    toastContent.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
    `;
    
    document.body.appendChild(toast);
    
    // Remover após 3 segundos
    setTimeout(() => {
      toast.style.animation = 'toastSlideOut 0.3s ease-in forwards';
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
  new InventarioManager();
});
