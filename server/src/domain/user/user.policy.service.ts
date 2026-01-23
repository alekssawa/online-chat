import { canView, type PrivacyContext } from './user.policy.js'
import { userPolicyMap } from './user.policyMap.js'
import type { UserOutputDTO, UserWithPrivacy } from './user.types.js'

export function applyUserPolicy(
	user: UserWithPrivacy,
	ctx: PrivacyContext,
): UserOutputDTO {
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

		privacy: null,

		encryptedPrivateKey: null,
		salt: null,
		iv: null,
		kdfIterations: null,
		keyCreatedAt: null,
		keyUpdatedAt: null,
	}

	if (ctx.isSelf) {
		result.encryptedPrivateKey = user.encryptedPrivateKey ?? null
		result.salt = user.salt ?? null
		result.iv = user.iv ?? null
		result.kdfIterations = user.kdfIterations ?? null

		// Обработка дат (если пришла Date, превращаем в строку)
		result.keyCreatedAt = user.keyCreatedAt
			? typeof user.keyCreatedAt === 'string'
				? user.keyCreatedAt
				: user.keyCreatedAt.toISOString()
			: null

		result.keyUpdatedAt = user.keyUpdatedAt
			? typeof user.keyUpdatedAt === 'string'
				? user.keyUpdatedAt
				: user.keyUpdatedAt.toISOString()
			: null

		result.privacy = user.privacy
	}

	if (!user.privacy) return result

	for (const key in userPolicyMap) {
		// Приводим ключ к типу ключей мапы ("showEmail" | "showAbout" ...)
		const privacyKey = key as keyof typeof userPolicyMap

		// Достаем source и target (свойства privacy ТУТ НЕТ, так как privacyKey и есть настройка)
		const { source, target } = userPolicyMap[privacyKey]

		// Достаем уровень доступа из настроек юзера, используя ключ мапы
		// TypeScript поймет, что privacyKey подходит для user.privacy
		const level = user.privacy[privacyKey]

		if (!canView(level, ctx)) continue

		// Достаем значение из UserWithPrivacy
		const value = user[source as keyof UserWithPrivacy]

		// Записываем в UserOutputDTO
		// Используем `any` или приведение типов, так как TS сложно сопоставить разные ключи динамически
		;(result as any)[target] =
			value instanceof Date ? value.toISOString() : (value ?? null)
	}

	return result
}
