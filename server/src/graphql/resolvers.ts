import prisma from "../prismaClient.js";

interface User {
  id: string;
  email: string;
  password: string;
  name: string;
}

interface Room {
  id: string;
  name: string;
  createdAt: string;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  roomId: string;
  sentAt: string;
  updatedAt: string;
  sender?: User;
  room?: Room;
}

interface RoomUser {
  id: string;
  roomId: string;
  userId: string;
  joinedAt: string;
  user: User;
  room: Room;
}

export const resolvers = {
  Query: {
    users: async (): Promise<User[]> => {
      return prisma.users.findMany();
    },

    rooms: async (): Promise<Room[]> => {
      const rooms = await prisma.rooms.findMany();
      return rooms.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
    },

    messages: async (_: any, { roomId }: { roomId: string }): Promise<Message[]> => {
      const msgs = await prisma.messages.findMany({
        where: { roomId },
        include: {
          sender: { select: { id: true, email: true, password: true, name: true } },
          room: true,
        },
      });

      return msgs.map((m) => ({
        ...m,
        sentAt: m.sentAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
        room: { ...m.room, createdAt: m.room.createdAt.toISOString() },
      }));
    },
  },

  Mutation: {
    createUser: async (_: any, { email, password, name }: { email: string; password: string; name?: string }) =>
      prisma.users.create({ data: { email, password, name: name ?? "unknown" } }),

    updateUser: async (
      _: any,
      { id, email, password, name }: { id: string; email?: string; password?: string; name?: string },
    ) => {
      const data: any = {};
      if (email !== undefined) data.email = email;
      if (password !== undefined) data.password = password;
      if (name !== undefined) data.name = name;

      return prisma.users.update({ where: { id }, data });
    },

    deleteUser: async (_: any, { id }: { id: string }) => prisma.users.delete({ where: { id } }),

    createRoom: async (_: any, { name, userId }: { name: string; userId: string }) => {
      const room = await prisma.rooms.create({ data: { name } });
      await prisma.room_users.create({ data: { roomId: room.id, userId } });
      return { ...room, createdAt: room.createdAt.toISOString() };
    },

    updateRoom: async (_: any, { id, name }: { id: string; name?: string }) => {
      const data: any = {};
      if (name !== undefined) data.name = name;
      return prisma.rooms.update({ where: { id }, data });
    },

    deleteRoom: async (_: any, { id }: { id: string }) => prisma.rooms.delete({ where: { id } }),

    addUserToRoom: async (_: any, { roomId, userId }: { roomId: string; userId: string }) =>
      prisma.room_users.create({
        data: { roomId, userId },
        include: {
          user: { select: { id: true, email: true, password: true, name: true } },
          room: true,
        },
      }),

    removeUserFromRoom: async (_: any, { roomId, userId }: { roomId: string; userId: string }) =>
      prisma.room_users.delete({
        where: { roomId_userId: { roomId, userId } },
      }),

    sendMessage: async (_: any, { userId, roomId, text }: { userId: string; roomId: string; text: string }): Promise<Message> => {
      const message = await prisma.messages.create({
        data: { text, senderId: userId, roomId },
        include: {
          sender: { select: { id: true, email: true, password: true, name: true } },
          room: true,
        },
      });

      return {
        ...message,
        sentAt: message.sentAt.toISOString(),
        updatedAt: message.updatedAt.toISOString(),
        room: { ...message.room, createdAt: message.room.createdAt.toISOString() },
      };
    },

    updateMessage: async (_: any, { id, text }: { id: string; text: string }): Promise<Message> => {
      const message = await prisma.messages.update({
        where: { id },
        data: { text, updatedAt: new Date() },
        include: {
          sender: { select: { id: true, email: true, password: true, name: true } },
          room: true,
        },
      });

      return {
        ...message,
        sentAt: message.sentAt.toISOString(),
        updatedAt: message.updatedAt.toISOString(),
        room: { ...message.room, createdAt: message.room.createdAt.toISOString() },
      };
    },

    deleteMessage: async (_: any, { id }: { id: string }): Promise<Message> => {
      const message = await prisma.messages.delete({
        where: { id },
        include: {
          sender: { select: { id: true, email: true, password: true, name: true } },
          room: true,
        },
      });

      return {
        ...message,
        sentAt: message.sentAt.toISOString(),
        updatedAt: message.updatedAt.toISOString(),
        room: { ...message.room, createdAt: message.room.createdAt.toISOString() },
      };
    },
  },

  Room: {
    users: async (parent: Room): Promise<User[]> => {
      const roomUsers = await prisma.room_users.findMany({
        where: { roomId: parent.id },
        include: { user: { select: { id: true, email: true, password: true, name: true } } },
      });
      return roomUsers.map((ru) => ru.user);
    },

    messages: async (parent: Room): Promise<Message[]> => {
      const msgs = await prisma.messages.findMany({
        where: { roomId: parent.id },
        include: { sender: { select: { id: true, email: true, password: true, name: true } }, room: true },
      });
      return msgs.map((m) => ({
        ...m,
        sentAt: m.sentAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
        room: { ...m.room, createdAt: m.room.createdAt.toISOString() },
      }));
    },
  },

  User: {
    rooms: async (parent: User): Promise<Room[]> => {
      const roomUsers = await prisma.room_users.findMany({
        where: { userId: parent.id },
        include: { room: true },
      });
      return roomUsers.map((ru) => ({ ...ru.room, createdAt: ru.room.createdAt.toISOString() }));
    },

    messages: async (parent: User): Promise<Message[]> => {
      const msgs = await prisma.messages.findMany({
        where: { senderId: parent.id },
        include: { sender: { select: { id: true, email: true, password: true, name: true } }, room: true },
      });
      return msgs.map((m) => ({
        ...m,
        sentAt: m.sentAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
        room: { ...m.room, createdAt: m.room.createdAt.toISOString() },
      }));
    },
  },

  Message: {
    sender: async (parent: Message): Promise<User> => {
      const user = await prisma.users.findUnique({
        where: { id: parent.senderId },
      });
      if (!user) throw new Error("Sender not found");
      return user;
    },
    room: async (parent: Message): Promise<Room> => {
      const room = await prisma.rooms.findUnique({
        where: { id: parent.roomId },
      });
      if (!room) throw new Error("Room not found");
      return { ...room, createdAt: room.createdAt.toISOString() };
    },
  },

  RoomUser: {
    user: async (parent: RoomUser): Promise<User> => {
      const user = await prisma.users.findUnique({
        where: { id: parent.userId },
      });
      if (!user) throw new Error("User not found");
      return user;
    },
    room: async (parent: RoomUser): Promise<Room> => {
      const room = await prisma.rooms.findUnique({
        where: { id: parent.roomId },
      });
      if (!room) throw new Error("Room not found");
      return { ...room, createdAt: room.createdAt.toISOString() };
    },
  },
};
