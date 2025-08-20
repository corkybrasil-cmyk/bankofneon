// Script para configurar categorias e subcategorias básicas do sistema
// Este script deve ser executado uma vez para configurar o banco

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBHU6yFDCKp9jm9tPGyRqQJFS3amewuuQY",
  authDomain: "crmdaneon.firebaseapp.com",
  projectId: "crmdaneon",
  storageBucket: "crmdaneon.firebasestorage.app",
  messagingSenderId: "564595832938",
  appId: "1:564595832938:web:16fb660d8d433ae5f3f213",
  measurementId: "G-D3G4M9F17R"
};

async function setupCategories() {
  console.log('🚀 Configurando categorias e subcategorias...');
  
  const app = initializeApp(firebaseConfig);
  await signInAnonymously(getAuth(app));
  
  let db;
  try {
    db = getFirestore(app, "bancodaneondb");
  } catch {
    db = getFirestore(app);
  }
  
  // Categorias principais
  const categorias = [
    {
      id: 'coleccionaveis',
      nome: 'Colecionáveis',
      descricao: 'Itens colecionáveis como cartas',
      ativo: true,
      ordem: 1
    },
    {
      id: 'consumiveis',
      nome: 'Consumíveis',
      descricao: 'Itens que podem ser consumidos ou usados',
      ativo: true,
      ordem: 2
    }
  ];
  
  // Subcategorias para cartas
  const subcategorias = [
    {
      id: 'cartas-comuns',
      nome: 'Cartas Comuns',
      categoria: 'coleccionaveis',
      descricao: 'Cartas comuns do jogo',
      ativo: true,
      ordem: 1
    },
    {
      id: 'cartas-raras',
      nome: 'Cartas Raras',
      categoria: 'coleccionaveis',
      descricao: 'Cartas raras do jogo',
      ativo: true,
      ordem: 2
    },
    {
      id: 'cartas-epicas',
      nome: 'Cartas Épicas',
      categoria: 'coleccionaveis',
      descricao: 'Cartas épicas do jogo',
      ativo: true,
      ordem: 3
    },
    {
      id: 'cartas-lendarias',
      nome: 'Cartas Lendárias',
      categoria: 'coleccionaveis',
      descricao: 'Cartas lendárias do jogo',
      ativo: true,
      ordem: 4
    },
    {
      id: 'pack-de-cartas',
      nome: 'Pack de Cartas',
      categoria: 'consumiveis',
      descricao: 'Pacotes que contêm cartas aleatórias',
      ativo: true,
      ordem: 1
    }
  ];
  
  // Criar categorias
  console.log('📂 Criando categorias...');
  for (const categoria of categorias) {
    const docRef = doc(db, 'loja', 'config', 'categorias', categoria.id);
    await setDoc(docRef, categoria);
    console.log(`✅ Categoria criada: ${categoria.nome}`);
  }
  
  // Criar subcategorias
  console.log('📋 Criando subcategorias...');
  for (const subcategoria of subcategorias) {
    const docRef = doc(db, 'loja', 'config', 'subcategorias', subcategoria.id);
    await setDoc(docRef, subcategoria);
    console.log(`✅ Subcategoria criada: ${subcategoria.nome}`);
  }
  
  console.log('🎉 Configuração concluída!');
}

// Executar se for chamado diretamente
if (typeof window !== 'undefined') {
  setupCategories().catch(console.error);
}

export default setupCategories;
