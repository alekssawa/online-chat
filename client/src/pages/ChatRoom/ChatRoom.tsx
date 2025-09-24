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

  // console.log("Selected Room:", selectedRoom);

  return (
    <div className={styles.container}>
      <RoomsList onSelectRoom={setSelectedRoom} />
      {selectedRoom && (
        <>
          <MessageView selectedRoom={selectedRoom} />
        </>
      )}
      <UserList selectedRoom={selectedRoom} />
    </div>
  );
}

export default ChatRoom;
