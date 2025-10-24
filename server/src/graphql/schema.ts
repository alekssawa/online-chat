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
    rooms: [Room!]!
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

  type Room {
    id: ID!
    name: String!
    createdAt: String!
    users: [User!]!
    messages: [Message!]!
    avatar: RoomAvatar
  }

  type RoomUser {
    id: ID!
    room: Room!
    user: User!
    joinedAt: String!
  }

  type Message {
    id: ID!
    text: String!
    sentAt: String!
    updatedAt: String!
    sender: User!
    room: Room!
  }

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
    room: Room!
    url: String!
  }

  type Query {
    users: [User!]!
    user(id: ID!): User
    rooms: [Room!]!
    room(id: ID!): Room
    messages(roomId: ID!): [Message!]!
  }

  scalar Upload

  type Mutation {
    register(email: String!, password: String!, name: String): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    refreshToken: AuthPayload!
    logout: Boolean!

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

    deleteUser(id: ID!): User!

    createRoom(name: String!, userId: ID!): Room!
    uploadRoomAvatar(roomId: ID!, file: Upload!): RoomAvatar!
    updateRoom(id: ID!, name: String!): Room!
    deleteRoom(id: ID!): Room!

    addUserToRoom(roomId: ID!, userId: ID!): RoomUser!
    removeUserFromRoom(roomId: ID!, userId: ID!): RoomUser!

    sendMessage(userId: ID!, roomId: ID!, text: String!): Message!
    updateMessage(id: ID!, text: String!): Message!
    deleteMessage(id: ID!): Message!
  }
`;
