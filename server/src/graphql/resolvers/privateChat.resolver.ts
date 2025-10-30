import prisma from "../../lib/prismaClient.js";
import type { Message, PrivateChat } from "../types.js";
import { GraphQLError } from "graphql";
import { withAuth } from "../../lib/authDecorator.js";

export const privateChatResolvers = {
  Query: {
    privateChats: withAuth(async (_: any, __: any) => {
      const chats = await prisma.private_chats.findMany({
        include: {
          user1: true,
          user2: true,
          messages: {
            include: { sender: true },
            orderBy: { sentAt: "asc" },
          },
        },
      });

      return chats.map((chat) => ({
        id: chat.id,
        user1Id: chat.user1Id,
        user2Id: chat.user2Id,
        user1: chat.user1,
        user2: chat.user2,
        createdAt: chat.createdAt.toISOString(),
        messages: chat.messages.map((m) => ({
          id: m.id,
          text: m.text,
          senderId: m.senderId,
          sender: m.sender,
          sentAt: m.sentAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
        })),
      }));
    }),

    privateChat: withAuth(async (_: any, { chatId }: { chatId: string }) => {
      if (!chatId) {
        throw new GraphQLError("chatId обязателен", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      const chat = await prisma.private_chats.findUnique({
        where: { id: chatId },
        include: {
          user1: true,
          user2: true,
          messages: {
            include: { sender: true },
            orderBy: { sentAt: "asc" },
          },
        },
      });

      if (!chat) {
        throw new GraphQLError("Чат не найден", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const otherUser = chat.user1Id === chatId ? chat.user2 : chat.user1;

      return {
        id: chat.id,
        user1: chat.user1,
        user2: chat.user2,
        otherUser, // объект другого пользователя
        createdAt: chat.createdAt.toISOString(),
        messages: chat.messages.map((m) => ({
          id: m.id,
          text: m.text,
          senderId: m.senderId,
          sender: m.sender,
          sentAt: m.sentAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
        })),
      };
    }),
  },

  Mutation: {
    createPrivateChat: withAuth(
      async (
        _: any,
        { user1Id, user2Id }: { user1Id: string; user2Id: string },
      ) => {
        if (!user1Id || !user2Id) {
          throw new GraphQLError("user1Id и user2Id обязательны", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        if (user1Id === user2Id) {
          throw new GraphQLError("Нельзя создать чат с самим собой", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        // Проверка на существующий чат (учитываем оба направления)
        const existingChat = await prisma.private_chats.findFirst({
          where: {
            OR: [
              { user1Id, user2Id },
              { user1Id: user2Id, user2Id: user1Id },
            ],
          },
        });

        if (existingChat) {
          throw new GraphQLError(
            "Чат между этими пользователями уже существует",
            { extensions: { code: "BAD_USER_INPUT" } },
          );
        }

        const chat = await prisma.private_chats.create({
          data: { user1Id, user2Id },
        });

        return {
          id: chat.id,
          user1Id: chat.user1Id,
          user2Id: chat.user2Id,
          createdAt: chat.createdAt.toISOString(),
        };
      },
    ),

    sendPrivateMessage: withAuth(
      async (
        _: any,
        {
          chatId,
          senderId,
          text,
        }: { chatId: string; senderId: string; text: string },
      ): Promise<Message> => {
        if (!chatId || !senderId || !text) {
          throw new GraphQLError("chatId, senderId и text обязательны", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        const chat = await prisma.private_chats.findUnique({
          where: { id: chatId },
        });
        if (!chat) {
          throw new GraphQLError("Чат не найден", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        if (senderId !== chat.user1Id && senderId !== chat.user2Id) {
          throw new GraphQLError("Пользователь не состоит в этом чате", {
            extensions: { code: "FORBIDDEN" },
          });
        }

        const message = await prisma.messages.create({
          data: { text, senderId, privateChatId: chatId },
          include: { sender: true },
        });

        return {
          id: message.id,
          text: message.text,
          sentAt: message.sentAt.toISOString(),
          updatedAt: message.updatedAt.toISOString(),
          senderId: message.senderId,
          sender: {
            ...message.sender,
            birthDate: message.sender.birthDate?.toISOString() || null,
            lastOnline: message.sender.lastOnline?.toISOString() || null,
          },
          privateChatId: message.privateChatId,
          groupId: null,
        };
      },
    ),
  },
};
