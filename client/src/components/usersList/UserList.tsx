import UserBox from "./userBox/UserBox";
import styles from "./UserList.module.css";

import SettingsIcon from "../../assets/icons/settingsIcon.svg?react";
import userIcon from "../../assets/icons/users.svg";
import ToolsbarAddRooms from "./toolsbarSettings/ToolsbarSettings";
import DefaultUserAvatar from "../../assets/icons/DefaultUserAvatar.svg?react";

import type { GroupChat, PrivateChat, SelectedChat, User } from "../type";

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

  console.log(selectedChat);

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

  console.log("Users in UserList:", users);

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
            <div className={styles.settings}>
              <button className={styles.settings_button}>
                <SettingsIcon />
              </button>
            </div>
            <div className={styles.profile_avatar}>
              {user?.avatar ? (
                <img src={user.avatar.url} alt="User avatar" />
              ) : (
                <DefaultUserAvatar />
              )}
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
