import prisma from "../../lib/prismaClient.js";
import type { Room, User, Message, RoomAvatar } from "../types.js";
import { GraphQLError } from "graphql";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import type { Response } from "express";
import { GraphQLUpload } from "graphql-upload-minimal";
import type { FileUpload } from "graphql-upload-minimal";
import { withAuth } from "../../lib/authDecorator.js"; // путь к твоему декоратору

export const roomResolvers = {
  Upload: GraphQLUpload,
  Query: {
    rooms: withAuth(
      async (
        _: any,
        __: any,
        context: { req: AuthRequest; res: Response },
      ): Promise<Room[]> => {
        const rooms = await prisma.rooms.findMany();
        return rooms.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        }));
      },
    ),

    room: withAuth(
      async (
        _: any,
        { id }: { id: string },
        context: { req: AuthRequest; res: Response },
      ): Promise<Room | null> => {
        const room = await prisma.rooms.findUnique({
          where: { id },
        });

        if (!room) return null;

        return { ...room, createdAt: room.createdAt.toISOString() };
      },
    ),
  },

  Mutation: {
    createRoom: withAuth(
      async (
        _: any,
        { name, userId }: { name: string; userId: string },
        context: { req: AuthRequest; res: Response },
      ) => {
        const room = await prisma.rooms.create({ data: { name } });
        await prisma.room_users.create({ data: { roomId: room.id, userId } });
        return { ...room, createdAt: room.createdAt.toISOString() };
      },
    ),

    updateRoom: withAuth(
      async (
        _: any,
        { id, name }: { id: string; name?: string },
        context: { req: AuthRequest; res: Response },
      ) => {
        const data: any = {};
        if (name) data.name = name;
        return prisma.rooms.update({ where: { id }, data });
      },
    ),

    uploadRoomAvatar: withAuth(
      async (
        _: any,
        { roomId, file }: { roomId: string; file: Promise<FileUpload> },
      ) => {
        const { createReadStream, filename, mimetype } = await file;
        const stream = createReadStream();

        const chunks: Uint8Array[] = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);

        const avatar = await prisma.room_avatars.upsert({
          where: { room_id: roomId },
          update: {
            filename,
            mime_type: mimetype,
            data: buffer,
            uploaded_at: new Date(),
          },
          create: {
            room_id: roomId,
            filename,
            mime_type: mimetype,
            data: buffer,
          },
          include: { room: true },
        });

        return {
          id: avatar.id.toString(),
          filename: avatar.filename,
          mimeType: avatar.mime_type,
          uploadedAt: avatar.uploaded_at.toISOString(),
          url: `${process.env.API_URL}/avatar/room/${avatar.room.id}`,
          room: {
            id: avatar.room.id,
            name: avatar.room.name,
            createdAt: avatar.room.createdAt.toISOString(),
          },
        };
      },
    ),

    deleteRoom: withAuth(
      async (
        _: any,
        { id }: { id: string },
        context: { req: AuthRequest; res: Response },
      ) => {
        await prisma.rooms.delete({ where: { id } });
        return true;
      },
    ),

    addUserToRoom: withAuth(
      async (
        _: any,
        { roomId, userId }: { roomId: string; userId: string },
        context: { req: AuthRequest; res: Response },
      ) => {
        // Валидация входных данных
        if (!roomId || !userId) {
          throw new GraphQLError("roomId и userId обязательны", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        // Проверка существования комнаты
        const room = await prisma.rooms.findUnique({ where: { id: roomId } });
        if (!room) {
          throw new GraphQLError("Комната не найдена", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        // Проверка существования пользователя
        const user = await prisma.users.findUnique({ where: { id: userId } });
        if (!user) {
          throw new GraphQLError("Пользователь не найден", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        // Проверка, что пользователь ещё не добавлен в комнату
        const existing = await prisma.room_users.findUnique({
          where: { roomId_userId: { roomId, userId } },
        });
        if (existing) {
          throw new GraphQLError("Пользователь уже в комнате", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        try {
          // Создание записи
          const roomUser = await prisma.room_users.create({
            data: { roomId, userId },
            include: { user: true, room: true },
          });

          return roomUser;
        } catch (err) {
          console.error("Ошибка добавления пользователя в комнату:", err);
          throw new GraphQLError("Не удалось добавить пользователя в комнату", {
            extensions: { code: "INTERNAL_SERVER_ERROR" },
          });
        }
      },
    ),

    removeUserFromRoom: withAuth(
      async (
        _: any,
        { roomId, userId }: { roomId: string; userId: string },
        context: { req: AuthRequest; res: Response },
      ) => {
        if (!roomId || !userId) {
          throw new GraphQLError("roomId и userId обязательны", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        // Проверка существования записи
        const existing = await prisma.room_users.findUnique({
          where: { roomId_userId: { roomId, userId } },
        });
        if (!existing) {
          throw new GraphQLError("Пользователь не найден в комнате", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        try {
          const roomUser = await prisma.room_users.delete({
            where: { roomId_userId: { roomId, userId } },
            include: { user: true, room: true },
          });

          return roomUser;
        } catch (err) {
          console.error("Ошибка удаления пользователя из комнаты:", err);
          throw new GraphQLError("Не удалось удалить пользователя из комнаты", {
            extensions: { code: "INTERNAL_SERVER_ERROR" },
          });
        }
      },
    ),
  },

  Room: {
    avatar: async (parent: Room) => {
      const avatar = await prisma.room_avatars.findUnique({
        where: { room_id: parent.id },
        include: { room: true },
      });
      if (!avatar) return null;
      return {
        id: avatar.id.toString(),
        filename: avatar.filename,
        mimeType: avatar.mime_type,
        uploadedAt: avatar.uploaded_at!.toISOString(),
        url: `${process.env.API_URL}/avatar/room/${avatar.room.id}`,
        room: {
          id: avatar.room.id,
          name: avatar.room.name,
          createdAt: avatar.room.createdAt.toISOString(),
        },
      };
    },

    users: withAuth(
      async (
        parent: Room,
        _: any,
        context: { req: AuthRequest; res: Response },
      ): Promise<User[]> => {
        const roomUsers = await prisma.room_users.findMany({
          where: { roomId: parent.id },
          select: { user: { select: { id: true, email: true, name: true } } },
        });
        return roomUsers.map((ru) => ru.user);
      },
    ),

    messages: withAuth(
      async (
        parent: Room,
        _: any,
        context: { req: AuthRequest; res: Response },
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
      },
    ),
  },
};
