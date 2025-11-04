# 💡 ChatApp

ChatApp is a modern real-time communication platform designed to facilitate seamless messaging between users. Leveraging cutting-edge technologies, it offers features such as user authentication, real-time chat capabilities, and privacy settings.

---

## ✨ Features
- 🔑 **User Authentication and Authorization**: Secure login and registration with token-based session management.
- 💬 **Real-Time Communication**: Instant messaging and group chats using WebSockets.
- ⚙️ **Admin Dashboard for Management**: Tools for monitoring users and managing server configurations.
- 📝 **Message History**: Persistent storage of chat history using Prisma ORM.
- 🔍 **Search Functionality**: Easy search within messages and user directories.
- 💻 **Responsive Design**: Cross-platform compatibility on desktops, tablets, and mobile devices.

---

## 🛠️ Tech Stack

**Backend:**
- Node.js + Express  
- GraphQL + Apollo Server  
- Prisma ORM  
- PostgreSQL  

**Frontend:**
- React + Vite  
- TypeScript  
- Apollo Client  

---

## 🚀 Getting Started

To set up and run the project locally, follow these steps:

1. **Clone the repository**

   ```bash
   git clone https://github.com/alekssawa/chatapp.git
   cd chatapp
   ```

2. **Install dependencies for both frontend and backend**

   - Navigate to the client directory and install dependencies:
     ```bash
     cd client
     npm install
     ```
   - Navigate back to the root directory, then into the server directory, and install dependencies:
     ```bash
     cd ../server
     npm install
     ```

3. **Configure environment variables**

   - For the backend, create a `.env` file in the `server` directory with configurations such as database connection strings and secret keys, for example:
   ```
  DATABASE_URL=""

  API_URL="http://localhost:3000"

  JWT_SECRET=""
  JWT_REFRESH_SECRET=""

  ACCESS_TOKEN_EXPIRY="1d"
  REFRESH_TOKEN_EXPIRY="7d"
   ```

4. **Start the development servers**

   - Start the frontend server:
     ```bash
     cd client
     npm run dev
     ```
   - In another terminal, start the backend server:
     ```bash
     cd ../server
     npm run dev
     ```

5. **Access the application**

   Open your web browser and navigate to `http://localhost:3000` (default port for Vite) to access the ChatApp interface.

---

## 📂 Project Overview

### Client
- **eslint.config.js**: Configuration file for ESLint.
- **public/**: Static assets directory, including a README.md file.
- **src/**: Source code directory containing components, context, hooks, pages, styles, and utilities.
  - **apollo/client.ts**: Apollo client setup.
  - **components/**: Reusable React components such as chat lists, message boxes, and user panels.
  - **context/AuthContext.ts** and **context/AuthProvider.tsx**: Authentication context for managing user sessions.
  - **hooks/useAuth.ts** and **hooks/useAuthClient.ts**: Custom hooks for authentication.
  - **pages/**: Main pages like AuthPage and ChatPage.
  - **styles/**: CSS/SCSS files.
  - **types/**: TypeScript type definitions.
  - **utills/**: Utility functions.
- **tsconfig.app.json**, **tsconfig.json**, **tsconfig.node.json**: TypeScript configuration files.
- **vite.config.ts**: Vite configuration file.

### Server
- **package-lock.json** and **package.json**: Dependency management files.
- **prisma/**: Prisma ORM configuration directory.
- **src/generated/prisma/**: Generated Prisma client files.
- **src/graphql/resolvers/**: GraphQL resolvers for different entities.
- **src/lib/**: Utility libraries like authentication decorators and token services.
- **src/middlewares/**: Middleware functions for request handling.
- **src/prisma/migrations/**: Database migration scripts.
- **src/routes/**: API routes.
- **src/sockets/**: Socket handler for real-time communication.
- **tsconfig.json**: TypeScript configuration file.

---