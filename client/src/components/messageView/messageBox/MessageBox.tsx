import styles from "./MessageBox.module.css";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

// import remarkMarkdownV2 from "../../../utils/markdown/remarkMarkdownV2";

interface User {
  id: string;
  name: string;
}

interface MessageBoxProps {
  id: string;
  text: string;
  senderId: string;
  roomId: string;
  sentAt: string;
  updatedAt: string;
  sender?: User;
}

// interface SpanProps {
//   children?: React.ReactNode;
//   "data-underline"?: string;
// }

function MessageBox({ text, sentAt, sender }: MessageBoxProps) {
  const userStr = localStorage.getItem("user");
  const user: User | null = userStr ? JSON.parse(userStr) : null;

  // console.log("MessageBox user:", user);

  // console.log(text);

  const processText = (text: string): string => {
    return text
      .replace(/__([^_]+)__/g, "<u>$1</u>")
      .replace(/~([^~]+)~/g, "<s>$1</s>");
  };

  const components = {
    // Заменяем p на div чтобы избежать ошибки с pre внутри p
    p: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    u: ({ children }: { children?: React.ReactNode }) => (
      <span style={{ textDecoration: "underline" }}>{children}</span>
    ),
    s: ({ children }: { children?: React.ReactNode }) => (
      <span style={{ textDecoration: "line-through" }}>{children}</span>
    ),
    code: ({
      children,
      inline,
    }: {
      children?: React.ReactNode;
      inline?: boolean;
    }) => {
      if (inline) {
        return (
          <code
            style={{
              fontFamily: "monospace",
              backgroundColor: "#0a141e",
              color: "#9dc6f2",
              padding: "2px 4px",
              borderRadius: "3px",
            }}
          >
            {children}
          </code>
        );
      }
      // Блок кода (многострочный)
      return (
        <pre
          style={{
            fontFamily: "monospace",
            backgroundColor: "#0a141e",
            color: "#9dc6f2",
            padding: "12px",
            borderRadius: "3px",
            overflow: "auto",
            margin: "10px 0",
          }}
        >
          <code>{children}</code>
        </pre>
      );
    },
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
      <a href={href} style={{ color: "#007acc", textDecoration: "underline" }}>
        {children}
      </a>
    ),
  };

  const processedText = processText(text);

  return (
    <div
      className={
        user?.id === sender?.id
          ? styles.MyMessageWrapper
          : styles.message_wrapper
      }
    >
      <div
        className={
          user?.id === sender?.id ? styles.Mycontainer : styles.container
        }
      >
        {user?.id === sender?.id ? null : (
          <h2 className={styles.author}>{sender!.name}</h2>
        )}
        <div className={styles.message}>
          <div className={styles.messageContent}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={components}
            >
              {processedText}
            </ReactMarkdown>
          </div>
          <span
            className={
              user?.id === sender?.id ? styles.MyTimestamp : styles.timestamp
            }
          >
            {new Date(sentAt).toLocaleString(undefined, {
              month: "numeric",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

export default MessageBox;

// TODO: Сделать формат для комнат
// TODO: Сделать формат для списка users
// TODO: добавить форматирование текста (markdown)
