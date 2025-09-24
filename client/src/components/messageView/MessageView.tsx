import { useEffect, useState, useRef } from "react";
import socketIOClient from "socket.io-client";
// import { useAuth } from "../../hooks/useAuth";

import styles from "./MessageView.module.css";
import MessageBox from "./messageBox/MessageBox";
import SendMessage from "./sendMessage/SendMessage";

interface FullRoom {
  id: string;
  name: string;
  createdAt: string;
  users: { id: string; email: string; name: string }[];
  messages: {
    id: string;
    text: string;
    sentAt: string;
    updatedAt: string;
    sender: { id: string; email: string; name: string };
  }[];
}

interface User {
  id: string;
  name: string;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  roomId: string;
  sentAt: string;
  updatedAt: string;
  sender?: User;
}

function MessageView({ selectedRoom }: { selectedRoom: FullRoom | null }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const socketRef = useRef<ReturnType<typeof socketIOClient> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userStr = localStorage.getItem("user");
  const user: User | null = userStr ? JSON.parse(userStr) : null;

  // console.log(user?.id);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const roomId = selectedRoom?.id ?? null;

  // Загружаем начальные сообщения
  useEffect(() => {
    if (selectedRoom) {
      // преобразуем messages из комнаты в наш формат
      const initialMessages: Message[] = selectedRoom.messages.map((m) => ({
        id: m.id,
        text: m.text,
        senderId: m.sender.id,
        roomId: selectedRoom.id,
        sentAt: m.sentAt,
        updatedAt: m.updatedAt,
        sender: { id: m.sender.id, name: m.sender.name },
      }));
      setMessages(initialMessages);
    } else {
      setMessages([]);
    }
  }, [selectedRoom]);

  // Подключение Socket.IO
  useEffect(() => {
    if (!roomId) return;

    const socket = socketIOClient("http://localhost:3000", {
      auth: { token: localStorage.getItem("accessToken") },
    });

    socketRef.current = socket;

    socket.emit("joinRoom", roomId);

    socket.on("newMessage", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.emit("leaveRoom", roomId);
      socket.off("newMessage");
      socket.disconnect();
    };
  }, [roomId]);

  if (!roomId) return <p>Выберите комнату</p>;

  return (
    <div className={styles.container}>
      <ul>
        {messages.map((m) => (
          <li key={m.id} className={m.senderId === user?.id ? styles.MyMessageLi : styles.messageLi}>
            <MessageBox
              id={m.id}
              text={m.text}
              senderId={m.senderId}
              roomId={m.roomId}
              sender={m.sender}
              sentAt={m.sentAt}
              updatedAt={m.updatedAt}
            />
          </li>
        ))}
        <div ref={messagesEndRef} />
      </ul>
      <SendMessage roomId={roomId} socket={socketRef.current} />
    </div>
  );
}

export default MessageView;
