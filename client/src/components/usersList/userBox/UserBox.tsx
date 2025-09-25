import styles from "./UserBox.module.css";

interface UserBoxProps {
  userName: string;
  userId: string;
  onlineUsers: { userId: string; online: boolean }[];
  // userStatus: string;
}

interface User {
  id: string;
  name: string;
}

function UserBox({ userName, userId, onlineUsers }: UserBoxProps) {
  const userStr = localStorage.getItem("user");
  const user: User | null = userStr ? JSON.parse(userStr) : null;

  return (
    <div className={styles.container}>
      <h2 className={styles.userName}>
        {userName}
        {userId === user?.id && <span className={styles.selectUser}> you</span>}
      </h2>
      {onlineUsers.find((ou) => ou.userId === userId)?.online ? (
        <p className={`${styles.userStatus} ${styles.statusOnline}`}>Online</p>
      ) : (
        <p className={`${styles.userStatus} ${styles.statusOffline}`}>
          Offline
        </p>
      )}
    </div>
  );
}

export default UserBox;
