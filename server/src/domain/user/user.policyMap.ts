import type { UserWithPrivacy } from "./user.types.js";

export const userPolicyMap = {
  showEmail: {
    source: "email",
    target: "email",
  },
  showAbout: {
    source: "about",
    target: "about",
  },
  showBirthDate: {
    source: "birthDate",
    target: "birthDate",
  },
  showLastOnline: {
    source: "lastOnline",
    target: "lastOnline",
  },
} as const;

export function mapUserToUserWithPrivacy(user: any): UserWithPrivacy {
  return {
    ...user,
    birthDate: user.birthDate ? user.birthDate.toISOString() : null,
    lastOnline: user.lastOnline ? user.lastOnline.toISOString() : null,
  };
}
