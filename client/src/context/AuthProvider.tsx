// src/components/AuthProvider.tsx
import {
	ApolloClient,
	ApolloLink,
	from,
	HttpLink,
	InMemoryCache,
	Observable,
	type FetchResult,
} from '@apollo/client'
import React, { useMemo } from 'react'

import { CombinedGraphQLErrors } from '@apollo/client/errors'
import { ErrorLink } from '@apollo/client/link/error'
import { ApolloProvider } from '@apollo/client/react'
import { useAuth } from '../hooks/useAuth'
import { AuthContext } from './AuthContext'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const { refreshAccessToken } = useAuth()

	// Error link для автоматического обновления токена
	const errorLink = useMemo(
		() =>
			new ErrorLink(({ error, operation, forward }) => {
				console.log('ErrorLink triggered:', {
					error,
					operationName: operation.operationName,
				})
				if (CombinedGraphQLErrors.is(error)) {
					console.log(error.errors)
					for (const err of error.errors) {
						console.error(err)
						if (err.extensions?.code === 'UNAUTHENTICATED') {
							switch (err.message) {
								case 'Invalid token':
									console.log('⏳ Access token expired, refreshing...')
									if (!refreshAccessToken) break

									return new Observable<FetchResult>(observer => {
										refreshAccessToken()
											.then(newToken => {
												if (!newToken) {
													observer.error(new Error('Token refresh failed'))
													return
												}

												operation.setContext(({ headers = {} }) => ({
													headers: {
														...headers,
														authorization: `Bearer ${newToken}`,
													},
												}))

												forward(operation).subscribe({
													next: observer.next.bind(observer),
													error: observer.error.bind(observer),
													complete: observer.complete.bind(observer),
												})
											})
											.catch(observer.error.bind(observer))
									})

								case 'Refresh token required':
									console.log(
										'⚠️ Refresh token отсутствует. Перенаправление на логин.'
									)
									localStorage.removeItem('accessToken')
									window.location.href = '/login'
									return

								default:
									console.log(
										'Неизвестная UNAUTHENTICATED ошибка:',
										err.message
									)
							}
						}
					}
				}
			}),
		[refreshAccessToken]
	)

	// HttpLink для GraphQL запросов
	const httpLink = useMemo(
		() =>
			new HttpLink({
				uri: 'http://localhost:3000/graphql',
				credentials: 'include', // важно для cookie-based refresh token
			}),
		[]
	)

	// AuthLink для всех запросов с access token
	const authLink = useMemo(
		() =>
			new ApolloLink((operation, forward) => {
				const token = localStorage.getItem('accessToken')
				operation.setContext({
					headers: {
						authorization: token ? `Bearer ${token}` : '',
					},
				})
				return forward(operation)
			}),
		[]
	)

	const client = useMemo(
		() =>
			new ApolloClient({
				link: from([errorLink, authLink.concat(httpLink)]),
				cache: new InMemoryCache(),
			}),
		[errorLink, authLink, httpLink]
	)

	return (
		<AuthContext.Provider value={{ client }}>
			<ApolloProvider client={client}>{children}</ApolloProvider>
		</AuthContext.Provider>
	)
}
