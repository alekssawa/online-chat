import { useState, useCallback, useRef, useEffect } from "react";
import { useApolloClient } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { setRefreshTokenFn } from '../apollo/client'; // путь к вашему client.ts

interface User {
  id: string;
  email: string;
  name: string;
}

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

  const client = useApolloClient();
  
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
            headers: {
              authorization: "",
            }
          }
        });

        console.log("💻 Refresh token result:", result);

        if (result.error) {
          throw new Error(result.error.message || 'Refresh token failed');
        }

        if (!result.data?.refreshToken) {
          throw new Error('Invalid refresh token response');
        }

        const newToken = result.data.refreshToken.accessToken;
        const newUser = result.data.refreshToken.user;

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
  }, [client]);

  // Регистрируем функцию refresh в Apollo Client при монтировании хука
  useEffect(() => {
    setRefreshTokenFn(refreshAccessToken);
    
    // Очищаем при размонтировании
    return () => {
      setRefreshTokenFn(null);
    };
  }, [refreshAccessToken]);

  const logout = useCallback(async () => {
    try {
      // Дополнительная логика logout если нужно
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setAccessToken(null);
      setUser(null);
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      await client.clearStore();
    }
  }, [client]);

  const isAuthenticated = useCallback(() => {
    return !!accessToken && !!user;
  }, [accessToken, user]);

  return { 
    accessToken, 
    user, 
    refreshAccessToken, 
    logout,
    isAuthenticated 
  };
};