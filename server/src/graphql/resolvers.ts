import { authResolvers } from "./resolvers/auth.resolver.js";
import { userResolvers } from "./resolvers/user.resolver.js";
import { groupResolvers } from "./resolvers/group.resolver.js";
import { privateChatResolvers } from "./resolvers/privateChat.resolver.js";
import { messageResolvers } from "./resolvers/message.resolver.js";

export const resolvers = {
  Query: {
    ...userResolvers.Query,
    ...groupResolvers.Query,
    ...privateChatResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...userResolvers.Mutation,
    ...groupResolvers.Mutation,
    ...privateChatResolvers.Mutation,
    ...messageResolvers.Mutation,
  },
  User: {
    ...userResolvers.User,
  },
  // GroupChat: {
  //   ...groupResolvers.GroupChat,
  // },
  Message: {
    ...messageResolvers.Message,
  },
};
