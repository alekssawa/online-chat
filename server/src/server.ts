import express from "express";
import type { Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express4"; // Изменено на express4
import cors from "cors";
import cookieParser from "cookie-parser";
import prisma from "./lib/prismaClient.js";
import { typeDefs } from "./graphql/schema.js";
import { resolvers } from "./graphql/resolvers.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

const apolloServer = new ApolloServer({ typeDefs, resolvers });
await apolloServer.start();

// Разрешаем CORS для всех источников (можно ограничить доменами)
app.use(
  cors({
    origin: "http://localhost:5173", // явно фронт
    credentials: true, // разрешаем cookie
  })
);

// Если нужны JSON-запросы
app.use(express.json());
app.use(cookieParser());

// GraphQL
app.use(
  "/graphql",
  expressMiddleware(apolloServer, {
    context: async ({ req, res }) => {
      const { operationName } = req.body;
      const publicOperations = ["Register", "Login", "IntrospectionQuery"];

      // Если операция публичная — возвращаем контекст без проверки
      if (publicOperations.includes(operationName)) {
        return { prisma, req, res, user: null };
      }

      // Для остальных операций — токен можно проверять уже **в конкретных резолверах**
      // Просто возвращаем req/res и prisma, без глобального middleware
      return { prisma, req, res, user: null };
    },
  })
);

io.on("connection", (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);

  socket.on("joinRoom", (roomId) => {
    console.log(`➡️ Client ${socket.id} joining room ${roomId}`);
    socket.join(roomId);
    console.log(`✅ Client ${socket.id} joined rooms: ${Array.from(socket.rooms).join(", ")}`);
  });

  socket.on("leaveRoom", (roomId) => {
    console.log(`⬅️ Client ${socket.id} leaving room ${roomId}`);
    socket.leave(roomId);
    console.log(`✅ Client ${socket.id} remaining rooms: ${Array.from(socket.rooms).join(", ")}`);
  });

  socket.on("sendMessage", (message) => {
    console.log(`✉️ New message from ${socket.id} in room ${message.roomId}: ${message.text}`);
    io.to(message.roomId).emit("newMessage", message);
    console.log(`📤 Message emitted to room ${message.roomId}`);
  });

  socket.on("disconnect", (reason) => {
    console.log(`❌ Client disconnected: ${socket.id}, reason: ${reason}`);
  });
});

const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`GraphQL endpoint at http://localhost:${PORT}/graphql`);
});

// TODO: Argon2id для хеширования паролей
