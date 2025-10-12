import express from "express";
import type { Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express4"; // Изменено на express4
import { graphqlUploadExpress, GraphQLUpload } from "graphql-upload-minimal";
import cors from "cors";
import cookieParser from "cookie-parser";

import prisma from "./lib/prismaClient.js";
import { typeDefs } from "./graphql/schema.js";
import { resolvers } from "./graphql/resolvers.js";

import { registerSocketHandlers } from "./sockets/socketHandler.js";
import avatarRoutes from "./routes/avatar.routes.js";

const app = express();

app.use(graphqlUploadExpress({ maxFileSize: 10_000_000, maxFiles: 1 }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers: {
    Upload: GraphQLUpload, // 👈 именно здесь
    ...resolvers,
  },
});

await apolloServer.start();

// Разрешаем CORS для всех источников (можно ограничить доменами)
app.use(
  cors({
    origin: "http://localhost:5173", // явно фронт
    credentials: true, // разрешаем cookie
  }),
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
  }),
);

app.use("/avatar", avatarRoutes);

registerSocketHandlers(io);

const PORT = 3000;
const API_URL = process.env.API_URL;
httpServer.listen(PORT, () => {
  console.log(`Server running at ${API_URL}`);
  console.log(`GraphQL endpoint at ${API_URL}/graphql`);
});
