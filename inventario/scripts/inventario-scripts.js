console.log("[INV] inventario-scripts.js carregado");
document.addEventListener("DOMContentLoaded", () => {
  console.log("[INV] DOMContentLoaded (scripts)");
});
console.log("[INV] Iniciando fluxo principal do inventário");
console.log("[INV] Chamando initializeInventario");
console.log("[INV] Entrou em loadInventory");
// Os logs de userDocId foram movidos para dentro do escopo correto em loadInventory()
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";
import {
  getAuth,
  signInAnonymously,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

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
try {
  getAnalytics(app);
} catch {}
const auth = getAuth(app);
async function anonAuth() {
  try {
    await signInAnonymously(auth);
    console.log("[INV] Autenticado anonimamente UID=", auth.currentUser?.uid);
  } catch (e) {
    console.warn("[INV] Falha auth anon:", e.message);
  }
}
anonAuth();
let db;
try {
  db = getFirestore(app, "bancodaneondb");
  console.log("[INV] Firestore OK (bancodaneondb)");
} catch {
  db = getFirestore(app);
  console.log("[INV] Firestore fallback (default)");
}

// Elementos
function getRequiredEl(id) {
  const el = document.getElementById(id);
  if (!el) {
    console.error(`[INV] Elemento obrigatório não encontrado: #${id}`);
    const unauthEl = document.getElementById("unauth");
    if (unauthEl) {
      unauthEl.classList.remove("hidden");
      unauthEl.textContent = `Erro: Elemento obrigatório não encontrado: #${id}`;
    }
    throw new Error(`[INV] Elemento obrigatório não encontrado: #${id}`);
  }
  return el;
}
const unauthEl = document.getElementById("unauth");
const contentEl = getRequiredEl("content");
const msgEl = getRequiredEl("msg");
const errEl = getRequiredEl("err");
const inventoryGrid = getRequiredEl("inventoryGrid");
const emptyState = getRequiredEl("emptyState");
const totalItems = getRequiredEl("totalItems");
const totalSpent = getRequiredEl("totalSpent");
const uniqueCategories = getRequiredEl("uniqueCategories");
const recentPurchases = getRequiredEl("recentPurchases");
const categoryFilter = getRequiredEl("categoryFilter");
const sortBy = getRequiredEl("sortBy");
const searchFilter = getRequiredEl("searchFilter");
const btnMenu = document.getElementById("btnMenu");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const btnCloseSidebar = document.getElementById("btnCloseSidebar");

// Sessão
let sessRaw = localStorage.getItem("bn.currentUser");
if (!sessRaw) {
  if (unauthEl) {
    unauthEl.classList.remove("hidden");
    unauthEl.textContent = "Erro: Nenhuma sessão encontrada. Faça login novamente.";
  }
  throw new Error("[INV] Nenhuma sessão encontrada em localStorage.bn.currentUser");
}
let sess = null;
try {
  sess = JSON.parse(sessRaw);
} catch {
  sess = null;
}
function setupEventListeners() {
  if (categoryFilter) categoryFilter.onchange = filterInventory;
  if (sortBy) sortBy.onchange = filterInventory;
  if (searchFilter) searchFilter.oninput = filterInventory;
}

async function loadInventory() {
  console.log("[INV] Iniciando loadInventory");
  try {
    // Buscar docId do aluno pelo campo user
    const alunosCol = collection(db, "alunos");
    let userDocId = null;
    if (sess?.user) {
      console.log("[INV] Buscando docId do aluno por user:", sess.user);
      const userQuery = query(alunosCol, where("user", "==", sess.user));
      const userSnap = await getDocs(userQuery);
      console.log(
        '[INV] Query alunos por campo "user" =',
        sess.user,
        "docs:",
        userSnap.size
      );
      if (!userSnap.empty) {
        userDocId = userSnap.docs[0].id;
      }
    }
    if (!userDocId) {
      showError("Usuário não encontrado.");
      return;
    }
    console.log("[INV] userDocId resolvido:", userDocId);
    // Buscar itens do inventário do aluno
    const invCol = collection(db, "inventario", userDocId, "inventarioAluno");
    let q = query(invCol, where("status", "==", "active"));
    let snap = await getDocs(q);
    console.log("[INV] Itens com status=active:", snap.size);
    purchases = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderInventory();
    if (uniqueCategories) {
      const cats = new Set(purchases.map((i) => i.category));
      uniqueCategories.textContent = cats.size;
    }
    if (recentPurchases) {
      const ref = new Date();
      ref.setDate(ref.getDate() - 30);
      const recent = purchases.filter(
        (i) =>
          i.lastPurchaseDate &&
          i.lastPurchaseDate.toDate &&
          i.lastPurchaseDate.toDate() > ref
      );
      const cnt = recent.reduce((s, i) => s + (i.quantity || 1), 0);
      recentPurchases.textContent = cnt;
    }
  } catch (e) {
    showError("Erro ao carregar inventário: " + e.message);
    console.error("[INV] loadInventory erro:", e);
  }
}

function renderInventory() {
  if (!inventoryGrid) return;
  if (purchases.length === 0) {
    inventoryGrid.classList.add("hidden");
    emptyState.classList.remove("hidden");
    console.log("[INV] Nenhum item no inventário, mostrando emptyState.");
    return;
  }
  emptyState.classList.add("hidden");
  inventoryGrid.classList.remove("hidden");
  inventoryGrid.innerHTML = "";
  purchases.forEach((item) => {
    const cardEl = document.createElement("div");
    cardEl.className = "inventory-item";
    // Topo: nome e categoria
    const topDiv = document.createElement("div");
    topDiv.className = "item-top";
    const nameDiv = document.createElement("div");
    nameDiv.className = "basic-name";
    nameDiv.textContent = item.productName;
    const catDiv = document.createElement("div");
    catDiv.className = "basic-cat";
    catDiv.textContent = item.category;
    topDiv.appendChild(nameDiv);
    topDiv.appendChild(catDiv);

    // Meio: imagem
    const imageDiv = document.createElement("div");
    imageDiv.className = "item-image-wrapper";
    let imageEl;
    if (item.imageUrl) {
      imageEl = document.createElement("img");
      imageEl.className = "item-image";
      imageEl.src = item.imageUrl;
      imageEl.alt = item.productName;
    } else {
      imageEl = document.createElement("div");
      imageEl.className = "item-image";
      imageEl.textContent = "📦";
    }
    imageDiv.appendChild(imageEl);
    // Base: subcategoria e quantidade
    const bottomDiv = document.createElement("div");
    bottomDiv.className = "item-bottom";
    const subDiv = document.createElement("div");
    subDiv.className = "basic-sub";
    subDiv.textContent = item.subcategory || "";
    const qtyDiv = document.createElement("div");
    qtyDiv.className = "basic-qty";
    qtyDiv.textContent = `Qtd: ${item.quantity || 1}`;
    bottomDiv.appendChild(subDiv);
    bottomDiv.appendChild(qtyDiv);
    // Monta o card
    cardEl.appendChild(topDiv);
    cardEl.appendChild(imageDiv);
    cardEl.appendChild(bottomDiv);
    cardEl.onclick = () => openItemModal(item);
    inventoryGrid.appendChild(cardEl);
  });
  modal.classList.add("open");
  document.body.classList.add("no-scroll");

function closeItemModal() {
  const modal = document.getElementById("itemModal");
  if (!modal) return;
  modal.classList.remove("open");
  document.body.classList.remove("no-scroll");
}
document.addEventListener("click", (e) => {
  if (e.target.id === "closeItemModal" || e.target.id === "itemModal") {
    closeItemModal();
  }
});

function openImageModal(src, title) {
  const modal = document.getElementById("imageModal");
  const img = document.getElementById("imageModalImg");
  if (!modal || !img) return;
  img.src = src;
  img.alt = title || "Imagem";
  modal.classList.add("open");
  document.body.classList.add("no-scroll");
}
function closeImageModal() {
  const modal = document.getElementById("imageModal");
  if (!modal) return;
  modal.classList.remove("open");
  document.body.classList.remove("no-scroll");
}
document.addEventListener("click", (e) => {
  if (e.target.id === "closeImageModal" || e.target.id === "imageModal") {
    closeImageModal();
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeImageModal();
    closeItemModal();
  }
});

function pickCard(rarity, used) {
  const pool = Object.values(productCatalog).filter(
    (c) => c.rarity === rarity && !used.has(c.id)
  );
  if (pool.length === 0) return null;
  const card = pool[Math.floor(Math.random() * pool.length)];
  used.add(card.id);
  return card;
}



}