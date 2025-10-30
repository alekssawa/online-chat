import prisma from "../../lib/prismaClient.js";
import type { User, Message, UserAvatar } from "../types.js";
import { withAuth } from "../../lib/authDecorator.js";
import { GraphQLError } from "graphql";

export const userResolvers = {
  Query: {
    users: withAuth(async (_: any): Promise<User[]> => {
      const users = await prisma.users.findMany();
      return users.map((u) => ({
        ...u,
        birthDate: u.birthDate ? u.birthDate.toISOString() : null,
        lastOnline: u.lastOnline ? u.lastOnline.toISOString() : null,
      }));
    }),

    user: withAuth(
      async (_: any, { id }: { id: string }): Promise<User | null> => {
        const user = await prisma.users.findUnique({ where: { id } });
        if (!user) return null;
        return {
          ...user,
          birthDate: user.birthDate ? user.birthDate.toISOString() : null,
          lastOnline: user.lastOnline ? user.lastOnline.toISOString() : null,
        };
      },
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
      ) => {
        const data: any = {};
        if (email) data.email = email;
        if (password) data.password = password;
        if (name) data.name = name;
        return prisma.users.update({ where: { id }, data });
      },
    ),

    uploadUserAvatar: withAuth(
      async (
        _: any,
        { userId, file }: { userId: string; file: Promise<any> },
      ) => {
        const { createReadStream, filename, mimetype } = await file;
        const stream = createReadStream();

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
      },
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
        },
      ) => {
        const data: any = {};
        if (showEmail !== undefined) data.showEmail = showEmail;
        if (showLastOnline !== undefined) data.showLastOnline = showLastOnline;
        if (showBirthDate !== undefined) data.showBirthDate = showBirthDate;

        const updated = await prisma.privacy_settings.upsert({
          where: { userId },
          update: data,
          create: { 
            userId, 
            ...data,
            showAbout: "ALL", 
            allowCalls: "FRIENDS", 
            showLastOnline: data.showLastOnline || "ALL",
            showEmail: data.showEmail || "FRIENDS", 
            showBirthDate: data.showBirthDate || "FRIENDS",
          },
          include: { user: true },
        });

        return {
          showEmail: updated.showEmail,
          showLastOnline: updated.showLastOnline,
          showBirthDate: updated.showBirthDate,
          user: updated.user,
        };
      },
    ),

    updateProfile: withAuth(
      async (
        _: any,
        {
          id,
          nickname,
          about,
          birthDate,
        }: {
          id: string;
          nickname?: string;
          about?: string;
          birthDate?: string;
        },
      ) => {
        const data: any = {};
        if (nickname !== undefined) data.nickname = nickname;
        if (about !== undefined) data.about = about;
        if (birthDate !== undefined) data.birthDate = new Date(birthDate);
        return prisma.users.update({ where: { id }, data });
      },
    ),

    addFriend: withAuth(
      async (
        _: any,
        {
          userId,
          friendIdentifier,
        }: { userId: string; friendIdentifier: string },
      ) => {
        const friend = await prisma.users.findFirst({
          where: {
            OR: [
              { id: friendIdentifier },
              { nickname: friendIdentifier },
              { email: friendIdentifier },
            ],
          },
        });
        if (!friend)
          throw new GraphQLError("Пользователь не найден", {
            extensions: { code: "NOT_FOUND" },
          });

        const existing = await prisma.friends.findFirst({
          where: { userId, friendId: friend.id },
        });
        if (existing)
          throw new GraphQLError("Этот пользователь уже в друзьях", {
            extensions: { code: "BAD_USER_INPUT" },
          });

        await prisma.friends.create({ data: { userId, friendId: friend.id } });
        return prisma.users.findUnique({ where: { id: userId } });
      },
    ),

    removeFriend: withAuth(
      async (
        _: any,
        {
          userId,
          friendIdentifier,
        }: { userId: string; friendIdentifier: string },
      ) => {
        const friend = await prisma.users.findFirst({
          where: {
            OR: [
              { id: friendIdentifier },
              { nickname: friendIdentifier },
              { email: friendIdentifier },
            ],
          },
        });
        if (!friend)
          throw new GraphQLError("Пользователь не найден", {
            extensions: { code: "NOT_FOUND" },
          });

        await prisma.friends.deleteMany({
          where: { userId, friendId: friend.id },
        });
        return prisma.users.findUnique({ where: { id: userId } });
      },
    ),

    deleteUser: withAuth(async (_: any, { id }: { id: string }) => {
      await prisma.users.delete({ where: { id } });
      return true;
    }),
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
        mimeType: avatar.mime_type,
        uploadedAt: avatar.uploaded_at!.toISOString(),
        url: `${process.env.API_URL}/avatar/${avatar.user_id}`,
        user: { id: parent.id, email: parent.email, name: parent.name },
      };
    },

    groupChats: async (parent: User) => {
      const groupUsers = await prisma.group_users.findMany({
        where: { userId: parent.id },
        include: { group: true },
      });
      return groupUsers.map((gu) => ({
        ...gu.group,
        createdAt: gu.group.createdAt.toISOString(),
      }));
    },

    privateChats: async (parent: User) => {
      const chats = await prisma.private_chats.findMany({
        where: { OR: [{ user1Id: parent.id }, { user2Id: parent.id }] },
        include: {
          user1: true,
          user2: true,
          messages: { include: { sender: true } },
        },
      });
      return chats.map((chat) => ({
        ...chat,
        createdAt: chat.createdAt.toISOString(),
      }));
    },

    messages: async (parent: User) => {
      const msgs = await prisma.messages.findMany({
        where: { senderId: parent.id },
        include: { sender: true, privateChat: true, group: true },
      });
      return msgs.map((m) => ({
        ...m,
        sentAt: m.sentAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
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
    },

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
        showEmail: settings.showEmail,
        showLastOnline: settings.showLastOnline,
        showBirthDate: settings.showBirthDate,
        user: parent,
      };
    },
  },
};
