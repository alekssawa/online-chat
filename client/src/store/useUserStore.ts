import { gql } from '@apollo/client'
import { create } from 'zustand'
import { client } from '../apollo/client'
import type { User } from '../components/type'

interface UserStore {
	user: User
	setUser: (user: User) => void
	loading: boolean
	error: string | null
	refreshUser: () => Promise<void>
}

export const useUserStore = create<UserStore>(set => ({
	loading: false,
	error: null,

	user: JSON.parse(localStorage.getItem('user') || 'null'),
	setUser: u => set({ user: u }),

	refreshUser: async () => {
		set({ loading: true, error: null })
		try {
			const { data } = await client.query<{ user: User }>({
				query: gql`
					query User {
						user {
							id
							email
							name
							avatar {
								url
							}
							nickname
							about
							birthDate
							lastOnline
							friends {
								id
								createdAt
								friend {
									id
									email
									name
									nickname
									about
									birthDate
									lastOnline
									avatar {
										url
									}
								}
							}
							privacy {
								showLastOnline
								showAbout
								showEmail
								allowCalls
							}
							publicKey
							encryptedPrivateKey
							salt
							iv
							kdfIterations
							keyCreatedAt
							keyUpdatedAt
						}
					}
				`,
				fetchPolicy: 'network-only',
			})

			if (data?.user) {
				localStorage.setItem('user', JSON.stringify(data.user))
				set({ user: data.user })
			}
		} catch (err) {
			if (err instanceof Error) set({ error: err.message })
			else set({ error: 'Unknown error occurred' })
		} finally {
			set({ loading: false })
		}
	},
}))
