export interface User {
  id: string;
  email: string;
  // password: string;
  name: string;
  avatar?: UserAvatar | null;
}

export interface UserAvatar {
  id: string;
  filename: string;
  mimeType: string;
  uploadedAt: string;
  user: User;
}

export interface Room {
  id: string;
  name: string;
  createdAt: string;
  avatar?: RoomAvatar | null;
}

export interface RoomAvatar {
  id: string;
  filename: string;
  mimeType: string;
  uploadedAt: string;
  room: Room;
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
