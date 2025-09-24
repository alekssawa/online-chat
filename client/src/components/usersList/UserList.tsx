// import { useEffect, useState } from "react";
// import { useAuth } from "../../hooks/useAuth";

import styles from "./UserList.module.css";


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

function UserList({ selectedRoom }: { selectedRoom: FullRoom | null }) {

  console.log("UserList selectedRoom:", selectedRoom);

  const users = selectedRoom?.users ?? [];

  return (
    <div className={styles.container}>
      <h4>Users:</h4>
      {selectedRoom && users.length > 0 ? (
        <ul>
          {users.map((u) => (
            <li key={u.id}>{u.name}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default UserList;
