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
try {
  await signInAnonymously(auth);
  console.log("[INV] Autenticado anonimamente UID=", auth.currentUser?.uid);
} catch (e) {
  console.warn("[INV] Falha auth anon:", e.message);
}
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
const btnMenu = getRequiredEl("btnMenu");
const sidebar = getRequiredEl("sidebar");
const sidebarOverlay = getRequiredEl("sidebarOverlay");
const btnCloseSidebar = getRequiredEl("btnCloseSidebar");

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
console.log("[INV] Sessão:", sess);
if (!sess || !sess.user) {
  if (unauthEl) {
    unauthEl.classList.remove("hidden");
    unauthEl.textContent = "Erro: Sessão inválida ou usuário não encontrado. Faça login novamente.";
  }
  throw new Error("[INV] Sessão inválida ou usuário não encontrado");
}
let purchases = [];
let productCatalog = {
  "carta-comum-1": {
    id: "carta-comum-1",
    name: "Soldado",
    subcategory: "Carta Comum",
    rarity: "comum",
    imageUrl: "versocarta.svg",
  },
  "carta-comum-2": {
    id: "carta-comum-2",
    name: "Arqueiro",
    subcategory: "Carta Comum",
    rarity: "comum",
    imageUrl: "versocarta.svg",
  },
  "carta-comum-3": {
    id: "carta-comum-3",
    name: "Mago",
    subcategory: "Carta Comum",
    rarity: "comum",
    imageUrl: "versocarta.svg",
  },
  "carta-comum-4": {
    id: "carta-comum-4",
    name: "Guerreiro",
    subcategory: "Carta Comum",
    rarity: "comum",
    imageUrl: "versocarta.svg",
  },
  "carta-comum-5": {
    id: "carta-comum-5",
    name: "Ladino",
    subcategory: "Carta Comum",
    rarity: "comum",
    imageUrl: "versocarta.svg",
  },
  "carta-comum-6": {
    id: "carta-comum-6",
    name: "Clérigo",
    subcategory: "Carta Comum",
    rarity: "comum",
    imageUrl: "versocarta.svg",
  },
  "carta-comum-7": {
    id: "carta-comum-7",
    name: "Bárbaro",
    subcategory: "Carta Comum",
    rarity: "comum",
    imageUrl: "versocarta.svg",
  },
  "carta-comum-8": {
    id: "carta-comum-8",
    name: "Paladino",
    subcategory: "Carta Comum",
    rarity: "comum",
    imageUrl: "versocarta.svg",
  },
  "carta-comum-9": {
    id: "carta-comum-9",
    name: "Caçador",
    subcategory: "Carta Comum",
    rarity: "comum",
    imageUrl: "versocarta.svg",
  },
  "carta-comum-10": {
    id: "carta-comum-10",
    name: "Mercenário",
    subcategory: "Carta Comum",
    rarity: "comum",
    imageUrl: "versocarta.svg",
  },
  "carta-comum-11": {
    id: "carta-comum-11",
    name: "Alquimista",
    subcategory: "Carta Comum",
    rarity: "comum",
    imageUrl: "versocarta.svg",
  },
  "carta-comum-12": {
    id: "carta-comum-12",
    name: "Monge",
    subcategory: "Carta Comum",
    rarity: "comum",
    imageUrl: "versocarta.svg",
  },
  "carta-comum-13": {
    id: "carta-comum-13",
    name: "Druida",
    subcategory: "Carta Comum",
    rarity: "comum",
    imageUrl: "versocarta.svg",
  },
  "carta-comum-14": {
    id: "carta-comum-14",
    name: "Necromante",
    subcategory: "Carta Comum",
    rarity: "comum",
    imageUrl: "versocarta.svg",
  },
  "carta-comum-15": {
    id: "carta-comum-15",
    name: "Bardo",
    subcategory: "Carta Comum",
    rarity: "comum",
    imageUrl: "versocarta.svg",
  },
  "carta-comum-16": {
    id: "carta-comum-16",
    name: "Samurai",
    subcategory: "Carta Comum",
    rarity: "comum",
    imageUrl: "versocarta.svg",
  },
  "carta-comum-17": {
    id: "carta-comum-17",
    name: "Ninja",
    subcategory: "Carta Comum",
    rarity: "comum",
    imageUrl: "versocarta.svg",
  },
  "carta-comum-18": {
    id: "carta-comum-18",
    name: "Pirata",
    subcategory: "Carta Comum",
    rarity: "comum",
    imageUrl: "versocarta.svg",
  },
  "carta-comum-19": {
    id: "carta-comum-19",
    name: "Gladiador",
    subcategory: "Carta Comum",
    rarity: "comum",
    imageUrl: "versocarta.svg",
  },
  "carta-comum-20": {
    id: "carta-comum-20",
    name: "Viking",
    subcategory: "Carta Comum",
    rarity: "comum",
    imageUrl: "versocarta.svg",
  },
  "carta-rara-1": {
    id: "carta-rara-1",
    name: "Cavaleiro Dourado",
    subcategory: "Carta Rara",
    rarity: "rara",
    imageUrl: "versocarta.svg",
  },
  "carta-rara-2": {
    id: "carta-rara-2",
    name: "Feiticeira das Sombras",
    subcategory: "Carta Rara",
    rarity: "rara",
    imageUrl: "versocarta.svg",
  },
  "carta-rara-3": {
    id: "carta-rara-3",
    name: "Assassino Fantasma",
    subcategory: "Carta Rara",
    rarity: "rara",
    imageUrl: "versocarta.svg",
  },
  "carta-rara-4": {
    id: "carta-rara-4",
    name: "Guardião da Neve",
    subcategory: "Carta Rara",
    rarity: "rara",
    imageUrl: "versocarta.svg",
  },
  "carta-rara-5": {
    id: "carta-rara-5",
    name: "Caçadora Lunar",
    subcategory: "Carta Rara",
    rarity: "rara",
    imageUrl: "versocarta.svg",
  },
  "carta-rara-6": {
    id: "carta-rara-6",
    name: "Mestre das Chamas",
    subcategory: "Carta Rara",
    rarity: "rara",
    imageUrl: "versocarta.svg",
  },
  "carta-epica-1": {
    id: "carta-epica-1",
    name: "Dragão Rubro",
    subcategory: "Carta Épica",
    rarity: "epica",
    imageUrl: "versocarta.svg",
  },
  "carta-epica-2": {
    id: "carta-epica-2",
    name: "Guardião Celestial",
    subcategory: "Carta Épica",
    rarity: "epica",
    imageUrl: "versocarta.svg",
  },
  "carta-epica-3": {
    id: "carta-epica-3",
    name: "Serpente Abissal",
    subcategory: "Carta Épica",
    rarity: "epica",
    imageUrl: "versocarta.svg",
  },
  "carta-lendaria-1": {
    id: "carta-lendaria-1",
    name: "Deus do Trovão",
    subcategory: "Carta Lendária",
    rarity: "lendaria",
    imageUrl: "versocarta.svg",
  },
};
let currentPackCards = [];
let currentCardIndex = 0;
let cardNavAnimating = false;
let packOpenStartTime = 0;
function packLog(s) {
  if (!packOpenStartTime) {
    console.log("[PACK OPEN][?] " + s);
    return;
  }
  const d = Math.round(performance.now() - packOpenStartTime);
  console.log(`[PACK OPEN][+${d}ms] ${s}`);
}

if (btnMenu && sidebar && sidebarOverlay) {
  btnMenu.onclick = () => {
    sidebar.classList.add("open");
    sidebarOverlay.classList.add("open");
  };
}
if (btnCloseSidebar) {
  btnCloseSidebar.onclick = () => {
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("open");
  };
}
if (sidebarOverlay) {
  sidebarOverlay.onclick = () => {
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("open");
  };
}

contentEl.style.display = "block";
initializeInventario();

async function initializeInventario() {
  try {
    setupEventListeners();
    await loadInventory();
  } catch (e) {
    showError("Erro ao inicializar: " + e.message);
  }
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
    purchases.length = 0;
    snap.forEach((d) => {
      const data = d.data();
      purchases.push({
        id: d.id,
        productId: data.productId || null,
        productName: data.productName,
        price: data.price,
        originalPrice: data.price,
        quantity: data.quantity || 1,
        category: data.category || "Geral",
        subcategory: data.subcategory || "",
        description: data.description || "Item do inventário",
        firstPurchaseDate: data.firstPurchaseDate,
        lastPurchaseDate: data.lastPurchaseDate,
        totalSpent: data.totalSpent || data.price,
        dateTime: data.lastPurchaseDate,
        imageUrl: data.imageUrl || null,
      });
    });
    console.log("[INV] purchases carregados:", purchases.length);
    purchases.sort((a, b) => {
      if (
        a.lastPurchaseDate &&
        b.lastPurchaseDate &&
        a.lastPurchaseDate.toDate &&
        b.lastPurchaseDate.toDate
      ) {
        return b.lastPurchaseDate.toDate() - a.lastPurchaseDate.toDate();
      }
      return 0;
    });
    updateStats();
    renderInventory();
    populateFilters();
    if (purchases.length === 0) {
      showError("Inventário vazio.");
    }
  } catch (e) {
    showError("Erro ao carregar inventário: " + e.message);
    console.error("[INV] loadInventory erro:", e);
  }
}

function updateStats() {
  const totalItemsCount = purchases.reduce((s, i) => s + (i.quantity || 1), 0);
  if (totalItems) totalItems.textContent = totalItemsCount;
  if (totalSpent) {
    const t = purchases.reduce((s, i) => s + (i.totalSpent || 0), 0);
    totalSpent.textContent = "N$ " + t.toFixed(2);
  }
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
    const el = document.createElement("div");
    el.className = "inventory-item";
    // Nome do item acima da foto+categoria
    const nameDiv = document.createElement("div");
    nameDiv.className = "basic-name";
    nameDiv.textContent = item.productName;

    // Foto + categoria em um só div
    const fotoCategoriaDiv = document.createElement("div");
    fotoCategoriaDiv.id = "foto+categoria";
    // Imagem do item
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
    fotoCategoriaDiv.appendChild(imageEl);
    // Categoria no canto superior direito, rotacionada
    const catDiv = document.createElement("div");
    catDiv.className = "basic-cat";
    catDiv.textContent = item.category;
    fotoCategoriaDiv.appendChild(catDiv);

    // Subcategoria abaixo da foto+categoria
    const subDiv = document.createElement("div");
    subDiv.className = "basic-sub";
    subDiv.textContent = item.subcategory || "";

    // Quantidade abaixo da foto+categoria
    const qtyDiv = document.createElement("div");
    qtyDiv.className = "basic-qty";
    qtyDiv.textContent = `Qtd: ${item.quantity || 1}`;

    // Monta o card
    el.appendChild(nameDiv);
    el.appendChild(fotoCategoriaDiv);
    el.appendChild(subDiv);
    el.appendChild(qtyDiv);
    el.onclick = () => openItemModal(item);
    inventoryGrid.appendChild(el);
  });
  // Diagnóstico visual: verifica se inventoryGrid está visível
  const isHidden = inventoryGrid.classList.contains("hidden");
  console.log(`[INV] inventoryGrid hidden? ${isHidden}`);
  if (isHidden) {
    if (errEl) {
      errEl.textContent = "Erro: O inventário foi carregado, mas não está visível. Verifique o CSS da classe .hidden.";
      errEl.classList.remove("hidden");
    }
  }
}

function populateFilters() {
  if (!categoryFilter) return;
  const cats = [""];
  const set = new Set(purchases.map((i) => i.category));
  set.forEach((c) => cats.push(c));
  categoryFilter.innerHTML = cats
    .map((c) => `<option value="${c}">${c || "Todas"}</option>`)
    .join("");
}
function filterInventory() {
  loadInventory();
}

function showSuccess(m) {
  if (!msgEl) return;
  msgEl.textContent = m;
  msgEl.classList.remove("hidden");
  if (errEl) errEl.classList.add("hidden");
  setTimeout(() => msgEl.classList.add("hidden"), 3000);
}
function showError(m) {
  if (!errEl) return;
  errEl.textContent = m;
  errEl.classList.remove("hidden");
  if (msgEl) msgEl.classList.add("hidden");
  setTimeout(() => errEl.classList.add("hidden"), 5000);
}

function makePill(t) {
  const s = document.createElement("span");
  s.className = "pill";
  s.textContent = t;
  return s;
}
function openItemModal(item) {
  const modal = document.getElementById("itemModal");
  if (!modal) return;
  document.getElementById("modalItemName").textContent = item.productName;
  const meta = document.getElementById("modalMeta");
  meta.innerHTML = "";
  meta.appendChild(makePill(item.category));
  if (item.subcategory) meta.appendChild(makePill(item.subcategory));
  meta.appendChild(makePill("Qtd: " + (item.quantity || 1)));
  const preview = document.getElementById("modalPreview");
  if (preview) {
    preview.src = item.imageUrl || "semfoto.png";
    preview.alt = item.productName;
  }
  const d = document.getElementById("modalDetails");
  const purchaseDate =
    item.lastPurchaseDate && item.lastPurchaseDate.toDate
      ? item.lastPurchaseDate.toDate().toLocaleDateString("pt-BR")
      : "—";
  d.innerHTML = `<div><span class='label'>Preço atual</span>N$ ${(
    item.price || 0
  ).toFixed(2)}</div><div><span class='label'>Preço histórico</span>${
    item.originalPrice != null
      ? "N$ " + (item.originalPrice || 0).toFixed(2)
      : "—"
  }</div><div><span class='label'>Total gasto</span>N$ ${(
    item.totalSpent || 0
  ).toFixed(
    2
  )}</div><div><span class='label'>Última compra</span>${purchaseDate}</div>`;
  document.getElementById("modalDescription").textContent =
    item.description || "Sem descrição";
  const actions = document.getElementById("modalActions");
  actions.innerHTML = "";
  const normalize = (v) =>
    (v || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
  const isConsumivel = normalize(item.category).includes("consum");
  const isPackCartas =
    isConsumivel && normalize(item.subcategory) === "pack de cartas";
  if (isConsumivel) {
    const btn = document.createElement("button");
    btn.className = "btn success";
    if (isPackCartas) {
      btn.textContent = "🃏 Abrir Pack";
      btn.onclick = () => openPackItem(item.id);
    } else {
      btn.textContent = "🎯 Usar";
      btn.onclick = () => showSuccess("Item usado");
    }
    actions.appendChild(btn);
  }
  modal.classList.add("open");
  document.body.classList.add("no-scroll");
}
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
async function generatePackCards() {
  currentPackCards = [];
  const used = new Set();
  for (let i = 0; i < 3; i++) {
    currentPackCards.push({
      slot: i + 1,
      rarity: "comum",
      product: pickCard("comum", used),
    });
  }
  const rarity4 = Math.random() < 0.1 ? "rara" : "comum";
  currentPackCards.push({
    slot: 4,
    rarity: rarity4,
    product: pickCard(rarity4, used),
  });
  let r5 = Math.random();
  let rarity5 = "rara";
  if (r5 < 0.001) rarity5 = "lendaria";
  else if (r5 < 0.051) rarity5 = "epica";
  currentPackCards.push({
    slot: 5,
    rarity: rarity5,
    product: pickCard(rarity5, used),
  });
  currentCardIndex = 0;
}
async function insertPackCardsToInventory() {
  try {
    const alunosCol = collection(db, "alunos");
    const userQuery = query(alunosCol, where("user", "==", sess.user));
    const snap = await getDocs(userQuery);
    if (snap.empty) return;
    const userDocId = snap.docs[0].id;
    const cartasCol = collection(db, "inventario", userDocId, "cartasAluno");
    for (const card of currentPackCards) {
      if (!card.product) continue;
      await addDoc(cartasCol, {
        productId: card.product.id,
        productName: card.product.name,
        rarity: card.rarity,
        subcategory: card.product.subcategory,
        imageUrl: card.product.imageUrl,
        dateTime: new Date(),
        status: "active",
      });
    }
  } catch (e) {
    console.error("Erro ao inserir cartas:", e);
  }
}

function openPackItem(id) {
  const overlay = document.getElementById("packOverlay");
  const final = document.getElementById("packFinal");
  const confirmBox = document.getElementById("packConfirm");
  const blocker = document.getElementById("packBlocker");
  if (!overlay || !final || !confirmBox) return;
  overlay.classList.add("active");
  document.body.classList.add("no-scroll");
  final.classList.remove("show");
  confirmBox.style.display = "none";
  if (blocker) blocker.style.display = "block";
  setTimeout(() => {
    final.classList.add("show");
    confirmBox.style.display = "block";
    wirePackConfirm(id);
  }, 3000);
}
function wirePackConfirm(itemId) {
  const btnYes = document.getElementById("packConfirmYes");
  const btnNo = document.getElementById("packConfirmNo");
  const overlay = document.getElementById("packOverlay");
  const final = document.getElementById("packFinal");
  const rays = document.querySelector("#packOverlay .pack-rays");
  const card = document.querySelector("#packOverlay .pack-card");
  const flashEl = document.getElementById("packFlash");
  const blocker = document.getElementById("packBlocker");
  if (!btnYes || !btnNo) return;
  const clean = () => {
    overlay.classList.remove("active");
    final.classList.remove("show");
    document.body.classList.remove("no-scroll");
    if (blocker) blocker.style.display = "none";
  };
  btnNo.onclick = clean;
  btnYes.onclick = () => {
    btnYes.disabled = btnNo.disabled = true;
    btnYes.style.opacity = btnNo.style.opacity = ".4";
    const confirmBoxEl = document.getElementById("packConfirm");
    if (confirmBoxEl) confirmBoxEl.classList.add("fade-out");
    packOpenStartTime = performance.now();
    packLog("Iniciando sequência");
    let step = 0;
    const maxStage = 6;
    const delays = [650, 550, 500, 450, 400, 350];
    let revealScheduled = false;
    const startSequence = () => {
      const advance = () => {
        step++;
        if (rays) {
          rays.classList.remove(
            "rays-accel-1",
            "rays-accel-2",
            "rays-accel-3",
            "rays-accel-4",
            "rays-accel-5",
            "rays-accel-6"
          );
          rays.classList.add("rays-accel-" + Math.min(step, maxStage));
        }
        if (card) {
          card.classList.remove(
            "pack-shake-1",
            "pack-shake-2",
            "pack-shake-3",
            "pack-shake-4",
            "pack-shake-5",
            "pack-shake-6",
            "pack-vanish"
          );
          if (step <= maxStage) {
            card.classList.add("pack-shake-" + step);
            packLog("Etapa " + step);
          }
          if (step === maxStage + 1) {
            card.classList.add("pack-vanish");
            if (flashEl) {
              flashEl.classList.remove("flash-go");
              void flashEl.offsetWidth;
              flashEl.classList.add("flash-go");
            }
            const confirmBoxEl = document.getElementById("packConfirm");
            if (confirmBoxEl) confirmBoxEl.style.display = "none";
            const fullFlash = document.getElementById("fullFlash");
            if (fullFlash) {
              fullFlash.classList.remove("show");
              void fullFlash.offsetWidth;
              fullFlash.classList.add("show");
            }
            if (!revealScheduled) {
              revealScheduled = true;
              setTimeout(() => {
                generatePackCards()
                  .then(async () => {
                    await insertPackCardsToInventory();
                    clean();
                    startCardReveal();
                    const overlayCR =
                      document.getElementById("cardRevealOverlay");
                    if (overlayCR && !overlayCR.classList.contains("active"))
                      overlayCR.classList.add("active");
                  })
                  .catch(() => {
                    const overlayCR =
                      document.getElementById("cardRevealOverlay");
                    if (overlayCR) overlayCR.classList.add("active");
                  });
              }, 200);
            }
          }
        }
        if (step <= maxStage) {
          setTimeout(advance, delays[step - 1] || 320);
        }
      };
      advance();
    };
    setTimeout(startSequence, 360);
  };
}

function startCardReveal() {
  const overlay = document.getElementById("cardRevealOverlay");
  const img = document.getElementById("currentCardImg");
  const btnPrev = document.getElementById("cardPrevBtn");
  const btnNext = document.getElementById("cardNextBtn");
  const btnReveal = document.getElementById("revealCardBtn");
  if (!overlay || !img) return;
  const temp = document.getElementById("incomingCardTemp");
  if (temp) temp.remove();
  overlay.classList.add("active");
  document.body.classList.add("no-scroll");
  img.classList.remove(
    "card-slide-in-right",
    "card-slide-in-left",
    "card-slide-out-left",
    "card-slide-out-right"
  );
  void img.offsetWidth;
  img.classList.add("card-enter");
  updateCardRevealUI();
  btnPrev.onclick = () => navigateCard(-1);
  btnNext.onclick = () => navigateCard(1);
  btnReveal.onclick = () => revealCurrentCard();
}
function navigateCard(dir) {
  if (cardNavAnimating) return;
  const newIndex = currentCardIndex + dir;
  if (newIndex < 0 || newIndex >= currentPackCards.length) return;
  const viewport = document.getElementById("cardRevealViewport");
  const currentImg = document.getElementById("currentCardImg");
  if (!viewport || !currentImg) return;
  cardNavAnimating = true;
  currentImg.classList.remove(
    "card-slide-in-right",
    "card-slide-in-left",
    "card-enter"
  );
  currentImg.classList.add(
    dir > 0 ? "card-slide-out-left" : "card-slide-out-right"
  );
  currentImg.style.position = "absolute";
  const incoming = document.createElement("img");
  incoming.id = "incomingCardTemp";
  incoming.src = "versocarta.svg";
  incoming.alt = "Carta";
  incoming.style.position = "absolute";
  incoming.className = dir > 0 ? "card-slide-in-right" : "card-slide-in-left";
  viewport.appendChild(incoming);
  currentCardIndex = newIndex;
  updateCardRevealUI();
  currentImg.addEventListener("animationend", () => currentImg.remove(), {
    once: true,
  });
  incoming.addEventListener(
    "animationend",
    () => {
      incoming.id = "currentCardImg";
      incoming.style.position = "";
      cardNavAnimating = false;
    },
    { once: true }
  );
}
function updateCardRevealUI() {
  const btnPrev = document.getElementById("cardPrevBtn");
  const btnNext = document.getElementById("cardNextBtn");
  const btnReveal = document.getElementById("revealCardBtn");
  const cardImg = document.getElementById("currentCardImg");
  const data = currentPackCards[currentCardIndex] || {};
  if (!btnPrev || !btnNext || !btnReveal || !cardImg) return;
  const total = currentPackCards.length;
  if (total === 0) {
    btnPrev.classList.add("hidden");
    btnNext.classList.add("hidden");
    btnReveal.classList.add("hidden");
    return;
  }
  if (currentCardIndex >= total) currentCardIndex = 0;
  if (currentCardIndex === 0) btnPrev.classList.add("hidden"); else btnPrev.classList.remove("hidden");
  if (currentCardIndex === total - 1) btnNext.classList.add("hidden"); else btnNext.classList.remove("hidden");
  btnReveal.classList.remove("hidden");
  btnReveal.textContent =
    "Revelar Carta (" + (currentCardIndex + 1) + " de " + total + ")";
  if (data.revealed) {
    cardImg.src = data.product?.imageUrl || "versocarta.svg";
    cardImg.alt = data.product?.name || "Carta";
    let info = document.getElementById("cardRevealInfo");
    if (!info) {
      info = document.createElement("div");
      info.id = "cardRevealInfo";
  info.className = "card-reveal-info";
      cardImg.parentNode.appendChild(info);
    }
    info.innerHTML = `${
      data.product?.name || ""
    } <span class='card-reveal-rarity'>(${data.rarity?.toUpperCase()})</span>`;
  } else {
    cardImg.src = "versocarta.svg";
    cardImg.alt = "Carta";
    const info = document.getElementById("cardRevealInfo");
    if (info) info.remove();
  }
}
function revealCurrentCard() {
  if (currentPackCards[currentCardIndex])
    currentPackCards[currentCardIndex].revealed = true;
  updateCardRevealUI();
  const cardImg = document.getElementById("currentCardImg");
  if (cardImg) {
    cardImg.classList.remove(
      "reveal-anim-1",
      "reveal-anim-2",
      "reveal-anim-3",
      "reveal-anim-4",
      "reveal-anim-5"
    );
    void cardImg.offsetWidth;
    cardImg.classList.add("reveal-anim-" + (currentCardIndex + 1));
  }
  showSuccess("Carta " + (currentCardIndex + 1) + " revelada");
}

window.openPackItem = openPackItem;
