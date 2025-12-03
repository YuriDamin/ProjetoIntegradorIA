📌 Meu Kanban — Sistema Completo de Gestão de Tarefas

Um sistema moderno de Kanban desenvolvido com Next.js, Node.js, Express, PostgreSQL e uma interface elegante inspirada em ferramentas como Linear, Trello e Notion.

Este projeto inclui:

✔ Login / Registro com autenticação JWT

✔ Board Kanban dinâmico

✔ Criação, edição e exclusão de cartões

✔ Checklist com progresso automático

✔ Interface moderna com glassmorphism

✔ Ícone e identidade visual próprias

✔ Backend em Node.js estruturado em controllers / models

✔ Frontend com React + TailwindCSS


✔ Total integração entre front e back

🚀 Tecnologias Utilizadas
Frontend

Next.js 14 (App Router)

React

TailwindCSS

Lucide Icons

ShadCN UI

LocalStorage para persistência de usuário

Fetch API

Backend

Node.js

Express

JWT (Json Web Token)

Bcrypt

Sequelize ORM

PostgreSQL

Outros

Favicon próprio em múltiplos tamanhos

Arquitetura modular (controllers, models, routes)

🖥️ Demonstração da Interface
🔹 Topbar com nome do usuário + logout
🔹 Colunas Kanban com visual premium
🔹 Modal avançado de edição de cartões
🔹 Progresso automático via checklist
🔹 Tema dark com gradiente

📦 Funcionalidades
🔐 Autenticação

Cadastro de usuário

Login com token

Armazenamento seguro do token

Nome do usuário exibido no topo da página

📝 Cartões (Tasks)

Criar cartão

Editar dados completos:

título

descrição

prioridade

responsável

prazo

status interno

horas trabalhadas / estimadas

labels

checklist

Barra de progresso automática

Excluir cartão

🧱 Colunas (Kanban)

Backlog

Em andamento

Concluído

Cada coluna com seus cartões

Organização visual limpa e fluida

📂 Estrutura de Pastas
back/
  src/
    ai/
    config/
    controllers/
    models/
    routes/
    app.js
    server.js
  .env

front/
  app/
  components/
  public/
  styles/

⚙️ Como rodar o projeto
🔻 1. Clonar o repositório
git clone https://github.com/seu-usuario/seu-repo.git
cd seu-repo

🗄️ Backend
🔻 2. Entrar na pasta do backend
cd back

🔻 3. Instalar dependências
npm install

🔻 4. Configurar o .env

Crie o arquivo:

JWT_SECRET=seu_token_secreto
DB_HOST=localhost
DB_USER=postgres
DB_PASS=sua_senha
DB_NAME=kanban

🔻 5. Rodar servidor
npm run dev


Servidor sobe em:

http://localhost:3001

🖥️ Frontend
🔻 6. Entrar na pasta do front
cd ../front

🔻 7. Instalar dependências
npm install

🔻 8. Rodar o projeto Next.js
npm run dev


Acesse:

http://localhost:3000
