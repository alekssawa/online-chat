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
  onSelectRoom: (room: FullRoom) => void; // передаём уже комнату
}

interface FullRoom extends Room {
  users: { id: string; email: string; name: string }[];
  messages: {
    id: string;
    text: string;
    sentAt: string;
    updatedAt: string;
    sender: { id: string; email: string; name: string };
  }[];
}

function RoomsList({ onSelectRoom }: RoomsListProps) {
  const { fetchWithAuth } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    const user: User | null = userStr ? JSON.parse(userStr) : null;

    const fetchRooms = async () => {
      try {
        const res = await fetchWithAuth("http://localhost:3000/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

        const data = await res.json();
        if (data.errors) {
          setError(data.errors[0].message);
        } else {
          setRooms(data.data.user?.rooms || []);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [fetchWithAuth]);

  const handleSelectRoom = async (roomId: string) => {
    try {
      const res = await fetchWithAuth("http://localhost:3000/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
          query {
            room(id: "${roomId}") {
              id
              name
              createdAt
              users {
                id
                email
                name
              }
              messages {
                id
                text
                sentAt
                updatedAt
                sender {
                  id
                  email
                  name
                }
              }
            }
          }
        `,
        }),
      });

      const data = await res.json();
      if (data.errors) {
        console.error("GraphQL error:", data.errors);
        return;
      }

      onSelectRoom(data.data.room); // передаём целую комнату
      // console.log("Комната выбрана:", data.data.room);
    } catch (err) {
      console.error("Ошибка при загрузке комнаты:", err);
    }
  };

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
              onClick={() => handleSelectRoom(room.id)}
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
