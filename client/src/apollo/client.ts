// client.ts
import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  from,
  Observable,
  type FetchResult,
} from "@apollo/client";
import { ErrorLink } from "@apollo/client/link/error";
import { CombinedGraphQLErrors } from "@apollo/client/errors";

let refreshAccessTokenFn: (() => Promise<string | null>) | null = null;
export const setRefreshTokenFn = (
  fn: (() => Promise<string | null>) | null,
) => {
  refreshAccessTokenFn = fn;
};

const httpLink = new HttpLink({
  uri: "http://localhost:3000/graphql",
  credentials: "include",
});

const errorLink = new ErrorLink(({ error, operation, forward }) => {
  if (CombinedGraphQLErrors.is(error)) {
    for (const err of error.errors) {
      if (err.extensions?.code === "UNAUTHENTICATED" && refreshAccessTokenFn) {
        return new Observable<FetchResult>((observer) => {
          refreshAccessTokenFn!()
            .then((newToken) => {
              operation.setContext(({ headers = {} }) => ({
                headers: { ...headers, authorization: `Bearer ${newToken}` },
              }));
              forward(operation).subscribe(observer);
            })
            .catch(observer.error.bind(observer));
        });
      }
    }
  }
});

export const client = new ApolloClient({
  link: from([errorLink, httpLink]),
  cache: new InMemoryCache(),
});
