# 💬 Online Chat App

Проект **онлайн-чата** с использованием **GraphQL, Prisma, Express и React**.  
Поддерживает регистрацию, авторизацию через JWT + Refresh Token, создание комнат и обмен сообщениями в реальном времени.

---

## ✨ Функционал

- 🔑 Регистрация и авторизация пользователей  
- 👤 Профиль пользователя (email + имя)  
- 💬 Создание и подключение к комнатам  
- 📨 Отправка и редактирование сообщений  
- ⏱️ Автоматическое обновление `updatedAt` при изменении сообщений  
- 🔄 Refresh Token механизм для продления сессии  

---

## 🛠️ Стек технологий

**Backend**:
- [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/)  
- [GraphQL](https://graphql.org/) + [Apollo Server](https://www.apollographql.com/docs/apollo-server/)  
- [Prisma ORM](https://www.prisma.io/)  
- [PostgreSQL](https://www.postgresql.org/)  

**Frontend**:
- [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)  
- [TypeScript](https://www.typescriptlang.org/)  
- [Apollo Client](https://www.apollographql.com/docs/react/)  

---

## 🚀 Запуск проекта

### 1. Клонирование
```bash
git clone https://github.com/your-username/online-chat.git
cd online-chat
2. Backend
bash
Копировать код
cd server
npm install
npx prisma migrate dev
npm run dev
Сервер поднимется на http://localhost:3000/graphql

3. Frontend
bash
Копировать код
cd client
npm install
npm run dev
Открой http://localhost:5173

📂 Структура проекта
graphql
Копировать код
online-chat/
│── server/              # Backend (Express + GraphQL + Prisma)
│   ├── prisma/          # Схемы и миграции
│   ├── resolvers/       # GraphQL-резолверы
│   ├── schema.graphql   # Описание схемы
│   └── index.ts         # Точка входа
│
│── client/              # Frontend (React + TS)
│   ├── src/
│   │   ├── components/  # Компоненты (RoomsList, ChatWindow и т.д.)
│   │   ├── hooks/       # Хуки (useAuth, useCart и т.д.)
│   │   └── App.tsx      # Главный компонент
│
└── README.md
🔐 Аутентификация
Access Token хранится в localStorage

Refresh Token — в HTTP-only cookie

При истечении accessToken автоматически выполняется refreshToken