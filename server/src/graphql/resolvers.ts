import { authResolvers } from "./resolvers/auth.resolver.js";
import { userResolvers } from "./resolvers/user.resolver.js";
// import { roomResolvers } from "./resolvers/room.resolver.js";
import { groupResolvers } from "./resolvers/group.resolver.js";
import { privateChatResolvers } from "./resolvers/privateChat.resolver.js";
import { messageResolvers } from "./resolvers/message.resolver.js";

export const resolvers = {
  Query: {
    ...userResolvers.Query,
    // ...roomResolvers.Query,
    ...groupResolvers.Query,
    ...privateChatResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...userResolvers.Mutation,
    // ...roomResolvers.Mutation,
    ...groupResolvers.Mutation,
    ...privateChatResolvers.Mutation,
    ...messageResolvers.Mutation,
  },
  User: {
    ...userResolvers.User,
  },
  // Room: {
  //   ...roomResolvers.Room,
  // },
  Group: {
    ...groupResolvers.Group,
  },
  PrivateChat: {
    ...privateChatResolvers.PrivateChat,
  },
  Message: {
    ...messageResolvers.Message,
  },
  RoomUser: {
    ...messageResolvers.RoomUser,
  },
};
