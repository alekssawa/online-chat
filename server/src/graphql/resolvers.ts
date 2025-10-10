import { authResolvers } from "./resolvers/auth.resolver.js";
import { userResolvers } from "./resolvers/user.resolver.js";
import { roomResolvers } from "./resolvers/room.resolver.js";
import { messageResolvers } from "./resolvers/message.resolver.js";

export const resolvers = {
  Query: {
    ...userResolvers.Query,
    ...roomResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...userResolvers.Mutation,
    ...roomResolvers.Mutation,
    ...messageResolvers.Mutation,
  },
  User: {
    ...userResolvers.User,
  },
  Room: {
    ...roomResolvers.Room,
  },
  Message: {
    ...messageResolvers.Message,
  },
  RoomUser: {
    ...messageResolvers.RoomUser,
  },
};
