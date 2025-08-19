import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, orderBy, limit, startAfter } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBHU6yFDCKp9jm9tPGyRqQJFS3amewuuQY",
  authDomain: "crmdaneon.firebaseapp.com",
  projectId: "crmdaneon",
  storageBucket: "crmdaneon.firebasestorage.app",
  messagingSenderId: "564595832938",
  appId: "1:564595832938:web:16fb660d8d433ae5f3f213",
  measurementId: "G-D3G4M9F17R",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Estado da página

let paginaAtual = 1;
let itensPorPagina = 10;
let inventario = [];
let categorias = [];
let subcategorias = [];
let filtroCategoria = '';
let filtroSubcategoria = '';
let ordenacao = 'name';
let alunoId = null;

// Recupera id do aluno da sessão
try {
  const sessRaw = localStorage.getItem('bn.currentUser');
  if (sessRaw) {
    const sess = JSON.parse(sessRaw);
    alunoId = sess.user || null;
  }
} catch {}

// Elementos
const kpiTotalItems = document.getElementById('kpi-total-items').querySelector('.kpi-value');
const kpiTotalValue = document.getElementById('kpi-total-value').querySelector('.kpi-value');
const kpiUniqueSubcats = document.getElementById('kpi-unique-subcats').querySelector('.kpi-value');
const grid = document.getElementById('inventario-grid');
const filterCategory = document.getElementById('filter-category');
const filterSubcategory = document.getElementById('filter-subcategory');
const orderBySelect = document.getElementById('order-by');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const paginaAtualEl = document.getElementById('pagina-atual');

// Busca inventário paginado e filtrado
async function fetchInventory() {
  if (!alunoId) {
    grid.innerHTML = '<div class="inventory-card">Sessão inválida ou usuário não encontrado.</div>';
    return;
  }
  // Busca o id do documento do aluno
  const alunosCol = collection(db, "alunos");
  const userQuery = query(alunosCol, where("user", "==", alunoId));
  const userSnap = await getDocs(userQuery);
  if (userSnap.empty) {
    grid.innerHTML = '<div class="inventory-card">Aluno não encontrado.</div>';
    return;
  }
  const userDocId = userSnap.docs[0].id;
  // Busca inventário do aluno
  let invCol = collection(db, "inventario", userDocId, "inventarioAluno");
  let filters = [];
  if (filtroCategoria) filters.push(where("category", "==", filtroCategoria));
  if (filtroSubcategoria) filters.push(where("subcategory", "==", filtroSubcategoria));
  filters.push(orderBy(ordenacao));
  filters.push(limit(itensPorPagina));
  let q = query(invCol, ...filters);
  const snap = await getDocs(q);
  inventario = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderKPIs();
  renderGrid();
  renderPaginacao();
  renderFiltros();
}

function renderKPIs() {
  kpiTotalItems.textContent = inventario.length;
  const totalValue = inventario.reduce((sum, item) => sum + (item.value || 0), 0);
  kpiTotalValue.textContent = `N$ ${totalValue.toFixed(2)}`;
  const subcats = new Set(inventario.map(i => i.subcategory));
  kpiUniqueSubcats.textContent = subcats.size;
}

function renderGrid() {
  grid.innerHTML = '';
  inventario.forEach(item => {
    const card = document.createElement('div');
    card.className = 'inventory-card';
    card.innerHTML = `
      <div class="item-name">${item.productName || item.name}</div>
      <div class="item-category">${item.category || ''}</div>
      <div class="item-subcategory">${item.subcategory || ''}</div>
      <div class="item-value">N$ ${(item.value || 0).toFixed(2)}</div>
    `;
    grid.appendChild(card);
  });
}

function renderPaginacao() {
  paginaAtualEl.textContent = paginaAtual;
  btnPrev.disabled = paginaAtual === 1;
  btnNext.disabled = inventario.length < itensPorPagina;
}

function renderFiltros() {
  // Preenche categorias/subcategorias dos itens atuais
  categorias = Array.from(new Set(inventario.map(i => i.category))).filter(Boolean);
  subcategorias = Array.from(new Set(inventario.map(i => i.subcategory))).filter(Boolean);
  filterCategory.innerHTML = '<option value="">Todas categorias</option>' + categorias.map(c => `<option value="${c}">${c}</option>`).join('');
  filterSubcategory.innerHTML = '<option value="">Todas subcategorias</option>' + subcategorias.map(s => `<option value="${s}">${s}</option>`).join('');
}

filterCategory.onchange = () => {
  filtroCategoria = filterCategory.value;
  paginaAtual = 1;
  fetchInventory();
};
filterSubcategory.onchange = () => {
  filtroSubcategoria = filterSubcategory.value;
  paginaAtual = 1;
  fetchInventory();
};
orderBySelect.onchange = () => {
  ordenacao = orderBySelect.value;
  paginaAtual = 1;
  fetchInventory();
};
btnPrev.onclick = () => {
  if (paginaAtual > 1) {
    paginaAtual--;
    fetchInventory();
  }
};
btnNext.onclick = () => {
  if (inventario.length === itensPorPagina) {
    paginaAtual++;
    fetchInventory();
  }
};

// Inicialização
fetchInventory();