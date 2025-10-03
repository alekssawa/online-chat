import { useEffect, useState } from "react";
import { gql } from "@apollo/client";
import { useQuery, useLazyQuery } from "@apollo/client/react";
import styles from "./RoomsList.module.css";
// import { useAuth } from "../../hooks/useAuth";

import roomsIcon from "../../assets/icons/rooms2.svg";
import ToolsbarAddRooms from "./toolsbarAddRooms/ToolsbarAddRooms";



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

// GraphQL запросы
const GET_USER_ROOMS = gql`
  query GetUserRooms($userId: ID!) {
    user(id: $userId) {
      rooms {
        id
        name
        createdAt
      }
    }
  }
`;

const GET_ROOM_DETAILS = gql`
  query GetRoomDetails($roomId: ID!) {
    room(id: $roomId) {
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
`;

// Типы для GraphQL ответов
interface UserRoomsData {
  user: {
    rooms: Room[];
  };
}

interface RoomDetailsData {
  room: FullRoom;
}

interface UserRoomsVariables {
  userId: string;
}

interface RoomDetailsVariables {
  roomId: string;
}

function RoomsList({
  onSelectRoom,
  loading,
  setLoading,
  setError,
}: RoomsListProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [/*refreshCounter*/, setRefreshCounter] = useState(0);

  const userStr = localStorage.getItem("user");
  const user: User | null = userStr ? JSON.parse(userStr) : null;

  // console.log(refreshCounter);

  // Запрос для получения комнат пользователя
   const { 
    data, 
    loading: queryLoading, 
    error, 
    refetch 
  } = useQuery<UserRoomsData, UserRoomsVariables>(GET_USER_ROOMS, {
    variables: { userId: user?.id || "" },
    skip: !user?.id,
    fetchPolicy: "network-only",
  });

  // Lazy query для загрузки деталей комнаты с правильными типами
  const [loadRoomDetails] = useLazyQuery<RoomDetailsData, RoomDetailsVariables>(GET_ROOM_DETAILS);

  // Обработка загрузки и ошибок
  useEffect(() => {
    setLoading(queryLoading);
  }, [queryLoading, setLoading]);

  useEffect(() => {
    if (error) {
      setError(error.message);
    }
  }, [error, setError]);

  // Обновление списка комнат при получении данных
  useEffect(() => {
    if (data?.user?.rooms) {
      setRooms(data.user.rooms);
      setError(null);
    }
  }, [data, setError]);

  // Функция для принудительного обновления списка комнат
  const refreshRooms = () => {
    setRefreshCounter(prev => prev + 1);
    refetch();
  };

  // Автоматическое обновление каждые 30 секунд
  useEffect(() => {
    const intervalId = setInterval(() => {
      refetch();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [refetch]);

  const handleSelectRoom = async (roomId: string) => {
    try {
      const result = await loadRoomDetails({ 
        variables: { roomId } 
      });
      
      if (result.data?.room) {
        onSelectRoom(result.data.room);
      }
      
      if (result.error) {
        console.error("Ошибка при загрузке комнаты:", result.error);
        setError(result.error.message);
      }
    } catch (err: unknown) {
      console.error("Ошибка при загрузке комнаты:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unknown error occurred");
      }
    }
  };

  return (
    <>
      {!loading && (
        <div className={styles.container}>
          <div className={styles.container_rooms}>
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
          <ToolsbarAddRooms onRoomCreated={refreshRooms} />
        </div>
      )}
    </>
  );
}

export default RoomsList;
