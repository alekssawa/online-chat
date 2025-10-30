import React, { useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import styles from "./Modal.module.css";

import type {Friend} from "../../../type"

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const modalRoot = document.getElementById("modal-root") || document.body;

export const FriendsModal: React.FC<FriendsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const user = useMemo(() => {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Friends</h2>
        </div>
        <div className={styles.modalBody}>
          <ul>
            {user.friends && user.friends.length > 0 ? (
              user.friends.map((f: Friend) => (
                <li key={f.id}>
                  <p>{f.friend.name}</p>
                  {f.friend.avatar && (
                    <img src={f.friend.avatar.url} alt={f.friend.name} />
                  )}
                  {f.friend.nickname && <span>@{f.friend.nickname}</span>}
                </li>
              ))
            ) : (
              <li>Нет друзей</li>
            )}
          </ul>
        </div>
      </div>
    </div>,
    modalRoot,
  );
};
