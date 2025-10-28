import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { gql } from "@apollo/client";
import { useApolloClient } from "@apollo/client/react";
import React from "react";
import { useQuery, useLazyQuery } from "@apollo/client/react";
import styles from "./ChatsList.module.css";

import DefaultGroupAvatar from "../../assets/icons/DefaultGroupAvatar.svg";
import ToolsbarAddRooms from "./toolsbarAddRooms/ToolsbarAddRooms";

import type { GroupChat, PrivateChat, SelectedChat, Message } from "../type";

interface ChatsListProps {
  setSelectedChat: (chat: SelectedChat) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  SetUpdateFunction?: (
    updateFn: (
      chatId: string,
      newMessage: { text: string; senderName?: string }
    ) => void
  ) => void;
}

interface ChatItem {
  id: string;
  name: string;
  type: "group" | "private";
  lastMessage?: string;
  senderName?: string;
  avatarUrl?: string;
}

// Выносим элемент чата в отдельный компонент для оптимизации
const ChatListItem = React.memo(
  ({
    item,
    onSelect,
  }: {
    item: ChatItem;
    onSelect: (item: ChatItem) => void;
  }) => {
    return (
      <li onClick={() => onSelect(item)}>
        <button className={styles.roomButton} >
          <div className={styles.group_element}>
            <img
              className={styles.group_avatar}
              src={item.avatarUrl || DefaultGroupAvatar}
              alt={item.name}
            />
            <div className={styles.groupInfo}>
              <p className={styles.groupName}>{item.name}</p>
              <p className={styles.groupMessagePreview}>
                {item.senderName
                  ? `${item.senderName}: ${item.lastMessage}`
                  : item.lastMessage}
              </p>
            </div>
          </div>
        </button>
      </li>
    );
  }
);

// GraphQL запросы остаются без изменений
const GET_USER_CHATS = gql`
  query GetUserChats($userId: ID!) {
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
          sender {
            name
          }
        }
      }
      privateChats {
        id
        user1 {
          id
          name
          avatar {
            url
          }
        }
        user2 {
          id
          name
          avatar {
            url
          }
        }
        messages {
          id
          text
          sentAt
          sender {
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
        name
        avatar {
          url
        }
      }
      messages {
        id
        text
        sentAt
        sender {
          id
          email
          name
        }
      }
    }
  }
`;

const GET_PRIVATECHAT_DETAILS = gql`
  query GetPrivateChat($chatId: ID!) {
    privateChat(chatId: $chatId) {
      id
      createdAt
      user1 {
        id
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
      user2 {
        id
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
      messages {
        id
        text
        sentAt
        sender {
          id
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
  SetUpdateFunction,
}: ChatsListProps) {
  const [chatItems, setChatItems] = useState<ChatItem[]>([]);
  const [, /*refreshCounter*/ setRefreshCounter] = useState(0);
  const retryInterval = useRef<number | null>(null);
  const client = useApolloClient();

  const user = useMemo(() => {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  }, []);

  const {
    data,
    loading: queryLoading,
    error,
    refetch,
  } = useQuery<
    { user: { groupChats: GroupChat[]; privateChats: PrivateChat[] } },
    { userId: string }
  >(GET_USER_CHATS, {
    variables: { userId: user?.id || "" },
    skip: !user?.id,
    fetchPolicy: "network-only",
  });

  const [loadGroupChatDetails] = useLazyQuery<
    { groupChat: GroupChat },
    { groupId: string }
  >(GET_GROUPCHAT_DETAILS, { fetchPolicy: "cache-and-network" });

  const [loadPrivateChatDetails] = useLazyQuery<
    { privateChat: PrivateChat },
    { chatId: string }
  >(GET_PRIVATECHAT_DETAILS, { fetchPolicy: "cache-and-network" });

  useEffect(() => {
    setLoading(queryLoading);
  }, [queryLoading, setLoading]);

  useEffect(() => {
    if (error) {
      setLoading(true);
      if (!retryInterval.current) {
        retryInterval.current = window.setInterval(async () => {
          try {
            await refetch();
            setLoading(false);
            if (retryInterval.current) {
              clearInterval(retryInterval.current);
              retryInterval.current = null;
            }
          } catch {
            setLoading(true);
          }
        }, 10000);
      }
    }
    return () => {
      if (retryInterval.current) clearInterval(retryInterval.current);
    };
  }, [error, refetch]);

  // Функция для обновления последнего сообщения в конкретном чате
  const updateChatLastMessage = useCallback(
    (chatId: string, newMessage: { text: string; senderName?: string }) => {
      // 1. Обновляем локальное состояние
      setChatItems((prevItems) =>
        prevItems.map((item) =>
          item.id === chatId
            ? {
                ...item,
                lastMessage: newMessage.text,
                senderName: newMessage.senderName || item.senderName,
              }
            : item
        )
      );

      // 2. Обновляем кэш Apollo без рефетча
      if (data?.user) {
        // Создаем новое сообщение для кэша
        const tempMessageId = `temp-${Date.now()}`;

        const newMessageForCache = {
          __typename: "Message",
          id: tempMessageId,
          text: newMessage.text,
          sentAt: new Date().toISOString(),
          sender: {
            __typename: "User",
            name: newMessage.senderName,
          },
        };

        // Обновляем кэш для groupChats
        const updatedGroupChats = data.user.groupChats.map((groupChat) => {
          if (groupChat.id === chatId) {
            return {
              ...groupChat,
              messages: [...groupChat.messages, newMessageForCache],
            };
          }
          return groupChat;
        });

        // Обновляем кэш для privateChats
        const updatedPrivateChats = data.user.privateChats.map(
          (privateChat) => {
            if (privateChat.id === chatId) {
              return {
                ...privateChat,
                messages: [...privateChat.messages, newMessageForCache],
              };
            }
            return privateChat;
          }
        );

        // Записываем обновленные данные в кэш
        client.writeQuery({
          query: GET_USER_CHATS,
          variables: { userId: user?.id || "" },
          data: {
            user: {
              ...data.user,
              groupChats: updatedGroupChats,
              privateChats: updatedPrivateChats,
            },
          },
        });
      }
    },
    [client, data, user?.id]
  );

  useEffect(() => {
    if (SetUpdateFunction) {
      SetUpdateFunction(updateChatLastMessage);
    }
  }, [SetUpdateFunction, updateChatLastMessage]);

  useEffect(() => {
    if (!data?.user) return;

    const items: ChatItem[] = [];

    // Функция для сортировки сообщений по дате (от старых к новым)
    const sortMessagesByDate = (messages: Message[]) => {
      return [...messages].sort(
        (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
      );
    };

    // group chats
    data.user.groupChats.forEach((g) => {
      const sortedMessages = sortMessagesByDate(g.messages);
      const lastMsg = sortedMessages[sortedMessages.length - 1];
      items.push({
        id: g.id,
        name: g.name,
        type: "group",
        lastMessage: lastMsg?.text,
        senderName: lastMsg?.sender?.name,
        avatarUrl: g.avatar?.url,
      });
      console.log("Group chat lastMsg:", lastMsg.text);
    });

    // private chats
    data.user.privateChats.forEach((p) => {
      const otherUser = p.user1.id === user?.id ? p.user2 : p.user1;
      const sortedMessages = sortMessagesByDate(p.messages);
      const lastMsg = sortedMessages[sortedMessages.length - 1];
      items.push({
        id: p.id,
        name: otherUser.name,
        type: "private",
        lastMessage: lastMsg?.text,
        senderName: lastMsg?.sender?.name,
        avatarUrl: otherUser.avatar?.url,
      });
      console.log("privateChat lastMsg:", lastMsg.text);
    });

    setChatItems(items);
    // console.log("Chat items:", items);
  }, [data, user]);

  const refreshChats = () => {
    setRefreshCounter((prev) => prev + 1);
    refetch();
  };

  const handleSelectChat = async (item: ChatItem) => {
    try {
      if (item.type === "group") {
        const result = await loadGroupChatDetails({
          variables: { groupId: item.id },
        });
        if (result.data?.groupChat)
          setSelectedChat({ chat: result.data.groupChat, type: "group" });
      } else {
        const result = await loadPrivateChatDetails({
          variables: { chatId: item.id },
        });
        if (result.data?.privateChat)
          setSelectedChat({ chat: result.data.privateChat, type: "private" });
      }
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("Unknown error occurred");
    }
  };

  return (
    <>
      {!loading && (
        <div className={styles.container}>
          <div className={styles.container_rooms}>
            <h2 className={styles.text}>search:</h2>
            <ul>
              {chatItems.map((item) => (
                <ChatListItem
                  key={item.id}
                  item={item}
                  onSelect={handleSelectChat}
                />
              ))}
            </ul>
          </div>

          {!loading && <ToolsbarAddRooms onRoomCreated={refreshChats} />}
        </div>
      )}
    </>
  );
}

// Экспортируем функцию для использования в других компонентах
export default ChatsList;
