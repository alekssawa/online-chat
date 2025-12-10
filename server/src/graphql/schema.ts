export const typeDefs = `#graphql
  scalar Upload

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
    privacy: PrivacySettings!
    privateChats: [PrivateChat!]!
    groupChats: [GroupChat!]!
    messages: [Message!]!

    # 🔐 Crypto fields
    publicKey: String         # Можно отдавать клиенту
    encryptedPrivateKey: String
    salt: String
    iv: String
    kdfIterations: Int
    keyCreatedAt: String      # ISO
    keyUpdatedAt: String      # ISO
  }

  type Friend {
    id: ID!
    friend: User!
    createdAt: String!
  }

  type PrivacySettings {
    showLastOnline: PrivacyLevel!
    showAbout: PrivacyLevel!
    showEmail: PrivacyLevel!
    showBirthDate: PrivacyLevel!  # ✅ ДОБАВЬТЕ ЭТО ПОЛЕ
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

  # Приватные чаты
  type PrivateChat {
    id: ID!
    user1Id: ID!
    user2Id: ID!
    user1: User!
    user2: User!
    messages: [Message!]!
    createdAt: String!
  }

  # Групповые чаты
  type GroupChat {
    id: ID!
    name: String!
    createdAt: String!
    users: [GroupChatUser!]!  # <- вместо User
    messages: [Message!]!
    avatar: GroupAvatar
  }

  type GroupChatUser {
    id: ID!
    name: String!
    nickname: String
    avatar: UserAvatar
    about: String
    email: String
    birthDate: String
    lastOnline: String
  }

  type Message {
    id: ID!
    text: String!
    iv: String! 
    sentAt: String!
    updatedAt: String!
    sender: User!
    privateChatId: ID
    privateChat: PrivateChat
    groupId: ID
    groupChat: GroupChat
  }

  # Аватары
  type UserAvatar {
    id: ID!
    filename: String!
    mimeType: String!
    uploadedAt: String!
    user: User!
    url: String!
  }

  type GroupAvatar {
    id: ID!
    filename: String!
    mimeType: String!
    uploadedAt: String!
    group: GroupChat!
    url: String!
  }

  # Запросы
  type Query {
    users: [User!]!
    user(id: ID!): User

    privateChats: [PrivateChat!]!  
    privateChat(chatId: ID!): PrivateChat

    groupChats: [GroupChat!]!
    groupChat(id: ID!): GroupChat
  }

  # Мутации
  type Mutation {
    # --- Аутентификация ---
    register(
    email: String!
    password: String!
    name: String

    publicKey: String!
    encryptedPrivateKey: String!
    salt: String!
    iv: String!
    kdfIterations: Int!
  ): AuthPayload!
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
    sendPrivateMessage(chatId: ID!, senderId: ID!, text: String!, iv: String!): Message!
    updatePrivateMessage(id: ID!, text: String!): Message!
    deletePrivateMessage(id: ID!): Message!

    # --- Групповые чаты ---
    createGroupChat(name: String!, creatorId: ID!): GroupChat!
    uploadGroupAvatar(groupId: ID!, file: Upload!): GroupAvatar!
    updateGroupChat(id: ID!, name: String!): GroupChat!
    deleteGroupChat(id: ID!): GroupChat!

    addUserToGroup(groupId: ID!, userId: ID!): GroupChat!
    removeUserFromGroup(groupId: ID!, userId: ID!): GroupChat!

    sendGroupMessage(groupId: ID!, senderId: ID!, text: String!, iv: String!): Message!
    updateGroupMessage(id: ID!, text: String!): Message!
    deleteGroupMessage(id: ID!): Message!
  }
`
