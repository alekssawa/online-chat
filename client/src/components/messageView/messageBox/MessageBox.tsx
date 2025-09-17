import styles from "./MessageBox.module.css";

function MessageBox() {
    return (
        <div className={styles.container}>
            <h2 className={styles.author}>{author}</h2>
            <p className={styles.message}></p>
        </div>
    );
}

export default MessageBox;