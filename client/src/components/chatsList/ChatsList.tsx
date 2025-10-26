import { useEffect, useRef, useState } from "react";
import { gql } from "@apollo/client";
import { useQuery, useLazyQuery } from "@apollo/client/react";
import styles from "./ChatsList.module.css";
// import { useAuth } from "../../hooks/useAuth";

import type { GroupChat, PrivateChat, User } from "../type";

import DefaultGroupAvatar from "../../assets/icons/DefaultGroupAvatar.svg";
import ToolsbarAddRooms from "./toolsbarAddRooms/ToolsbarAddRooms";

interface ChatsListProps {
  setSelectedChat: (chat: GroupChat | PrivateChat) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// GraphQL запросы
const GET_USER_GROUPCHAT = gql`
  query GetUserGroupChats($userId: ID!) {
    user(id: $userId) {
      groupChats {
        id
        name
        createdAt
        avatar {
          url
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
  }
`;

const GET_GROUPCHAT_DETAILS = gql`
  query GetGroupChatDetails($groupId: ID!) {
    groupChat(id: $groupId) {
      id
      name
      createdAt
      avatar {
        url
      }
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

function ChatsList({
  setSelectedChat,
  loading,
  setLoading,
  setError,
}: ChatsListProps) {
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
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
  } = useQuery<
  {
    user: {
      groupChats: GroupChat[];
    } 
  }, 
  {
    userId: string
  }
  >(GET_USER_GROUPCHAT, {
    variables: { userId: user?.id || "" },
    skip: !user?.id,
    fetchPolicy: "network-only",
  });

  // Lazy query для загрузки деталей комнаты с правильными типами
  const [loadGroupChatDetails] = useLazyQuery<{groupChat: GroupChat}, {groupId: string}>(
    GET_GROUPCHAT_DETAILS,
    {
      fetchPolicy: "cache-and-network",
    },
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
    if (data?.user?.groupChats) {
      setGroupChats(data.user.groupChats);
      setError(null);
    }
  }, [data, setError]);

  // Функция для принудительного обновления списка комнат
  const refreshChats = () => {
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

  const handleSelectChat = async (groupId: string) => {
    try {
      const result = await loadGroupChatDetails({
        variables: { groupId },
      });

      if (result.data?.groupChat) {
        setSelectedChat(result.data.groupChat);
        // console.log(result.data.room);
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
              search:
            </h2>
            <ul>
              {groupChats.map((groupChat) => (
                <li key={groupChat.id}>
                  <button
                    className={styles.roomButton}
                    onClick={() => handleSelectChat(groupChat.id)}
                  >
                    {groupChat.avatar ? (
                      <div className={styles.group_element}>
                        <img
                          className={styles.group_avatar}
                          src={groupChat.avatar.url}
                        />
                        <div className={styles.groupInfo}>
                          <p className={styles.groupName}>{groupChat.name}</p>
                          <p className={styles.groupMessagePreview}>
                            {groupChat.messages.length > 0
                              ? `${
                                  groupChat.messages[groupChat.messages.length - 1].sender
                                    ?.name
                                }:${" "}${
                                  groupChat.messages[groupChat.messages.length - 1].text
                                }`
                              : ""}
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
                          <p className={styles.groupName}>{groupChat.name}</p>
                          <p className={styles.groupMessagePreview}>
                            {groupChat.messages.length > 0
                              ? `${
                                  groupChat.messages[groupChat.messages.length - 1].sender
                                    ?.name
                                }:${" "}${
                                  groupChat.messages[groupChat.messages.length - 1].text
                                }`
                              : ""}
                          </p>
                        </div>
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <ToolsbarAddRooms onRoomCreated={refreshChats} />
        </div>
      )}
    </>
  );
}

export default ChatsList;
