import styles from "./ToolsbarSettings.module.css";

import SettingsIcon from "../../../assets/icons/settingsIcon.svg?react";
import AddIcon from "../../../assets/icons/addIcon.svg?react";

function ToolsbarSettings() {
  return (
    <div className={styles.toolsbarSettings}>
      <button className={styles.addButton} disabled={true}>
        <AddIcon className={styles.addIcon} />
      </button>

      <span className={styles.divider}></span>

      <button className={styles.settingsButton}>
        <SettingsIcon className={styles.settingsIcon} />
      </button>
    </div>
  );
}

export default ToolsbarSettings;
