import styles from "./UserBox.module.css";

import DefaultUserAvatar from "../../../assets/icons/DefaultUserAvatar.svg?react";

import type { Avatar } from "../../type";

interface UserBoxProps {
  avatar?: Avatar;
  userName: string;
  userId: string;
  onlineUsers: { userId: string; online: boolean }[];
  // userStatus: string;
}

function UserBox({ avatar, userName, userId, onlineUsers }: UserBoxProps) {
  // const userStr = localStorage.getItem("user");
  // const user: User | null = userStr ? JSON.parse(userStr) : null;

  return (
    <div className={styles.container}>
      {avatar ? (
        <img className={styles.user_avatar} src={avatar.url} />
      ) : (
        <DefaultUserAvatar
          className={`${styles.user_avatar} ${styles.defaultAvatar}`}
        />
      )}

      <div className={styles.userInfo}>
        <span className={styles.userName}>
          {userName}
          {/* {userId === user?.id && (
            <span className={styles.selectUser}> you</span>
          )} */}
        </span>
        {onlineUsers.find((ou) => ou.userId === userId)?.online ? (
          <p className={`${styles.userStatus} ${styles.statusOnline}`}>
            Online
          </p>
        ) : (
          <p className={`${styles.userStatus} ${styles.statusOffline}`}>
            Offline
          </p>
        )}
      </div>
    </div>
  );
}

export default UserBox;
