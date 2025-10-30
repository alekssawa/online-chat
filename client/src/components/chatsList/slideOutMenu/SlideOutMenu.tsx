import React, { useMemo } from "react";
import styles from "./SlideOutMenu.module.css";
import { useMutation, useApolloClient } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { useNavigate } from "react-router-dom";

import DefaultUserAvatar from "../../../assets/icons/DefaultUserAvatar.svg?react";
import SettingsIcon from "../../../assets/icons/settingsIcon.svg?react";

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
  const navigate = useNavigate();
  const [logoutMutation /*, { loading: logoutLoading }*/] =
    useMutation(LOGOUT_MUTATION);
  const user = useMemo(() => {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  }, []);
  const client = useApolloClient();

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
                <li className={styles.menuItem}>Profile</li>
                <li className={styles.menuItem}>New Group</li>
                <li className={styles.menuItem}>Friends</li>
                <li className={styles.menuItem}>
                  <SettingsIcon />
                  Settings
                </li>
                <li className={styles.menuItem}>Night mode</li>
                <li className={styles.menuItem} onClick={handleExit}>
                  Exit
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SlideOutMenu;
