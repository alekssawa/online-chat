import styles from "./RoomHeader.module.css";
import DefaultGroupAvatar from "../../../assets/icons/DefaultGroupAvatar.svg";

import type {FullRoom } from "../../type";

interface RoomHeaderProps {
  selectedRoom: FullRoom | null;
  onlineUsers: { userId: string; online: boolean }[];
}

function RoomHeader({ selectedRoom, onlineUsers }: RoomHeaderProps) {
  return (
    <div className={styles.roomHeader}>
      {/* Левая часть - информация о чате */}
      <div className={styles.chatInfo}>
        <div className={styles.avatar}>
          <img 
            src={selectedRoom?.avatar ? selectedRoom.avatar.url: DefaultGroupAvatar}
            alt="Chat avatar" 
            className={styles.avatarImage}
          />
        </div>
        <div className={styles.chatDetails}>
          <h2 className={styles.chatName}>{selectedRoom?.name}</h2>
          <div className={styles.onlineStatus}>
            <span className={styles.statusDot}></span>
            <span className={styles.statusText}>{
            onlineUsers.length>5 ? 
              `${onlineUsers.length +' участников онлайн'}`: 
                onlineUsers.length == 1 ? 
                  `${onlineUsers.length +' участник онлайн'}`:
                  `${onlineUsers.length +' участника онлайн'}`}
            </span>
          </div>
        </div>
      </div>

      {/* Правая часть - кнопки действий */}
      <div className={styles.actions}>
        <button className={styles.actionButton} title="Аудиозвонок">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
          </svg>
        </button>
        
        <button className={styles.actionButton} title="Видеозвонок">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
          </svg>
        </button>
        
        <button className={styles.actionButton} title="Поиск в чате">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
        </button>
        
        <button className={styles.actionButton} title="Меню">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default RoomHeader;