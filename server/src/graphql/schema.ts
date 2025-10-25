export const typeDefs = `#graphql
  type User {
    id: ID!
    email: String!
    name: String!
    nickname: String
    about: String
    birthDate: String
    lastOnline: String
    avatar: UserAvatar
    friends: [Friend!]!
    privacy: PrivacySettings
    # 🔸 Чаты и сообщения
    privateChats: [PrivateChat!]!
    groupChats: [GroupChat!]!
    messages: [Message!]!
  }

  type Friend {
    id: ID!
    friend: User!
    createdAt: String!
  }

  type PrivacySettings {
    id: ID!
    showLastOnline: PrivacyLevel!
    showAbout: PrivacyLevel!
    showEmail: PrivacyLevel!
    allowCalls: PrivacyLevel!
  }

  enum PrivacyLevel {
    ALL
    FRIENDS
    NONE
  }

  type AuthPayload {
    accessToken: String!
    refreshToken: String!
    user: User!
  }

  # 🔹 Приватные чаты
  type PrivateChat {
    id: ID!
    user1: User!
    user2: User!
    messages: [PrivateMessage!]!
    createdAt: String!
  }

  # 🔹 Групповые чаты
  type GroupChat {
    id: ID!
    name: String!
    createdAt: String!
    users: [User!]!
    messages: [GroupMessage!]!
    avatar: RoomAvatar
  }

  # 🔹 Сообщения
  interface Message {
    id: ID!
    text: String!
    sentAt: String!
    updatedAt: String!
    sender: User!
  }

  type PrivateMessage implements Message {
    id: ID!
    text: String!
    sentAt: String!
    updatedAt: String!
    sender: User!
    chat: PrivateChat!
  }

  type GroupMessage implements Message {
    id: ID!
    text: String!
    sentAt: String!
    updatedAt: String!
    sender: User!
    chat: GroupChat!
  }

  # 🔹 Аватары
  type UserAvatar {
    id: ID!
    filename: String!
    mimeType: String!
    uploadedAt: String!
    user: User!
    url: String!
  }

  type RoomAvatar {
    id: ID!
    filename: String!
    mimeType: String!
    uploadedAt: String!
    room: GroupChat!
    url: String!
  }

  # 🔹 Запросы
  type Query {
    users: [User!]!
    user(id: ID!): User

    privateChats(userId: ID!): [PrivateChat!]!
    privateChat(id: ID!): PrivateChat

    groupChats: [GroupChat!]!
    groupChat(id: ID!): GroupChat
  }

  # 🔹 Мутации
  scalar Upload

  type Mutation {
    # --- Аутентификация ---
    register(email: String!, password: String!, name: String): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    refreshToken: AuthPayload!
    logout: Boolean!

    # --- Пользователи ---
    createUser(email: String!, name: String, password: String!): User!
    uploadUserAvatar(userId: ID!, file: Upload!): UserAvatar!
    updateUser(
      id: ID!,
      email: String,
      name: String,
      password: String,
      nickname: String,
      about: String,
      birthDate: String
    ): User!
    updateProfile(
      id: ID!,
      nickname: String,
      about: String,
      birthDate: String
    ): User!

    updatePrivacySettings(
      userId: ID!,
      showEmail: Boolean,
      showLastOnline: Boolean,
      showBirthDate: Boolean
    ): PrivacySettings!

    # --- Друзья ---
    addFriend(userId: ID!, friendIdentifier: String!): User!
    removeFriend(userId: ID!, friendIdentifier: String!): User!

    deleteUser(id: ID!): User!

    # --- Приватные чаты ---
    createPrivateChat(user1Id: ID!, user2Id: ID!): PrivateChat!
    sendPrivateMessage(chatId: ID!, senderId: ID!, text: String!): PrivateMessage!
    updatePrivateMessage(id: ID!, text: String!): PrivateMessage!
    deletePrivateMessage(id: ID!): PrivateMessage!

    # --- Группы ---
    createGroupChat(name: String!, creatorId: ID!): GroupChat!
    uploadGroupAvatar(roomId: ID!, file: Upload!): RoomAvatar!
    updateGroupChat(id: ID!, name: String!): GroupChat!
    deleteGroupChat(id: ID!): GroupChat!

    addUserToGroup(roomId: ID!, userId: ID!): GroupChat!
    removeUserFromGroup(roomId: ID!, userId: ID!): GroupChat!

    sendGroupMessage(roomId: ID!, senderId: ID!, text: String!): GroupMessage!
    updateGroupMessage(id: ID!, text: String!): GroupMessage!
    deleteGroupMessage(id: ID!): GroupMessage!
  }
`;
