import { useEffect, useState, useRef } from "react";
import socketIOClient from "socket.io-client";

import styles from "./MessageView.module.css";
import MessageBox from "./messageBox/MessageBox";
import SendMessage from "./sendMessage/SendMessage";

import type { SelectedChat, User, Message, OnlineUser } from "../type";
import RoomHeader from "./chatHeader/ChatHeader";
// import { c } from "@apollo/client/react/internal/compiler-runtime";

interface MessageViewProps {
  selectedChat: SelectedChat | null;
  onlineUsers: OnlineUser[];
  setOnlineUsers: React.Dispatch<React.SetStateAction<OnlineUser[]>>;
}

interface MessageGroup {
  date: string;
  messages: Message[];
}

function MessageView({
  selectedChat,
  onlineUsers,
  setOnlineUsers,
}: MessageViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  const socketRef = useRef<ReturnType<typeof socketIOClient> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userStr = localStorage.getItem("user");
  const user: User | null = userStr ? JSON.parse(userStr) : null;

  const chatId = selectedChat?.chat.id ?? null;

  console.log("MessageView selectedChat:", selectedChat);

  // Прокрутка вниз при новых сообщениях
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Загрузка начальных сообщений
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    const initialMessages: Message[] = selectedChat.chat.messages.map((m) => ({
      id: m.id,
      text: m.text,
      senderId: m.sender?.id ?? "",
      chatId,
      sentAt: m.sentAt,
      updatedAt: m.updatedAt,
      sender: m.sender
        ? { id: m.sender.id, name: m.sender.name, email: m.sender.email }
        : { id: "", name: "Unknown", email: "" },
      privateChatId:
        selectedChat.type === "private" ? selectedChat.chat.id : null,
      groupId: selectedChat.type === "group" ? selectedChat.chat.id : null,
    }));

    setMessages(initialMessages);
  }, [selectedChat]);

  // Подключение Socket.IO
  useEffect(() => {
    if (!chatId || !user || !selectedChat?.type) return; // chatType = "private" | "group"

    if (!socketRef.current) {
      const socket = socketIOClient("http://localhost:3000", {
        auth: { token: localStorage.getItem("accessToken"), userId: user.id },
      });
      socketRef.current = socket;

      socket.on("connect", () => setIsSocketConnected(true));
      socket.on("disconnect", () => setIsSocketConnected(false));

      socket.on("newMessage", (message: Message) =>
        setMessages((prev) => [...prev, message])
      );

      socket.on("onlineUsersList", (users: OnlineUser[]) =>
        setOnlineUsers(users)
      );

      socket.on("userStatusChanged", (status: OnlineUser) =>
        setOnlineUsers((prev) => {
          const filtered = prev.filter((u) => u.userId !== status.userId);
          return [...filtered, status];
        })
      );
    }

    const socket = socketRef.current;

    // 🔹 различаем тип комнаты
    const roomEvent =
      selectedChat?.type === "group" ? "joinGroupChat" : "joinPrivateChat";
      console.log("Emitting to room:", roomEvent, chatId);
    const leaveEvent =
      selectedChat?.type === "group" ? "leaveGroupChat" : "leavePrivateChat";

    socket.emit(roomEvent, chatId);

    return () => {
      socket.emit(leaveEvent, chatId);
    };
  }, [chatId, selectedChat?.type]);

  if (!chatId) return null;

  const getReadableDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

    return date.toLocaleDateString("en-US", { day: "numeric", month: "long" });
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: MessageGroup } = {};
    messages.forEach((message) => {
      const dateKey = new Date(message.sentAt).toDateString();
      const readableDate = getReadableDate(message.sentAt);
      if (!groups[dateKey])
        groups[dateKey] = { date: readableDate, messages: [] };
      groups[dateKey].messages.push(message);
    });
    return groups;
  };

  return (
    <div className={styles.container}>
      {!isSocketConnected && (
        <div className={styles.overlay}>
          <div className={styles.loader}></div>
          <p>Connecting...</p>
        </div>
      )}

      <RoomHeader
        onlineUsers={onlineUsers}
        selectedRoom={selectedChat?.chat ?? null}
        socket={socketRef.current}
      />

      <ul>
        {Object.entries(groupMessagesByDate(messages)).map(
          ([dateKey, group]) => (
            <div key={dateKey}>
              <div className={styles.dateSeparator}>
                <span className={styles.dateText}>{group.date}</span>
              </div>

              {group.messages.map((m) => (
                <li
                  key={m.id}
                  className={
                    m.senderId === user?.id
                      ? styles.MyMessageLi
                      : styles.messageLi
                  }
                >
                  <MessageBox
                    id={m.id}
                    text={m.text}
                    senderId={m.senderId}
                    chatId={chatId}
                    sender={m.sender}
                    sentAt={m.sentAt}
                    updatedAt={m.updatedAt}
                    privateChatId={m.privateChatId}
                    groupId={m.groupId}
                  />
                </li>
              ))}
            </div>
          )
        )}
        <div ref={messagesEndRef} />
      </ul>

      <SendMessage
        chatId={chatId}
        socket={socketRef.current}
        isSocketConnected={isSocketConnected}
      />
    </div>
  );
}

export default MessageView;
