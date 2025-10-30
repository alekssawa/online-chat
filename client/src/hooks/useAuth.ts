import { useState, useCallback, useRef, useEffect } from "react";
import { gql } from "@apollo/client";
import { client, setRefreshTokenFn } from "../apollo/client";

import type { User } from "../components/type";

interface RefreshTokenResponse {
  refreshToken: {
    accessToken: string;
    user: User;
  };
}

const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken {
    refreshToken {
      accessToken
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
        }
        privacy {
            id
            showLastOnline
            showAbout
            showEmail
            allowCalls
        }
      }
    }
  }
`;

export const useAuth = () => {
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem("accessToken"),
  );
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const refreshingToken = useRef<Promise<string | null> | null>(null);

  const refreshAccessToken = useCallback(async () => {
    if (refreshingToken.current) {
      return refreshingToken.current;
    }

    refreshingToken.current = (async () => {
      console.log("🔄 Refreshing access token...");

      try {
        const result = await client.mutate<RefreshTokenResponse>({
          mutation: REFRESH_TOKEN_MUTATION,
          context: {
            // headers: {
            //   authorization: "", // явно очищаем заголовок
            // },
            credentials: "include",
          },
        });

        console.log("💻 Refresh token result:", result);

        if (result.error) {
          throw new Error(result.error.message || "Refresh token failed");
        }

        if (!result.data?.refreshToken) {
          throw new Error("Invalid refresh token response");
        }

        const newToken = result.data.refreshToken.accessToken;
        const newUser = result.data.refreshToken.user;

        // console.log(newUser);

        localStorage.setItem("accessToken", newToken);
        localStorage.setItem("user", JSON.stringify(newUser));

        setAccessToken(newToken);
        setUser(newUser);

        console.log("✅ Token refreshed successfully");
        return newToken;
      } catch (err) {
        console.error("❌ Refresh token error:", err);

        setAccessToken(null);
        setUser(null);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");

        await client.clearStore();

        return null;
      } finally {
        refreshingToken.current = null;
      }
    })();

    return refreshingToken.current;
  }, []);

  // Регистрируем функцию refresh в Apollo Client при монтировании хука
  useEffect(() => {
    setRefreshTokenFn(refreshAccessToken);
    return () => {
      setRefreshTokenFn(null);
    };
  }, [refreshAccessToken]);

  const logout = useCallback(async () => {
    try {
      // дополнительная логика logout если нужно
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setAccessToken(null);
      setUser(null);
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      await client.clearStore();
    }
  }, []);

  const isAuthenticated = useCallback(() => {
    return !!accessToken && !!user;
  }, [accessToken, user]);

  return {
    accessToken,
    user,
    refreshAccessToken,
    logout,
    isAuthenticated,
  };
};
