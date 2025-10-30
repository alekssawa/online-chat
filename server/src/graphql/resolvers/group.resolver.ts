import prisma from "../../lib/prismaClient.js";
import type { User, Message } from "../types.js";
import { GraphQLError } from "graphql";
import { withAuth } from "../../lib/authDecorator.js";
import { GraphQLUpload } from "graphql-upload-minimal";
import type { FileUpload } from "graphql-upload-minimal";

import filterUserByPrivacy from "../../lib/filterUserByPrivacy.js";

export const groupResolvers = {
  Upload: GraphQLUpload,

  Query: {
    groupChats: withAuth(async (_: any, __: any, context: any) => {
      const currentUserId = context.userId;

      const friends = await prisma.friends.findMany({
        where: { userId: currentUserId },
        select: { friendId: true },
      });
      const friendIds = new Set(friends.map((f) => f.friendId));

      // Находим группы, где пользователь является участником
      const userGroups = await prisma.group_users.findMany({
        where: { userId: currentUserId },
        include: {
          group: {
            include: {
              users: {
                include: {
                  user: {
                    include: {
                      privacy: true,
                      avatar: true,
                    },
                  },
                },
              },
              messages: {
                include: {
                  sender: {
                    include: {
                      privacy: true,
                      avatar: true,
                    },
                  },
                },
                orderBy: { sentAt: "asc" },
              },
              avatar: true,
            },
          },
        },
      });

      return userGroups.map((userGroup) => ({
        ...userGroup.group,
        createdAt: userGroup.group.createdAt.toISOString(),
        users: userGroup.group.users.map((groupUser) => ({
          ...groupUser,
          joinedAt: groupUser.joinedAt.toISOString(),
          user: filterUserByPrivacy(
            groupUser.user,
            friendIds.has(groupUser.userId),
          ),
        })),
        messages: userGroup.group.messages.map((message) => ({
          ...message,
          sentAt: message.sentAt.toISOString(),
          updatedAt: message.updatedAt.toISOString(),
          sender: filterUserByPrivacy(
            message.sender,
            friendIds.has(message.senderId),
          ),
        })),
      }));
    }),

    groupChat: withAuth(
      async (_: any, { id }: { id: string }, context: any) => {
        const currentUserId = context.userId;

        // Сначала проверяем, что пользователь участник группы
        const userMembership = await prisma.group_users.findFirst({
          where: {
            userId: currentUserId,
            groupId: id,
          },
        });

        if (!userMembership) {
          throw new GraphQLError("Доступ запрещен или группа не найдена", {
            extensions: { code: "FORBIDDEN" },
          });
        }

        const friends = await prisma.friends.findMany({
          where: { userId: currentUserId },
          select: { friendId: true },
        });
        const friendIds = new Set(friends.map((f) => f.friendId));

        const group = await prisma.groups.findUnique({
          where: { id },
          include: {
            users: {
              include: {
                user: {
                  include: {
                    privacy: true,
                    avatar: true,
                  },
                },
              },
            },
            messages: {
              include: {
                sender: {
                  include: {
                    privacy: true,
                    avatar: true,
                  },
                },
              },
              orderBy: { sentAt: "asc" },
            },
            avatar: true,
          },
        });

        if (!group) return null;

        return {
          ...group,
          createdAt: group.createdAt.toISOString(),
          users: group.users.map((groupUser) => ({
            ...groupUser,
            joinedAt: groupUser.joinedAt.toISOString(),
            user: filterUserByPrivacy(
              groupUser.user,
              friendIds.has(groupUser.userId),
            ),
          })),
          messages: group.messages.map((message) => ({
            ...message,
            sentAt: message.sentAt.toISOString(),
            updatedAt: message.updatedAt.toISOString(),
            sender: filterUserByPrivacy(
              message.sender,
              friendIds.has(message.senderId),
            ),
          })),
        };
      },
    ),
  },

  Mutation: {
    createGroupChat: withAuth(
      async (
        _: any,
        { name, creatorId }: { name: string; creatorId: string },
      ) => {
        if (!name || !creatorId) {
          throw new GraphQLError("name и creatorId обязательны", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        const user = await prisma.users.findUnique({
          where: { id: creatorId },
        });
        if (!user) {
          throw new GraphQLError("Пользователь не найден", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        const group = await prisma.groups.create({ data: { name } });
        await prisma.group_users.create({
          data: { groupId: group.id, userId: creatorId },
        });

        return { ...group, createdAt: group.createdAt.toISOString() };
      },
    ),

    addUserToGroup: withAuth(
      async (
        _: any,
        { groupId, userId }: { groupId: string; userId: string },
      ) => {
        if (!groupId || !userId) {
          throw new GraphQLError("groupId и userId обязательны", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        const group = await prisma.groups.findUnique({
          where: { id: groupId },
          include: { users: { include: { user: true } } }, // чтобы вернуть пользователей
        });
        if (!group) {
          throw new GraphQLError("Группа не найдена", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        const user = await prisma.users.findUnique({ where: { id: userId } });
        if (!user) {
          throw new GraphQLError("Пользователь не найден", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        const existing = await prisma.group_users.findUnique({
          where: { groupId_userId: { groupId, userId } },
        });
        if (existing) {
          throw new GraphQLError("Пользователь уже в группе", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        try {
          // Добавляем пользователя в группу
          await prisma.group_users.create({
            data: { groupId, userId },
          });

          // Возвращаем саму группу с актуальными пользователями
          const updatedGroup = await prisma.groups.findUnique({
            where: { id: groupId },
            include: { users: { include: { user: true } } },
          });

          if (!updatedGroup) {
            throw new GraphQLError("Группа не найдена после обновления", {
              extensions: { code: "NOT_FOUND" },
            });
          }

          return updatedGroup;
        } catch (err) {
          console.error("Ошибка добавления пользователя в группу:", err);
          throw new GraphQLError("Не удалось добавить пользователя в группу", {
            extensions: { code: "INTERNAL_SERVER_ERROR" },
          });
        }
      },
    ),

    removeUserFromGroup: withAuth(
      async (
        _: any,
        { groupId, userId }: { groupId: string; userId: string },
      ) => {
        if (!groupId || !userId) {
          throw new GraphQLError("groupId и userId обязательны", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        const existing = await prisma.group_users.findUnique({
          where: { groupId_userId: { groupId, userId } },
        });
        if (!existing) {
          throw new GraphQLError("Пользователь не найден в группе", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        try {
          const groupUser = await prisma.group_users.delete({
            where: { groupId_userId: { groupId, userId } },
            include: { user: true, group: true },
          });
          return groupUser;
        } catch (err) {
          console.error("Ошибка удаления пользователя из группы:", err);
          throw new GraphQLError("Не удалось удалить пользователя из группы", {
            extensions: { code: "INTERNAL_SERVER_ERROR" },
          });
        }
      },
    ),

    uploadGroupAvatar: withAuth(
      async (
        _: any,
        { groupId, file }: { groupId: string; file: Promise<FileUpload> },
      ) => {
        if (!groupId || !file) {
          throw new GraphQLError("groupId и file обязательны", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        const group = await prisma.groups.findUnique({
          where: { id: groupId },
        });
        if (!group) {
          throw new GraphQLError("Группа не найдена", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        const { createReadStream, filename, mimetype } = await file;
        const stream = createReadStream();
        const chunks: Uint8Array[] = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);

        const avatar = await prisma.group_avatars.upsert({
          where: { group_id: groupId },
          update: {
            filename,
            mime_type: mimetype,
            data: buffer,
            uploaded_at: new Date(),
          },
          create: {
            group_id: groupId,
            filename,
            mime_type: mimetype,
            data: buffer,
          },
        });

        return {
          id: avatar.id.toString(),
          filename: avatar.filename,
          mimeType: avatar.mime_type,
          uploadedAt: avatar.uploaded_at.toISOString(),
          url: `${process.env.API_URL}/avatar/group/${group.id}`,
          group: {
            id: group.id,
            name: group.name,
            createdAt: group.createdAt.toISOString(),
          },
        };
      },
    ),
  },

  GroupChat: {
    messages: withAuth(async (parent: any) => {
      const msgs = await prisma.messages.findMany({
        where: { groupId: parent.id },
        include: { sender: true },
      });
      return msgs.map((m) => ({
        ...m,
        sentAt: m.sentAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      }));
    }),

    users: withAuth(async (parent: any) => {
      const users = await prisma.group_users.findMany({
        where: { groupId: parent.id },
        include: { user: true },
      });
      return users.map((u) => u.user);
    }),

    avatar: withAuth(async (parent: any) => {
      const avatar = await prisma.group_avatars.findUnique({
        where: { group_id: parent.id },
      });
      if (!avatar) return null;
      return {
        ...avatar,
        uploadedAt: avatar.uploaded_at.toISOString(),
        url: `${process.env.API_URL}/avatar/group/${parent.id}`,
      };
    }),
  },
};
