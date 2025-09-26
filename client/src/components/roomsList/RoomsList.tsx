import { useEffect, useState } from "react";
import styles from "./RoomsList.module.css";
import { useAuth } from "../../hooks/useAuth";

import roomsIcon from "../../assets/icons/rooms2.svg";

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
  onSelectRoom: (room: FullRoom) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
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

function RoomsList({
  onSelectRoom,
  loading,
  setLoading,
  setError,
}: RoomsListProps) {
  const { fetchWithAuth } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  // const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    const user: User | null = userStr ? JSON.parse(userStr) : null;

    let intervalId: ReturnType<typeof setInterval> | null = null;

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
          if (!intervalId) {
            intervalId = setInterval(fetchRooms, 5000);
          }
        } else {
          setRooms(data.data.user?.rooms || []);
          setError(null);
          setLoading(false);

          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
        if (!intervalId) {
          intervalId = setInterval(fetchRooms, 5000);
        }
      }
    };

    fetchRooms();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchWithAuth, setLoading, setError]);

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

  // if (loading) return <p>Загрузка...</p>;

  return (
    <>
      {!loading && (
        <div className={styles.container}>
          <h2 className={styles.text}>
            <img src={roomsIcon} className={styles.roomsIcon}></img>Rooms:
          </h2>
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
      )}
    </>
  );
}

export default RoomsList;
