import { createContext } from "react";
import { ApolloClient } from "@apollo/client";

export interface AuthContextValue {
  client: ApolloClient;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
