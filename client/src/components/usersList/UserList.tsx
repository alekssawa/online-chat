import UserBox from "./userBox/UserBox";
import styles from "./UserList.module.css";

import userIcon from "../../assets/icons/users.svg";
import ToolsbarAddRooms from "./toolsbarSettings/ToolsbarSettings";

import type { FullRoom } from "../type";

interface UserListProps {
  selectedRoom: FullRoom | null;
  loading: boolean;
  onlineUsers: { userId: string; online: boolean }[];
}

function UserList({ selectedRoom, loading, onlineUsers }: UserListProps) {
  // console.log("UserList selectedRoom:", selectedRoom);

  const users = selectedRoom?.users ?? [];

  // console.log("UserList onlineUsers:", onlineUsers);

  return (
    <>
      {!loading && (
        <div className={styles.container}>
          <div className={styles.container_users}>
            <h4>
              <img src={userIcon} className={styles.userIcon}></img>Users:
            </h4>
            {selectedRoom && users.length > 0 ? (
              <ul>
                {users.map((u) => (
                  <li key={u.id}>
                    <UserBox
                      avatar={u.avatar}
                      userName={u.name}
                      userId={u.id}
                      onlineUsers={onlineUsers}
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <ToolsbarAddRooms selectedRoom={selectedRoom} />
        </div>
      )}
    </>
  );
}

export default UserList;
