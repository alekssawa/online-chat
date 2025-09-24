import { useEffect, useState } from "react";
import styles from "./RoomsList.module.css";
import { useAuth } from "../../hooks/useAuth";

interface Room {
  id: string;
  name: string;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
}

interface RoomsListProps {
  onSelectRoom: (roomId: string) => void;
}

function RoomsList({ onSelectRoom }: RoomsListProps) {
  const { fetchWithAuth } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    const user: User | null = userStr ? JSON.parse(userStr) : null;

    // console.log("Current user from localStorage:", user);
    const fetchRooms = async () => {
      try {
        // console.log("Fetching rooms...");

        const token = localStorage.getItem("accessToken");
        // console.log("Token:", token);

        if (!token) {
          setError("Нет токена авторизации");
          setLoading(false);
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
              user(id: "${user?.id}") {
                rooms {
                  id
                  name
                  createdAt
                }
              }
            }
          `,
          }),
        });

        // console.log("Raw response:", res);

        const data = await res.json();
        // console.log("Parsed JSON:", data);

        if (data.errors) {
          console.error("GraphQL errors:", data.errors);
          setError(data.errors[0].message);
        } else {
          const userData = data.data.user;
          setRooms(userData?.rooms || []);
          // console.log("Rooms data for current user:", userData?.rooms || []);
        }
      } catch (err: unknown) {
        console.error("Fetch error:", err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(String(err));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [fetchWithAuth]);

  if (loading) return <p>Загрузка...</p>;
  if (error) return <p>Ошибка: {error}</p>;

  return (
    <div className={styles.container}>
      <h2>Rooms:</h2>
      <ul>
        {rooms.map((room) => (
          <li key={room.id}>
            <button
              className={styles.roomButton}
              onClick={() => onSelectRoom(room.id)}
            >
              {room.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default RoomsList;
