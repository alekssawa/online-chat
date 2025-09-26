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
  const userStr = localStorage.getItem("user");
  const user: User | null = userStr ? JSON.parse(userStr) : null;

  // console.log("MessageBox user:", user);

  return (
    <div
      className={
        user?.id === sender?.id
          ? styles.MyMessageWrapper
          : styles.message_wrapper
      }
    >
      <div
        className={
          user?.id === sender?.id ? styles.Mycontainer : styles.container
        }
      >
        {user?.id === sender?.id ? null : (
          <h2 className={styles.author}>{sender!.name}</h2>
        )}
        <p className={styles.message}>
          {text}
          <span
            className={
              user?.id === sender?.id ? styles.MyTimestamp : styles.timestamp
            }
          >
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

// TODO: Сделать формат для комнат
// TODO: Сделать формат для списка users
// TODO: добавить форматирование текста (markdown)
