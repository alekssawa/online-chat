import { useEffect, useState, useRef } from "react";
import socketIOClient from "socket.io-client";
import { useAuth } from "../../hooks/useAuth";

import styles from "./MessageView.module.css";
import MessageBox from "./messageBox/MessageBox";
import SendMessage from "./sendMessage/SendMessage";

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

interface MessageViewProps {
  roomId: string | null;
}

function MessageView({ roomId }: MessageViewProps) {
  const { fetchWithAuth } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<ReturnType<typeof socketIOClient> | null>(null);

  useEffect(() => {
    if (!roomId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const fetchMessages = async () => {
      try {
        const res = await fetchWithAuth("http://localhost:3000/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `
              query {
                room(id: "${roomId}") {
                  messages {
                    id
                    text
                    sentAt
                    updatedAt
                    sender {
                      id
                      name
                    }
                  }
                }
              }
            `,
          }),
        });

        const data = await res.json();
        setMessages(data.data.room?.messages ?? []);
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message);
        else setError(String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Socket.IO
    const socket = socketIOClient("http://localhost:3000", {
      auth: { token: localStorage.getItem("accessToken") },
    });
    socketRef.current = socket;

    socket.emit("joinRoom", roomId);

    socket.on("newMessage", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit("leaveRoom", roomId);
        socketRef.current.off("newMessage");
        socketRef.current.disconnect();
      }
    };
  }, [roomId, fetchWithAuth]);

  if (loading) return <p>Загрузка сообщений...</p>;
  if (error) return <p>Ошибка: {error}</p>;

  return (
    <div className={styles.container}>
      <ul>
        {messages.map((m) => (
          <li key={m.id} className={styles.messageLi}>
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
      </ul>
      {roomId ? <SendMessage /> : null}
      
    </div>
  );
}

export default MessageView;
