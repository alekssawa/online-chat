import { ApolloClient, InMemoryCache, createHttpLink, from, Observable } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { ErrorLink } from "@apollo/client/link/error";
import type { FetchResult } from "@apollo/client";
import type { Operation } from "@apollo/client/core";

type NextLink = (operation: Operation) => Observable<FetchResult>;

let refreshAccessTokenFn: (() => Promise<string | null>) | null = null;

export const setRefreshTokenFn = (fn: (() => Promise<string | null>) | null) => {
  refreshAccessTokenFn = fn;
};

const httpLink = createHttpLink({
  uri: "http://localhost:3000/graphql",
  credentials: "include",
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem("accessToken");
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});

// свой тип вместо ErrorResponse
type MyErrorResponse = {
  graphQLErrors?: readonly {
    message: string;
    extensions?: Record<string, unknown>;
  }[];
  networkError?: unknown;
  operation: Operation;
  forward: NextLink;
};

const errorLink = new ErrorLink(({ graphQLErrors, operation, forward }: MyErrorResponse) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      if (err.extensions?.code === "UNAUTHENTICATED") {
        console.log("⏳ Token expired, refreshing...");

        if (!refreshAccessTokenFn) {
          window.location.href = "/";
          return;
        }

        return new Observable<FetchResult>((observer) => {
          (async () => {
            try {
              const newToken = await refreshAccessTokenFn!();
              if (!newToken) {
                console.error("Token refresh failed");
                window.location.href = "/";
                observer.error(new Error("Token refresh failed"));
                return;
              }

              localStorage.setItem("accessToken", newToken);

              const oldHeaders = operation.getContext().headers ?? {};
              operation.setContext({
                headers: {
                  ...oldHeaders,
                  authorization: `Bearer ${newToken}`,
                },
              });

              const subscriber = forward(operation).subscribe({
                next: (result: FetchResult) => observer.next(result),
                error: (e: unknown) => observer.error(e),
                complete: () => observer.complete(),
              });

              return () => subscriber.unsubscribe();
            } catch (e) {
              console.error("Refresh error:", e);
              window.location.href = "/";
              observer.error(e);
            }
          })();
        });
      }
    }
  }
});

export const client = new ApolloClient({
  link: from([authLink, errorLink, httpLink]),
  cache: new InMemoryCache(),
});
