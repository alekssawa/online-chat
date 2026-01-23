import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import prisma from "../lib/prismaClient.js";

import type { Message } from "../../src/graphql/types.js";

interface Call {
  callId: string;
  from: string;
  to: string;
  roomId: string;
  type: "audio" | "video";
  timestamp: number;
  fromSocketId: string; // Добавьте это свойство
}

// Хранилище онлайн-статусов
const onlineUsers = new Map<string, boolean>();
// Хранилище звонковых комнат
const callRooms = new Map<string, Set<string>>();
// Хранилище активных входящих звонков
const incomingCalls = new Map<string, Call>();

export function registerSocketHandlers(io: Server) {
  io.on("connection", (socket) => {
    const userId = socket.handshake.auth.userId;
    if (!userId) return;

    console.log(`✅ Socket connected: ${socket.id}, userId=${userId}`);

    // Присоединяем сокет к комнате пользователя
    socket.join(`user-${userId}`);

    // Помечаем пользователя онлайн
    onlineUsers.set(userId, true);

    // Отправляем новому сокету весь текущий список онлайн
    const currentOnline = Array.from(onlineUsers.entries()).map(
      ([id, online]) => ({
        userId: id,
        online,
      }),
    );
    socket.emit("onlineUsersList", currentOnline);

    // Сообщаем остальным, что этот пользователь онлайн
    socket.broadcast.emit("userStatusChanged", { userId, online: true });

    // ==========================
    // 📞 ЛОГИКА ВХОДЯЩИХ ЗВОНКОВ
    // ==========================

    // Инициация звонка
    socket.on(
      "initiate-call",
      async (data: { to: string; roomId: string; type: "audio" | "video" }) => {
        const { to, roomId, type } = data;

        console.log(`📞 User ${userId} calling ${to} in room ${roomId}`);

        // Проверяем, онлайн ли пользователь
        const targetOnline = onlineUsers.get(to);
        if (!targetOnline) {
          socket.emit("call-failed", {
            reason: "Пользователь не в сети",
          });
          return;
        }

        // Проверяем, не занят ли пользователь другим звонком
        const existingCall = Array.from(incomingCalls.values()).find(
          (call) => call.to === to && Date.now() - call.timestamp < 30000,
        );

        if (existingCall) {
          socket.emit("call-failed", {
            reason: "Пользователь занят другим звонком",
          });
          return;
        }

        // Создаем уникальный ID для звонка
        const callId = uuidv4();

        // Сохраняем информацию о звонке (добавляем fromSocketId)
        incomingCalls.set(callId, {
          callId,
          from: userId,
          to,
          roomId,
          type,
          timestamp: Date.now(),
          fromSocketId: socket.id, // Сохраняем socket.id инициатора
        });

        // Отправляем уведомление о входящем звонке
        io.to(`user-${to}`).emit("incoming-call", {
          callId,
          from: userId,
          fromSocketId: socket.id,
          roomId,
          type,
          callerName: await getUsername(userId),
        });

        console.log(
          `📞 User ${userId} incoming-call (callId: ${callId}), (socket: ${socket.id}) (to: ${to}) in room ${roomId}`,
        );

        // Таймаут для автоматического отклонения
        setTimeout(() => {
          if (incomingCalls.has(callId)) {
            incomingCalls.delete(callId);
            socket.emit("call-timeout", { callId });
            io.to(`user-${to}`).emit("call-ended", {
              callId,
              reason: "Время вышло",
            });
          }
        }, 30000); // 30 секунд

        socket.emit("call-initiated", { callId });
      },
    );

    socket.on("accept-call", async (data: { callId: string }) => {
      const { callId } = data;
      const call = incomingCalls.get(callId);

      if (!call || call.to !== userId) {
        socket.emit("call-error", { reason: "Звонок не найден" });
        return;
      }

      console.log(`✅ User ${userId} accepted call ${callId}`);

      // Присоединяем принимающего к обеим версиям комнат
      socket.join(call.roomId); // Основная комната
      socket.join(`call-${call.roomId}`); // WebRTC комната

      // Получаем socket звонящего и присоединяем его к комнатам
      const callerSocket = io.sockets.sockets.get(call.fromSocketId);
      if (callerSocket) {
        callerSocket.join(call.roomId); // Основная комната
        callerSocket.join(`call-${call.roomId}`); // WebRTC комната
      }

      // Уведомляем звонящего о принятии звонка
      io.to(`user-${call.from}`).emit("call-accepted", {
        callId,
        acceptorSocketId: socket.id,
      });

      // Удаляем звонок из ожидания
      incomingCalls.delete(callId);

      // Уведомляем обоих пользователей о присоединении к комнате
      socket.emit("join-call-room", { roomId: call.roomId });
      io.to(`user-${call.from}`).emit("join-call-room", {
        roomId: call.roomId,
      });

      console.log(
        `🎯 Both users joined rooms ${call.roomId} and call-${call.roomId}`,
      );
    });

    // Отклонение звонка
    socket.on("reject-call", (data: { callId: string; reason?: string }) => {
      const { callId, reason = "Звонок отклонен" } = data;
      const call = incomingCalls.get(callId);

      if (!call || call.to !== userId) {
        socket.emit("call-error", { reason: "Звонок не найден" });
        return;
      }

      console.log(`❌ User ${userId} rejected call ${callId}`);

      // Уведомляем звонящего об отклонении (в комнату пользователя)
      io.to(`user-${call.from}`).emit("call-rejected", {
        callId,
        reason,
      });

      // Удаляем звонок
      incomingCalls.delete(callId);
    });

    // Отмена звонка (когда инициатор отменяет до ответа)
    socket.on("cancel-call", (data: { callId: string }) => {
      const { callId } = data;
      const call = incomingCalls.get(callId);

      if (!call || call.from !== userId) {
        socket.emit("call-error", { reason: "Звонок не найден" });
        return;
      }

      console.log(`🚫 User ${userId} cancelled call ${callId}`);

      // Уведомляем получателя об отмене (в комнату пользователя)
      io.to(`user-${call.to}`).emit("call-cancelled", { callId });

      // Удаляем звонок
      incomingCalls.delete(callId);
    });

    // Завершение активного звонка
    socket.on("end-call", (data: { callId?: string; roomId?: string }) => {
      const { callId, roomId } = data;

      console.log(`📞 Call ended by ${userId}`);

      const sendCallEnded = (call: Call) => {
        // Отправляем в обе версии комнат на всякий случай
        const callRoomId = `call-${call.roomId}`;

        // 1. В комнату WebRTC
        io.to(callRoomId).emit("call-ended", {
          callId: call.callId,
          roomId: call.roomId,
          reason: "Собеседник завершил звонок",
          endedBy: userId,
        });

        // 2. В обычную комнату (если используется)
        io.to(call.roomId).emit("call-ended", {
          callId: call.callId,
          roomId: call.roomId,
          reason: "Собеседник завершил звонок",
          endedBy: userId,
        });

        // 3. В личные комнаты пользователей
        io.to(`user-${call.from}`).emit("call-ended", {
          callId: call.callId,
          roomId: call.roomId,
          reason: "Собеседник завершил звонок",
          endedBy: userId,
        });

        io.to(`user-${call.to}`).emit("call-ended", {
          callId: call.callId,
          roomId: call.roomId,
          reason: "Собеседник завершил звонок",
          endedBy: userId,
        });

        console.log(`🔚 Sent call-ended to room ${callRoomId} and user rooms`);
      };

      let foundCall = false;

      if (callId) {
        const call = incomingCalls.get(callId);
        if (call) {
          sendCallEnded(call);
          incomingCalls.delete(callId);
          foundCall = true;
        }
      } else if (roomId) {
        for (const [id, call] of incomingCalls.entries()) {
          if (call.roomId === roomId) {
            sendCallEnded(call);
            incomingCalls.delete(id);
            foundCall = true;
            break; // Удаляем только первый найденный звонок для этой комнаты
          }
        }
      }

      if (!foundCall) {
        console.log(`❌ No active call found for end-call from user ${userId}`);

        // Если звонок не найден в incomingCalls, возможно он уже активен
        // Попробуем отправить завершение в комнату WebRTC
        if (roomId) {
          const callRoomId = `call-${roomId}`;
          io.to(callRoomId).emit("call-ended", {
            roomId: roomId,
            reason: "Собеседник завершил звонок",
            endedBy: userId,
          });
          console.log(
            `📢 Sent call-ended to WebRTC room ${callRoomId} as fallback`,
          );
        }
      }
    });

    // ==========================
    // 📞 ЛОГИКА WEBRTC ЗВОНКОВ (существующая)
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
      if (socket.rooms.has(callRoomId)) {
        console.log(
          `⚠️ User ${socket.id} tried to rejoin ${callRoomId}, ignoring`,
        );
        return;
      }
      socket.join(callRoomId);

      if (!callRooms.has(callRoomId)) {
        callRooms.set(callRoomId, new Set());
      }

      const room = callRooms.get(callRoomId);
      const otherUsers = Array.from(room || []);

      // Add current user to room
      room?.add(socket.id);

      // Send existing users to new user
      socket.emit("users-in-room", otherUsers);

      // Notify other users about new user
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

      // Очищаем незавершенные звонки пользователя
      for (const [callId, call] of incomingCalls.entries()) {
        if (call.from === userId || call.to === userId) {
          incomingCalls.delete(callId);
          // Уведомляем другую сторону (в комнату пользователя)
          if (call.from === userId) {
            io.to(`user-${call.to}`).emit("call-ended", {
              callId,
              reason: "Собеседник отключился",
            });
          } else {
            io.to(`user-${call.from}`).emit("call-ended", {
              callId,
              reason: "Собеседник отключился",
            });
          }
        }
      }

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

    socket.on(
      "sendGroupChatMessage",
      async (data: {
        groupId: string;
        senderId: string;
        text: string; // уже зашифрованный текст от клиента
        iv: string; // теперь IV обязателен
      }) => {
        if (!data.groupId || !data.senderId || !data.text || !data.iv) return;

        try {
          const savedMessage = await prisma.messages.create({
            data: {
              text: data.text,
              iv: data.iv, // сохраняем IV
              senderId: data.senderId,
              groupId: data.groupId,
            },
            include: { sender: true },
          });

          const sender = {
            ...savedMessage.sender,
            birthDate: savedMessage.sender.birthDate?.toISOString() ?? null,
            lastOnline: savedMessage.sender.lastOnline?.toISOString() ?? null,
            publicKey: savedMessage.sender.publicKey,
            keyCreatedAt: savedMessage.sender.keyCreatedAt.toISOString(),
            keyUpdatedAt: savedMessage.sender.keyUpdatedAt.toISOString(),
          };

          const message: Message = {
            id: savedMessage.id,
            text: savedMessage.text,
            iv: savedMessage.iv, // добавляем IV
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
      },
    );

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
      async (data: {
        chatId: string;
        senderId: string;
        text: string;
        iv: string;
      }) => {
        if (!data.chatId || !data.senderId || !data.text || !data.iv) return;

        try {
          const savedMessage = await prisma.messages.create({
            data: {
              text: data.text,
              iv: data.iv, // сохраняем IV
              senderId: data.senderId,
              privateChatId: data.chatId,
            },
            include: { sender: true },
          });

          const sender = {
            ...savedMessage.sender,
            birthDate: savedMessage.sender.birthDate?.toISOString() ?? null,
            lastOnline: savedMessage.sender.lastOnline?.toISOString() ?? null,
            publicKey: savedMessage.sender.publicKey,
            keyCreatedAt: savedMessage.sender.keyCreatedAt.toISOString(),
            keyUpdatedAt: savedMessage.sender.keyUpdatedAt.toISOString(),
          };

          const message: Message = {
            id: savedMessage.id,
            text: savedMessage.text,
            iv: savedMessage.iv,
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
      },
    );
  });
}

// Вспомогательная функция для получения имени пользователя
async function getUsername(userId: string): Promise<string> {
  try {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    return user?.name || "Пользователь";
  } catch (error) {
    console.error("Error getting username:", error);
    return "Пользователь";
  }
}
