import type { PrivacySettings } from "../../graphql/types.js"

export type UserWithPrivacy = {
  id: string;
  name: string;
  nickname: string | null;
  email: string;
  about: string | null;
  birthDate: string | null;
  lastOnline: string | null;
  avatar: { id: string } | null;
  privacy: PrivacySettings | null;

  encryptedPrivateKey: string | null;
  salt: string | null;
  iv: string | null;
  kdfIterations: number | null;
  keyCreatedAt: Date | string | null; // Prisma может возвращать Date
  keyUpdatedAt: Date | string | null;
};

export type UserOutputDTO = {
  id: string;
  name: string;
  nickname: string | null;
  avatar: { url: string } | null;
  email: string | null;
  about: string | null;
  birthDate: string | null;
  lastOnline: string | null;

  privacy: PrivacySettings | null;

  encryptedPrivateKey: string | null;
  salt: string | null;
  iv: string | null;
  kdfIterations: number | null;
  keyCreatedAt: string | null;
  keyUpdatedAt: string | null;
};
