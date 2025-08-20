# Guia Completo: Firebase/Firestore - Banco da Neon

## Visão Geral da Estrutura de Dados

### **Configuração do Projeto Firebase**
- **Project ID**: `crmdaneon`
- **Auth Domain**: `crmdaneon.firebaseapp.com`
- **Database ID**: `bancodaneondb` (multi-database setup)
- **Storage Bucket**: `crmdaneon.firebasestorage.app`

### **Estrutura das Coleções Principais**

```
bancodaneondb/
├── inventario/
│   └── {userId}/
│       └── inventarioAluno/
│           └── {itemId}/
│               ├── quantidade: number
│               ├── categoria: string
│               ├── subcategoria: string
│               ├── preco: number
│               └── [outros campos do item]
│
├── loja/
│   └── config/
│       ├── categorias/
│       │   └── {categoriaId}/
│       │       ├── nome: string
│       │       ├── icone: string
│       │       └── ordem: number
│       │
│       ├── subcategorias/
│       │   └── {subcategoriaId}/
│       │       ├── nome: string
│       │       ├── categoria: string (referência)
│       │       └── ordem: number
│       │
│       └── produtos/
│           └── {produtoId}/
│               ├── nome: string
│               ├── preco: number
│               ├── categoria: string
│               ├── subcategoria: string
│               ├── imagem: string (URL)
│               └── descricao: string
│
├── alunos/
│   └── {alunoId}/
│       ├── nome: string
│       ├── email: string
│       ├── saldo: number
│       ├── dataCriacao: timestamp
│       └── ativo: boolean
│
├── ocorrencias/
│   └── {ocorrenciaId}/
│       ├── tipo: string
│       ├── valor: number
│       ├── data: timestamp
│       ├── usuario: string
│       └── descricao: string
│
└── pix/
    └── {pixId}/
        ├── valor: number
        ├── status: string
        ├── data: timestamp
        └── usuario: string
```

## Importação e Configuração do Firebase

### **1. Imports Básicos**

```javascript
// Imports essenciais do Firebase v12.1.0
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Imports para operações com Firestore
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Imports para Storage (se necessário)
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";
```

### **2. Configuração do Firebase**

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBHU6yFDCKp9jm9tPGyRqQJFS3amewuuQY",
  authDomain: "crmdaneon.firebaseapp.com",
  projectId: "crmdaneon",
  storageBucket: "crmdaneon.firebasestorage.app",
  messagingSenderId: "564595832938",
  appId: "1:564595832938:web:16fb660d8d433ae5f3f213",
  measurementId: "G-D3G4M9F17R"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Autenticação anônima
const auth = getAuth(app);
await signInAnonymously(auth);

// Firestore com database específico
let db;
try {
  db = getFirestore(app, "bancodaneondb");
} catch {
  db = getFirestore(app); // fallback para default
}

// Storage
const storage = getStorage(app, "gs://crmdaneon.firebasestorage.app");
```

## Exemplos de Operações CRUD

### **1. Leitura de Dados**

```javascript
// Ler inventário de um usuário
async function lerInventarioUsuario(userId) {
  const inventarioRef = collection(db, 'inventario', userId, 'inventarioAluno');
  const snapshot = await getDocs(inventarioRef);
  
  const items = [];
  snapshot.forEach(doc => {
    items.push({
      id: doc.id,
      ...doc.data()
    });
  });
  
  return items;
}

// Ler um documento específico
async function lerItem(userId, itemId) {
  const itemRef = doc(db, 'inventario', userId, 'inventarioAluno', itemId);
  const docSnap = await getDoc(itemRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  } else {
    return null;
  }
}

// Query com filtros
async function lerItensPorCategoria(userId, categoria) {
  const inventarioRef = collection(db, 'inventario', userId, 'inventarioAluno');
  const q = query(
    inventarioRef, 
    where("categoria", "==", categoria),
    orderBy("nome")
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
```

### **2. Criação de Dados**

```javascript
// Adicionar item ao inventário
async function adicionarItem(userId, itemData) {
  const inventarioRef = collection(db, 'inventario', userId, 'inventarioAluno');
  const docRef = await addDoc(inventarioRef, itemData);
  return docRef.id;
}

// Adicionar com ID específico
async function adicionarItemComId(userId, itemId, itemData) {
  const itemRef = doc(db, 'inventario', userId, 'inventarioAluno', itemId);
  await setDoc(itemRef, itemData);
}
```

### **3. Atualização de Dados**

```javascript
// Atualizar quantidade de um item
async function atualizarQuantidade(userId, itemId, novaQuantidade) {
  const itemRef = doc(db, 'inventario', userId, 'inventarioAluno', itemId);
  await updateDoc(itemRef, {
    quantidade: novaQuantidade
  });
}

// Atualizar múltiplos campos
async function atualizarItem(userId, itemId, dadosAtualizados) {
  const itemRef = doc(db, 'inventario', userId, 'inventarioAluno', itemId);
  await updateDoc(itemRef, dadosAtualizados);
}
```

### **4. Exclusão de Dados**

```javascript
// Excluir item do inventário
async function excluirItem(userId, itemId) {
  const itemRef = doc(db, 'inventario', userId, 'inventarioAluno', itemId);
  await deleteDoc(itemRef);
}

// Excluir múltiplos itens
async function excluirMultiplosItens(userId, itemIds) {
  const deletePromises = itemIds.map(itemId => {
    const itemRef = doc(db, 'inventario', userId, 'inventarioAluno', itemId);
    return deleteDoc(itemRef);
  });
  
  await Promise.all(deletePromises);
}
```

## Tratamento de Erros

```javascript
async function operacaoComTratamentoDeErro() {
  try {
    // Sua operação aqui
    const resultado = await lerInventarioUsuario(userId);
    return resultado;
  } catch (error) {
    console.error('Erro na operação:', error);
    
    // Verificar tipos específicos de erro
    if (error.code === 'permission-denied') {
      throw new Error('Acesso negado. Verifique as permissões.');
    } else if (error.code === 'unavailable') {
      throw new Error('Serviço temporariamente indisponível.');
    } else {
      throw new Error(`Erro inesperado: ${error.message}`);
    }
  }
}
```

## Boas Práticas

### **1. Otimização de Queries**
- Use `limit()` para paginar resultados grandes
- Crie índices compostos para queries complexas
- Use `startAfter()` para paginação eficiente

### **2. Segurança**
- Sempre valide dados antes de salvar
- Use regras de segurança do Firestore
- Não confie apenas na validação do frontend

### **3. Performance**
- Minimize o número de reads
- Use operações em lote quando possível
- Cache dados localmente quando apropriado

### **4. Monitoramento**
- Sempre adicione logs para operações críticas
- Use try/catch em todas as operações assíncronas
- Monitore o uso de reads/writes

## Estrutura de Sessão do Usuário

```javascript
// Formato do localStorage "bn.currentUser"
{
  "user": "identificador_do_usuario",
  "nome": "Nome do Usuário",
  "email": "email@exemplo.com",
  "timestamp": 1692547200000,
  "ativo": true
}
```
