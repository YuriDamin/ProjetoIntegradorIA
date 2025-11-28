Meu Kanban — Sistema Completo de Gestão de Tarefas

Um sistema moderno de Kanban desenvolvido com Next.js, Node.js, Express, PostgreSQL e uma interface elegante inspirada em ferramentas como Linear, Trello e Notion.

Funcionalidades principais:
- Login e registro com autenticação JWT
- Board Kanban dinâmico
- Criação, edição e exclusão de cartões
- Checklist com progresso automático
- Interface moderna com glassmorphism
- Backend Node + Express + PostgreSQL
- Frontend Next.js 14 + TailwindCSS
- Identidade visual própria com favicon

Tecnologias:
Frontend: Next.js, React, TailwindCSS, ShadCN, Lucide Icons
Backend: Node.js, Express, Sequelize, PostgreSQL, JWT, Bcrypt

Como rodar o projeto:

1. Backend
- Entre na pasta /back
- Crie e configure o arquivo .env:
  JWT_SECRET=seu_token
  DB_HOST=localhost
  DB_USER=postgres
  DB_PASS=sua_senha
  DB_NAME=kanban
- Rode:
  npm install
  npm run dev

2. Frontend
- Entre na pasta /front
- Rode:
  npm install
  npm run dev
- Acesse:
  http://localhost:3000
