import { useState } from "react";
import styles from "./ChatRoom.module.css";

import RoomsList from "../../components/roomsList/RoomsList";
import UserList from "../../components/usersList/UserList";
import MessageView from "../../components/messageView/MessageView";

function ChatRoom() {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  return (
    <div className={styles.container}>
      {/* Передаём setSelectedRoom в RoomsList */}
      <RoomsList onSelectRoom={setSelectedRoom} />
      <MessageView roomId={selectedRoom} />
      <UserList roomId={selectedRoom} />

    </div>
  );
}

export default ChatRoom;
