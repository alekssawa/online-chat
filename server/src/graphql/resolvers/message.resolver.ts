import prisma from "../../lib/prismaClient.js";
import type { Message, User, Room, RoomUser } from "../types.js";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import type { Response } from "express";
import { withAuth } from "../../lib/authDecorator.js"; // путь к твоему декоратору

export const messageResolvers = {
  Mutation: {
    sendMessage: withAuth(async (
      _: any,
      { userId, roomId, text }: { userId: string; roomId: string; text: string },
      context: { req: AuthRequest; res: Response }
    ): Promise<Message> => {
      const message = await prisma.messages.create({
        data: { text, senderId: userId, roomId },
        include: { sender: true, room: true },
      });
      return {
        ...message,
        sentAt: message.sentAt.toISOString(),
        updatedAt: message.updatedAt.toISOString(),
        room: { ...message.room, createdAt: message.room.createdAt.toISOString() },
      };
    }),

    updateMessage: withAuth(async (
      _: any,
      { id, text }: { id: string; text: string },
      context: { req: AuthRequest; res: Response }
    ): Promise<Message> => {
      const message = await prisma.messages.update({
        where: { id },
        data: { text, updatedAt: new Date() },
        include: { sender: true, room: true },
      });
      return {
        ...message,
        sentAt: message.sentAt.toISOString(),
        updatedAt: message.updatedAt.toISOString(),
        room: { ...message.room, createdAt: message.room.createdAt.toISOString() },
      };
    }),

    deleteMessage: withAuth(async (
      _: any,
      { id }: { id: string },
      context: { req: AuthRequest; res: Response }
    ): Promise<Message> => {
      const message = await prisma.messages.delete({
        where: { id },
        include: { sender: true, room: true },
      });
      return {
        ...message,
        sentAt: message.sentAt.toISOString(),
        updatedAt: message.updatedAt.toISOString(),
        room: { ...message.room, createdAt: message.room.createdAt.toISOString() },
      };
    }),
  },

  Message: {
    sender: withAuth(async (parent: Message): Promise<User> => {
      const user = await prisma.users.findUnique({ where: { id: parent.senderId } });
      if (!user) throw new Error("Sender not found");
      return user;
    }),

    room: withAuth(async (parent: Message): Promise<Room> => {
      const room = await prisma.rooms.findUnique({ where: { id: parent.roomId } });
      if (!room) throw new Error("Room not found");
      return { ...room, createdAt: room.createdAt.toISOString() };
    }),
  },

  RoomUser: {
    user: withAuth(async (parent: RoomUser): Promise<User> => {
      const user = await prisma.users.findUnique({ where: { id: parent.userId } });
      if (!user) throw new Error("User not found");
      return user;
    }),

    room: withAuth(async (parent: RoomUser): Promise<Room> => {
      const room = await prisma.rooms.findUnique({ where: { id: parent.roomId } });
      if (!room) throw new Error("Room not found");
      return { ...room, createdAt: room.createdAt.toISOString() };
    }),
  },
};
