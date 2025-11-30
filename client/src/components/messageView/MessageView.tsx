import { useEffect, useRef, useState } from 'react'
import { type TSocket } from '../../pages/ChatPage/ChatPage'

import styles from './MessageView.module.css'
import MessageBox from './messageBox/MessageBox'
import SendMessage from './sendMessage/SendMessage'

import type { Message, OnlineUser, SelectedChat, User } from '../type'
import ChatHeader from './chatHeader/ChatHeader'
// import { c } from "@apollo/client/react/internal/compiler-runtime";

interface MessageViewProps {
	socketRef: React.RefObject<TSocket | null>
	isSocketConnected: boolean
	selectedChat: SelectedChat | null
	onlineUsers: OnlineUser[]
	updateChatLastMessage: (
		chatId: string,
		newMessage: { text: string; senderName?: string }
	) => void
}

interface MessageGroup {
	date: string
	messages: Message[]
}

function MessageView({
	socketRef,
	isSocketConnected,
	selectedChat,
	onlineUsers,
	updateChatLastMessage,
}: MessageViewProps) {
	const [messages, setMessages] = useState<Message[]>([])

	// const socketRef = useRef<ReturnType<typeof socketIOClient> | null>(null)
	const messagesEndRef = useRef<HTMLDivElement>(null)

	const userStr = localStorage.getItem('user')
	const user: User | null = userStr ? JSON.parse(userStr) : null

	const chatId = selectedChat?.chat.id ?? null

	// console.log("MessageView selectedChat:", selectedChat);

	// Прокрутка вниз при новых сообщениях
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages])

	// Загрузка начальных сообщений
	useEffect(() => {
		if (!selectedChat) {
			setMessages([])
			return
		}

		const initialMessages: Message[] = selectedChat.chat.messages.map(m => ({
			id: m.id,
			text: m.text,
			senderId: m.sender?.id ?? '',
			chatId,
			sentAt: m.sentAt,
			updatedAt: m.updatedAt,
			sender: m.sender
				? { id: m.sender.id, name: m.sender.name, email: m.sender.email }
				: { id: '', name: 'Unknown', email: '' },
			privateChatId:
				selectedChat.type === 'private' ? selectedChat.chat.id : null,
			groupId: selectedChat.type === 'group' ? selectedChat.chat.id : null,
		}))

		setMessages(initialMessages)
	}, [selectedChat])

	// Подключение Socket.IO
	useEffect(() => {
		if (!chatId || !user || !selectedChat?.type) return

		const socket = socketRef.current
		if (!socket) return

		// 🔹 Подписка на новые сообщения в зависимости от типа чата
		const handleNewMessage = (message: Message) => {
			setMessages(prev => [...prev, message])
		}

		if (selectedChat.type === 'group') {
			socket.emit('joinGroupChat', chatId)
			socket.on('newGroupMessage', handleNewMessage)
		} else {
			socket.emit('joinPrivateChat', chatId)
			socket.on('newPrivateMessage', handleNewMessage)
		}

		return () => {
			if (selectedChat.type === 'group') {
				socket.emit('leaveGroupChat', chatId)
				socket.off('newGroupMessage', handleNewMessage)
			} else {
				socket.emit('leavePrivateChat', chatId)
				socket.off('newPrivateMessage', handleNewMessage)
			}
		}
	}, [chatId, selectedChat?.type])

	if (!chatId) return null

	const getReadableDate = (dateString: string) => {
		const date = new Date(dateString)
		const today = new Date()
		const yesterday = new Date(today)
		yesterday.setDate(yesterday.getDate() - 1)

		if (date.toDateString() === today.toDateString()) return 'Today'
		if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'

		return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long' })
	}

	const groupMessagesByDate = (messages: Message[]) => {
		// 1️⃣ Сначала сортируем сообщения по дате отправки
		const sortedMessages = [...messages].sort(
			(a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
		)

		// 2️⃣ Группируем по дате
		const groups: { [key: string]: MessageGroup } = {}

		sortedMessages.forEach(message => {
			const dateKey = new Date(message.sentAt).toDateString()
			const readableDate = getReadableDate(message.sentAt)

			if (!groups[dateKey]) {
				groups[dateKey] = { date: readableDate, messages: [] }
			}

			groups[dateKey].messages.push(message)
		})

		return groups
	}

	return (
		<div className={styles.container}>
			{!isSocketConnected && (
				<div className={styles.overlay}>
					<div className={styles.loader}></div>
					<p>Connecting...</p>
				</div>
			)}

			<ChatHeader
				onlineUsers={onlineUsers}
				selectedChat={selectedChat}
				socket={socketRef.current}
			/>

			<ul>
				{Object.entries(groupMessagesByDate(messages))
					// 3️⃣ Сортируем группы по дате (чтобы старые были сверху, новые — внизу)
					.sort(
						([dateA], [dateB]) =>
							new Date(dateA).getTime() - new Date(dateB).getTime()
					)
					.map(([dateKey, group]) => (
						<div key={dateKey}>
							<div className={styles.dateSeparator}>
								<span className={styles.dateText}>{group.date}</span>
							</div>

							{group.messages.map(m => (
								<li
									key={m.id}
									className={
										m.senderId === user?.id
											? styles.MyMessageLi
											: styles.messageLi
									}
								>
									<MessageBox
										id={m.id}
										text={m.text}
										senderId={m.senderId}
										chatId={chatId}
										sender={m.sender}
										sentAt={m.sentAt}
										updatedAt={m.updatedAt}
										privateChatId={m.privateChatId}
										groupId={m.groupId}
									/>
								</li>
							))}
						</div>
					))}
				<div ref={messagesEndRef} />
			</ul>

			<SendMessage
				selectedChat={selectedChat}
				socket={socketRef.current}
				isSocketConnected={isSocketConnected}
				updateChatLastMessage={updateChatLastMessage}
			/>
		</div>
	)
}

export default MessageView
