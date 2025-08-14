
# ATENÇÃO IA/DESENVOLVEDOR
Antes de qualquer alteração no projeto, abra e leia este arquivo.
Ao final de cada alteração, registre aqui o que foi feito, removendo funcionalidades que não existem mais.

## Checklist para alterações:
- [ ] Abrir e ler o REFERENCIA.md antes de modificar qualquer arquivo.
- [ ] Registrar todas as alterações realizadas ao final do trabalho.
- [ ] Remover funcionalidades que foram excluídas do projeto.
- [ ] Manter este arquivo sempre atualizado para facilitar futuras manutenções.

# Documentação do Projeto: Bank of Neon

Este arquivo serve como referência para desenvolvedores e IAs que venham a dar continuidade ao projeto.

## Objetivo
Banco digital fictício para disciplina de educação financeira da escola Neon. Alunos ganham e gerenciam moeda digital (Neon Dollar).

## Estrutura Inicial
- `index.html`: Página de login do aluno.
- `alunos.html`: Página para visualizar e registrar alunos.
- `js/firebase-init.js`: Inicialização do Firebase.
- `js/alunos.js`: Lógica para cadastro e listagem de alunos.
- `style.css`: Estilos gerais.
- `README.md`: Instruções gerais.
- `.github/pages.yml`: Configuração do GitHub Pages.

## Firebase
- Utilizado para armazenar dados dos alunos e autenticação.
- Configuração em `js/firebase-init.js`.

### Como configurar o Firestore
1. No console do Firebase, acesse Firestore Database.
2. Crie um banco de dados (ex: bancodaneondb).
3. Crie uma coleção chamada `alunos` para armazenar os dados dos alunos.
4. Adicione campos como `nome`, `senha`, `saldo` conforme necessário.
5. Configure regras de segurança conforme o ambiente (teste/desenvolvimento/produção).

## Como continuar
- Consulte este arquivo para entender a estrutura e propósito de cada parte.
- Para adicionar funcionalidades, crie arquivos JS separados e documente aqui.

---

## Histórico de funcionalidades
- 2025-08-14: Estrutura inicial, login, cadastro e listagem de alunos.
