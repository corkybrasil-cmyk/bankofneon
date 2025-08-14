// js/alunos.js
// Cadastro e listagem de alunos usando Firebase Firestore

import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const db = getFirestore();

const cadastroForm = document.getElementById('cadastroAlunoForm');
const listaAlunos = document.getElementById('listaAlunos');

cadastroForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = document.getElementById('novoAlunoNome').value;
  const senha = document.getElementById('novoAlunoSenha').value;
  await addDoc(collection(db, 'alunos'), { nome, senha });
  document.getElementById('novoAlunoNome').value = '';
  document.getElementById('novoAlunoSenha').value = '';
  listarAlunos();
});

async function listarAlunos() {
  listaAlunos.innerHTML = '';
  const querySnapshot = await getDocs(collection(db, 'alunos'));
  querySnapshot.forEach((doc) => {
    const aluno = doc.data();
    const li = document.createElement('li');
    li.textContent = aluno.nome;
    listaAlunos.appendChild(li);
  });
}


// Cria usuário padrão para testes se não existir
async function criarUsuarioPadrao() {
  const querySnapshot = await getDocs(collection(db, 'alunos'));
  let existePadrao = false;
  querySnapshot.forEach((doc) => {
    const aluno = doc.data();
    if (aluno.nome === 'teste' && aluno.senha === '1234') {
      existePadrao = true;
    }
  });
  if (!existePadrao) {
    await addDoc(collection(db, 'alunos'), { nome: 'teste', senha: '1234' });
  }
}

criarUsuarioPadrao().then(listarAlunos);
