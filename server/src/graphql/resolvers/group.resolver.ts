import prisma from "../../lib/prismaClient.js";
import type { User, Message } from "../types.js";
import { GraphQLError } from "graphql";
import { withAuth } from "../../lib/authDecorator.js";
import { GraphQLUpload } from "graphql-upload-minimal";
import type { FileUpload } from "graphql-upload-minimal";

export const groupResolvers = {
  Upload: GraphQLUpload,

  Query: {
    groups: withAuth(async () => {
      const groups = await prisma.groups.findMany();
      return groups.map(g => ({ ...g, createdAt: g.createdAt.toISOString() }));
    }),

    group: withAuth(async (_: any, { id }: { id: string }) => {
      const group = await prisma.groups.findUnique({ where: { id } });
      if (!group) return null;
      return { ...group, createdAt: group.createdAt.toISOString() };
    }),
  },

  Mutation: {
    createGroup: withAuth(async (_: any, { name, userId }: { name: string; userId: string }) => {
      if (!name || !userId) {
        throw new GraphQLError("name и userId обязательны", { extensions: { code: "BAD_USER_INPUT" } });
      }

      const user = await prisma.users.findUnique({ where: { id: userId } });
      if (!user) {
        throw new GraphQLError("Пользователь не найден", { extensions: { code: "NOT_FOUND" } });
      }

      const group = await prisma.groups.create({ data: { name } });
      await prisma.group_users.create({ data: { groupId: group.id, userId } });

      return { ...group, createdAt: group.createdAt.toISOString() };
    }),

    addUserToGroup: withAuth(async (_: any, { groupId, userId }: { groupId: string; userId: string }) => {
      if (!groupId || !userId) {
        throw new GraphQLError("groupId и userId обязательны", { extensions: { code: "BAD_USER_INPUT" } });
      }

      const group = await prisma.groups.findUnique({ where: { id: groupId } });
      if (!group) {
        throw new GraphQLError("Группа не найдена", { extensions: { code: "NOT_FOUND" } });
      }

      const user = await prisma.users.findUnique({ where: { id: userId } });
      if (!user) {
        throw new GraphQLError("Пользователь не найден", { extensions: { code: "NOT_FOUND" } });
      }

      const existing = await prisma.group_users.findUnique({ where: { groupId_userId: { groupId, userId } } });
      if (existing) {
        throw new GraphQLError("Пользователь уже в группе", { extensions: { code: "BAD_USER_INPUT" } });
      }

      try {
        const groupUser = await prisma.group_users.create({
          data: { groupId, userId },
          include: { user: true, group: true },
        });
        return groupUser;
      } catch (err) {
        console.error("Ошибка добавления пользователя в группу:", err);
        throw new GraphQLError("Не удалось добавить пользователя в группу", { extensions: { code: "INTERNAL_SERVER_ERROR" } });
      }
    }),

    removeUserFromGroup: withAuth(async (_: any, { groupId, userId }: { groupId: string; userId: string }) => {
      if (!groupId || !userId) {
        throw new GraphQLError("groupId и userId обязательны", { extensions: { code: "BAD_USER_INPUT" } });
      }

      const existing = await prisma.group_users.findUnique({ where: { groupId_userId: { groupId, userId } } });
      if (!existing) {
        throw new GraphQLError("Пользователь не найден в группе", { extensions: { code: "NOT_FOUND" } });
      }

      try {
        const groupUser = await prisma.group_users.delete({
          where: { groupId_userId: { groupId, userId } },
          include: { user: true, group: true },
        });
        return groupUser;
      } catch (err) {
        console.error("Ошибка удаления пользователя из группы:", err);
        throw new GraphQLError("Не удалось удалить пользователя из группы", { extensions: { code: "INTERNAL_SERVER_ERROR" } });
      }
    }),

    uploadGroupAvatar: withAuth(async (_: any, { groupId, file }: { groupId: string; file: Promise<FileUpload> }) => {
      if (!groupId || !file) {
        throw new GraphQLError("groupId и file обязательны", { extensions: { code: "BAD_USER_INPUT" } });
      }

      const group = await prisma.groups.findUnique({ where: { id: groupId } });
      if (!group) {
        throw new GraphQLError("Группа не найдена", { extensions: { code: "NOT_FOUND" } });
      }

      const { createReadStream, filename, mimetype } = await file;
      const stream = createReadStream();
      const chunks: Uint8Array[] = [];
      for await (const chunk of stream) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);

      const avatar = await prisma.group_avatars.upsert({
        where: { group_id: groupId },
        update: { filename, mime_type: mimetype, data: buffer, uploaded_at: new Date() },
        create: { group_id: groupId, filename, mime_type: mimetype, data: buffer },
      });

      return {
        id: avatar.id.toString(),
        filename: avatar.filename,
        mimeType: avatar.mime_type,
        uploadedAt: avatar.uploaded_at.toISOString(),
        url: `${process.env.API_URL}/avatar/group/${group.id}`,
        group: { id: group.id, name: group.name, createdAt: group.createdAt.toISOString() },
      };
    }),
  },

  Group: {
    messages: withAuth(async (parent: any) => {
      const msgs = await prisma.messages.findMany({
        where: { groupId: parent.id },
        include: { sender: true },
      });
      return msgs.map(m => ({
        ...m,
        sentAt: m.sentAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      }));
    }),

    users: withAuth(async (parent: any) => {
      const users = await prisma.group_users.findMany({ where: { groupId: parent.id }, include: { user: true } });
      return users.map(u => u.user);
    }),

    avatar: withAuth(async (parent: any) => {
      const avatar = await prisma.group_avatars.findUnique({ where: { group_id: parent.id } });
      if (!avatar) return null;
      return { ...avatar, uploadedAt: avatar.uploaded_at.toISOString(), url: `${process.env.API_URL}/avatar/group/${parent.id}` };
    }),
  },
};
