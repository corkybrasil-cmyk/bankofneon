// js/login.js
// Lógica de login do aluno usando Firebase Firestore

import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const db = getFirestore();

const loginForm = document.getElementById('loginForm');
const loginMsg = document.getElementById('loginMsg');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = document.getElementById('alunoNome').value;
  const senha = document.getElementById('alunoSenha').value;

  const alunosRef = collection(db, 'alunos');
  const q = query(alunosRef, where('nome', '==', nome), where('senha', '==', senha));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    loginMsg.textContent = 'Login realizado com sucesso!';
    // Redirecionar ou mostrar dashboard
  } else {
    loginMsg.textContent = 'Nome ou senha incorretos.';
  }
});
