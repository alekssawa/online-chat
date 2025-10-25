import prisma from "../../lib/prismaClient.js";
import type { User, Message } from "../types.js";
import { GraphQLError } from "graphql";
import { withAuth } from "../../lib/authDecorator.js";

export const privateChatResolvers = {
  Query: {
    privateChats: withAuth(async (_: any, { userId }: { userId: string }) => {
      if (!userId) {
        throw new GraphQLError("userId обязателен", { extensions: { code: "BAD_USER_INPUT" } });
      }

      const user = await prisma.users.findUnique({ where: { id: userId } });
      if (!user) {
        throw new GraphQLError("Пользователь не найден", { extensions: { code: "NOT_FOUND" } });
      }

      const chats = await prisma.private_chats.findMany({
        where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
        include: {
          user1: true,
          user2: true,
          messages: { include: { sender: true } },
        },
      });

      return chats.map(chat => ({
        ...chat,
        createdAt: chat.createdAt.toISOString(),
      }));
    }),
  },

  Mutation: {
    createPrivateChat: withAuth(async (_: any, { user1Id, user2Id }: { user1Id: string; user2Id: string }) => {
      if (!user1Id || !user2Id) {
        throw new GraphQLError("user1Id и user2Id обязательны", { extensions: { code: "BAD_USER_INPUT" } });
      }

      if (user1Id === user2Id) {
        throw new GraphQLError("Нельзя создать чат с самим собой", { extensions: { code: "BAD_USER_INPUT" } });
      }

      const user1 = await prisma.users.findUnique({ where: { id: user1Id } });
      const user2 = await prisma.users.findUnique({ where: { id: user2Id } });

      if (!user1 || !user2) {
        throw new GraphQLError("Один из пользователей не найден", { extensions: { code: "NOT_FOUND" } });
      }

      // Проверка на существующий чат
      const existingChat = await prisma.private_chats.findUnique({
        where: { user1Id_user2Id: { user1Id, user2Id } },
      });
      if (existingChat) {
        throw new GraphQLError("Чат между этими пользователями уже существует", { extensions: { code: "BAD_USER_INPUT" } });
      }

      const chat = await prisma.private_chats.create({
        data: { user1Id, user2Id },
        include: { user1: true, user2: true },
      });

      return { ...chat, createdAt: chat.createdAt.toISOString() };
    }),

    sendPrivateMessage: withAuth(async (_: any, { chatId, senderId, text }: { chatId: string; senderId: string; text: string }) => {
      if (!chatId || !senderId || !text) {
        throw new GraphQLError("chatId, senderId и text обязательны", { extensions: { code: "BAD_USER_INPUT" } });
      }

      const chat = await prisma.private_chats.findUnique({ where: { id: chatId } });
      if (!chat) {
        throw new GraphQLError("Чат не найден", { extensions: { code: "NOT_FOUND" } });
      }

      const sender = await prisma.users.findUnique({ where: { id: senderId } });
      if (!sender) {
        throw new GraphQLError("Отправитель не найден", { extensions: { code: "NOT_FOUND" } });
      }

      // Проверка, что отправитель состоит в чате
      if (senderId !== chat.user1Id && senderId !== chat.user2Id) {
        throw new GraphQLError("Пользователь не состоит в этом чате", { extensions: { code: "FORBIDDEN" } });
      }

      const message = await prisma.messages.create({
        data: { text, senderId, privateChatId: chatId },
        include: { sender: true },
      });

      return { ...message, sentAt: message.sentAt.toISOString(), updatedAt: message.updatedAt.toISOString() };
    }),
  },

  PrivateChat: {
    messages: withAuth(async (parent: any) => {
      const msgs = await prisma.messages.findMany({
        where: { privateChatId: parent.id },
        include: { sender: true },
      });
      return msgs.map(m => ({
        ...m,
        sentAt: m.sentAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      }));
    }),

    user1: withAuth(async (parent: any) => {
      const user = await prisma.users.findUnique({ where: { id: parent.user1Id } });
      return user || null;
    }),

    user2: withAuth(async (parent: any) => {
      const user = await prisma.users.findUnique({ where: { id: parent.user2Id } });
      return user || null;
    }),
  },
};
