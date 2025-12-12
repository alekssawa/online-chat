import { useLayoutEffect, useState } from 'react'

const queries = [
	'(max-width: 766px)',
	'(min-width: 767px) and (max-width: 1199px)',
	'(min-width: 1200px)',
]

export interface MatchMediaResult {
	isMobile: boolean
	isTablet: boolean
	isDesktop: boolean
}

export const useMatchMedia = (): MatchMediaResult => {
	const mediaQueryLists = queries.map(query => matchMedia(query))

	const getValues = () => mediaQueryLists.map(list => list.matches)

	const [values, setValues] = useState(getValues)

	useLayoutEffect(() => {
		const handler = () => setValues(getValues)

		mediaQueryLists.forEach(list => list.addEventListener('change', handler))

		return () =>
			mediaQueryLists.forEach(list =>
				list.removeEventListener('change', handler)
			)
	}, [])

	return {
		isMobile: values[0],
		isTablet: values[1],
		isDesktop: values[2],
	}
}
