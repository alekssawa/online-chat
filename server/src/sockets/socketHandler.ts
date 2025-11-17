import { Server } from "socket.io";
import prisma from "../lib/prismaClient.js";
import { v4 as uuidv4 } from "uuid";

import type { User, Message } from "../../src/graphql/types.js";

// Хранилище онлайн-статусов
const onlineUsers = new Map<string, boolean>();
// Хранилище звонковых комнат
const callRooms = new Map<string, Set<string>>();

export function registerSocketHandlers(io: Server) {
  io.on("connection", (socket) => {
    const userId = socket.handshake.auth.userId;
    if (!userId) return;

    console.log(`✅ Socket connected: ${socket.id}, userId=${userId}`);

    // Помечаем пользователя онлайн
    onlineUsers.set(userId, true);

    // Отправляем новому сокету весь текущий список онлайн
    const currentOnline = Array.from(onlineUsers.entries()).map(
      ([id, online]) => ({
        userId: id,
        online,
      })
    );
    socket.emit("onlineUsersList", currentOnline);

    // Сообщаем остальным, что этот пользователь онлайн
    socket.broadcast.emit("userStatusChanged", { userId, online: true });

    // ==========================
    // 📞 ЛОГИКА WEBRTC ЗВОНКОВ
    // ==========================
    socket.on("join-room", (roomId: string) => {
      if (!roomId) return;

      // Leave previous rooms
      socket.rooms.forEach((room) => {
        if (room !== socket.id && room.startsWith("call-")) {
          socket.leave(room);
          // Remove from callRooms
          const roomSet = callRooms.get(room);
          if (roomSet) {
            roomSet.delete(socket.id);
            if (roomSet.size === 0) {
              callRooms.delete(room);
            }
          }
        }
      });

      const callRoomId = `call-${roomId}`;
      socket.join(callRoomId);

      if (!callRooms.has(callRoomId)) {
        callRooms.set(callRoomId, new Set());
      }

      const room = callRooms.get(callRoomId);
      const otherUsers = Array.from(room || []);

      // Add current user to room
      room?.add(socket.id);

      // Send existing users to new user (исправленное событие)
      socket.emit("users-in-room", otherUsers);

      // Notify other users about new user (исправленное событие)
      socket.to(callRoomId).emit("user-joined", socket.id);

      console.log(`🎧 User ${socket.id} joined room ${callRoomId}`);
      console.log(`👥 Room ${callRoomId} users:`, Array.from(room || []));
    });

    // Обработчик отключения пользователя
    socket.on("disconnect", () => {
      console.log(`❌ Socket disconnected: ${socket.id}, userId=${userId}`);
      onlineUsers.delete(userId);

      // Удаляем пользователя из всех комнат
      callRooms.forEach((users, roomId) => {
        if (users.has(socket.id)) {
          users.delete(socket.id);
          // Уведомляем остальных пользователей
          socket.to(roomId).emit("user-left", socket.id);
          if (users.size === 0) {
            callRooms.delete(roomId);
          }
        }
      });

      socket.broadcast.emit("userStatusChanged", { userId, online: false });
    });

    socket.on("webrtc-signal", (data: { to: string; signal: any }) => {
      socket.to(data.to).emit("webrtc-signal", {
        from: socket.id,
        signal: data.signal,
      });
      console.log(`🔔 WebRTC signal from ${socket.id} to ${data.to}`);
    });

    // ==========================
    // ГРУППОВЫЕ СООБЩЕНИЯ
    // ==========================
    socket.on("joinGroupChat", (groupId: string) => {
      if (!groupId) return;
      socket.join(`group-${groupId}`);
      console.log(`👥 User ${userId} joined group ${groupId}`);
    });

    socket.on("leaveGroupChat", (groupId: string) => {
      if (!groupId) return;
      socket.leave(`group-${groupId}`);
      console.log(`🚪 User ${userId} left group ${groupId}`);
    });

    socket.on("sendGroupChatMessage", async (data) => {
      if (!data.groupId || !data.senderId || !data.text) return;

      try {
        const savedMessage = await prisma.messages.create({
          data: {
            text: data.text,
            senderId: data.senderId,
            groupId: data.groupId,
          },
          include: { sender: true },
        });

        const sender = {
          ...savedMessage.sender,
          birthDate: savedMessage.sender.birthDate?.toISOString() ?? null,
          lastOnline: savedMessage.sender.lastOnline?.toISOString() ?? null,
        };

        const message: Message = {
          id: savedMessage.id,
          text: savedMessage.text,
          senderId: savedMessage.senderId,
          groupId: savedMessage.groupId,
          privateChatId: null,
          sentAt: savedMessage.sentAt.toISOString(),
          updatedAt: savedMessage.updatedAt.toISOString(),
          sender,
        };

        io.to(`group-${data.groupId}`).emit("newGroupMessage", message);
      } catch (err) {
        console.error(err);
        socket.emit("errorMessage", {
          message: "Не удалось отправить сообщение в группу",
        });
      }
    });

    // ==========================
    // ПРИВАТНЫЕ ЧАТЫ
    // ==========================
    socket.on("joinPrivateChat", (chatId: string) => {
      if (!chatId) return;
      socket.join(`chat-${chatId}`);
      console.log(`👥 User ${userId} joined private chat ${chatId}`);
    });

    socket.on("leavePrivateChat", (chatId: string) => {
      if (!chatId) return;
      socket.leave(`chat-${chatId}`);
      console.log(`🚪 User ${userId} left private chat ${chatId}`);
    });

    socket.on(
      "sendPrivateChatMessage",
      async (data: { chatId: string; senderId: string; text: string }) => {
        if (!data.chatId || !data.senderId || !data.text) return;

        try {
          const savedMessage = await prisma.messages.create({
            data: {
              text: data.text,
              senderId: data.senderId,
              privateChatId: data.chatId, // привязка к приватному чату
            },
            include: { sender: true },
          });

          const sender = {
            ...savedMessage.sender,
            birthDate: savedMessage.sender.birthDate
              ? savedMessage.sender.birthDate.toISOString()
              : null,
            lastOnline: savedMessage.sender.lastOnline
              ? savedMessage.sender.lastOnline.toISOString()
              : null,
          };

          const message: Message = {
            id: savedMessage.id,
            text: savedMessage.text,
            senderId: savedMessage.senderId,
            groupId: null,
            privateChatId: savedMessage.privateChatId,
            sentAt: savedMessage.sentAt.toISOString(),
            updatedAt: savedMessage.updatedAt.toISOString(),
            sender,
          };

          io.to(`chat-${data.chatId}`).emit("newPrivateMessage", message);
        } catch (err) {
          console.error(err);
          socket.emit("errorMessage", {
            message: "Не удалось отправить сообщение в приватный чат",
          });
        }
      }
    );

    // ==========================
    // DISCONNECT
    // ==========================
    socket.on("disconnect", async () => {
      console.log(`❌ Socket disconnected: ${socket.id}, userId=${userId}`);

      onlineUsers.set(userId, false);
      io.emit("userStatusChanged", { userId, online: false });

      try {
        await prisma.users.update({
          where: { id: userId },
          data: { lastOnline: new Date() },
        });
      } catch (err) {
        console.error(`⚠️ Failed to update lastOnline for ${userId}:`, err);
      }

      // Обработка выхода из звонков
      callRooms.forEach((users, roomId) => {
        if (users.has(socket.id)) {
          users.delete(socket.id);
          socket.to(roomId).emit("user-left-call", socket.id);
          if (users.size === 0) callRooms.delete(roomId);
        }
      });
    });
  });
}
