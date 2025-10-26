import UserBox from "./userBox/UserBox";
import styles from "./UserList.module.css";

import SettingsIcon from "../../assets/icons/settingsIcon.svg?react";
import userIcon from "../../assets/icons/users.svg";
import ToolsbarAddRooms from "./toolsbarSettings/ToolsbarSettings";
import DefaultUserAvatar from "../../assets/icons/DefaultUserAvatar.svg?react";

import type { GroupChat, PrivateChat, User } from "../type";

interface UserListProps {
  selectedChat: GroupChat | PrivateChat | null;
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

  // Получаем массив пользователей корректно
  const users: DisplayUser[] = (() => {
    if (!selectedChat) return [];

    if ("users" in selectedChat) {
      // GroupChat — теперь users это просто User[]
      return (selectedChat.users ?? []).map((u) => ({
        id: u.id,
        name: u.name,
        avatar: u.avatar?.url,
      }));
    } else {
      // PrivateChat
      return [
        { id: (selectedChat as PrivateChat).user1Id, name: "User 1" },
        { id: (selectedChat as PrivateChat).user2Id, name: "User 2" },
      ];
    }
  })();

  console.log("Users in UserList:", users);

  const sortedUsers = [...users].sort((a, b) => {
    // 1️⃣ Сначала наш юзер — всегда первый
    if (a.id === user?.id) return -1;
    if (b.id === user?.id) return 1;

    // 2️⃣ Потом по онлайн-статусу
    const aOnline = onlineUsers.some((ou) => ou.userId === a.id && ou.online);
    const bOnline = onlineUsers.some((ou) => ou.userId === b.id && ou.online);

    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;

    // 3️⃣ Остальные — по имени
    return a.name.localeCompare(b.name);
  });

  return (
    <>
      {!loading && (
        <div className={styles.container}>
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

                        if (selectedChat && "users" in selectedChat) {
                          fullUser =
                            selectedChat.users?.find((gu) => gu.id === u.id) ??
                            null;
                        } else {
                          // Для PrivateChat пока оставляем null
                          fullUser = null;
                        }

                        setSelectedUser?.(fullUser);
                        setIsUserPageOpen?.(true);
                      }}
                    >
                      <UserBox
                        avatar={u.avatar ? { url: u.avatar } : undefined} // передаем строку URL
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

          <ToolsbarAddRooms selectedRoom={selectedChat} />
        </div>
      )}
    </>
  );
}

export default UserList;
