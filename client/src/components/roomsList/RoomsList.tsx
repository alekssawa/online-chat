import { useEffect, useRef, useState } from "react";
import { gql } from "@apollo/client";
import { useQuery, useLazyQuery } from "@apollo/client/react";
import styles from "./RoomsList.module.css";
// import { useAuth } from "../../hooks/useAuth";

import type { Room, User, FullRoom } from ".././type";

import DefaultGroupAvatar from "../../assets/icons/DefaultGroupAvatar.svg";
import roomsIcon from "../../assets/icons/rooms2.svg";
import ToolsbarAddRooms from "./toolsbarAddRooms/ToolsbarAddRooms";

interface RoomsListProps {
  onSelectRoom: (room: FullRoom) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// GraphQL запросы
const GET_USER_ROOMS = gql`
  query GetUserRooms($userId: ID!) {
    user(id: $userId) {
      rooms {
        id
        name
        createdAt
        avatar {
          url
        }
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
        avatar {
          url
        }
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
  const [, /*refreshCounter*/ setRefreshCounter] = useState(0);
  const retryInterval = useRef<number | null>(null);

  const userStr = localStorage.getItem("user");
  const user: User | null = userStr ? JSON.parse(userStr) : null;

  // console.log(refreshCounter);

  // Запрос для получения комнат пользователя
  const {
    data,
    loading: queryLoading,
    error,
    refetch,
  } = useQuery<UserRoomsData, UserRoomsVariables>(GET_USER_ROOMS, {
    variables: { userId: user?.id || "" },
    skip: !user?.id,
    fetchPolicy: "network-only",
  });

  // Lazy query для загрузки деталей комнаты с правильными типами
  const [loadRoomDetails] = useLazyQuery<RoomDetailsData, RoomDetailsVariables>(
    GET_ROOM_DETAILS,
  );

  // Обработка загрузки и ошибок
  useEffect(() => {
    setLoading(queryLoading);
  }, [queryLoading, setLoading]);

  useEffect(() => {
    if (error) {
      console.error("Server connection error, starting retry interval", error);

      setLoading(true);

      if (!retryInterval.current) {
        retryInterval.current = window.setInterval(async () => {
          try {
            console.log(
              `[${new Date().toLocaleTimeString()}] retrying connection...`,
            );
            await refetch();
            console.log("✅ Server reconnected, stopping retry interval");
            setLoading(false);
            if (retryInterval.current) {
              clearInterval(retryInterval.current);
              retryInterval.current = null;
            }
          } catch (err) {
            console.warn("Retry failed:", err);
            setLoading(true);
          }
        }, 10000);
      }
    }

    return () => {
      if (retryInterval.current) {
        clearInterval(retryInterval.current);
        retryInterval.current = null;
      }
    };
  }, [error, refetch]);

  // Обновление списка комнат при получении данных
  useEffect(() => {
    if (data?.user?.rooms) {
      setRooms(data.user.rooms);
      console.log(data.user.rooms);
      setError(null);
    }
  }, [data, setError]);

  // Функция для принудительного обновления списка комнат
  const refreshRooms = () => {
    setRefreshCounter((prev) => prev + 1);
    refetch();
  };

  // Автоматическое обновление каждые 30 секунд
  // useEffect(() => {
  //   const intervalId = setInterval(() => {
  //     console.log(`[${new Date().toLocaleTimeString()}] refresh RoomList`);
  //     refetch();
  //   }, 30000);

  //   console.log("refresh RoomList")

  //   return () => clearInterval(intervalId);
  // }, [refetch]);

  const handleSelectRoom = async (roomId: string) => {
    try {
      const result = await loadRoomDetails({
        variables: { roomId },
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
                    {room.avatar ? (
                      <div className={styles.group_element}>
                        <img
                          className={styles.group_avatar}
                          src={room.avatar.url}
                        />
                        <div className={styles.groupInfo}>
                          <p className={styles.groupName}>{room.name}</p>
                          <p className={styles.groupMessagePreview}>
                            Max: testmasdasdasdasd
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.group_element}>
                        <img
                          className={styles.group_avatar}
                          src={DefaultGroupAvatar}
                        />
                        <div className={styles.groupInfo}>
                          <p className={styles.groupName}>{room.name}</p>
                          <p className={styles.groupMessagePreview}>
                            Max: testmasdasdasdasd
                          </p>
                        </div>
                      </div>
                    )}
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
