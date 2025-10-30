const filterUserByPrivacy = (user: any, isFriend: boolean) => {
  if (!user) return null;

  const filteredUser: any = {
    id: user.id,
    email: user.email,
    name: user.name,
    nickname: user.nickname,
    avatar: user.avatar,
  };

  if (!user.privacy) return filteredUser;

  if (
    user.privacy.showLastOnline === "ALL" ||
    (user.privacy.showLastOnline === "FRIENDS" && isFriend)
  ) {
    filteredUser.lastOnline = user.lastOnline;
  }

  if (
    user.privacy.showAbout === "ALL" ||
    (user.privacy.showAbout === "FRIENDS" && isFriend)
  ) {
    filteredUser.about = user.about;
  }

  if (
    user.privacy.showEmail === "ALL" ||
    (user.privacy.showEmail === "FRIENDS" && isFriend)
  ) {
    filteredUser.email = user.email;
  }

  if (
    user.privacy.showBirthDate === "ALL" ||
    (user.privacy.showBirthDate === "FRIENDS" && isFriend)
  ) {
    filteredUser.birthDate = user.birthDate;
  }

  if (user.avatar) {
    filteredUser.avatar = user.avatar;
  }

  return filteredUser;
};

export default filterUserByPrivacy;
