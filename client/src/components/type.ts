export interface Avatar {
  url: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: Avatar; // 👈 добавлено поле для аватара
}

export interface Room {
  id: string;
  name: string;
  createdAt: string;
  avatar?: Avatar; // 👈 добавлено поле для аватара
  messages: Message[];
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  roomId: string;
  sentAt: string;
  updatedAt: string;
  sender?: User;
}

export interface FullRoom extends Room {
  id: string;
  name: string;
  createdAt: string;
  users: { id: string; email: string; name: string; avatar?: Avatar }[];
  messages: Message[];
  avatar?: Avatar;
}

export interface OnlineUser {
  userId: string;
  online: boolean;
}
