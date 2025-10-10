import { Server } from "socket.io";
import prisma from "../lib/prismaClient.js";
import { v4 as uuidv4 } from "uuid";

import type { User, Message} from "../../src/graphql/types.js";

// interface User {
//   id: string;
//   name: string;
// }

// interface Message {
//   id: string;
//   text: string;
//   senderId: string;
//   roomId: string;
//   sentAt: string;
//   updatedAt: string;
//   sender?: User;
// }

// Хранилище онлайн-статусов
const onlineUsers = new Map<string, boolean>();

export function registerSocketHandlers(io: Server) {
  io.on("connection", (socket) => {
    const userId = socket.handshake.auth.userId;
    if (!userId) return;

    console.log(`✅ Socket connected: ${socket.id}, userId=${userId}`);

    // Помечаем пользователя онлайн
    onlineUsers.set(userId, true);

    // 1️⃣ Отправляем новому сокету весь текущий список онлайн
    const currentOnline = Array.from(onlineUsers.entries()).map(
      ([id, online]) => ({ userId: id, online }),
    );
    socket.emit("onlineUsersList", currentOnline);

    // 2️⃣ Сообщаем остальным, что этот пользователь онлайн
    socket.broadcast.emit("userStatusChanged", { userId, online: true });

    socket.on("joinRoom", (roomId: string) => {
      console.log(`👥 ${userId} joined room ${roomId}`);
      socket.join(roomId);
    });

    socket.on("leaveRoom", (roomId: string) => {
      console.log(`🚪 ${userId} left room ${roomId}`);
      socket.leave(roomId);
    });

    socket.on(
      "sendMessage",
      async (data: {
        text: string;
        roomId: string;
        senderId: string;
        sender: { id: string; name: string };
      }) => {
        try {
          const savedMessage = await prisma.messages.create({
            data: {
              id: uuidv4(),
              text: data.text,
              roomId: data.roomId,
              senderId: data.senderId,
            },
            include: { sender: true },
          });

          const message: Message = {
            id: savedMessage.id,
            text: savedMessage.text,
            senderId: savedMessage.senderId,
            roomId: savedMessage.roomId,
            sentAt: savedMessage.sentAt.toISOString(),
            updatedAt: savedMessage.updatedAt.toISOString(),
            sender: savedMessage.sender,
          };

          io.to(data.roomId).emit("newMessage", message);
        } catch (err) {
          console.error(err);
          socket.emit("errorMessage", {
            message: "Не удалось отправить сообщение",
          });
        }
      },
    );

    socket.on("disconnect", () => {
      console.log(`❌ Socket disconnected: ${socket.id}, userId=${userId}`);
      onlineUsers.set(userId, false);
      io.emit("userStatusChanged", { userId, online: false });
    });
  });
}
