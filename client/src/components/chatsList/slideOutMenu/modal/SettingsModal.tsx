import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import styles from "./Modal.module.css";

import DefaultUserAvatar from "../../../../assets/icons/DefaultUserAvatar.svg?react";
import DefaultUserAvatar3 from "../../../../assets/icons/DefaultUserAvatar3.svg?react";
import Bell from "../../../../assets/icons/Bell.svg?react";
import LockIcon from "../../../../assets/icons/lockIcon.svg?react";
import ChatBubbleIcon from "../../../../assets/icons/chatBubbleIcon.svg?react";
import Adjustments from "../../../../assets/icons/adjustmentsIcon.svg?react";
import FolderIcon from "../../../../assets/icons/folderIcon.svg?react";
import SpeackerIcon from "../../../../assets/icons/speackerIcon.svg?react";
import LanguageIcon from "../../../../assets/icons/languageIcon.svg?react";

import { ToastContainer, toast } from "react-toastify";

// Импортируем отдельные компоненты категорий
import { MyAccount } from "./tabs/MyAccount";
import { NotificationsAndSounds } from "./tabs/NotificationsAndSounds";
import { PrivacyAndSecurity } from "./tabs/PrivacyAndSecurity";
import type { User } from "../../../type";
// Остальные категории импортируем по аналогии

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const modalRoot = document.getElementById("modal-root") || document.body;

const TABS = [
  { name: "My Account", icon: DefaultUserAvatar3 },
  { name: "Notifications and Sounds", icon: Bell },
  { name: "Privacy and Security", icon: LockIcon },
  { name: "Chat Settings", icon: ChatBubbleIcon },
  { name: "Folders", icon: FolderIcon },
  { name: "Advanced", icon: Adjustments },
  { name: "Speakers and Camera", icon: SpeackerIcon },
  { name: "Language", icon: LanguageIcon },
];

// Сопоставление названий вкладок с компонентами
const TAB_COMPONENTS: Record<string, React.FC<{ onBack?: () => void }>> = {
  "My Account": MyAccount,
  "Notifications and Sounds": NotificationsAndSounds,
  "Privacy and Security": PrivacyAndSecurity,
  // Добавляй остальные категории здесь
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const userStr = localStorage.getItem("user");
  const user: User | null = userStr ? JSON.parse(userStr) : null;

  // Блокировка прокрутки при открытии модалки
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Закрытие модалки по Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const ActiveTabComponent = activeTab ? TAB_COMPONENTS[activeTab] : null;

  return ReactDOM.createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {!activeTab && (
          <div className={styles.modalHeader}>
            <h2 className={styles.title}>Settings</h2>
            <div className={styles.user_info}>
              {user?.avatar ? (
                <img className={styles.user_avatar} src={user.avatar.url} />
              ) : (
                <DefaultUserAvatar
                  className={`${styles.user_avatar} ${styles.defaultAvatar}`}
                />
              )}
              <div className={styles.user_details}>
                <h2 className={styles.user_name}>{user?.name}</h2>
                <h2 className={styles.user_email}>{user?.email}</h2>
                {(() => {
                  const nickname = user?.nickname;

                  if (!nickname) return null;

                  const handleClick = () => {
                    const nickWithAt = "@" + nickname;
                    navigator.clipboard.writeText(nickWithAt);

                    toast("Link copied to clipboard", {
                      closeButton: false,
                      toastId: "unique-id",
                      style: {
                        width: "auto",
                        maxWidth: "300px",
                        padding: "0 20px",
                      },
                    });
                  };

                  return (
                    <p className={styles.nickname} onClick={handleClick}>
                      {"@" + nickname}
                    </p>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        <div className={styles.modalBody}>
          {!activeTab ? (
            // Список категорий
            <div className={styles.modalTabs}>
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.name}
                    className={styles.tabButton}
                    onClick={() => setActiveTab(tab.name)}
                  >
                    <Icon
                      style={{ marginRight: 14, width: "20px", height: "auto" }}
                    />
                    {tab.name}
                  </button>
                );
              })}
            </div>
          ) : (
            // Контент выбранной категории
            <div className={styles.tabContent}>
              <button
                className={styles.backButton}
                onClick={() => setActiveTab(null)}
              >
                ← Back
              </button>
              {ActiveTabComponent && (
                <ActiveTabComponent onBack={() => setActiveTab(null)} />
              )}
            </div>
          )}
        </div>
      </div>
      <ToastContainer
        position="top-center"
        pauseOnHover={false}
        pauseOnFocusLoss={false}
        hideProgressBar
        closeOnClick={false}
        draggable={false}
        limit={2}
        autoClose={1500}
        theme="dark"
      />
    </div>,
    modalRoot
  );
};
