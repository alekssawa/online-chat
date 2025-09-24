import prisma from "../../lib/prismaClient.js";
import type { User, Room, Message } from "../types.js";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import type { Response } from "express";
import { withAuth } from "../../lib/authDecorator.js"; // путь к твоему декоратору

export const userResolvers = {
  Query: {
    users: withAuth(
      async (
        _: any,
        __: any,
        context: { req: AuthRequest; res: Response }
      ): Promise<User[]> => {
        return prisma.users.findMany();
      }
    ),

    // Поиск пользователя по ID
    user: withAuth(
      async (
        _: any,
        { id }: { id: string },
        context: { req: AuthRequest; res: Response }
      ): Promise<User | null> => {
        const user = await prisma.users.findUnique({
          where: { id },
        });
        return user; // вернёт null, если не найден
      }
    ),
  },

  Mutation: {
    updateUser: withAuth(
      async (
        _: any,
        {
          id,
          email,
          password,
          name,
        }: { id: string; email?: string; password?: string; name?: string },
        context: { req: AuthRequest; res: Response }
      ) => {
        const data: any = {};
        if (email) data.email = email;
        if (password) data.password = password;
        if (name) data.name = name;

        return prisma.users.update({ where: { id }, data });
      }
    ),

    deleteUser: withAuth(
      async (
        _: any,
        { id }: { id: string },
        context: { req: AuthRequest; res: Response }
      ) => {
        await prisma.users.delete({ where: { id } });
        return true;
      }
    ),
  },

  User: {
    rooms: withAuth(
      async (
        parent: User,
        _: any,
        context: { req: AuthRequest; res: Response }
      ): Promise<Room[]> => {
        const roomUsers = await prisma.room_users.findMany({
          where: { userId: parent.id },
          select: {
            room: { select: { id: true, name: true, createdAt: true } },
          },
        });

        return roomUsers.map((ru) => ({
          ...ru.room,
          createdAt: ru.room.createdAt.toISOString(),
        }));
      }
    ),

    messages: withAuth(
      async (
        parent: User,
        _: any,
        context: { req: AuthRequest; res: Response }
      ): Promise<Message[]> => {
        const msgs = await prisma.messages.findMany({
          where: { senderId: parent.id },
          include: { sender: true, room: true },
        });

        return msgs.map((m) => ({
          ...m,
          sentAt: m.sentAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
          room: { ...m.room, createdAt: m.room.createdAt.toISOString() },
        }));
      }
    ),
  },
};
