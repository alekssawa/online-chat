import { useCallback, useState } from "react";
import styles from "./ChatPage.module.css";

import ChatsList from "../../components/chatsList/ChatsList";
import UserList from "../../components/usersList/UserList";
import MessageView from "../../components/messageView/MessageView";

import type { SelectedChat, User, OnlineUser } from "../../components/type";
import UserInfoPanel from "../../components/userInfoPanel/UserInfoPanel";

function ChatRoom() {
  const [selectedChat, setSelectedChat] = useState<SelectedChat | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [, /*error*/ setError] = useState<string | null>(null);

  const [updateChatLastMessage, setUpdateChatLastMessage] = useState<
    (chatId: string, newMessage: { text: string; senderName?: string }) => void
  >(() => () => {});

  const handleUpdateFunction = useCallback(
    (
      updateFn: (
        chatId: string,
        newMessage: { text: string; senderName?: string },
      ) => void,
    ) => {
      setUpdateChatLastMessage(() => updateFn);
    },
    [],
  );

  const [isUserPageOpen, setIsUserPageOpen] = useState(false);

  // console.log("Selected Room:", selectedRoom);
  // console.log("selectedUser:", selectedUser);

  return (
    <div className={styles.container}>
      {loading && (
        <div className={styles.loading}>
          <div className={styles.loader}></div>
          <div className={styles.loadingText}>Connecting to server...</div>
          {/* {error && <div className={styles.error}>Error: {error}</div>} */}
        </div>
      )}

      <>
        <ChatsList
          setSelectedChat={setSelectedChat}
          setIsUserPageOpen={setIsUserPageOpen}
          loading={loading}
          setLoading={setLoading}
          setError={setError}
          SetUpdateFunction={handleUpdateFunction}
        />
        {selectedChat && (
          <>
            <MessageView
              selectedChat={selectedChat}
              onlineUsers={onlineUsers}
              setOnlineUsers={setOnlineUsers}
              updateChatLastMessage={updateChatLastMessage}
            />
          </>
        )}
        {isUserPageOpen || selectedChat?.type == "private" ? (
          <UserInfoPanel
            selectedChat={selectedChat}
            selectedUser={selectedUser}
            setIsUserPageOpen={setIsUserPageOpen}
            onlineUsers={onlineUsers}
          />
        ) : (
          <UserList
            selectedChat={selectedChat}
            loading={loading}
            onlineUsers={onlineUsers}
            setSelectedUser={setSelectedUser}
            setIsUserPageOpen={setIsUserPageOpen}
          />
        )}
      </>
    </div>
  );
}

export default ChatRoom;
