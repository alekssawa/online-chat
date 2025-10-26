export interface Avatar {
  url: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: Avatar; // 👈 добавлено поле для аватара
}

export type SelectedChat =
  | { chat: GroupChat; type: "group" }
  | { chat: PrivateChat; type: "private" };

export interface GroupChat {
  id: string;
  name: string;
  createdAt: string;
  avatar?: GroupAvatar | null;
  users?: User[];
  messages: Message[];
}

export interface GroupAvatar {
  url: string;
}

// ✅ Участник группы
export interface GroupUser {
  id: string;
  groupId: string;
  userId: string;
  joinedAt: string;
  user: User;
  group?: GroupChat;
}

export interface PrivateChat {
  id: string;
  user1Id: string;
  user2Id: string;
  user1: User;
  user2: User;
  createdAt: string;
  messages: Message[];
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  sentAt: string;
  updatedAt: string;
  sender?: User;
  privateChatId?: string | null;
  groupId?: string | null;
}

export interface OnlineUser {
  userId: string;
  online: boolean;
}
