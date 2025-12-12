const filterUserByPrivacy = (user: any, isFriend: boolean) => {
	if (!user) return null

	// ✅ всегда создаём новый объект, без ссылок на оригинал
	const filteredUser: any = {
		id: user.id,
		name: user.name,
		nickname: user.nickname,
		avatar: user.avatar
			? { url: `${process.env.API_URL_BACKEND}/avatar/${user.id}` }
			: null,

		publicKey: user.publicKey,
		keyCreatedAt: user.keyCreatedAt,
		keyUpdatedAt: user.keyUpdatedAt,
	}

	// если нет настроек приватности — возвращаем только базовые поля
	if (!user.privacy) return filteredUser

	// сначала добавляем все, потом удаляем, чтобы было проще отлаживать
	filteredUser.lastOnline = user.lastOnline ?? null
	filteredUser.about = user.about ?? null
	filteredUser.email = user.email ?? null
	filteredUser.birthDate = user.birthDate ?? null

	// скрываем поля, если приватность не разрешает
	if (
		user.privacy.showLastOnline !== 'ALL' &&
		(user.privacy.showLastOnline !== 'FRIENDS' || !isFriend)
	) {
		filteredUser.lastOnline = null
	}

	if (
		user.privacy.showAbout !== 'ALL' &&
		(user.privacy.showAbout !== 'FRIENDS' || !isFriend)
	) {
		filteredUser.about = null
	}

	if (
		user.privacy.showEmail !== 'ALL' &&
		(user.privacy.showEmail !== 'FRIENDS' || !isFriend)
	) {
		filteredUser.email = null
	}

	if (
		user.privacy.showBirthDate !== 'ALL' &&
		(user.privacy.showBirthDate !== 'FRIENDS' || !isFriend)
	) {
		filteredUser.birthDate = null
	}

	return filteredUser
}

export default filterUserByPrivacy
