export function getUserStatus(
	userId: string | null | undefined,
	lastOnline: string | null | undefined,
	onlineUsers: { userId: string; online: boolean }[]
): string {
	// 🔹 Проверяем, онлайн ли пользователь сейчас
	if (userId && onlineUsers.some(u => u.userId === userId && u.online)) {
		return 'в сети'
	}

	// 🔹 Если дата отсутствует
	if (!lastOnline) return 'был(а) давно'

	// 🔹 Преобразуем timestamp (умножаем на 1000 если это секунды)
	let timestamp = Number(lastOnline)

	// Если timestamp маленький (в секундах), преобразуем в миллисекунды
	if (timestamp < 10000000000) {
		timestamp = timestamp * 1000
	}

	const date = new Date(Number(timestamp))
	if (isNaN(date.getTime())) return 'был(а) недавно'

	const now = new Date()
	const diffMs = now.getTime() - date.getTime()
	if (diffMs < 0) return 'в будущем 😅'

	const minutes = Math.floor(diffMs / (1000 * 60))
	const hours = Math.floor(minutes / 60)
	const days = Math.floor(hours / 24)
	const years = Math.floor(days / 365)

	if (years >= 1) {
		return 'был(а) давно'
	} else if (days > 0) {
		return `был(а) ${days} ${declOfNum(days, ['день', 'дня', 'дней'])} назад`
	} else if (hours > 0) {
		return `был(а) ${hours} ${declOfNum(hours, ['час', 'часа', 'часов'])} назад`
	} else if (minutes > 0) {
		return `был(а) ${minutes} ${declOfNum(minutes, [
			'минуту',
			'минуты',
			'минут',
		])} назад`
	} else {
		return 'только что'
	}
}

// 🔹 Склонения числительных
function declOfNum(n: number, titles: [string, string, string]) {
	const cases = [2, 0, 1, 1, 1, 2]
	return titles[
		n % 100 > 4 && n % 100 < 20 ? 2 : cases[n % 10 < 5 ? n % 10 : 5]
	]
}
