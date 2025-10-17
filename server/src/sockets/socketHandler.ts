import { Server } from "socket.io";
import prisma from "../lib/prismaClient.js";
import { v4 as uuidv4 } from "uuid";

import type { User, Message } from "../../src/graphql/types.js";

// Хранилище онлайн-статусов
const onlineUsers = new Map<string, boolean>();
// Хранилище комнат для звонков
const callRooms = new Map<string, Set<string>>();

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

    // 📞 ЛОГИКА WEBRTC ЗВОНКОВ - ДОБАВЬТЕ ЭТОТ БЛОК
    socket.on('join-room', (roomId: string) => {
      console.log(`🎧 User ${userId} (socket: ${socket.id}) joining call room ${roomId}`);
      
      // Leave previous rooms
      socket.rooms.forEach(room => {
        if (room !== socket.id && room.startsWith('call-')) {
          socket.leave(room);
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

      // Send existing users to new user
      socket.emit('users-in-room', otherUsers);

      // Notify other users about new user
      otherUsers.forEach(userSocketId => {
        socket.to(userSocketId).emit('user-joined', socket.id);
      });

      console.log(`🎧 Call room ${callRoomId} users:`, Array.from(room || []));
    });

    socket.on('webrtc-signal', (data: { to: string; signal: any }) => {
      console.log(`🎧 WebRTC signal from ${socket.id} to ${data.to}`);
      socket.to(data.to).emit('webrtc-signal', {
        from: socket.id,
        signal: data.signal
      });
    });

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
      
      // Обновляем онлайн статус
      onlineUsers.set(userId, false);
      io.emit("userStatusChanged", { userId, online: false });
      
      // 📞 ОБРАБОТКА ВЫХОДА ИЗ КОМНАТ ЗВОНКОВ - ДОБАВЬТЕ ЭТО
      callRooms.forEach((users, roomId) => {
        if (users.has(socket.id)) {
          users.delete(socket.id);
          socket.to(roomId).emit('user-left', socket.id);
          
          if (users.size === 0) {
            callRooms.delete(roomId);
          }
          
          console.log(`🎧 User ${socket.id} left call room ${roomId}`);
        }
      });
    });
  });
}