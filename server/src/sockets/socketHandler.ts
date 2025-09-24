// socketHandler.ts
import { Server } from "socket.io";
import prisma from "../lib/prismaClient.js";
import { v4 as uuidv4 } from "uuid";

interface User {
  id: string;
  name: string;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  roomId: string;
  sentAt: string;
  updatedAt: string;
  sender?: User;
}

export function registerSocketHandlers(io: Server) {
  io.on("connection", (socket) => {
    // console.log(`🔌 New client connected: ${socket.id}`);

    socket.on("joinRoom", (roomId: string) => {
    //   console.log(`➡️ Client ${socket.id} joining room ${roomId}`);
      socket.join(roomId);
    });

    socket.on("leaveRoom", (roomId: string) => {
    //   console.log(`⬅️ Client ${socket.id} leaving room ${roomId}`);
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
            include: {
              sender: true, // чтобы получить имя пользователя из базы
            },
          });

          const message: Message = {
            id: savedMessage.id,
            text: savedMessage.text,
            senderId: savedMessage.senderId,
            roomId: savedMessage.roomId,
            sentAt: savedMessage.sentAt.toISOString(),
            updatedAt: savedMessage.updatedAt.toISOString(),
            sender: savedMessage.sender, // берём из фронта, т.к. он уже есть
          };

        //   console.log("✅ Message saved:", message);
          // Отправляем всем в комнате
          io.to(data.roomId).emit("newMessage", message);
        } catch (err) {
          console.error("❌ Error saving message:", err);
          socket.emit("errorMessage", {
            message: "Не удалось отправить сообщение",
          });
        }
      }
    );

    socket.on("disconnect", (reason) => {
    //   console.log(`❌ Client disconnected: ${socket.id}, reason: ${reason}`);
    });
  });
}
