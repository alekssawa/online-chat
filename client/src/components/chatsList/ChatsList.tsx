import type { Reference } from '@apollo/client'
import { gql } from '@apollo/client'
import { useApolloClient, useQuery } from '@apollo/client/react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import styles from './ChatsList.module.css'

import DefaultGroupAvatar from '../../assets/icons/DefaultGroupAvatar.svg'
import MenuIcon from '../../assets/icons/menuIcon2.svg?react'

import { useUserKeys } from '../../hooks/useGenerateUserKeys'
import { type TSocket } from '../../pages/ChatPage/ChatPage'
import { useChatStore } from '../../store/useChatStore'
import { useUserStore } from '../../store/useUserStore'
import { buildChatItems } from '../../utils/buildChatItems'
import type {
	ChatItem,
	GroupChat,
	Message,
	newMessage,
	PrivateChat,
} from '../type'
import SlideOutMenu from './slideOutMenu/SlideOutMenu'

type GroupChatCache = {
	__typename: 'GroupChat'
	id: string
	messages: Message[]
}

type PrivateChatCache = {
	__typename: 'PrivateChat'
	id: string
	messages: Message[]
}

interface ChatsListProps {
	socketRef: React.RefObject<TSocket | null>
	containerRef?: React.RefObject<HTMLDivElement | null>

	setIsUserPageOpen: (isUserPageOpen: boolean) => void
	loading: boolean
	setLoading: (loading: boolean) => void
	setError: (error: string | null) => void
	SetUpdateFunction?: (
		updateFn: (chatId: string, newMessage: newMessage) => void
	) => void
}

function getChatDisplayData(item: ChatItem, currentUserId?: string) {
	if (item.type === 'private') {
		const { user1, user2 } = item.chat

		const otherUser = user1.id === currentUserId ? user2 : user1

		// console.log(user1, user2, otherUser)

		return {
			name: otherUser.nickname ? `@${otherUser.nickname}` : otherUser.name,
			avatarUrl: otherUser.avatar?.url,
		}
	}

	// group chat
	return {
		name: item.chat.name,
		avatarUrl: item.chat.avatar?.url,
	}
}

// Выносим элемент чата в отдельный компонент для оптимизации
const ChatListItem = React.memo(
	({
		item,
		onSelect,
		currentUserId,
	}: {
		item: ChatItem
		onSelect: (selectedChat: string) => void
		currentUserId?: string
	}) => {
		// console.log(item, item.chat.sentAt)
		const { name, avatarUrl } = getChatDisplayData(item, currentUserId)

		return (
			<li onClick={() => onSelect(item.chat.id)}>
				<button className={styles.roomButton}>
					<div className={styles.group_element}>
						<img
							className={styles.group_avatar}
							src={avatarUrl || DefaultGroupAvatar}
							alt={name}
						/>

						<div className={styles.groupInfo}>
							<div className={styles.groupTitle}>
								<p className={styles.groupName}>{name}</p>

								<p className={styles.sentAt}>
									{item.chat.sentAt
										? new Date(Number(item.chat.sentAt)).toLocaleTimeString(
												[],
												{
													hour: '2-digit',
													minute: '2-digit',
												}
										  )
										: ''}
								</p>
							</div>

							<p className={styles.groupMessagePreview}>
								{item.chat.senderName
									? `${item.chat.senderName}: ${item.chat.lastMessage}`
									: item.chat.lastMessage}
							</p>
						</div>
					</div>
				</button>
			</li>
		)
	}
)

// GraphQL запросы остаются без изменений
const GET_USER_CHATS = gql`
	query GetUserChats($userId: ID!) {
		user(id: $userId) {
			groupChats {
				id
				name
				createdAt
				avatar {
					url
				}
				users {
					id
					email
					name
					avatar {
						url
					}
					nickname
					about
					birthDate
					lastOnline
				}
				messages {
					id
					text
					iv
					sentAt
					updatedAt
					sender {
						id
						name
					}
				}
			}
			privateChats {
				id
				createdAt
				user1 {
					id
					email
					name
					avatar {
						url
					}
					nickname
					about
					birthDate
					lastOnline
					publicKey
					keyCreatedAt
					keyUpdatedAt
				}
				user2 {
					id
					email
					name
					avatar {
						url
					}
					nickname
					about
					birthDate
					lastOnline
					publicKey
					keyCreatedAt
					keyUpdatedAt
				}
				messages {
					id
					text
					iv
					sentAt
					updatedAt
					sender {
						id
						name
						publicKey
						keyCreatedAt
						keyUpdatedAt
					}
				}
			}
		}
	}
`

// const GET_GROUPCHAT_DETAILS = gql`
// 	query GetGroupChatDetails($groupId: ID!) {
// 		groupChat(id: $groupId) {
// 			id
// 			name
// 			createdAt
// 			avatar {
// 				url
// 			}
// 			users {
// 				id
// 				email
// 				name
// 				avatar {
// 					url
// 				}
// 				nickname
// 				about
// 				birthDate
// 				lastOnline
// 			}
// 			messages {
// 				id
// 				text
// 				sentAt
// 				sender {
// 					id
// 					name
// 				}
// 			}
// 		}
// 	}
// `

// const GET_PRIVATECHAT_DETAILS = gql`
// 	query GetPrivateChat($chatId: ID!) {
// 		privateChat(chatId: $chatId) {
// 			id
// 			createdAt
// 			user1 {
// 				id
// 				email
// 				name
// 				avatar {
// 					url
// 				}
// 				nickname
// 				about
// 				birthDate
// 				lastOnline
// 				publicKey
// 				keyCreatedAt
// 				keyUpdatedAt
// 			}
// 			user2 {
// 				id
// 				email
// 				name
// 				avatar {
// 					url
// 				}
// 				nickname
// 				about
// 				birthDate
// 				lastOnline
// 				publicKey
// 				keyCreatedAt
// 				keyUpdatedAt
// 			}
// 			messages {
// 				id
// 				text
// 				iv
// 				sentAt
// 				sender {
// 					id
// 					name
// 					publicKey
// 					keyCreatedAt
// 					keyUpdatedAt
// 				}
// 			}
// 		}
// 	}
// `

function ChatsList({
	socketRef,
	containerRef,
	setIsUserPageOpen,
	loading,
	setLoading,
	setError,
	SetUpdateFunction,
}: ChatsListProps) {
	const chatItems = useChatStore(s => s.chats)
	const setChats = useChatStore(s => s.setChats)
	const setSelectedChatId = useChatStore(s => s.setSelectedChatId)
	const updateLastMessage = useChatStore(s => s.updateLastMessage)
	const setRefreshChatsList = useChatStore(s => s.setRefreshChatsList)
	// const selectedChat = useChatStore(s => s.selectChat)

	const [isMenuOpen, setIsMenuOpen] = useState(false)

	// const [, /*refreshCounter*/ setRefreshCounter] = useState(0);
	const retryInterval = useRef<number | null>(null)
	const client = useApolloClient()
	const [searchValue, setSearchValue] = useState('')
	const { deriveSharedKey, decryptMessage } = useUserKeys()

	const user = useUserStore(s => s.user)

	useEffect(() => {
		setLoading(false)
	}, [setLoading])

	// console.log("user:", user);

	const {
		// data,
		// loading: queryLoading,
		error,
		refetch,
	} = useQuery<
		{ user: { groupChats: GroupChat[]; privateChats: PrivateChat[] } },
		{ userId: string }
	>(GET_USER_CHATS, {
		variables: { userId: user?.id || '' },
		skip: !user?.id,
		fetchPolicy: 'network-only',
	})

	useEffect(() => {
		const socket = socketRef.current
		if (!socket) return
		if (!chatItems.length) return

		const handleNewMessage = (message: Message) => {
			console.log(message)
			// обновляешь lastMessage / sentAt / senderName
			updateChatLastMessage(message.senderId, {
				text: message.text,
				iv: message.iv,
				senderName: message.sender?.name,
				sentAt: message.sentAt,
			})
		}

		chatItems.forEach(chat => {
			if (chat.type === 'group') {
				socket.emit('joinGroupChat', chat.chat.id)
			} else {
				socket.emit('joinPrivateChat', chat.chat.id)
			}
		})

		socket.on('newGroupMessage', handleNewMessage)
		socket.on('newPrivateMessage', handleNewMessage)

		return () => {
			chatItems.forEach(chat => {
				if (chat.type === 'group') {
					socket.emit('leaveGroupChat', chat.chat.id)
				} else {
					socket.emit('leavePrivateChat', chat.chat.id)
				}
			})

			socket.off('newGroupMessage', handleNewMessage)
			socket.off('newPrivateMessage', handleNewMessage)
		}
	}, [chatItems])

	useEffect(() => {
		if (error) {
			// setLoading(true)
			if (!retryInterval.current) {
				retryInterval.current = window.setInterval(async () => {
					try {
						await refetch()
						// setLoading(false)
						if (retryInterval.current) {
							clearInterval(retryInterval.current)
							retryInterval.current = null
						}
					} catch {
						// setLoading(true)
					}
				}, 10000)
			}
		}
		return () => {
			if (retryInterval.current) clearInterval(retryInterval.current)
		}
	}, [error, refetch])

	// Функция для обновления последнего сообщения в конкретном чате
	const updateChatLastMessage = useCallback(
		(chatId: string, newMessage: newMessage) => {
			// 1️⃣ Zustand
			updateLastMessage(chatId, newMessage)

			// 2️⃣ Apollo cache
			if (!user?.id) return

			const newMessageForCache = {
				__typename: 'Message',
				id: `temp-${Date.now()}`,
				text: newMessage.text,
				iv: newMessage.iv,
				sentAt: newMessage.sentAt,
				updatedAt: newMessage.updatedAt,
				sender: {
					__typename: 'User',
					name: newMessage.senderName,
				},
			}

			const updateCache = <T extends { id: string; messages: Message[] }>(
				existingRefs: readonly Reference[],
				fragmentName: string
			) =>
				existingRefs.map(ref => {
					const chat = client.cache.readFragment<T>({
						id: ref.__ref,
						fragment: gql`
            fragment ${fragmentName} on ${fragmentName} {
              id
              messages
            }
          `,
					})
					if (!chat || chat.id !== chatId) return ref
					return {
						...ref,
						messages: [...chat.messages, newMessageForCache],
					}
				})

			client.cache.modify({
				id: client.cache.identify({ __typename: 'User', id: user.id }),
				fields: {
					groupChats: (existing: readonly Reference[] = []) =>
						updateCache<GroupChatCache>(existing, 'GroupChatCache'),
					privateChats: (existing: readonly Reference[] = []) =>
						updateCache<PrivateChatCache>(existing, 'PrivateChatCache'),
				},
			})
		},
		[updateLastMessage, client, user?.id]
	)

	const refreshChatsList = useCallback(async () => {
		if (!user?.id) return
		try {
			const result = await refetch()
			const data = result.data
			if (!data?.user) return

			const items = await buildChatItems(
				data.user,
				user.id,
				deriveSharedKey,
				decryptMessage
			)
			setChats(items)
		} catch (err) {
			if (err instanceof Error) setError(err.message)
			else setError('Unknown error occurred')
		}
	}, [refetch, setError, setChats, user?.id, deriveSharedKey, decryptMessage])

	useEffect(() => {
		refreshChatsList()
	}, [refreshChatsList])

	useEffect(() => {
		setRefreshChatsList(refreshChatsList)
	}, [refreshChatsList, setRefreshChatsList])

	useEffect(() => {
		if (SetUpdateFunction) {
			SetUpdateFunction(updateChatLastMessage)
		}
	}, [SetUpdateFunction, updateChatLastMessage, refreshChatsList])

	const handleSelectChat = (chatId: string) => {
		const item = chatItems.find(c => c.chat.id === chatId)
		if (!item) return // если не нашли, ничего не делаем

		setSelectedChatId(item.chat.id)
		setIsUserPageOpen(false)
	}

	const handleMenuToggle = () => {
		setIsMenuOpen(!isMenuOpen)
	}

	const handleMenuClose = () => {
		setIsMenuOpen(false)
	}

	// console.log(chatItems)
	// console.log()

	return (
		<>
			{!loading && (
				<div ref={containerRef} className={styles.container}>
					<div className={styles.container_rooms}>
						<>
							<div className={styles.header}>
								<div className={styles.menuIcon} onClick={handleMenuToggle}>
									<MenuIcon />
								</div>
								<SlideOutMenu
									refreshChats={refreshChatsList}
									isOpen={isMenuOpen}
									onClose={handleMenuClose}
								></SlideOutMenu>
								<div className={styles.searchContainer}>
									<div className={styles.searchIcon}>
										<svg
											width='16'
											height='16'
											viewBox='0 0 24 24'
											fill='none'
											xmlns='http://www.w3.org/2000/svg'
										>
											<path
												d='M21 21L16.514 16.506L21 21ZM19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z'
												stroke='currentColor'
												strokeWidth='2'
												strokeLinecap='round'
												strokeLinejoin='round'
											/>
										</svg>
									</div>
									<input
										type='text'
										placeholder='Search...'
										className={styles.searchInput}
										value={searchValue}
										onChange={e => setSearchValue(e.target.value)}
									/>
									{searchValue && (
										<button
											className={styles.clearButton}
											onClick={() => setSearchValue('')}
										>
											<svg
												width='14'
												height='14'
												viewBox='0 0 24 24'
												fill='none'
												xmlns='http://www.w3.org/2000/svg'
											>
												<path
													d='M18 6L6 18M6 6L18 18'
													stroke='currentColor'
													strokeWidth='2'
													strokeLinecap='round'
													strokeLinejoin='round'
												/>
											</svg>
										</button>
									)}
								</div>
							</div>
							<ul>
								{chatItems.map(item => {
									// console.log(item)
									// if (!item?.chat?.id) return null

									return (
										<ChatListItem
											key={item.chat.id}
											item={item}
											onSelect={handleSelectChat}
											currentUserId={user?.id}
										/>
									)
								})}
							</ul>
						</>
					</div>
				</div>
			)}
		</>
	)
}

// Экспортируем функцию для использования в других компонентах
export default ChatsList
