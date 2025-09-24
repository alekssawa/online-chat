import prisma from "../../lib/prismaClient.js";
import type { Room, User, Message } from "../types.js";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import type { Response } from "express";
import { withAuth } from "../../lib/authDecorator.js"; // путь к твоему декоратору

export const roomResolvers = {
  Query: {
    rooms: withAuth(
      async (
        _: any,
        __: any,
        context: { req: AuthRequest; res: Response }
      ): Promise<Room[]> => {
        const rooms = await prisma.rooms.findMany();
        return rooms.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        }));
      }
    ),

    room: withAuth(
      async (
        _: any,
        { id }: { id: string },
        context: { req: AuthRequest; res: Response }
      ): Promise<Room | null> => {
        const room = await prisma.rooms.findUnique({
          where: { id },
        });

        if (!room) return null;

        return { ...room, createdAt: room.createdAt.toISOString() };
      }
    ),
  },

  Mutation: {
    createRoom: withAuth(
      async (
        _: any,
        { name, userId }: { name: string; userId: string },
        context: { req: AuthRequest; res: Response }
      ) => {
        const room = await prisma.rooms.create({ data: { name } });
        await prisma.room_users.create({ data: { roomId: room.id, userId } });
        return { ...room, createdAt: room.createdAt.toISOString() };
      }
    ),

    updateRoom: withAuth(
      async (
        _: any,
        { id, name }: { id: string; name?: string },
        context: { req: AuthRequest; res: Response }
      ) => {
        const data: any = {};
        if (name) data.name = name;
        return prisma.rooms.update({ where: { id }, data });
      }
    ),

    deleteRoom: withAuth(
      async (
        _: any,
        { id }: { id: string },
        context: { req: AuthRequest; res: Response }
      ) => {
        await prisma.rooms.delete({ where: { id } });
        return true;
      }
    ),

    addUserToRoom: withAuth(
      async (
        _: any,
        { roomId, userId }: { roomId: string; userId: string },
        context: { req: AuthRequest; res: Response }
      ) => {
        return prisma.room_users.create({
          data: { roomId, userId },
          include: { user: true, room: true },
        });
      }
    ),

    removeUserFromRoom: withAuth(
      async (
        _: any,
        { roomId, userId }: { roomId: string; userId: string },
        context: { req: AuthRequest; res: Response }
      ) => {
        return prisma.room_users.delete({
          where: { roomId_userId: { roomId, userId } },
        });
      }
    ),
  },

  Room: {
    users: withAuth(
      async (
        parent: Room,
        _: any,
        context: { req: AuthRequest; res: Response }
      ): Promise<User[]> => {
        const roomUsers = await prisma.room_users.findMany({
          where: { roomId: parent.id },
          select: { user: { select: { id: true, email: true, name: true } } },
        });
        return roomUsers.map((ru) => ru.user);
      }
    ),

    messages: withAuth(
      async (
        parent: Room,
        _: any,
        context: { req: AuthRequest; res: Response }
      ): Promise<Message[]> => {
        const msgs = await prisma.messages.findMany({
          where: { roomId: parent.id },
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
