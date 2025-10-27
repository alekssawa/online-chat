import React, { useState, useRef, useEffect } from "react";
import styles from "./ChatHeader.module.css";
import DefaultGroupAvatar from "../../../assets/icons/DefaultGroupAvatar.svg";
import AudioIcon from "../../../assets/icons/audioIcon.svg?react";
import VideoIcon from "../../../assets/icons/videoIcon.svg?react";
import MenuIcon from "../../../assets/icons/menuIcon.svg?react";
import SearchIcon from "../../../assets/icons/searchIcon.svg?react";
import type { SelectedChat, User } from "../../type";
import { Socket } from "socket.io-client";

interface RoomHeaderProps {
  selectedChat: SelectedChat | null;
  onlineUsers: { userId: string; online: boolean }[];
  socket: typeof Socket | null; // ← Исправлен тип
}

// WebRTC interfaces
interface WebRTCSignal {
  type: "offer" | "answer" | "ice-candidate";
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidate;
}

interface SocketSignalData {
  from: string;
  signal: WebRTCSignal;
}

function RoomHeader({ selectedChat, onlineUsers, socket }: RoomHeaderProps) {
  console.log("RoomHeader selectedChat1:", selectedChat);
  // Refs для WebRTC
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // State для звонков
  const [callStatus, setCallStatus] = useState<string>("Готов к звонку");
  const [isCallActive, setIsCallActive] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // WebRTC variables
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const currentRoomRef = useRef<string | null>(null);

  const userStr = localStorage.getItem("user");
  const user: User | null = userStr ? JSON.parse(userStr) : null;

  // Update status message
  const updateCallStatus = (message: string) => {
    setCallStatus(message);
    console.log("Call Status:", message);
  };

  // Create peer connection for a specific user
  const createPeerConnection = (userId: string): RTCPeerConnection => {
    updateCallStatus(`Создание соединения с пользователем ${userId.slice(-6)}`);

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle remote stream
    pc.ontrack = (event: RTCTrackEvent) => {
      updateCallStatus(
        `✅ Получен аудиопоток от пользователя ${userId.slice(-6)}`,
      );
      const remoteStream = event.streams[0];
      if (remoteStream && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        setIsCallActive(true);
      }
    };

    // ICE candidates
    pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate && socket) {
        socket.emit("webrtc-signal", {
          // ← Используем переданный socket
          to: userId,
          signal: {
            type: "ice-candidate",
            candidate: event.candidate,
          } as WebRTCSignal,
        });
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      updateCallStatus(
        `Соединение с ${userId.slice(-6)}: ${pc.connectionState}`,
      );

      if (pc.connectionState === "connected") {
        setIsCallActive(true);
      } else if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed"
      ) {
        setIsCallActive(false);
      }
    };

    return pc;
  };

  // Create and send offer
  const createOffer = async (userId: string): Promise<void> => {
    if (peerConnectionsRef.current.has(userId)) {
      return; // Already connected
    }

    const pc = createPeerConnection(userId);
    peerConnectionsRef.current.set(userId, pc);

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket?.emit("webrtc-signal", {
        // ← Используем переданный socket
        to: userId,
        signal: {
          type: "offer",
          offer: offer,
        } as WebRTCSignal,
      });

      updateCallStatus(
        `📤 Отправлено предложение пользователю ${userId.slice(-6)}`,
      );
    } catch (error) {
      console.error("Error creating offer:", error);
      updateCallStatus(
        `❌ Ошибка создания предложения: ${(error as Error).message}`,
      );
    }
  };

  // Handle incoming signal
  const handleSignal = async (data: SocketSignalData): Promise<void> => {
    const { from, signal } = data;

    if (signal.type === "offer") {
      await handleOffer(from, signal.offer!);
    } else if (signal.type === "answer") {
      await handleAnswer(from, signal.answer!);
    } else if (signal.type === "ice-candidate") {
      await handleIceCandidate(from, signal.candidate!);
    }
  };

  // Handle incoming offer
  const handleOffer = async (
    from: string,
    offer: RTCSessionDescriptionInit,
  ): Promise<void> => {
    updateCallStatus(
      `📨 Получено предложение от пользователя ${from.slice(-6)}`,
    );

    let pc = peerConnectionsRef.current.get(from);
    if (!pc) {
      pc = createPeerConnection(from);
      peerConnectionsRef.current.set(from, pc);
    }

    try {
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket?.emit("webrtc-signal", {
        // ← Используем переданный socket
        to: from,
        signal: {
          type: "answer",
          answer: answer,
        } as WebRTCSignal,
      });

      updateCallStatus(`📤 Отправлен ответ пользователю ${from.slice(-6)}`);
    } catch (error) {
      console.error("Error handling offer:", error);
      updateCallStatus(
        `❌ Ошибка обработки предложения: ${(error as Error).message}`,
      );
    }
  };

  // Handle incoming answer
  const handleAnswer = async (
    from: string,
    answer: RTCSessionDescriptionInit,
  ): Promise<void> => {
    updateCallStatus(`📨 Получен ответ от пользователя ${from.slice(-6)}`);

    const pc = peerConnectionsRef.current.get(from);
    if (pc) {
      try {
        await pc.setRemoteDescription(answer);
        updateCallStatus(
          `✅ Соединение установлено с пользователем ${from.slice(-6)}`,
        );
      } catch (error) {
        console.error("Error handling answer:", error);
        updateCallStatus(
          `❌ Ошибка обработки ответа: ${(error as Error).message}`,
        );
      }
    }
  };

  // Handle ICE candidate
  const handleIceCandidate = async (
    from: string,
    candidate: RTCIceCandidate,
  ): Promise<void> => {
    const pc = peerConnectionsRef.current.get(from);
    if (pc) {
      try {
        await pc.addIceCandidate(candidate);
        updateCallStatus(
          `🧊 Обмен ICE-кандидатами с пользователем ${from.slice(-6)}`,
        );
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    }
  };

  // Setup socket listeners for WebRTC
  useEffect(() => {
    if (!socket) return;

    // Обработчики для WebRTC
    socket.on("users-in-room", (users: string[]) => {
      updateCallStatus(`👥 ${users.length} пользователей в комнате`);

      // Create offers for existing users
      users.forEach((userId) => {
        setTimeout(() => createOffer(userId), 1000);
      });
    });

    socket.on("user-joined", (userId: string) => {
      updateCallStatus(
        `🆕 Пользователь ${userId.slice(-6)} присоединился к комнате`,
      );
      createOffer(userId);
    });

    socket.on("user-left", (userId: string) => {
      updateCallStatus(`👋 Пользователь ${userId.slice(-6)} покинул комнату`);
      const pc = peerConnectionsRef.current.get(userId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(userId);
      }
    });

    socket.on("webrtc-signal", handleSignal);

    return () => {
      // Cleanup listeners
      socket.off("users-in-room");
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("webrtc-signal");
    };
  }, [socket]);

  // Join room for calls
  const joinCallRoom = async (): Promise<void> => {
    if (!selectedChat || !socket) {
      alert("Пожалуйста, выберите комнату и убедитесь в подключении");
      return;
    }

    const roomIdValue = selectedChat.chat.id;

    try {
      updateCallStatus("🎤 Запрос доступа к микрофону...");

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      localStreamRef.current = stream;
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
      }
      updateCallStatus("✅ Доступ к микрофону получен");

      // Используем существующий socket
      currentRoomRef.current = roomIdValue;

      // Присоединяемся к комнате звонков
      socket.emit("join-room", roomIdValue);
      setIsConnected(true);
      updateCallStatus("🔌 Подключено к комнате звонков");
    } catch (error) {
      console.error("Error joining room:", error);

      if ((error as Error).name === "NotAllowedError") {
        updateCallStatus("❌ Доступ к микрофону запрещен");
        alert(
          "Для аудиозвонков необходим доступ к микрофону. Пожалуйста, разрешите доступ в настройках браузера.",
        );
      } else {
        updateCallStatus(`❌ Ошибка: ${(error as Error).message}`);
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
    }
  };

  // Leave call room
  const leaveCallRoom = (): void => {
    updateCallStatus("Выход из комнаты...");

    // Close all peer connections
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Reset UI
    if (localAudioRef.current) {
      localAudioRef.current.srcObject = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    setIsConnected(false);
    setIsCallActive(false);
    currentRoomRef.current = null;

    updateCallStatus("Готов к звонку");
  };

  // Start audio call
  const startAudioCall = async (): Promise<void> => {
    if (!selectedChat || !socket) {
      alert("Пожалуйста, выберите комнату для звонка");
      return;
    }

    if (isConnected) {
      leaveCallRoom();
    } else {
      await joinCallRoom();
    }
  };

  // Start video call (заглушка)
  const startVideoCall = (): void => {
    alert("Видеозвонки пока не реализованы");
  };

  function getUserStatus(
  userId: string | null | undefined,
  lastOnline: string | null | undefined,
  onlineUsers: { userId: string; online: boolean }[]
): string {
  // 🔹 Проверяем, онлайн ли пользователь сейчас
  if (userId && onlineUsers.some((u) => u.userId === userId && u.online)) {
    return "в сети";
  }

  // 🔹 Если дата отсутствует
  if (!lastOnline) return "был(а) давно";

  // 🔹 Преобразуем timestamp (умножаем на 1000 если это секунды)
  let timestamp = Number(lastOnline);
  
  // Если timestamp маленький (в секундах), преобразуем в миллисекунды
  if (timestamp < 10000000000) {
    timestamp = timestamp * 1000;
  }
  
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "был(а) недавно";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return "в будущем 😅";

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const years = Math.floor(days / 365);

  if (years >= 1) {
    return "был(а) давно";
  } else if (days > 0) {
    return `был(а) ${days} ${declOfNum(days, ["день", "дня", "дней"])} назад`;
  } else if (hours > 0) {
    return `был(а) ${hours} ${declOfNum(hours, ["час", "часа", "часов"])} назад`;
  } else if (minutes > 0) {
    return `был(а) ${minutes} ${declOfNum(minutes, ["минуту", "минуты", "минут"])} назад`;
  } else {
    return "только что";
  }
}

// 🔹 Склонения числительных
function declOfNum(n: number, titles: [string, string, string]) {
  const cases = [2, 0, 1, 1, 1, 2];
  return titles[
    n % 100 > 4 && n % 100 < 20 ? 2 : cases[n % 10 < 5 ? n % 10 : 5]
  ];
}


  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveCallRoom();
    };
  }, []);

  // console.log("ChatHeader selectedChat:", selectedChat);
  // console.log("ChatHeader user:", user);
//   console.log(getUserStatus(
//   selectedChat?.type === "private" ? selectedChat.chat.user2?.id : undefined,
//   "1761503924", 
//   onlineUsers
// ))

  if (selectedChat?.type === "private")
    {
      if (selectedChat.chat.user1.id === user?.id) {
        console.log(selectedChat.chat.user2.lastOnline);
      } else {
        console.log(selectedChat.chat.user1.lastOnline);
      }
    } else {
      console.log("ChatHeader group:", selectedChat?.type)
    }

  return (
    <div className={styles.roomHeader}>
      {/* Левая часть - информация о чате */}
      <div className={styles.chatInfo}>
        <div className={styles.avatar}>
          <img
            src={
              selectedChat?.type === "private"
                ? selectedChat.chat.user1.id === user?.id
                  ? selectedChat.chat.user2.avatar?.url || DefaultGroupAvatar
                  : selectedChat.chat.user1.avatar?.url || DefaultGroupAvatar
                : selectedChat?.chat.avatar?.url || DefaultGroupAvatar
            }
            alt="Chat avatar"
            className={styles.avatarImage}
          />
        </div>
        <div className={styles.chatDetails}>
          <h2 className={styles.chatName}>
            {selectedChat?.type === "private"
              ? selectedChat.chat.user1.id === user?.id
                ? selectedChat.chat.user2.name
                : selectedChat.chat.user1.name
              : selectedChat?.chat.name}
          </h2>
          <div className={styles.onlineStatus}>
            {selectedChat?.type === "private" ? 
              selectedChat?.chat.user1.id === user?.id ? 
              (
                <span className={styles.statusText}>
                  {getUserStatus(selectedChat.chat.user2.id, selectedChat.chat.user2.lastOnline, onlineUsers)}
                </span>
              ) : (
                <span className={styles.statusText}>
                  {getUserStatus(selectedChat.chat.user1.id, selectedChat.chat.user1.lastOnline, onlineUsers)}
                </span>
              )
              : (
              <>
                <span className={styles.statusDot}></span>
                <span className={styles.statusText}>
                  {onlineUsers.filter((u) => u.online).length > 5
                    ? `${
                        onlineUsers.filter((u) => u.online).length
                      } участников онлайн`
                    : onlineUsers.filter((u) => u.online).length === 1
                      ? `${
                          onlineUsers.filter((u) => u.online).length
                        } участник онлайн`
                      : `${
                          onlineUsers.filter((u) => u.online).length
                        } участника онлайн`}
                </span>
              </>
            )}
          </div>
          {isCallActive && (
            <div className={styles.callStatus}>
              <span className={styles.callStatusText}>
                🔴 В звонке • {callStatus}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Правая часть - кнопки действий */}
      <div className={styles.actions}>
        <button
          className={`${styles.actionButton} ${
            isCallActive ? styles.activeCall : ""
          }`}
          title={isConnected ? "Завершить звонок" : "Аудиозвонок"}
          onClick={startAudioCall}
          disabled={!socket} // Отключаем если нет socket
        >
          <AudioIcon />
        </button>

        <button
          className={styles.actionButton}
          title="Видеозвонок"
          onClick={startVideoCall}
          disabled={!socket}
        >
          <VideoIcon />
        </button>

        <button className={styles.actionButton} title="Поиск в чате">
          <SearchIcon />
        </button>

        <button className={styles.actionButton} title="Меню">
          <MenuIcon />
        </button>
      </div>

      {/* Скрытые аудио элементы для звонков */}
      <audio ref={localAudioRef} autoPlay muted style={{ display: "none" }} />
      <audio ref={remoteAudioRef} autoPlay style={{ display: "none" }} />
    </div>
  );
}

export default RoomHeader;
