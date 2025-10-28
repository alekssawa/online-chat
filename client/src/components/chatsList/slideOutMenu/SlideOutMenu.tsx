import React, { useMemo } from "react";
import styles from "./SlideOutMenu.module.css";

import DefaultUserAvatar from "../../../assets/icons/DefaultUserAvatar.svg?react";

interface SlideOutMenuProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
}

const SlideOutMenu: React.FC<SlideOutMenuProps> = ({
  isOpen,
  onClose,
  children,
}) => {
  const user = useMemo(() => {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  }, []);

  console.log(user);

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
                <li className={styles.menuItem}>Settings</li>
                <li className={styles.menuItem}>Night mode</li>
                <li className={styles.menuItem}>Exit</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SlideOutMenu;
