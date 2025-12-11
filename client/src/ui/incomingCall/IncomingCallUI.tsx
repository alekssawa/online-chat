import { useEffect, useRef } from 'react'
import AcceptCall from '../../assets/icons/AcceptCall.svg?react'
import DeclineCall from '../../assets/icons/DeclineCall.svg?react'
import DefaultUserAvatar from '../../assets/icons/DefaultUserAvatar.svg?react'

import incomingCallSound from '../../assets/sounds/Incoming_call.mp3'

import type { SelectedChat, User } from '../../components/type'
import type { IncomingCall } from '../../hooks/useWebRTC'
import styles from './IncomingCallUI.module.css'

interface IncomingCallProps {
	incomingCall: IncomingCall
	selectedChat: SelectedChat | null
	handleAcceptCall: () => void
	handleRejectCall: () => void
}

function IncomingCallUI({
	incomingCall,
	selectedChat,
	handleAcceptCall,
	handleRejectCall,
}: IncomingCallProps) {
	const user: User | null = JSON.parse(localStorage.getItem('user') || 'null')
	const audioRef = useRef<HTMLAudioElement | null>(null)

	useEffect(() => {
		const audioEl = audioRef.current // Сохраняем текущее значение ref

		if (incomingCall && audioEl) {
			audioEl.play().catch(err => {
				console.warn('Не удалось воспроизвести звук:', err)
			})
		}

		return () => {
			if (audioEl) {
				audioEl.pause()
				audioEl.currentTime = 0
			}
		}
	}, [incomingCall])

	return (
		<div className={styles.incomingCallModal}>
			<audio ref={audioRef} src={incomingCallSound} loop />
			<div className={styles.incomingCallContent}>
				<div className={styles.incomingCallHeader}>
					<div className={styles.callerInfo}>
						{selectedChat?.type === 'private' ? (
							selectedChat.chat.user1.id === user?.id ? (
								selectedChat.chat.user2.avatar ? (
									<img
										className={styles.user_avatar}
										src={selectedChat.chat.user2.avatar?.url}
									/>
								) : (
									<DefaultUserAvatar
										className={`${styles.user_avatar} ${styles.defaultAvatar}`}
									/>
								)
							) : selectedChat.chat.user1.avatar ? (
								<img
									className={styles.user_avatar}
									src={selectedChat.chat.user1.avatar?.url}
								/>
							) : (
								<DefaultUserAvatar
									className={`${styles.user_avatar} ${styles.defaultAvatar}`}
								/>
							)
						) : (
							selectedChat?.chat.name
						)}

						<span className={styles.callerName}>{incomingCall.callerName}</span>
						<span className={styles.callType}>is calling you...</span>
					</div>
				</div>

				<div className={styles.incomingCallActions}>
					<div className={styles.callButtonsRow}>
						<div className={styles.circleButtonWrapper}>
							<button
								className={`${styles.circleButton} ${styles.rejectBtn}`}
								onClick={handleRejectCall}
							>
								<DeclineCall />
							</button>
							<span className={styles.buttonLabel}>Decline</span>
						</div>

						<div className={styles.circleButtonWrapper}>
							<button
								className={`${styles.circleButton} ${styles.acceptBtn}`}
								onClick={handleAcceptCall}
							>
								<AcceptCall />
							</button>
							<span className={styles.buttonLabel}>Accept</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export default IncomingCallUI
