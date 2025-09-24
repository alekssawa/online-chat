export const typeDefs = `#graphql
  # Пользователь
  type User {
    id: ID!
    email: String!
    name: String!
    # password: String!
    rooms: [Room!]!
    messages: [Message!]!
  }

  type AuthPayload {
    accessToken: String!
    refreshToken: String!
    user: User!
  }

  # Комната
  type Room {
    id: ID!
    name: String!
    createdAt: String!
    users: [User!]!
    messages: [Message!]!
  }

  # Связь пользователей и комнат
  type RoomUser {
    id: ID!
    room: Room!
    user: User!
    joinedAt: String!
  }

  # Сообщение
  type Message {
    id: ID!
    text: String!
    sentAt: String!
    updatedAt: String!  
    sender: User!
    room: Room!
  }

  type Query {
    users: [User!]!
    user(id: ID!): User
    rooms: [Room!]!
    room(id: ID!): Room
    messages(roomId: ID!): [Message!]!
  }

  type Mutation {
    register(email: String!, password: String!, name: String): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    refreshToken: AuthPayload!
    logout: Boolean!

    createUser(email: String!, name: String, password: String!): User!
    updateUser(id: ID!, email: String, name: String, password: String): User!
    deleteUser(id: ID!): User!

    createRoom(name: String!, userId: ID!): Room!
    updateRoom(id: ID!, name: String!): Room!
    deleteRoom(id: ID!): Room!

    addUserToRoom(roomId: ID!, userId: ID!): RoomUser!
    removeUserFromRoom(roomId: ID!, userId: ID!): RoomUser!

    sendMessage(userId: ID!, roomId: ID!, text: String!): Message!
    updateMessage(id: ID!, text: String!): Message!
    deleteMessage(id: ID!): Message!
  }
`;
