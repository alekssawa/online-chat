import prisma from "../../lib/prismaClient.js";
import type { Message, User, PrivateChat, GroupChat } from "../types.js";
import { withAuth } from "../../lib/authDecorator.js";
import { GraphQLError } from "graphql";

export const messageResolvers = {
  Mutation: {
    // --- Приватные сообщения ---
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
          throw new GraphQLError("chatId, senderId и text обязательны");
        }

        const chat = await prisma.private_chats.findUnique({
          where: { id: chatId },
        });
        if (!chat) throw new GraphQLError("Чат не найден");

        if (senderId !== chat.user1Id && senderId !== chat.user2Id) {
          throw new GraphQLError("Пользователь не состоит в этом чате");
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

    updatePrivateMessage: withAuth(
      async (
        _: any,
        { id, text }: { id: string; text: string },
      ): Promise<Message> => {
        const message = await prisma.messages.update({
          where: { id },
          data: { text, updatedAt: new Date() },
          include: { sender: true, privateChat: true },
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

    deletePrivateMessage: withAuth(
      async (_: any, { id }: { id: string }): Promise<Message> => {
        const message = await prisma.messages.delete({
          where: { id },
          include: { sender: true, privateChat: true },
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

    // --- Групповые сообщения ---
    sendGroupMessage: withAuth(
      async (
        _: any,
        {
          groupId,
          senderId,
          text,
        }: { groupId: string; senderId: string; text: string },
      ): Promise<Message> => {
        if (!groupId || !senderId || !text) {
          throw new GraphQLError("groupId, senderId и text обязательны");
        }

        const chat = await prisma.groups.findUnique({ where: { id: groupId } });
        if (!chat) throw new GraphQLError("Группа не найдена");

        const message = await prisma.messages.create({
          data: { text, senderId, groupId },
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
          privateChatId: null,
          groupId: message.groupId,
        };
      },
    ),

    updateGroupMessage: withAuth(
      async (
        _: any,
        { id, text }: { id: string; text: string },
      ): Promise<Message> => {
        const message = await prisma.messages.update({
          where: { id },
          data: { text, updatedAt: new Date() },
          include: { sender: true, group: true },
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
          privateChatId: null,
          groupId: message.groupId,
        };
      },
    ),

    deleteGroupMessage: withAuth(
      async (_: any, { id }: { id: string }): Promise<Message> => {
        const message = await prisma.messages.delete({
          where: { id },
          include: { sender: true, group: true },
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
          privateChatId: null,
          groupId: message.groupId,
        };
      },
    ),
  },

  Message: {
    sender: withAuth(async (parent: Message): Promise<User> => {
      if (!parent.sender) throw new GraphQLError("Sender not found");
      return {
        ...parent.sender,
        birthDate: parent.sender.birthDate
          ? new Date(parent.sender.birthDate).toISOString()
          : null,
        lastOnline: parent.sender.lastOnline
          ? new Date(parent.sender.lastOnline).toISOString()
          : null,
      };
    }),

    privateChat: withAuth(
      async (parent: Message): Promise<PrivateChat | null> => {
        if (!parent.privateChatId) return null;
        const chat = await prisma.private_chats.findUnique({
          where: { id: parent.privateChatId },
        });
        if (!chat) return null;
        return {
          id: chat.id,
          user1Id: chat.user1Id,
          user2Id: chat.user2Id,
          createdAt: chat.createdAt.toISOString(),
        };
      },
    ),

    groupChat: withAuth(async (parent: Message): Promise<GroupChat | null> => {
      if (!parent.groupId) return null;
      const chat = await prisma.groups.findUnique({
        where: { id: parent.groupId },
        include: { users: { include: { user: true } }, messages: true },
      });
      if (!chat) return null;

      return {
        ...chat,
        createdAt: chat.createdAt.toISOString(),
        messages: chat.messages.map((m) => ({
          ...m,
          sentAt: m.sentAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
        })),
        users: chat.users.map((u) => ({
          ...u,
          joinedAt: u.joinedAt.toISOString(),
          user: {
            ...u.user,
            birthDate: u.user.birthDate ? u.user.birthDate.toISOString() : null,
            lastOnline: u.user.lastOnline
              ? u.user.lastOnline.toISOString()
              : null,
          },
          group: {
            id: chat.id,
            name: chat.name,
            createdAt: chat.createdAt.toISOString(),
            messages: [],
            users: [],
          },
        })),
      };
    }),
  },
};
