# Configuração Firebase
```js
const firebaseConfig = {
  apiKey: "AIzaSyBHU6yFDCKp9jm9tPGyRqQJFS3amewuuQY",
  authDomain: "crmdaneon.firebaseapp.com",
  projectId: "crmdaneon",
  storageBucket: "crmdaneon.firebasestorage.app",
  messagingSenderId: "564595832938",
  appId: "1:564595832938:web:16fb660d8d433ae5f3f213",
  measurementId: "G-D3G4M9F17R"
};
```
# Estrutura do Firestore: bancodaneondb

## Coleções

### 1. alunos
- Cada documento representa um aluno.
- O `docId` é igual ao campo `user`.
- Exemplo de documento (docId = marcel, user = marcelrpg):
  - ativo: true (boolean)
  - classe: "aluno" (string)
  - firstName: "Marcel" (string)
  - lastName: "Tasso" (string)
  - password: "1q2w3e4r" (string)
  - periodo: "manhã" (string)
  - quandoRegistrou: timestamp
  - saldo: 9999500 (number)
  - user: "marcelrpg" (string)
- Subcoleção: `extrato`
  - Exemplo de documento:
    - amount: 0 (number)
    - dateTime: timestamp
    - description: "Abertura de conta" (string)
    - isEarn: true (boolean)
    - saldoFinal: 1000 (number)
    - saldoInicial: 1000 (number)

### 2. inventario
- Cada documento tem o nome igual ao campo `user` (ex: "marcelrpg").
- Subcoleção: `inventarioAluno`
  - Cada documento tem o nome do produto da loja (ex: "Pack de 5 cartas").

### 3. loja
- Documento único: `config`
- Subcoleções:
  - categorias
  - produtos
  - subcategorias

---

## Resumo visual
- bancodaneondb
  - alunos
    - <docId = user>
      - campos: ativo, classe, firstName, lastName, password, periodo, quandoRegistrou, saldo, user
      - extrato (subcoleção)
        - <docId>
          - campos: amount, dateTime, description, isEarn, saldoFinal, saldoInicial
  - inventario
    - <docId = user>
      - inventarioAluno (subcoleção)
        - <docId = nome do produto>
  - loja
    - config
      - categorias (subcoleção)
      - produtos (subcoleção)
      - subcategorias (subcoleção)

---


## Observações
- O campo `user` dentro do documento de aluno é igual ao docId do inventário.
- Para buscar o inventário de um aluno: inventario/<user>/inventarioAluno
- Para buscar o extrato de um aluno: alunos/<docId>/extrato
- Para buscar produtos, categorias e subcategorias da loja: loja/config/<subcoleção>

## Storage (Firebase)
- Pasta `imagemAlunos`: armazena as imagens dos alunos.
- Pasta `imagemLoja`: armazena as imagens dos produtos da loja.
