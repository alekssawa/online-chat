import { useCallback, useEffect, useRef, useState } from 'react'
import socketIOClient from 'socket.io-client'
import styles from './ChatPage.module.css'

import ChatsList from '../../components/chatsList/ChatsList'
import MessageView from '../../components/messageView/MessageView'
import UserList from '../../components/usersList/UserList'

import type { OnlineUser, SelectedChat, User } from '../../components/type'
import UserInfoPanel from '../../components/userInfoPanel/UserInfoPanel'
import { useMatchMedia } from '../../utils/useMatchMedia'

export type TSocket = ReturnType<typeof socketIOClient>

function ChatRoom() {
	const [selectedChat, setSelectedChat] = useState<SelectedChat | null>(null)
	const [selectedUser, setSelectedUser] = useState<User | null>(null)
	const [loading, setLoading] = useState(true)
	const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
	const [, /*error*/ setError] = useState<string | null>(null)
	const [isUserPageOpen, setIsUserPageOpen] = useState(false)
	const { isMobile, isTablet, isDesktop } = useMatchMedia()
	const containerRef = useRef<HTMLDivElement>(null)

	const socketRef = useRef<TSocket | null>(null)
	const [isSocketConnected, setIsSocketConnected] = useState(false)

	const user: User | null = JSON.parse(localStorage.getItem('user') || 'null')

	useEffect(() => {
		if (isMobile) {
			console.log('isMobile true')
		} else if (isTablet) {
			console.log('isTablet true')
		} else if (isDesktop) {
			console.log('isDesktop true')
		}
	}, [isDesktop, isMobile, isTablet])

	if (!socketRef.current && user) {
		const socket = socketIOClient(`${import.meta.env.VITE_URL_BACKEND}`, {
			auth: { token: localStorage.getItem('accessToken'), userId: user.id },
		})
		socketRef.current = socket

		socket.on('connect', () => setIsSocketConnected(true))
		socket.on('disconnect', () => setIsSocketConnected(false))

		socket.on('onlineUsersList', (users: OnlineUser[]) => setOnlineUsers(users))

		socket.on('userStatusChanged', (status: OnlineUser) =>
			setOnlineUsers(prev => {
				const filtered = prev.filter(u => u.userId !== status.userId)
				return [...filtered, status]
			})
		)
	}

	const [updateChatLastMessage, setUpdateChatLastMessage] = useState<
		(chatId: string, newMessage: { text: string; senderName?: string }) => void
	>(() => () => {})

	const handleUpdateFunction = useCallback(
		(
			updateFn: (
				chatId: string,
				newMessage: { text: string; senderName?: string }
			) => void
		) => {
			setUpdateChatLastMessage(() => updateFn)
		},
		[]
	)

	// console.log("Selected Room:", selectedRoom);
	// console.log("selectedUser:", selectedUser);

	return (
		<div className={styles.container}>
			{loading && (
				<div className={styles.loading}>
					<div className={styles.loader}></div>
					<div className={styles.loadingText}>Connecting to server...</div>
					{/* {error && <div className={styles.error}>Error: {error}</div>} */}
				</div>
			)}

			<>
				{(!isMobile || (isMobile && !selectedChat)) && (
					<ChatsList
						containerRef={containerRef}
						setSelectedChat={setSelectedChat}
						setIsUserPageOpen={setIsUserPageOpen}
						loading={loading}
						setLoading={setLoading}
						setError={setError}
						SetUpdateFunction={handleUpdateFunction}
					/>
				)}

				{selectedChat && (
					<>
						<MessageView
							socketRef={socketRef}
							isSocketConnected={isSocketConnected}
							selectedChat={selectedChat}
							setSelectedChat={setSelectedChat}
							onlineUsers={onlineUsers}
							updateChatLastMessage={updateChatLastMessage}
						/>

						{isUserPageOpen || selectedChat?.type === 'private' ? (
							<UserInfoPanel
								selectedChat={selectedChat}
								selectedUser={selectedUser}
								setIsUserPageOpen={setIsUserPageOpen}
								onlineUsers={onlineUsers}
							/>
						) : (
							<UserList
								selectedChat={selectedChat}
								loading={loading}
								onlineUsers={onlineUsers}
								setSelectedUser={setSelectedUser}
								setIsUserPageOpen={setIsUserPageOpen}
							/>
						)}
					</>
				)}
			</>
		</div>
	)
}

export default ChatRoom
