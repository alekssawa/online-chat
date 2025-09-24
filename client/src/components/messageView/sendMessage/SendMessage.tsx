import styles from "./SendMessage.module.css";

function SendMessage() {
    return (
        <div className={styles.container}>
            <input type="text" placeholder="Введите сообщение..." />
            <button>Отправить</button>
        </div>
    );
}

export default SendMessage;