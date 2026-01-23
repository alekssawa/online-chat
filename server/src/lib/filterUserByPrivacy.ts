import type { UserOutputDTO } from "../graphql/types.js";

const filterUserByPrivacy = (
  user: any,
  isFriend: boolean,
): UserOutputDTO | null => {
  if (!user) return null;

  const result: UserOutputDTO = {
    id: user.id,
    name: user.name,
    nickname: user.nickname ?? null,
    avatar: user.avatar
      ? { url: `${process.env.API_URL_BACKEND}/avatar/${user.id}` }
      : null,
    email: null,
    about: null,
    birthDate: null,
    lastOnline: null,
  };

  if (!user.privacy) return result;

  const canView = (level: "ALL" | "FRIENDS" | "NONE") =>
    level === "ALL" || (level === "FRIENDS" && isFriend);

  if (canView(user.privacy.showEmail)) {
    result.email = user.email ?? null;
  }

  if (canView(user.privacy.showAbout)) {
    result.about = user.about ?? null;
  }

  if (canView(user.privacy.showBirthDate)) {
    result.birthDate = user.birthDate ? user.birthDate.toISOString() : null;
  }

  if (canView(user.privacy.showLastOnline)) {
    result.lastOnline = user.lastOnline ? user.lastOnline.toISOString() : null;
  }

  return result;
};

export default filterUserByPrivacy;
