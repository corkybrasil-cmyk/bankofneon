// js/alunos.js
// Cadastro e listagem de alunos usando Firebase Firestore

import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

let db;
try {
  db = getFirestore();
  console.log('[Alunos] Firestore obtido com sucesso');
} catch (firestoreError) {
  console.error('[Alunos] Erro ao obter Firestore:', firestoreError?.message || firestoreError);
}

const cadastroForm = document.getElementById('cadastroAlunoForm');
const listaAlunos = document.getElementById('listaAlunos');

cadastroForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!db) {
    console.error('[Alunos] Firestore indisponível ao cadastrar');
    return;
  }
  try {
    const nome = document.getElementById('novoAlunoNome').value;
    const senha = document.getElementById('novoAlunoSenha').value;
    if (!nome || !senha) {
      console.warn('[Alunos] Cadastro com campos vazios');
      return;
    }
    console.log('[Alunos] Adicionando documento', { collection: 'alunos', nome });
    await addDoc(collection(db, 'alunos'), { nome, senha });
    document.getElementById('novoAlunoNome').value = '';
    document.getElementById('novoAlunoSenha').value = '';
    listarAlunos();
  } catch (addError) {
    const code = addError?.code;
    if (code) {
      switch (code) {
        case 'permission-denied':
          console.error('[Alunos] Escrita bloqueada pelas Regras do Firestore. Ajuste permissões.');
          break;
        case 'unavailable':
          console.error('[Alunos] Firestore indisponível (rede/offline) ao adicionar.');
          break;
        default:
          console.error(`[Alunos] Erro Firestore (${code}) ao adicionar:`, addError?.message || addError);
      }
    } else {
      console.error('[Alunos] Erro ao adicionar aluno:', addError?.message || addError);
    }
  }
});

async function listarAlunos() {
  if (!db) {
    console.error('[Alunos] Firestore indisponível ao listar');
    return;
  }
  try {
    listaAlunos.innerHTML = '';
    console.log('[Alunos] Buscando lista de alunos');
    const querySnapshot = await getDocs(collection(db, 'alunos'));
    let count = 0;
    querySnapshot.forEach((docRef) => {
      const aluno = docRef.data();
      const li = document.createElement('li');
      li.textContent = aluno.nome;
      listaAlunos.appendChild(li);
      count += 1;
    });
    console.log('[Alunos] Total de alunos listados:', count);
  } catch (listError) {
    const code = listError?.code;
    if (code) {
      switch (code) {
        case 'permission-denied':
          console.error('[Alunos] Leitura bloqueada pelas Regras do Firestore. Ajuste permissões.');
          break;
        case 'unavailable':
          console.error('[Alunos] Firestore indisponível (rede/offline).');
          break;
        default:
          console.error(`[Alunos] Erro Firestore (${code}):`, listError?.message || listError);
      }
    } else {
      console.error('[Alunos] Erro ao listar alunos:', listError?.message || listError);
    }
  }
}


// Cria usuário padrão para testes se não existir
async function criarUsuarioPadrao() {
  if (!db) {
    console.error('[Alunos] Firestore indisponível ao criar usuário padrão');
    return;
  }
  try {
    const querySnapshot = await getDocs(collection(db, 'alunos'));
    let existePadrao = false;
    querySnapshot.forEach((docRef) => {
      const aluno = docRef.data();
      if (aluno.nome === 'teste' && aluno.senha === '1234') {
        existePadrao = true;
      }
    });
    if (!existePadrao) {
      console.warn('[Alunos] Criando usuário padrão teste/1234 (apenas para desenvolvimento)');
      await addDoc(collection(db, 'alunos'), { nome: 'teste', senha: '1234' });
    }
  } catch (seedError) {
    const code = seedError?.code;
    if (code) {
      switch (code) {
        case 'permission-denied':
          console.error('[Alunos] Regras bloquearam a semeadura do usuário de teste.');
          break;
        case 'unavailable':
          console.error('[Alunos] Firestore indisponível durante semeadura.');
          break;
        default:
          console.error(`[Alunos] Erro Firestore (${code}) na semeadura:`, seedError?.message || seedError);
      }
    } else {
      console.error('[Alunos] Erro ao verificar/criar usuário padrão:', seedError?.message || seedError);
    }
  }
}

criarUsuarioPadrao().then(listarAlunos).catch((e) => console.error('[Alunos] Erro ao inicializar lista:', e?.message || e));
