export const parseDate = (value: string | number) => {
	if (typeof value === 'string' && /^\d+$/.test(value)) {
		return new Date(Number(value)) // timestamp
	}

	return new Date(value) // ISO
}
