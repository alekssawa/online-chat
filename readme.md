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
```


### 2. Backend
```bash
Копировать код
cd server
npm install
npx prisma migrate dev
npm run dev
```

Сервер поднимется на http://localhost:3000/graphql

### 3. Frontend
```bash
Копировать код
cd client
npm install
npm run dev
```

Открой http://localhost:5173

📂 Структура проекта
```bash
online-chat/
│── server/              # Backend (Express + GraphQL + Prisma)
│   └── src                  
│       ├── graphql/              # GraphQL слой
│       │   ├── resolvers/        # Резолверы (auth, message, room, user)
│       │   ├── resolvers.ts      # Индекс резолверов
│       │   ├── schema.ts         # GraphQL-схема
│       │   └── types.ts          # Типы
│       ├── lib/                  # Утилиты
│       │   ├── authDecorator.ts
│       │   ├── prismaClient.ts
│       │   └── tokenService.ts
│       ├── middlewares/          # Middleware
│       │   ├── auth.middleware.ts
│       │   └── refresh.middleware.ts
│       ├── sockets/              # WebSocket
│       │   └── socketHandler.ts
│       └── server.ts             # Точка входа (Express + GraphQL + WebSocket)
│
└── client/              # Frontend (React + TS)
    └── src/                      # Исходники React + TypeScript
        ├── assets/               # Медиа-файлы
        │   └── react.svg
        ├── components/           # Компоненты
        │   ├── messageView/      # UI для сообщений
        │   │   ├── messageBox/   # Один блок сообщения
        │   │   │   ├── MessageBox.tsx
        │   │   │   └── MessageBox.module.css
        │   │   ├── sendMessage/  # Форма отправки сообщений
        │   │   │   ├── SendMessage.tsx
        │   │   │   └── SendMessage.module.css
        │   │   ├── MessageView.tsx
        │   │   └── MessageView.module.css
        │   ├── roomsList/        # Список комнат
        │   │   ├── RoomsList.tsx
        │   │   └── RoomsList.module.css
        │   └── usersList/        # Список пользователей
        │       ├── UserList.tsx
        │       └── UserList.module.css
        │
        ├── hooks/                # Кастомные хуки
        │   └── useAuth.ts        # Аутентификация + refresh token
        ├── pages/                # Страницы
        │   ├── ChatRoom/         # Чат-страница
        │   │   ├── ChatRoom.tsx
        │   │   └── ChatRoom.module.css
        │   └── General/          # Главная + авторизация
        │       ├── authForm/     # Форма логина/регистрации
        │       │   ├── AuthForm.tsx
        │       │   └── AuthForm.module.css
        │       └── General.tsx
        │
        ├── styles/               # Глобальные стили
        │   ├── reset.css
        │   └── common.css
        ├── App.tsx               # Главный компонент
        ├── main.tsx              # Входная точка приложения
        └── vite-env.d.ts         # TypeScript типы для Vite
 
 

```

🔐 Аутентификация
```bash
Access Token хранится в localStorage
Refresh Token — в HTTP-only cookie
При истечении accessToken автоматически выполняется refreshToken
```
