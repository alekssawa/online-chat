export interface User {
  id: string;
  email: string;
  // password: string;
  name: string;
}

export interface Room {
  id: string;
  name: string;
  createdAt: string;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  roomId: string;
  sentAt: string;
  updatedAt: string;
  sender?: User;
  room?: Room;
}

export interface RoomUser {
  id: string;
  roomId: string;
  userId: string;
  joinedAt: string;
  user: User;
  room: Room;
}