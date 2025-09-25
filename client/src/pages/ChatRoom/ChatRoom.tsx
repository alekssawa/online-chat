import { useState } from "react";
import styles from "./ChatRoom.module.css";

import RoomsList from "../../components/roomsList/RoomsList";
import UserList from "../../components/usersList/UserList";
import MessageView from "../../components/messageView/MessageView";

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

function ChatRoom() {
  const [selectedRoom, setSelectedRoom] = useState<FullRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [/*error*/, setError] = useState<string | null>(null);

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
            <MessageView selectedRoom={selectedRoom} />
          </>
        )}
        <UserList selectedRoom={selectedRoom} loading={loading} />
      </>
    </div>
  );
}

export default ChatRoom;
