import { useState, useCallback, useRef } from "react";

interface User {
  id: string;
  email: string;
  name: string;
}

export const useAuth = () => {
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem("accessToken")
  );
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  // useRef для хранения текущего refresh-промиса
  const refreshingToken = useRef<Promise<string | null> | null>(null);

  const refreshAccessToken = useCallback(async () => {
    if (refreshingToken.current) {
      // Ждём уже выполняющийся refresh
      return refreshingToken.current;
    }

    refreshingToken.current = (async () => {
      console.log("🔄 Refreshing access token...");

      try {
        const query = `
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

        const response = await fetch("http://localhost:3000/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ query }),
        });

        const result = await response.json();
        console.log("💻 Refresh token result:", result);

        if (result.errors) throw result.errors;

        const newToken = result.data.refreshToken.accessToken;
        const newUser = result.data.refreshToken.user;

        localStorage.setItem("accessToken", newToken);
        localStorage.setItem("user", JSON.stringify(newUser));

        setAccessToken(newToken);
        setUser(newUser);

        return newToken;
      } catch (err) {
        console.error("❌ Refresh token error:", err);
        setAccessToken(null);
        setUser(null);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        return null;
      } finally {
        refreshingToken.current = null; // сбрасываем
      }
    })();

    return refreshingToken.current;
  }, []);

  const fetchWithAuth = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const performFetch = async (token: string | null) => {
        const headers = options.headers
          ? new Headers(options.headers)
          : new Headers();

        if (token) headers.set("Authorization", `Bearer ${token}`);

        return fetch(url, { ...options, headers, credentials: "include" });
      };

      let response = await performFetch(accessToken);

      if (response.status === 401) {
        console.log("⚠️ Access token expired, attempting refresh...");
        const newToken = await refreshAccessToken();

        if (!newToken) {
          console.log("❌ Refresh failed, returning 401 response");
          return response;
        }

        response = await performFetch(newToken);
        console.log("✅ Request retried after refresh, status:", response.status);
      }

      return response;
    },
    [accessToken, refreshAccessToken]
  );

  return { accessToken, user, fetchWithAuth, refreshAccessToken };
};
