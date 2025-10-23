import { useState } from "react";
import styles from "./ChatRoom.module.css";

import RoomsList from "../../components/roomsList/RoomsList";
import UserList from "../../components/usersList/UserList";
import MessageView from "../../components/messageView/MessageView";

import type { FullRoom, User, OnlineUser } from "../../components/type";
import UserInfoPanel from "../../components/userInfoPanel/UserInfoPanel";

function ChatRoom() {
  const [selectedRoom, setSelectedRoom] = useState<FullRoom | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [, /*error*/ setError] = useState<string | null>(null);

  const [isUserPageOpen, setIsUserPageOpen] = useState(false);

  // console.log("Selected Room:", selectedRoom);

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
        <RoomsList
          onSelectRoom={setSelectedRoom}
          loading={loading}
          setLoading={setLoading}
          setError={setError}
        />
        {selectedRoom && (
          <>
            <MessageView
              selectedRoom={selectedRoom}
              onlineUsers={onlineUsers}
              setOnlineUsers={setOnlineUsers}
            />
          </>
        )}
        {isUserPageOpen ? (
          <UserInfoPanel
            selectedUser={selectedUser}
            setIsUserPageOpen={setIsUserPageOpen}
            onlineUsers={onlineUsers}
          />
        ) : (
          <UserList
            selectedRoom={selectedRoom}
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
