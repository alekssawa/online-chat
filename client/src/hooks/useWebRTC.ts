// useWebRTC.tsx
import { useRef, useEffect, useCallback } from "react";
import { Socket } from "socket.io-client";

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

interface useWebRTCProps {
  socket: typeof Socket | null;
  roomId: string | null;
  currentUserId: string;
  onCallStatusChange: (status: string) => void;
  onCallActiveChange: (active: boolean) => void;
  onConnectedChange: (connected: boolean) => void;
}

export function useWebRTC({
  socket,
  roomId,
  currentUserId,
  onCallStatusChange,
  onCallActiveChange,
  onConnectedChange,
}: useWebRTCProps) {
  // Refs для WebRTC
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // WebRTC variables
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const currentRoomRef = useRef<string | null>(null);

  // Update status message
  const updateCallStatus = useCallback(
    (message: string) => {
      onCallStatusChange(message);
      console.log("Call Status:", message);
    },
    [onCallStatusChange]
  );

  // Create peer connection for a specific user
  const createPeerConnection = useCallback(
    (userId: string): RTCPeerConnection => {
      updateCallStatus(
        `Создание соединения с пользователем ${userId.slice(-6)}`
      );

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
          `✅ Получен аудиопоток от пользователя ${userId.slice(-6)}`
        );
        const remoteStream = event.streams[0];
        if (remoteStream && remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          onCallActiveChange(true);
        }
      };

      // ICE candidates
      pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
        if (event.candidate && socket) {
          socket.emit("webrtc-signal", {
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
          `Соединение с ${userId.slice(-6)}: ${pc.connectionState}`
        );

        if (pc.connectionState === "connected") {
          onCallActiveChange(true);
        } else if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed"
        ) {
          onCallActiveChange(false);
        }
      };

      return pc;
    },
    [socket, updateCallStatus, onCallActiveChange]
  );

  // Handle incoming offer
  const handleOffer = useCallback(
    async (from: string, offer: RTCSessionDescriptionInit): Promise<void> => {
      updateCallStatus(
        `📨 Получено предложение от пользователя ${from.slice(-6)}`
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
          `❌ Ошибка обработки предложения: ${(error as Error).message}`
        );
      }
    },
    [socket, createPeerConnection, updateCallStatus]
  );

  // Handle incoming answer
  const handleAnswer = useCallback(
    async (from: string, answer: RTCSessionDescriptionInit): Promise<void> => {
      updateCallStatus(`📨 Получен ответ от пользователя ${from.slice(-6)}`);

      const pc = peerConnectionsRef.current.get(from);
      if (pc) {
        try {
          await pc.setRemoteDescription(answer);
          updateCallStatus(
            `✅ Соединение установлено с пользователем ${from.slice(-6)}`
          );
        } catch (error) {
          console.error("Error handling answer:", error);
          updateCallStatus(
            `❌ Ошибка обработки ответа: ${(error as Error).message}`
          );
        }
      }
    },
    [updateCallStatus]
  );

  // Handle ICE candidate
  const handleIceCandidate = useCallback(
    async (from: string, candidate: RTCIceCandidate): Promise<void> => {
      const pc = peerConnectionsRef.current.get(from);
      if (pc) {
        try {
          await pc.addIceCandidate(candidate);
          updateCallStatus(
            `🧊 Обмен ICE-кандидатами с пользователем ${from.slice(-6)}`
          );
        } catch (error) {
          console.error("Error adding ICE candidate:", error);
        }
      }
    },
    [updateCallStatus]
  );

  // Handle incoming signal
  const handleSignal = useCallback(
    async (data: SocketSignalData): Promise<void> => {
      const { from, signal } = data;

      // Игнорируем сигналы от самого себя
      if (from === currentUserId) {
        console.log("Ignoring signal from self");
        return;
      }

      if (signal.type === "offer") {
        await handleOffer(from, signal.offer!);
      } else if (signal.type === "answer") {
        await handleAnswer(from, signal.answer!);
      } else if (signal.type === "ice-candidate") {
        await handleIceCandidate(from, signal.candidate!);
      }
    },
    [currentUserId, handleOffer, handleAnswer, handleIceCandidate]
  );

  // Create and send offer
  const createOffer = useCallback(
    async (userId: string): Promise<void> => {
      // Пропускаем создание оффера для самого себя
      if (userId === currentUserId) {
        console.log("Skipping offer to self");
        return;
      }

      if (peerConnectionsRef.current.has(userId)) {
        console.log(`Already connected to ${userId.slice(-6)}`);
        return; // Already connected
      }

      const pc = createPeerConnection(userId);
      peerConnectionsRef.current.set(userId, pc);

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket?.emit("webrtc-signal", {
          to: userId,
          signal: {
            type: "offer",
            offer: offer,
          } as WebRTCSignal,
        });

        updateCallStatus(
          `📤 Отправлено предложение пользователю ${userId.slice(-6)}`
        );
      } catch (error) {
        console.error("Error creating offer:", error);
        updateCallStatus(
          `❌ Ошибка создания предложения: ${(error as Error).message}`
        );
      }
    },
    [socket, createPeerConnection, updateCallStatus, currentUserId]
  );

  // Setup socket listeners for WebRTC
  useEffect(() => {
    if (!socket) return;

    // Обработчики для WebRTC
    socket.on("users-in-room", (users: string[]) => {
      updateCallStatus(`👥 ${users.length} пользователей в комнате`);

      // Create offers for existing users (excluding self)
      users.forEach((userId) => {
        if (userId !== currentUserId) {
          setTimeout(() => createOffer(userId), 1000);
        }
      });
    });

    socket.on("user-joined", (userId: string) => {
      // Игнорируем себя
      if (userId === currentUserId) return;
      
      updateCallStatus(
        `🆕 Пользователь ${userId.slice(-6)} присоединился к комнате`
      );
      createOffer(userId);
    });

    socket.on("user-left", (userId: string) => {
      // Игнорируем себя
      if (userId === currentUserId) return;
      
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
  }, [socket, createOffer, handleSignal, updateCallStatus, currentUserId]);

  // Join room for calls
  const joinCallRoom = useCallback(async (): Promise<void> => {
    if (!roomId || !socket) {
      alert("Пожалуйста, выберите комнату и убедитесь в подключении");
      return;
    }

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

      currentRoomRef.current = roomId;

      // Присоединяемся к комнате звонков
      socket.emit("join-room", roomId);
      onConnectedChange(true);
      updateCallStatus("🔌 Подключено к комнате звонков");
    } catch (error) {
      console.error("Error joining room:", error);

      if ((error as Error).name === "NotAllowedError") {
        updateCallStatus("❌ Доступ к микрофону запрещен");
        alert(
          "Для аудиозвонков необходим доступ к микрофону. Пожалуйста, разрешите доступ в настройках браузера."
        );
      } else {
        updateCallStatus(`❌ Ошибка: ${(error as Error).message}`);
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
    }
  }, [roomId, socket, updateCallStatus, onConnectedChange]);

  // Leave call room
  const leaveCallRoom = useCallback((): void => {
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

    onConnectedChange(false);
    onCallActiveChange(false);
    currentRoomRef.current = null;

    updateCallStatus("Готов к звонку");
  }, [updateCallStatus, onConnectedChange, onCallActiveChange]);

  // Start audio call
  const startAudioCall = useCallback(async (): Promise<void> => {
    if (!roomId || !socket) {
      alert("Пожалуйста, выберите комнату для звонка");
      return;
    }

    if (currentRoomRef.current) {
      leaveCallRoom();
    } else {
      await joinCallRoom();
    }
  }, [roomId, socket, joinCallRoom, leaveCallRoom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveCallRoom();
    };
  }, [leaveCallRoom]);

  // Экспортируем методы для использования в родительском компоненте
  return {
    startAudioCall,
    leaveCallRoom,
    isConnected: !!currentRoomRef.current,
    localAudioRef,
    remoteAudioRef,
  };
}