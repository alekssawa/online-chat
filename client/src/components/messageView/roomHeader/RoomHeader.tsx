import React, { useState, useRef, useEffect } from 'react';
import styles from "./RoomHeader.module.css";
import DefaultGroupAvatar from "../../../assets/icons/DefaultGroupAvatar.svg";
import type { FullRoom } from "../../type";
import { io, Socket } from 'socket.io-client';

interface RoomHeaderProps {
  selectedRoom: FullRoom | null;
  onlineUsers: { userId: string; online: boolean }[];
}

// WebRTC interfaces
interface WebRTCSignal {
  type: 'offer' | 'answer' | 'ice-candidate';
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidate;
}

interface SocketSignalData {
  from: string;
  signal: WebRTCSignal;
}

function RoomHeader({ selectedRoom, onlineUsers }: RoomHeaderProps) {
  // Refs для WebRTC
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  
  // State для звонков
  const [callStatus, setCallStatus] = useState<string>('Готов к звонку');
  const [isCallActive, setIsCallActive] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // WebRTC variables (using refs to avoid re-renders)
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const socketRef = useRef<typeof Socket | null>(null);
  const currentRoomRef = useRef<string | null>(null);

  // Update status message
  const updateCallStatus = (message: string) => {
    setCallStatus(message);
    console.log('Call Status:', message);
  };

  // Create peer connection for a specific user
  const createPeerConnection = (userId: string): RTCPeerConnection => {
    updateCallStatus(`Создание соединения с пользователем ${userId.slice(-6)}`);
    
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle remote stream
    pc.ontrack = (event: RTCTrackEvent) => {
      updateCallStatus(`✅ Получен аудиопоток от пользователя ${userId.slice(-6)}`);
      const remoteStream = event.streams[0];
      if (remoteStream && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        setIsCallActive(true);
      }
    };

    // ICE candidates
    pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('webrtc-signal', {
          to: userId,
          signal: {
            type: 'ice-candidate',
            candidate: event.candidate
          } as WebRTCSignal
        });
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      updateCallStatus(`Соединение с ${userId.slice(-6)}: ${pc.connectionState}`);
      
      if (pc.connectionState === 'connected') {
        setIsCallActive(true);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
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
      
      socketRef.current?.emit('webrtc-signal', {
        to: userId,
        signal: {
          type: 'offer',
          offer: offer
        } as WebRTCSignal
      });
      
      updateCallStatus(`📤 Отправлено предложение пользователю ${userId.slice(-6)}`);
    } catch (error) {
      console.error('Error creating offer:', error);
      updateCallStatus(`❌ Ошибка создания предложения: ${(error as Error).message}`);
    }
  };

  // Handle incoming signal
  const handleSignal = async (data: SocketSignalData): Promise<void> => {
    const { from, signal } = data;
    
    if (signal.type === 'offer') {
      await handleOffer(from, signal.offer!);
    } else if (signal.type === 'answer') {
      await handleAnswer(from, signal.answer!);
    } else if (signal.type === 'ice-candidate') {
      await handleIceCandidate(from, signal.candidate!);
    }
  };

  // Handle incoming offer
  const handleOffer = async (from: string, offer: RTCSessionDescriptionInit): Promise<void> => {
    updateCallStatus(`📨 Получено предложение от пользователя ${from.slice(-6)}`);
    
    let pc = peerConnectionsRef.current.get(from);
    if (!pc) {
      pc = createPeerConnection(from);
      peerConnectionsRef.current.set(from, pc);
    }

    try {
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      socketRef.current?.emit('webrtc-signal', {
        to: from,
        signal: {
          type: 'answer',
          answer: answer
        } as WebRTCSignal
      });
      
      updateCallStatus(`📤 Отправлен ответ пользователю ${from.slice(-6)}`);
    } catch (error) {
      console.error('Error handling offer:', error);
      updateCallStatus(`❌ Ошибка обработки предложения: ${(error as Error).message}`);
    }
  };

  // Handle incoming answer
  const handleAnswer = async (from: string, answer: RTCSessionDescriptionInit): Promise<void> => {
    updateCallStatus(`📨 Получен ответ от пользователя ${from.slice(-6)}`);
    
    const pc = peerConnectionsRef.current.get(from);
    if (pc) {
      try {
        await pc.setRemoteDescription(answer);
        updateCallStatus(`✅ Соединение установлено с пользователем ${from.slice(-6)}`);
      } catch (error) {
        console.error('Error handling answer:', error);
        updateCallStatus(`❌ Ошибка обработки ответа: ${(error as Error).message}`);
      }
    }
  };

  // Handle ICE candidate
  const handleIceCandidate = async (from: string, candidate: RTCIceCandidate): Promise<void> => {
    const pc = peerConnectionsRef.current.get(from);
    if (pc) {
      try {
        await pc.addIceCandidate(candidate);
        updateCallStatus(`🧊 Обмен ICE-кандидатами с пользователем ${from.slice(-6)}`);
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    }
  };

  // Join room for calls
  const joinCallRoom = async (): Promise<void> => {
    if (!selectedRoom) {
      alert('Пожалуйста, выберите комнату');
      return;
    }

    const roomIdValue = selectedRoom.id;
    
    try {
      updateCallStatus('🎤 Запрос доступа к микрофону...');
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false 
      });
      
      localStreamRef.current = stream;
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
      }
      updateCallStatus('✅ Доступ к микрофону получен');

      // Connect to signaling server (замените на ваш URL сервера)
      const socket = io('http://localhost:5000');
      socketRef.current = socket;
      currentRoomRef.current = roomIdValue;

      // Socket event handlers
      socket.on('connect', () => {
        updateCallStatus('🔌 Подключено к серверу сигнализации');
        socket.emit('join-room', roomIdValue);
        setIsConnected(true);
      });

      socket.on('users-in-room', (users: string[]) => {
        updateCallStatus(`👥 ${users.length} пользователей в комнате`);
        
        // Create offers for existing users
        users.forEach(userId => {
          setTimeout(() => createOffer(userId), 1000);
        });
      });

      socket.on('user-joined', (userId: string) => {
        updateCallStatus(`🆕 Пользователь ${userId.slice(-6)} присоединился к комнате`);
        createOffer(userId);
      });

      socket.on('user-left', (userId: string) => {
        updateCallStatus(`👋 Пользователь ${userId.slice(-6)} покинул комнату`);
        const pc = peerConnectionsRef.current.get(userId);
        if (pc) {
          pc.close();
          peerConnectionsRef.current.delete(userId);
        }
      });

      socket.on('webrtc-signal', handleSignal);

      socket.on('disconnect', () => {
        updateCallStatus('❌ Отключено от сервера сигнализации');
        setIsConnected(false);
        setIsCallActive(false);
      });

    } catch (error) {
      console.error('Error joining room:', error);
      
      if ((error as Error).name === 'NotAllowedError') {
        updateCallStatus('❌ Доступ к микрофону запрещен');
        alert('Для аудиозвонков необходим доступ к микрофону. Пожалуйста, разрешите доступ в настройках браузера.');
      } else {
        updateCallStatus(`❌ Ошибка: ${(error as Error).message}`);
      }
      
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
    }
  };

  // Leave call room
  const leaveCallRoom = (): void => {
    updateCallStatus('Выход из комнаты...');
    
    // Close all peer connections
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    // Disconnect from server
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
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
    
    updateCallStatus('Готов к звонку');
  };

  // Start audio call
  const startAudioCall = async (): Promise<void> => {
    if (!selectedRoom) {
      alert('Пожалуйста, выберите комнату для звонка');
      return;
    }

    if (isConnected) {
      leaveCallRoom();
    } else {
      await joinCallRoom();
    }
  };

  // Start video call (заглушка - можно реализовать аналогично)
  const startVideoCall = (): void => {
    alert('Видеозвонки пока не реализованы');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveCallRoom();
    };
  }, []);

  return (
    <div className={styles.roomHeader}>
      {/* Левая часть - информация о чате */}
      <div className={styles.chatInfo}>
        <div className={styles.avatar}>
          <img 
            src={selectedRoom?.avatar ? selectedRoom.avatar.url: DefaultGroupAvatar}
            alt="Chat avatar" 
            className={styles.avatarImage}
          />
        </div>
        <div className={styles.chatDetails}>
          <h2 className={styles.chatName}>{selectedRoom?.name}</h2>
          <div className={styles.onlineStatus}>
            <span className={styles.statusDot}></span>
            <span className={styles.statusText}>
              {onlineUsers.length > 5 ? 
                `${onlineUsers.length +' участников онлайн'}`: 
                onlineUsers.length === 1 ? 
                  `${onlineUsers.length +' участник онлайн'}`:
                  `${onlineUsers.length +' участника онлайн'}`}
            </span>
          </div>
          {isCallActive && (
            <div className={styles.callStatus}>
              <span className={styles.callStatusText}>🔴 В звонке • {callStatus}</span>
            </div>
          )}
        </div>
      </div>

      {/* Правая часть - кнопки действий */}
      <div className={styles.actions}>
        <button 
          className={`${styles.actionButton} ${isCallActive ? styles.activeCall : ''}`} 
          title={isConnected ? "Завершить звонок" : "Аудиозвонок"}
          onClick={startAudioCall}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
          </svg>
        </button>
        
        <button 
          className={styles.actionButton} 
          title="Видеозвонок"
          onClick={startVideoCall}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
          </svg>
        </button>
        
        <button className={styles.actionButton} title="Поиск в чате">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
        </button>
        
        <button className={styles.actionButton} title="Меню">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
          </svg>
        </button>
      </div>

      {/* Скрытые аудио элементы для звонков */}
      <audio ref={localAudioRef} autoPlay muted style={{ display: 'none' }} />
      <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />
    </div>
  );
}

export default RoomHeader;