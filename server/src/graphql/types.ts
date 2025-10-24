export interface User {
  id: string;
  email: string;
  name: string;
  nickname?: string | null; // ✅ опциональный ник
  about?: string | null;    // ✅ информация о себе
  birthDate?: string | null; // ✅ дата рождения (ISO string)
  lastOnline?: string | null; // ✅ время последнего входа
  avatar?: UserAvatar | null;
  privacy?: PrivacySettings | null; // ✅ настройки конфиденциальности
  friends?: Friend[]; // ✅ список друзей
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

// ✅ Новые интерфейсы
export interface Friend {
  id: string;
  friend: User;
  createdAt: string;
}

export interface PrivacySettings {
  id: string;
  showLastOnline: PrivacyLevel;
  showAbout: PrivacyLevel;
  showEmail: PrivacyLevel;
  allowCalls: PrivacyLevel;
}

export type PrivacyLevel = "ALL" | "FRIENDS" | "NONE";
