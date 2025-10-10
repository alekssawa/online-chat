import { useEffect, useState, useRef } from "react";
import socketIOClient from "socket.io-client";

import styles from "./MessageView.module.css";
import MessageBox from "./messageBox/MessageBox";
import SendMessage from "./sendMessage/SendMessage";

import type { User, Message, FullRoom, OnlineUser } from "../type";

interface MessageViewProps {
  selectedRoom: FullRoom | null;
  setOnlineUsers: React.Dispatch<React.SetStateAction<OnlineUser[]>>;
}

function MessageView({ selectedRoom, setOnlineUsers }: MessageViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  const socketRef = useRef<ReturnType<typeof socketIOClient> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userStr = localStorage.getItem("user");
  const user: User | null = userStr ? JSON.parse(userStr) : null;

  const roomId = selectedRoom?.id ?? null;

  // Прокрутка вниз при новых сообщениях
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Загрузка начальных сообщений
  useEffect(() => {
    if (!selectedRoom) {
      setMessages([]);
      return;
    }

    const initialMessages: Message[] = selectedRoom.messages.map((m) => ({
      id: m.id,
      text: m.text,
      senderId: m.sender.id,
      roomId: selectedRoom.id,
      sentAt: m.sentAt,
      updatedAt: m.updatedAt,
      sender: { id: m.sender.id, name: m.sender.name, email: m.sender.email },
    }));

    setMessages(initialMessages);
  }, [selectedRoom]);

  // Подключение Socket.IO
  useEffect(() => {
    if (!roomId || !user) return;

    if (!socketRef.current) {
      const socket = socketIOClient("http://localhost:3000", {
        auth: { token: localStorage.getItem("accessToken"), userId: user.id },
      });
      socketRef.current = socket;

      socket.on("connect", () => setIsSocketConnected(true));
      socket.on("disconnect", () => setIsSocketConnected(false));

      socket.on("newMessage", (message: Message) =>
        setMessages((prev) => [...prev, message]),
      );

      // 1️⃣ Слушаем список всех онлайн при подключении
      socket.on("onlineUsersList", (users: OnlineUser[]) => {
        setOnlineUsers(users);
      });

      // 2️⃣ Слушаем изменения статуса
      socket.on("userStatusChanged", (status: OnlineUser) =>
        setOnlineUsers((prev) => {
          const filtered = prev.filter((u) => u.userId !== status.userId);
          return [...filtered, status];
        }),
      );
    }

    const socket = socketRef.current;

    // Входим в комнату
    socket.emit("joinRoom", roomId);

    return () => {
      socket.emit("leaveRoom", roomId);
    };
  }, [roomId]);

  if (!roomId) return <p>Выберите комнату</p>;

  return (
    <div className={styles.container}>
      {!isSocketConnected && (
        <div className={styles.overlay}>
          <div className={styles.loader}></div>
          <p>Connecting...</p>
        </div>
      )}
      <ul>
        {messages.map((m) => (
          <li
            key={m.id}
            className={
              m.senderId === user?.id ? styles.MyMessageLi : styles.messageLi
            }
          >
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
      <SendMessage
        roomId={roomId}
        socket={socketRef.current}
        isSocketConnected={isSocketConnected}
      />
    </div>
  );
}

export default MessageView;
