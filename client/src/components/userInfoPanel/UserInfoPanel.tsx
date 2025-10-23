import styles from "./UserInfoPanel.module.css";

import ArrowLeft from "../../assets/icons/ArrowLeft.svg?react";
import ArrowShare from "../../assets/icons/ArrowShare.svg?react";
import PencilIcon from "../../assets/icons/PencilIcon.svg?react";
import TrashIcon from "../../assets/icons/TrashIcon.svg?react";
import BlockIcon from "../../assets/icons/BlockIcon.svg?react";
import DefaultUserAvatar from "../../assets/icons/DefaultUserAvatar.svg?react";

import type { User } from "../type";

interface UserInfoPanelProps {
  selectedUser: User | null;
  setIsUserPageOpen: (isUserPageOpen: boolean) => void;
  onlineUsers: { userId: string; online: boolean }[];
}

function UserInfoPanel({
  selectedUser,
  setIsUserPageOpen,
  onlineUsers,
}: UserInfoPanelProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => setIsUserPageOpen(false)}
        >
          <ArrowLeft />
          Back
        </button>
      </div>
      <div className={styles.container_profile}>
        <div className={styles.profile}>
          {selectedUser?.avatar ? (
            <img className={styles.user_avatar} src={selectedUser.avatar.url} />
          ) : (
            <DefaultUserAvatar
              className={`${styles.user_avatar} ${styles.defaultAvatar}`}
            />
          )}

          <div className={styles.userInfo}>
            <span className={styles.userName}>{selectedUser?.name}</span>
            {onlineUsers.find((ou) => ou.userId === selectedUser?.id)
              ?.online ? (
              <p className={`${styles.userStatus} ${styles.statusOnline}`}>
                Online
              </p>
            ) : (
              <p className={`${styles.userStatus} ${styles.statusOffline}`}>
                Offline
              </p>
            )}
          </div>
        </div>
        <div className={styles.userDetails}>
          <p>{selectedUser?.email}</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.actionButton}>
            <ArrowShare /> Share contact
          </button>
          <button className={styles.actionButton}>
            <PencilIcon /> Edit contact
          </button>
          <button className={styles.actionButton}>
            <TrashIcon /> Delete contact
          </button>
          <button className={`${styles.actionButton} ${styles.highlight}`}>
            <BlockIcon /> Block user
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserInfoPanel;
