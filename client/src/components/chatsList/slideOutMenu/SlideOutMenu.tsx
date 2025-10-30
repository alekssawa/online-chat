import React, { useMemo, useState } from "react";
import styles from "./SlideOutMenu.module.css";
import { useMutation, useApolloClient } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { useNavigate } from "react-router-dom";

import DefaultUserAvatar from "../../../assets/icons/DefaultUserAvatar.svg?react";
import DefaultUserAvatar3 from "../../../assets/icons/DefaultUserAvatar3.svg?react";
import UsersIcon from "../../../assets/icons/usersIcon.svg?react";
import ProfileIcon from "../../../assets/icons/profileIcon.svg?react";
import SettingsIcon from "../../../assets/icons/settingsIcon.svg?react";
import NightMode from "../../../assets/icons/NightMode.svg?react";
import ExitIcon from "../../../assets/icons/exitIcon.svg?react";

import { ProfileModal } from './modal/ProfileModal';
import { FriendsModal } from './modal/FriendsModal';
import { SettingsModal } from './modal/SettingsModal';

interface SlideOutMenuProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
}

const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`;

const SlideOutMenu: React.FC<SlideOutMenuProps> = ({
  isOpen,
  onClose,
  children,
}) => {
  const [activeModal, setActiveModal] = useState<'profile' | 'friends' | 'settings' | null>(null);
  const [logoutMutation /*, { loading: logoutLoading }*/] = useMutation(LOGOUT_MUTATION);

  const openModal = (modalName: 'profile' | 'friends' | 'settings') => {
    setActiveModal(modalName);
    onClose();
  };
  const user = useMemo(() => {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  }, []);

  const navigate = useNavigate();
  const client = useApolloClient();

  const closeModal = () => {
    setActiveModal(null);
  };

  const handleExit = async () => {
    try {
      await logoutMutation();
      await client.clearStore();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      document.cookie =
        "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
      navigate("/");
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && <div className={styles.overlay} onClick={onClose} />}

      {/* Menu */}
      <div className={`${styles.menu} ${isOpen ? styles.menuOpen : ""}`}>
        {/* Menu content */}
        <div className={styles.menuContent}>
          {children || (
            <div className={styles.defaultContent}>
              <div className={styles.userInfo}>
                <div className={styles.avatar}>
                  {user?.avatar ? (
                    <img src={user.avatar.url} alt="User avatar" />
                  ) : (
                    <DefaultUserAvatar />
                  )}
                </div>
              </div>
              <ul className={styles.menuList}>
                <li className={styles.menuItem} onClick={() => openModal('profile')}>
                  <DefaultUserAvatar3 /> Profile
                </li>
                <li className={styles.menuItem}><UsersIcon /> New Group</li>
                <li className={styles.menuItem} onClick={() => openModal('friends')}>
                  <ProfileIcon /> Friends
                </li>
                <li className={styles.menuItem} onClick={() => openModal('settings')}>
                  <SettingsIcon /> Settings
                </li>
                <li className={styles.menuItem}><NightMode /> Night mode</li>
                <li className={styles.menuItem} onClick={handleExit}><ExitIcon /> Exit</li>
              </ul>
              <ProfileModal isOpen={activeModal === 'profile'} onClose={closeModal} />
              <FriendsModal isOpen={activeModal === 'friends'} onClose={closeModal} />
              <SettingsModal isOpen={activeModal === 'settings'} onClose={closeModal} />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SlideOutMenu;
