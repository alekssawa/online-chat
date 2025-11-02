import UserBox from "./userBox/UserBox";
import styles from "./UserList.module.css";

import userIcon from "../../assets/icons/usersIcon.svg";
import ToolsbarAddRooms from "./toolsbarSettings/ToolsbarSettings";
import DefaultUserAvatar from "../../assets/icons/DefaultUserAvatar.svg?react";

import type { GroupChat, PrivateChat, SelectedChat, User } from "../type";

import { getUserStatus } from "./../../utills/getUserStatus";

interface UserListProps {
  selectedChat: SelectedChat | null;
  loading: boolean;
  onlineUsers: { userId: string; online: boolean }[];
  setSelectedUser?: (user: User | null) => void;
  setIsUserPageOpen?: (isUserPageOpen: boolean) => void;
}

interface DisplayUser {
  id: string;
  name: string;
  avatar?: string;
}

function UserList({
  selectedChat,
  loading,
  onlineUsers,
  setSelectedUser,
  setIsUserPageOpen,
}: UserListProps) {
  const userStr = localStorage.getItem("user");
  const user: User | null = userStr ? JSON.parse(userStr) : null;

  // 🧩 Определяем список пользователей в зависимости от типа чата
  const users: DisplayUser[] = (() => {
    if (!selectedChat) return [];

    if (selectedChat.type === "group") {
      const group = selectedChat.chat as GroupChat;
      return (group.users ?? []).map((u) => ({
        id: u.id,
        name: u.name,
        avatar: u.avatar?.url,
      }));
    }

    if (selectedChat.type === "private") {
      const chat = selectedChat.chat as PrivateChat;
      return [
        {
          id: chat.user1.id,
          name: chat.user1.name,
          avatar: chat.user1.avatar?.url,
        },
        {
          id: chat.user2.id,
          name: chat.user2.name,
          avatar: chat.user2.avatar?.url,
        },
      ];
    }

    return [];
  })();

  // 🔄 Сортировка пользователей
  const sortedUsers = [...users].sort((a, b) => {
    if (a.id === user?.id) return -1;
    if (b.id === user?.id) return 1;

    const aOnline = onlineUsers.some((ou) => ou.userId === a.id && ou.online);
    const bOnline = onlineUsers.some((ou) => ou.userId === b.id && ou.online);

    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;

    return a.name.localeCompare(b.name);
  });

  

  return (
    <>
      {!loading && (
        <div className={styles.container}>
          {/* Профиль текущего пользователя */}
          <div className={styles.container_profile}>
            <h2 className={styles.chatText}>Group info</h2>
            <div className={styles.chatDetails}>
              <div className={styles.chat_avatar}>
                {selectedChat?.type === "private" ? (
                  selectedChat.chat.user1.id === user?.id ? (
                    selectedChat.chat.user2.avatar?.url ? (
                      <img
                        src={selectedChat.chat.user2.avatar.url}
                        alt="User avatar"
                      />
                    ) : (
                      <DefaultUserAvatar />
                    )
                  ) : selectedChat.chat.user1.avatar?.url ? (
                    <img
                      src={selectedChat.chat.user1.avatar.url}
                      alt="User avatar"
                    />
                  ) : (
                    <DefaultUserAvatar />
                  )
                ) : selectedChat?.chat.avatar?.url ? (
                  <img
                    src={selectedChat?.chat.avatar?.url}
                    alt="Group avatar"
                  />
                ) : (
                  <DefaultUserAvatar />
                )}
              </div>
              <div className={styles.chatInfo}>
                <h2 className={styles.chatName}>
                  {selectedChat?.type === "private"
                    ? selectedChat.chat.user1.id === user?.id
                      ? selectedChat.chat.user2.name
                      : selectedChat.chat.user1.name
                    : selectedChat?.chat.name}
                </h2>
                <div className={styles.onlineStatus}>
                  {selectedChat?.type === "private" ? (
                    selectedChat?.chat.user1.id === user?.id ? (
                      <span className={styles.statusText}>
                        {getUserStatus(
                          selectedChat.chat.user2.id,
                          selectedChat.chat.user2.lastOnline,
                          onlineUsers,
                        )}
                      </span>
                    ) : (
                      <span className={styles.statusText}>
                        {getUserStatus(
                          selectedChat.chat.user1.id,
                          selectedChat.chat.user1.lastOnline,
                          onlineUsers,
                        )}
                      </span>
                    )
                  ) : (
                    <>
                      <span className={styles.statusText}>
                        {selectedChat?.chat?.users &&
                        selectedChat.chat.users.length > 5
                          ? `${selectedChat?.chat.users?.length} участников, ${onlineUsers.filter((u) => u.online).length} в сети`
                          : selectedChat?.chat.users?.length === 1
                            ? `${selectedChat?.chat.users?.length} участник, ${onlineUsers.filter((u) => u.online).length} в сети`
                            : `${selectedChat?.chat.users?.length} участника, ${onlineUsers.filter((u) => u.online).length} в сети`}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Список пользователей */}
          <div className={styles.container_users}>
            {selectedChat && users.length > 0 && (
              <>
                <h4>
                  <img src={userIcon} className={styles.userIcon} /> Users:
                </h4>
                <ul>
                  {sortedUsers.map((u) => (
                    <li
                      key={u.id}
                      onClick={() => {
                        let fullUser: User | null = null;

                        if (selectedChat.type === "group") {
                          const group = selectedChat.chat as GroupChat;
                          fullUser =
                            group.users?.find((gu) => gu.id === u.id) ?? null;
                        } else if (selectedChat.type === "private") {
                          const chat = selectedChat.chat as PrivateChat;
                          fullUser =
                            chat.user1.id === u.id
                              ? chat.user1
                              : chat.user2.id === u.id
                                ? chat.user2
                                : null;
                        }
                        // console.log("Full User:", fullUser);

                        setSelectedUser?.(fullUser);
                        setIsUserPageOpen?.(true);
                      }}
                    >
                      <UserBox
                        avatar={u.avatar ? { url: u.avatar } : undefined}
                        userName={u.name}
                        userId={u.id}
                        onlineUsers={onlineUsers}
                      />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {/* Нижняя панель */}
          <ToolsbarAddRooms selectedRoom={selectedChat?.chat ?? null} />
        </div>
      )}
    </>
  );
}

export default UserList;
