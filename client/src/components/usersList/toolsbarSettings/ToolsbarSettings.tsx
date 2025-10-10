import { useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client";
import styles from "./ToolsbarSettings.module.css";
import SettingsIcon from "../../../assets/icons/settingsIcon.svg?react";
import AddIcon from "../../../assets/icons/addIcon.svg?react";
import { useState } from "react";

import type { FullRoom } from "../UserList";

interface ToolsbarSettingsProps {
  selectedRoom: FullRoom | null;
  onUserAdded?: () => void; // callback после успешного добавления
}

const ADD_USER_TO_ROOM = gql`
  mutation AddUserToRoom($roomId: ID!, $userId: ID!) {
    addUserToRoom(roomId: $roomId, userId: $userId) {
      id # id самой связи RoomUser
      user {
        # данные добавленного пользователя
        id
        email
      }
    }
  }
`;

function ToolsbarSettings({
  selectedRoom,
  onUserAdded,
}: ToolsbarSettingsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userID, setUserID] = useState("");
  const [error, setError] = useState("");

  const [addUserToRoomMutation, { loading: addUserLoading }] =
    useMutation(ADD_USER_TO_ROOM);

  const openModalMenu = () => {
    setIsModalOpen(true);
    setUserID("");
    setError("");
  };

  const closeModalMenu = () => {
    setIsModalOpen(false);
    setUserID("");
    setError("");
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userID.trim()) {
      setError("ID пользователя не может быть пустым");
      return;
    }

    if (!selectedRoom) return null;

    try {
      const result = await addUserToRoomMutation({
        variables: {
          roomId: selectedRoom.id,
          userId: userID.trim(),
        },
      });

      const data = result.data as {
        addUserToRoom: {
          id: string;
          name: string;
          user: { id: string; email: string }[];
        };
      };

      if (data?.addUserToRoom) {
        console.log("Пользователь добавлен:", data.addUserToRoom);

        if (onUserAdded) {
          onUserAdded(); // обновляем список участников комнаты
        }

        closeModalMenu();
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("Ошибка добавления пользователя:", err.message);
        setError(err.message);
      } else {
        console.error("Неизвестная ошибка:", err);
        setError("Неизвестная ошибка при добавлении пользователя");
      }
    }
  };

  return (
    <>
      <div className={styles.toolsbarSettings}>
        <button onClick={openModalMenu} className={styles.addButton}>
          <AddIcon className={styles.addIcon} />
        </button>

        <span className={styles.divider}></span>

        <button className={styles.settingsButton}>
          <SettingsIcon className={styles.settingsIcon} />
        </button>
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={closeModalMenu}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>Добавить участника</h3>
            </div>

            <form onSubmit={handleAddUser} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label htmlFor="userId">ID Пользователя:</label>
                <input
                  id="userId"
                  type="text"
                  value={userID}
                  onChange={(e) => setUserID(e.target.value)}
                  placeholder="Введите ID пользователя"
                  className={styles.roomInput}
                  autoFocus
                />
              </div>

              {error && <div className={styles.errorMessage}>{error}</div>}

              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={closeModalMenu}
                  className={styles.cancelButton}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={addUserLoading || !userID.trim()}
                  className={styles.createButton}
                >
                  {addUserLoading ? "Добавление..." : "Добавить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default ToolsbarSettings;
