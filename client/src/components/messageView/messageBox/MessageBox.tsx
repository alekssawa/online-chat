import styles from "./MessageBox.module.css";

interface User {
  id: string;
  name: string;
}

interface MessageBoxProps {
  id: string;
  text: string;
  senderId: string;
  roomId: string;
  sentAt: string;
  updatedAt: string;
  sender?: User;
}

function MessageBox({ text, sentAt, sender }: MessageBoxProps) {
  return (
    <div className={styles["message-wrapper"]}>
      <div className={styles.container}>
        <h2 className={styles.author}>{sender!.name}</h2>
        <p className={styles.message}>
          {text}
          <span className={styles.timestamp}>
            {new Date(sentAt).toLocaleString(undefined, {
              // year: "numeric", 
              month: "numeric", 
              day: "numeric", 
              hour: "2-digit", 
              minute: "2-digit", 
              // second: "2-digit",
            })}
          </span>
        </p>
      </div>
    </div>
  );
}

export default MessageBox;
