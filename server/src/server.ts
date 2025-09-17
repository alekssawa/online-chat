import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express4"; // Изменено на express4
import bodyParser from "body-parser";
import cors from "cors";
import prisma from "./prismaClient.js";
import { typeDefs } from "./graphql/schema.js";
import { resolvers } from "./graphql/resolvers.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

const apolloServer = new ApolloServer({ typeDefs, resolvers });
await apolloServer.start();

app.use(
  "/graphql",
  cors(),
  express.json(),
  expressMiddleware(apolloServer, {
    context: async ({ req }) => ({ prisma, req }),
  }),
);
io.on("connection", (socket) => {
  console.log(socket.id, "connected");

  // socket.on("chat message", async (msg: { userId: number; roomId: number; text: string }) => {
  //   const message = await prisma.message.create({
  //     data: { text: msg.text, roomId: msg.roomId, senderId: msg.userId },
  //   });
  //   io.emit("chat message", message);
  // });

  socket.on("disconnect", () => {
    console.log(socket.id, "disconnected");
  });
});

const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`GraphQL endpoint at http://localhost:${PORT}/graphql`);
});


// TODO: Argon2id для хеширования паролей