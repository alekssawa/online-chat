import prisma from "../../lib/prismaClient.js";
import type { User, Room, Message, UserAvatar } from "../types.js";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { GraphQLUpload } from "graphql-upload-minimal";
import type { FileUpload } from "graphql-upload-minimal";
import type { Response } from "express";
import { withAuth } from "../../lib/authDecorator.js"; // путь к твоему декоратору

export const userResolvers = {
  Upload: GraphQLUpload,
  Query: {
    users: withAuth(async (_: any, __: any): Promise<User[]> => {
      const users = await prisma.users.findMany();
      return users.map((u) => ({
        ...u,
        birthDate: u.birthDate ? u.birthDate.toISOString() : null,
        lastOnline: u.lastOnline ? u.lastOnline.toISOString() : null,
      }));
    }),

    // Поиск пользователя по ID
    user: withAuth(
      async (_: any, { id }: { id: string }): Promise<User | null> => {
        const user = await prisma.users.findUnique({ where: { id } });
        if (!user) return null;
        return {
          ...user,
          birthDate: user.birthDate ? user.birthDate.toISOString() : null,
          lastOnline: user.lastOnline ? user.lastOnline.toISOString() : null,
        };
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
    uploadUserAvatar: withAuth(
      async (
        _: any,
        { userId, file }: { userId: string; file: Promise<FileUpload> }
      ) => {
        const { createReadStream, filename, mimetype } = await file;
        const stream = createReadStream();

        // читаем поток в Buffer
        const chunks: Uint8Array[] = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);

        const avatar = await prisma.user_avatars.upsert({
          where: { user_id: userId },
          update: {
            filename,
            mime_type: mimetype,
            data: buffer,
            uploaded_at: new Date(),
          },
          create: {
            user_id: userId,
            filename,
            mime_type: mimetype,
            data: buffer,
          },
          include: { user: true },
        });

        return {
          id: avatar.id.toString(),
          filename: avatar.filename,
          mimeType: avatar.mime_type,
          uploadedAt: avatar.uploaded_at.toISOString(),
          url: `${process.env.API_URL}/avatar/${avatar.user.id}`,
          user: avatar.user,
        };
      }
    ),

    updatePrivacySettings: withAuth(
      async (
        _: any,
        {
          userId,
          showEmail,
          showLastOnline,
          showBirthDate,
        }: {
          userId: string;
          showEmail?: boolean;
          showLastOnline?: boolean;
          showBirthDate?: boolean;
        }
      ) => {
        const data: any = {};
        if (showEmail !== undefined) data.showEmail = showEmail;
        if (showLastOnline !== undefined) data.showLastOnline = showLastOnline;
        if (showBirthDate !== undefined) data.showBirthDate = showBirthDate;

        const updated = await prisma.privacy_settings.upsert({
          where: { userId },
          update: data,
          create: { userId, ...data },
          include: { user: true },
        });

        return {
          id: updated.id,
          showEmail: updated.showEmail,
          showLastOnline: updated.showLastOnline,
          showBirthDate: updated.showBirthDate,
          user: updated.user,
        };
      }
    ),

    updateProfile: withAuth(
      async (
        _: any,
        {
          id,
          nickname,
          about,
          birthDate,
        }: { id: string; nickname?: string; about?: string; birthDate?: string }
      ) => {
        const data: any = {};
        if (nickname !== undefined) data.nickname = nickname;
        if (about !== undefined) data.about = about;
        if (birthDate !== undefined) data.birthDate = new Date(birthDate);

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
    avatar: async (parent: User) => {
      const avatar = await prisma.user_avatars.findUnique({
        where: { user_id: parent.id },
      });
      if (!avatar) return null;
      return {
        id: avatar.id.toString(),
        filename: avatar.filename,
        mimeType: avatar.mime_type, // ✅ маппинг
        uploadedAt: avatar.uploaded_at!.toISOString(),
        url: `${process.env.API_URL}/avatar/${avatar.user_id}`,
        user: { id: parent.id, email: parent.email, name: parent.name },
      };
    },

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

    messages: withAuth(async (parent: User): Promise<Message[]> => {
      const msgs = await prisma.messages.findMany({
        where: { senderId: parent.id },
        include: { sender: true, room: true },
      });

      return msgs.map((m) => ({
        ...m,
        sentAt: m.sentAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
        room: { ...m.room, createdAt: m.room.createdAt.toISOString() },
        sender: {
          ...m.sender,
          birthDate: m.sender.birthDate
            ? m.sender.birthDate.toISOString()
            : null,
          lastOnline: m.sender.lastOnline
            ? m.sender.lastOnline.toISOString()
            : null,
        },
      }));
    }),

    friends: async (parent: User) => {
      const friends = await prisma.friends.findMany({
        where: { userId: parent.id },
        include: { friend: true },
      });
      return friends.map((f) => f.friend);
    },

    privacy: async (parent: User) => {
      const settings = await prisma.privacy_settings.findUnique({
        where: { userId: parent.id },
      });
      if (!settings) return null;

      return {
        id: settings.id,
        showEmail: settings.showEmail,
        showLastOnline: settings.showLastOnline,
        showBirthDate: settings.showBirthDate,
        user: parent,
      };
    },
  },
};
