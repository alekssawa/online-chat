// client.ts
import {
	ApolloClient,
	from,
	HttpLink,
	InMemoryCache,
	Observable,
	type FetchResult,
} from '@apollo/client'
import { CombinedGraphQLErrors } from '@apollo/client/errors'
import { ErrorLink } from '@apollo/client/link/error'

let refreshAccessTokenFn: (() => Promise<string | null>) | null = null
export const setRefreshTokenFn = (
	fn: (() => Promise<string | null>) | null
) => {
	refreshAccessTokenFn = fn
}

const httpLink = new HttpLink({
	uri: `${import.meta.env.VITE_URL_BACKEND}/graphql`,
	credentials: 'include',
})

const errorLink = new ErrorLink(({ error, operation, forward }) => {
	if (CombinedGraphQLErrors.is(error)) {
		for (const err of error.errors) {
			if (err.extensions?.code === 'UNAUTHENTICATED' && refreshAccessTokenFn) {
				return new Observable<FetchResult>(observer => {
					refreshAccessTokenFn!()
						.then(newToken => {
							operation.setContext(({ headers = {} }) => ({
								headers: { ...headers, authorization: `Bearer ${newToken}` },
							}))
							forward(operation).subscribe(observer)
						})
						.catch(observer.error.bind(observer))
				})
			}
		}
	}
})

export const client = new ApolloClient({
	link: from([errorLink, httpLink]),
	cache: new InMemoryCache(),
})
