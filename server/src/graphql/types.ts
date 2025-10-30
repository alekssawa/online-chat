// ✅ Пользователь
export interface User {
  id: string;
  email: string;
  name: string;
  nickname?: string | null;
  about?: string | null;
  birthDate?: string | null; // ISO string
  lastOnline?: string | null;
  avatar?: UserAvatar | null;
  privacy?: PrivacySettings | null;
  friends?: Friend[];
  groups?: GroupUser[]; // ✅ участие в группах
  privateChats1?: PrivateChat[]; // ✅ чаты, где он user1
  privateChats2?: PrivateChat[]; // ✅ чаты, где он user2
}

// ✅ Аватар пользователя
export interface UserAvatar {
  id: string;
  filename: string;
  mimeType: string;
  uploadedAt: string;
  user: User;
}

// ✅ Группы
export interface GroupChat {
  id: string;
  name: string;
  createdAt: string;
  avatar?: GroupAvatar | null;
  users?: GroupUser[];
  messages?: Message[];
}

// ✅ Аватар группы
export interface GroupAvatar {
  id: string;
  filename: string;
  mimeType: string;
  uploadedAt: string;
  group: GroupChat;
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

// ✅ Приватный чат
export interface PrivateChat {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: string;
  messages?: Message[];
}

// ✅ Сообщение
export interface Message {
  id: string;
  text: string;
  senderId: string;
  sentAt: string;
  updatedAt: string;
  sender?: User;
  // сообщение может быть либо в приватном чате, либо в группе
  privateChatId?: string | null;
  groupId?: string | null;
}

// ✅ Друзья
export interface Friend {
  id: string;
  friend: User;
  createdAt: string;
}

// ✅ Настройки приватности
export interface PrivacySettings {
  showLastOnline: PrivacyLevel;
  showAbout: PrivacyLevel;
  showEmail: PrivacyLevel;
  showBirthDate: PrivacyLevel; // ✅ добавлено, как в Prisma
  allowCalls: PrivacyLevel;
}

export type PrivacyLevel = "ALL" | "FRIENDS" | "NONE";
