import { useState } from 'react'
import IncomingCallUI from '../../../ui/incomingCall/IncomingCallUI'
import styles from './ChatHeader.module.css'

import { Socket } from 'socket.io-client'
import ArrowLeft from '../../../assets/icons/ArrowLeft.svg?react'
import AudioIcon from '../../../assets/icons/audioIcon.svg?react'
import MenuIcon from '../../../assets/icons/menuIcon.svg?react'
import SearchIcon from '../../../assets/icons/searchIcon.svg?react'
import VideoIcon from '../../../assets/icons/videoIcon.svg?react'
import { useWebRTC } from '../../../hooks/useWebRTC'
import { useChatStore, useSelectedChat } from '../../../store/useChatStore'
import { useMatchMedia } from '../../../utils/useMatchMedia'
import type { User } from '../../type'

interface RoomHeaderProps {
	onlineUsers: { userId: string; online: boolean }[]
	socket: typeof Socket | null
}

function RoomHeader({ onlineUsers, socket }: RoomHeaderProps) {
	const [callStatus, setCallStatus] = useState<string>('Готов к звонку')
	const [isCallActive, setIsCallActive] = useState<boolean>(false)
	const [isConnected, setIsConnected] = useState<boolean>(false)
	const { isMobile } = useMatchMedia()
	const selectedChat = useSelectedChat()
	const setSelectedChatId = useChatStore(s => s.setSelectedChatId)
	// const userStr =
	const user: User | null = JSON.parse(localStorage.getItem('user') || 'null')

	// Получаем ID собеседника для приватных чатов
	const getTargetUserId = (): string | null => {
		if (!selectedChat || selectedChat.type !== 'private' || !user) return null

		if (selectedChat.chat.user1.id === user.id) {
			return selectedChat.chat.user2.id
		} else {
			return selectedChat.chat.user1.id
		}
	}

	// Используем WebRTC менеджер
	const {
		startAudioCall,
		initiateCall,
		acceptCall,
		rejectCall,
		endCall,
		incomingCall,
		isCallInitiator,
		localAudioRef,
		remoteAudioRef,
	} = useWebRTC({
		socket,
		roomId: selectedChat?.chat.id || null,
		currentUserId: user?.id || '',
		onCallStatusChange: setCallStatus,
		onCallActiveChange: setIsCallActive,
		onConnectedChange: setIsConnected,
	})

	// Start video call (заглушка)
	const startVideoCall = (): void => {
		alert('Видеозвонки пока не реализованы')
	}

	// Обработчик начала аудиозвонка
	const handleAudioCall = async (): Promise<void> => {
		if (!selectedChat || !socket) {
			alert('Пожалуйста, выберите чат для звонка')
			return
		}

		if (isConnected) {
			// Если уже в звонке - завершаем
			endCall()
		} else {
			// Начинаем новый звонок
			if (selectedChat.type === 'private') {
				const targetUserId = getTargetUserId()
				if (targetUserId) {
					await initiateCall(targetUserId, 'audio')
				} else {
					alert('Не удалось определить собеседника')
				}
			} else {
				// Для групповых чатов используем старую логику
				await startAudioCall()
			}
		}
	}

	// Принять входящий звонок
	const handleAcceptCall = async (): Promise<void> => {
		await acceptCall()
	}

	// Отклонить входящий звонок
	const handleRejectCall = (): void => {
		rejectCall('Отклонено пользователем')
	}

	const handleSelectChat = (): void => {
		setSelectedChatId(null)
	}

	function getUserStatus(
		userId: string | null | undefined,
		lastOnline: string | null | undefined,
		onlineUsers: { userId: string; online: boolean }[]
	): string {
		// 🔹 Проверяем, онлайн ли пользователь сейчас
		if (userId && onlineUsers.some(u => u.userId === userId && u.online)) {
			return 'в сети'
		}

		// 🔹 Если дата отсутствует
		if (!lastOnline) return 'был(а) давно'

		// 🔹 Преобразуем timestamp (умножаем на 1000 если это секунды)
		let timestamp = Number(lastOnline)

		// Если timestamp маленький (в секундах), преобразуем в миллисекунды
		if (timestamp < 10000000000) {
			timestamp = timestamp * 1000
		}

		const date = new Date(Number(timestamp))
		if (isNaN(date.getTime())) return 'был(а) недавно'

		const now = new Date()
		const diffMs = now.getTime() - date.getTime()
		if (diffMs < 0) return 'в будущем 😅'

		const minutes = Math.floor(diffMs / (1000 * 60))
		const hours = Math.floor(minutes / 60)
		const days = Math.floor(hours / 24)
		const years = Math.floor(days / 365)

		if (years >= 1) {
			return 'был(а) давно'
		} else if (days > 0) {
			return `был(а) ${days} ${declOfNum(days, ['день', 'дня', 'дней'])} назад`
		} else if (hours > 0) {
			return `был(а) ${hours} ${declOfNum(hours, [
				'час',
				'часа',
				'часов',
			])} назад`
		} else if (minutes > 0) {
			return `был(а) ${minutes} ${declOfNum(minutes, [
				'минуту',
				'минуты',
				'минут',
			])} назад`
		} else {
			return 'только что'
		}
	}

	// 🔹 Склонения числительных
	function declOfNum(n: number, titles: [string, string, string]) {
		const cases = [2, 0, 1, 1, 1, 2]
		return titles[
			n % 100 > 4 && n % 100 < 20 ? 2 : cases[n % 10 < 5 ? n % 10 : 5]
		]
	}

	return (
		<div className={styles.roomHeader}>
			{/* Левая часть - информация о чате */}
			<div className={styles.chatInfo}>
				{isMobile && (
					<div className={styles.menuIcon} onClick={handleSelectChat}>
						<ArrowLeft />
					</div>
				)}
				<div className={styles.chatDetails}>
					<h2 className={styles.chatName}>
						{selectedChat?.type === 'private'
							? selectedChat.chat.user1.id === user?.id
								? selectedChat.chat.user2.name
								: selectedChat.chat.user1.name
							: selectedChat?.chat.name}
					</h2>
					<div className={styles.onlineStatus}>
						{selectedChat?.type === 'private' ? (
							selectedChat?.chat.user1.id === user?.id ? (
								<span className={styles.statusText}>
									{getUserStatus(
										selectedChat.chat.user2.id,
										selectedChat.chat.user2.lastOnline,
										onlineUsers
									)}
								</span>
							) : (
								<span className={styles.statusText}>
									{getUserStatus(
										selectedChat.chat.user1.id,
										selectedChat.chat.user1.lastOnline,
										onlineUsers
									)}
								</span>
							)
						) : (
							<>
								<span className={styles.statusText}>
									{selectedChat?.chat?.users &&
									selectedChat.chat.users.length > 5
										? `${selectedChat?.chat.users?.length} участников, ${
												onlineUsers.filter(u => u.online).length
										  } в сети`
										: selectedChat?.chat.users?.length === 1
										? `${selectedChat?.chat.users?.length} участник, ${
												onlineUsers.filter(u => u.online).length
										  } в сети`
										: `${selectedChat?.chat.users?.length} участника, ${
												onlineUsers.filter(u => u.online).length
										  } в сети`}
								</span>
							</>
						)}
					</div>

					{/* Статус звонка */}
					{isCallActive && (
						<div className={styles.callStatus}>
							<span className={styles.callStatusText}>
								🔴 В звонке • {callStatus}
							</span>
						</div>
					)}

					{/* Статус ожидания ответа */}
					{isCallInitiator && !isCallActive && (
						<div className={styles.callStatus}>
							<span className={styles.callStatusText}>
								🕐 Ожидание ответа... • {callStatus}
							</span>
						</div>
					)}
				</div>
			</div>

			{/* Правая часть - кнопки действий */}
			<div className={styles.actions}>
				<button
					className={`${styles.actionButton} ${
						isCallActive ? styles.activeCall : ''
					} ${isCallInitiator ? styles.pendingCall : ''}`}
					title={isConnected ? 'Завершить звонок' : 'Аудиозвонок'}
					onClick={handleAudioCall}
					disabled={!socket || !!incomingCall}
				>
					<AudioIcon />
				</button>

				<button
					className={styles.actionButton}
					title='Видеозвонок'
					onClick={startVideoCall}
					disabled={!socket || !!incomingCall}
				>
					<VideoIcon />
				</button>

				<button
					className={styles.actionButton}
					title='Поиск в чате'
					disabled={!!incomingCall}
				>
					<SearchIcon />
				</button>

				<button
					className={styles.actionButton}
					title='Меню'
					disabled={!!incomingCall}
				>
					<MenuIcon />
				</button>
			</div>

			{/* Модальное окно входящего звонка */}
			{incomingCall && (
				<IncomingCallUI
					incomingCall={incomingCall}
					selectedChat={selectedChat}
					handleAcceptCall={handleAcceptCall}
					handleRejectCall={handleRejectCall}
				/>
			)}

			{/* Скрытые аудио элементы для звонков */}
			<audio ref={localAudioRef} autoPlay muted style={{ display: 'none' }} />
			<audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />
		</div>
	)
}

export default RoomHeader
