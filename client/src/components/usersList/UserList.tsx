import UserBox from "./userBox/UserBox";
import styles from "./UserList.module.css";

import SettingsIcon from "../../assets/icons/settingsIcon.svg?react";
import userIcon from "../../assets/icons/users.svg";
import ToolsbarAddRooms from "./toolsbarSettings/ToolsbarSettings";
import DefaultUserAvatar from "../../assets/icons/DefaultUserAvatar.svg?react";

import type { FullRoom, User } from "../type";

interface UserListProps {
  selectedRoom: FullRoom | null;
  loading: boolean;
  onlineUsers: { userId: string; online: boolean }[];
  setSelectedUser?: (user: User | null) => void;
  setIsUserPageOpen?: (isUserPageOpen: boolean) => void;
}

function UserList({
  selectedRoom,
  loading,
  onlineUsers,
  setSelectedUser,
  setIsUserPageOpen,
}: UserListProps) {
  const userStr = localStorage.getItem("user");
  const user: User | null = userStr ? JSON.parse(userStr) : null;
  // console.log("UserList selectedRoom:", selectedRoom);

  const users = selectedRoom?.users ?? [];

  const sortedUsers = [...users].sort((a, b) => {
    // 1️⃣ Сначала наш юзер — всегда первый
    if (a.id === user?.id) return -1;
    if (b.id === user?.id) return 1;

    // 2️⃣ Потом по онлайн-статусу
    const aOnline = onlineUsers.some((ou) => ou.userId === a.id && ou.online);
    const bOnline = onlineUsers.some((ou) => ou.userId === b.id && ou.online);

    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;

    // 3️⃣ Остальные — как есть (по алфавиту, если хочешь)
    return a.name.localeCompare(b.name);
  });

  console.log("UserList onlineUsers:", onlineUsers);
  console.log(users);
  console.log(user);

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
            {selectedRoom && users.length > 0 ? (
              <h4>
                <img src={userIcon} className={styles.userIcon}></img>Users:
              </h4>
            ) : null}
            {selectedRoom && users.length > 0 ? (
              <ul>
                {sortedUsers.map((u) => (
                  <li
                    key={u.id}
                    onClick={() => {
                      setSelectedUser?.(u);
                      setIsUserPageOpen?.(true);
                    }}
                  >
                    <UserBox
                      avatar={u.avatar}
                      userName={u.name}
                      userId={u.id}
                      onlineUsers={onlineUsers}
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <ToolsbarAddRooms selectedRoom={selectedRoom} />
        </div>
      )}
    </>
  );
}

export default UserList;
