import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";

import styles from "./UserList.module.css";

interface User {
  id: string;
  name: string;
}

interface UserListProps {
  roomId: string | null;
}

function UserList({ roomId }: UserListProps) {
  const { fetchWithAuth } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) {
      setUsers([]); // пустой список, если нет выбранной комнаты
      setLoading(false);
      return;
    }

    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          // setError("Нет токена авторизации");
          // setLoading(false);
          return;
        }

        const res = await fetchWithAuth("http://localhost:3000/graphql", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            query: `
              query {
                room(id: "${roomId}") {
                  users {
                    id
                    name
                  }
                }
              }
            `,
          }),
        });

        const data = await res.json();

        if (data.errors) {
          setError(data.errors[0].message);
        } else {
          setUsers(data.data.room?.users ?? []);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(String(err));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [roomId, fetchWithAuth]);

  if (loading) return <p>Загрузка пользователей...</p>;
  if (error) return <p>Ошибка: {error}</p>;

  return (
    <div className={styles.container}>
      <h4>Users:</h4>
      <ul>
        {users.map((u) => (
          <li key={u.id}>{u.name}</li>
        ))}
      </ul>
    </div>
  );
}

export default UserList;
