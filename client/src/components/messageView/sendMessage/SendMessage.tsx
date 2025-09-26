import { useState, useRef } from "react";
import { Socket } from "socket.io-client";
import styles from "./SendMessage.module.css";

interface User {
  id: string;
  name: string;
}

interface SendMessageProps {
  roomId: string;
  socket: typeof Socket | null;
  isSocketConnected: boolean;
}

function SendMessage({ roomId, socket, isSocketConnected }: SendMessageProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");

  // Получаем пользователя из localStorage
  const userStr = localStorage.getItem("user");
  const user: User | null = userStr ? JSON.parse(userStr) : null;

  const handleSend = () => {
    if (!socket || !user) return;

    const messageText = editorRef.current?.innerText || "";
    if (!messageText.trim()) return;

    const message = {
      roomId,
      text: messageText,
      senderId: user.id,
      sender: { id: user.id, name: user.name },
    };

    socket.emit("sendMessage", message);

    // очищаем редактор
    if (editorRef.current) editorRef.current.innerHTML = "";
    setText("");
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSend();
  };

  // execCommand для форматирования
  const execCommand = (command: string) => {
    document.execCommand(command, false);
    editorRef.current?.focus();
  };

  const clearFormat = () => {
    document.execCommand("removeFormat", false);
    editorRef.current?.focus();
  };

  // Сохраняем текст в state (Markdown) для отправки на сервер или предпросмотра
  const handleInput = () => {
    setText(editorRef.current?.innerText || "");
  };

  return (
    <div className={styles.wrapper}>
      {/* тулбар */}
      <div className={styles.toolbar}>
        <button type="button" onClick={() => execCommand("bold")}>B</button>
        <button type="button" onClick={() => execCommand("italic")}>I</button>
        <button type="button" onClick={() => execCommand("underline")}>U</button>
        <button type="button" onClick={() => execCommand("strikeThrough")}>S</button>
        <button type="button" onClick={clearFormat}>Обычный</button>
      </div>

      {/* форма */}
      <form className={styles.container} onSubmit={onSubmit}>
        <div
          ref={editorRef}
          className={styles.editor}
          contentEditable
          onInput={handleInput}
          suppressContentEditableWarning
        ></div>
        <button type="submit" disabled={!isSocketConnected || !text.trim()}>
          Отправить
        </button>
      </form>
    </div>
  );
}

export default SendMessage;
