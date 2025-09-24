import { useState } from "react";
import { Socket } from "socket.io-client";
import styles from "./SendMessage.module.css";

interface User {
  id: string;
  name: string;
}

interface SendMessageProps {
  roomId: string;
  socket: typeof Socket | null;
}

function SendMessage({ roomId, socket }: SendMessageProps) {
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // чтобы страница не перезагружалась
    handleSend();
  };
  const [text, setText] = useState("");

  // Получаем пользователя из localStorage
  const userStr = localStorage.getItem("user");
  const user: User | null = userStr ? JSON.parse(userStr) : null;

  const handleSend = () => {
    if (!text.trim() || !socket || !user) return;

    const message = {
      roomId,
      text,
      senderId: user.id,
      sender: { id: user.id, name: user.name },
    };

    socket.emit("sendMessage", message);
    setText(""); // очищаем поле ввода
  };

  return (
    <form className={styles.container} onSubmit={onSubmit}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Введите сообщение..."
      />
      <button type="submit">Отправить</button>
    </form>
  );
}

export default SendMessage;
