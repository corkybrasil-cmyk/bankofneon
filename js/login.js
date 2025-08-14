// js/login.js
// Lógica de login do aluno usando Firebase Firestore

import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

let db;
try {
  db = getFirestore(undefined, 'bancodaneondb');
  console.log('[Login] Firestore obtido com sucesso (db: bancodaneondb)');
} catch (firestoreError) {
  console.error('[Login] Erro ao obter Firestore:', firestoreError?.message || firestoreError);
}

const loginForm = document.getElementById('loginForm');
const loginMsg = document.getElementById('loginMsg');
const loginButton = loginForm?.querySelector('button[type="submit"]');
let isSubmitting = false;

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (isSubmitting) return;
  if (!db) {
    loginMsg.textContent = 'Erro de inicialização do banco. Veja o console.';
    console.error('[Login] Firestore indisponível. Verifique a inicialização do Firebase.');
    return;
  }
  try {
    isSubmitting = true;
    if (loginButton) {
      loginButton.disabled = true;
      loginButton.textContent = 'Entrando...';
    }
    loginMsg.textContent = 'Verificando credenciais...';
    const nome = document.getElementById('alunoNome').value;
    const senha = document.getElementById('alunoSenha').value;
    if (!nome || !senha) {
      loginMsg.textContent = 'Preencha usuário e senha.';
      return;
    }

    const alunosRef = collection(db, 'alunos');
    // Ajuste para os campos do seu Firestore: user / password
    const q = query(alunosRef, where('user', '==', nome), where('password', '==', senha));

    console.log('[Login] Executando consulta no Firestore', { collection: 'alunos', filtros: { nome, senhaMasked: senha ? '***' : '' } });
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      console.log('[Login] Login bem-sucedido para usuário:', nome);
      loginMsg.textContent = 'Login realizado com sucesso!';
      setTimeout(() => {
        window.location.href = 'alunos.html';
      }, 500);
    } else {
      console.warn('[Login] Nenhum documento correspondente para usuário fornecido');
      loginMsg.textContent = 'Nome ou senha incorretos.';
    }
  } catch (loginError) {
    const code = loginError?.code;
    if (code) {
      switch (code) {
        case 'permission-denied':
          console.error('[Login] Regras do Firestore bloquearam a leitura. Ajuste as Firestore Rules para permitir leitura da coleção alunos no ambiente atual.');
          break;
        case 'failed-precondition':
          console.error('[Login] Índice composto ausente para consulta em (nome, senha). Crie um índice composto para a coleção alunos (nome ASC, senha ASC).');
          break;
        case 'unavailable':
          console.error('[Login] Rede/Firestore indisponível. Verifique conexão com a internet ou status do Firebase.');
          break;
        default:
          console.error(`[Login] Erro Firestore (${code}):`, loginError?.message || loginError);
      }
    } else {
      console.error('[Login] Erro durante a consulta de login:', loginError?.message || loginError);
    }
    loginMsg.textContent = 'Erro ao realizar login. Veja o console.';
  } finally {
    isSubmitting = false;
    if (loginButton) {
      loginButton.disabled = false;
      loginButton.textContent = 'Entrar';
    }
  }
});
