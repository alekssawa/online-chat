import { useEffect, useMemo, useRef, useState } from "react";
import { gql } from "@apollo/client";
import { useQuery, useLazyQuery } from "@apollo/client/react";
import styles from "./ChatsList.module.css";

import type { GroupChat, PrivateChat, SelectedChat } from "../type";

import DefaultGroupAvatar from "../../assets/icons/DefaultGroupAvatar.svg";
import ToolsbarAddRooms from "./toolsbarAddRooms/ToolsbarAddRooms";
// import { c } from "@apollo/client/react/internal/compiler-runtime";

interface ChatsListProps {
  setSelectedChat: (chat: SelectedChat) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

interface ChatItem {
  id: string;
  name: string;
  type: "group" | "private";
  lastMessage?: string;
  senderName?: string;
  avatarUrl?: string;
}

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
}: ChatsListProps) {
  const [chatItems, setChatItems] = useState<ChatItem[]>([]);
  const [, /*refreshCounter*/ setRefreshCounter] = useState(0);
  const retryInterval = useRef<number | null>(null);

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

  useEffect(() => {
    if (!data?.user) return;

    const items: ChatItem[] = [];

    // group chats
    data.user.groupChats.forEach((g) => {
      const lastMsg = g.messages[g.messages.length - 1];
      items.push({
        id: g.id,
        name: g.name,
        type: "group",
        lastMessage: lastMsg?.text,
        senderName: lastMsg?.sender?.name,
        avatarUrl: g.avatar?.url,
      });
    });

    // private chats
    data.user.privateChats.forEach((p) => {
      const otherUser = p.user1.id === user?.id ? p.user2 : p.user1;
      const lastMsg = p.messages[p.messages.length - 1];
      items.push({
        id: p.id,
        name: otherUser.name,
        type: "private",
        lastMessage: lastMsg?.text,
        senderName: lastMsg?.sender?.name,
        avatarUrl: otherUser.avatar?.url,
      });
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
      <div className={styles.container}>
        <div className={styles.container_rooms}>
          <h2 className={styles.text}>search:</h2>

          {!loading && (
            <ul>
              {chatItems.map((item) => (
                <li key={item.id}>
                  <button
                    className={styles.roomButton}
                    onClick={() => handleSelectChat(item)}
                  >
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
              ))}
            </ul>
          )}
        </div>

        {!loading && <ToolsbarAddRooms onRoomCreated={refreshChats} />}
      </div>
    </>
  );
}

export default ChatsList;
