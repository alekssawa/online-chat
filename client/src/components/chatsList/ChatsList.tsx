import { gql } from '@apollo/client'
import { useApolloClient, useLazyQuery, useQuery } from '@apollo/client/react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './ChatsList.module.css'

import DefaultGroupAvatar from '../../assets/icons/DefaultGroupAvatar.svg'
import MenuIcon from '../../assets/icons/menuIcon2.svg?react'

// import ToolsbarAddRooms from "./toolsbarAddRooms/ToolsbarAddRooms";
import SlideOutMenu from './slideOutMenu/SlideOutMenu'

import { useUserKeys } from '../../hooks/useGenerateUserKeys'
import type {
	ChatItem,
	GroupChat,
	Message,
	PrivateChat,
	SelectedChat,
} from '../type'

interface ChatsListProps {
	containerRef?: React.RefObject<HTMLDivElement | null>
	setSelectedChat: (chat: SelectedChat) => void
	setIsUserPageOpen: (isUserPageOpen: boolean) => void
	loading: boolean
	setLoading: (loading: boolean) => void
	setError: (error: string | null) => void
	SetUpdateFunction?: (
		updateFn: (
			chatId: string,
			newMessage: { text: string; senderName?: string }
		) => void
	) => void
}

// Выносим элемент чата в отдельный компонент для оптимизации
const ChatListItem = React.memo(
	({
		item,
		onSelect,
	}: {
		item: ChatItem
		onSelect: (item: ChatItem) => void
	}) => {
		return (
			<li onClick={() => onSelect(item)}>
				<button className={styles.roomButton}>
					<div className={styles.group_element}>
						<img
							className={styles.group_avatar}
							src={item.avatarUrl || DefaultGroupAvatar}
							alt={item.name}
						/>
						<div className={styles.groupInfo}>
							<p className={styles.groupName}>{item.name}</p>
							<p className={styles.groupMessagePreview}>
								{item.senderName
									? `${item.senderName}: ${item.lastMessage}`
									: item.lastMessage}
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
				messages {
					id
					text
					iv
					sentAt
					sender {
						name
					}
				}
			}
			privateChats {
				id
				user1 {
					id
					name
					avatar {
						url
					}
					publicKey
				}
				user2 {
					id
					name
					avatar {
						url
					}
					publicKey
				}
				messages {
					id
					text
					iv
					sentAt
					sender {
						name
					}
				}
			}
		}
	}
`

const GET_GROUPCHAT_DETAILS = gql`
	query GetGroupChatDetails($groupId: ID!) {
		groupChat(id: $groupId) {
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
				sentAt
				sender {
					id
					name
				}
			}
		}
	}
`

const GET_PRIVATECHAT_DETAILS = gql`
	query GetPrivateChat($chatId: ID!) {
		privateChat(chatId: $chatId) {
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
`

function ChatsList({
	containerRef,
	setSelectedChat,
	setIsUserPageOpen,
	loading,
	setLoading,
	setError,
	SetUpdateFunction,
}: ChatsListProps) {
	const [isMenuOpen, setIsMenuOpen] = useState(false)

	const [chatItems, setChatItems] = useState<ChatItem[]>([])
	// const [, /*refreshCounter*/ setRefreshCounter] = useState(0);
	const retryInterval = useRef<number | null>(null)
	const client = useApolloClient()
	const [searchValue, setSearchValue] = useState('')
	const { deriveSharedKey, decryptMessage } = useUserKeys()

	const user = useMemo(() => {
		return JSON.parse(localStorage.getItem('user') || 'null')
	}, [])

	setLoading(false)

	// console.log("user:", user);

	const {
		data,
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

	const [loadGroupChatDetails] = useLazyQuery<
		{ groupChat: GroupChat },
		{ groupId: string }
	>(GET_GROUPCHAT_DETAILS, { fetchPolicy: 'cache-and-network' })

	const [loadPrivateChatDetails] = useLazyQuery<
		{ privateChat: PrivateChat },
		{ chatId: string }
	>(GET_PRIVATECHAT_DETAILS, { fetchPolicy: 'cache-and-network' })

	// useEffect(() => {
	// 	setLoading(queryLoading)
	// }, [queryLoading, setLoading])

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
		(chatId: string, newMessage: { text: string; senderName?: string }) => {
			console.log(newMessage)
			// 1. Обновляем локальное состояние
			setChatItems(prevItems =>
				prevItems.map(item =>
					item.id === chatId
						? {
								...item,
								lastMessage: newMessage.text,
								senderName: newMessage.senderName || item.senderName,
						  }
						: item
				)
			)

			// 2. Обновляем кэш Apollo без рефетча
			if (data?.user) {
				// Создаем новое сообщение для кэша
				const tempMessageId = `temp-${Date.now()}`

				const newMessageForCache = {
					__typename: 'Message',
					id: tempMessageId,
					text: newMessage.text,
					sentAt: new Date().toISOString(),
					sender: {
						__typename: 'User',
						name: newMessage.senderName,
					},
				}

				// Обновляем кэш для groupChats
				const updatedGroupChats = data.user.groupChats.map(groupChat => {
					if (groupChat.id === chatId) {
						return {
							...groupChat,
							messages: [...groupChat.messages, newMessageForCache],
						}
					}
					return groupChat
				})

				// Обновляем кэш для privateChats
				const updatedPrivateChats = data.user.privateChats.map(privateChat => {
					if (privateChat.id === chatId) {
						return {
							...privateChat,
							messages: [...privateChat.messages, newMessageForCache],
						}
					}
					return privateChat
				})

				// Записываем обновленные данные в кэш
				client.writeQuery({
					query: GET_USER_CHATS,
					variables: { userId: user?.id || '' },
					data: {
						user: {
							...data.user,
							groupChats: updatedGroupChats,
							privateChats: updatedPrivateChats,
						},
					},
				})
				console.log(data)
			}
		},
		[client, data, user?.id]
	)
	const refreshChatsList = useCallback(async () => {
		// setLoading(true)
		try {
			const result = await refetch()
			const data = result.data
			if (!data?.user) return

			const items: ChatItem[] = []
			const sortMessagesByDate = (messages: Message[]) =>
				[...messages].sort(
					(a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
				)

			// group chats
			data.user.groupChats.forEach(g => {
				const sortedMessages = sortMessagesByDate(g.messages)
				const lastMsg = sortedMessages[sortedMessages.length - 1]
				items.push({
					id: g.id,
					users: g.users || [],
					name: g.name,
					type: 'group',
					lastMessage: lastMsg?.text || '',
					senderName: lastMsg?.sender?.name || '',
					avatarUrl: g.avatar?.url,
				})
			})

			// private chats
			data.user.privateChats.forEach(p => {
				const otherUser = p.user1.id === user?.id ? p.user2 : p.user1
				const sortedMessages = sortMessagesByDate(p.messages)
				const lastMsg = sortedMessages[sortedMessages.length - 1]
				items.push({
					id: p.id,
					users: [p.user1, p.user2],
					name: otherUser.name,
					type: 'private',
					lastMessage: lastMsg?.text || '',
					senderName: lastMsg?.sender?.name || '',
					avatarUrl: otherUser.avatar?.url,
				})
			})

			setChatItems(items)
			console.log(items)
		} catch (err) {
			if (err instanceof Error) setError(err.message)
			else setError('Unknown error occurred')
		} finally {
			// setLoading(false)
		}
	}, [refetch, setError, user?.id])

	useEffect(() => {
		if (SetUpdateFunction) {
			SetUpdateFunction(updateChatLastMessage)
		}
	}, [SetUpdateFunction, updateChatLastMessage, refreshChatsList])

	useEffect(() => {
		if (!data?.user) return

		const sortMessagesByDate = (messages: Message[]) =>
			[...messages].sort(
				(a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
			)

		async function buildChatItems(userData: {
			groupChats: GroupChat[]
			privateChats: PrivateChat[]
		}) {
			const items: ChatItem[] = []

			// group chats
			userData.groupChats.forEach(g => {
				const sortedMessages = sortMessagesByDate(g.messages)
				const lastMsg = sortedMessages[sortedMessages.length - 1]
				items.push({
					id: g.id,
					users: g.users || [],
					name: g.name,
					type: 'group',
					lastMessage: lastMsg?.text,
					senderName: lastMsg?.sender?.name,
					avatarUrl: g.avatar?.url,
				})
			})

			// private chats
			for (const p of userData.privateChats) {
				const otherUser = p.user1.id === user?.id ? p.user2 : p.user1
				const sortedMessages = sortMessagesByDate(p.messages)
				const lastMsg = sortedMessages[sortedMessages.length - 1]

				console.log(lastMsg)

				let decryptedText = lastMsg?.text || ''

				if (lastMsg?.iv && otherUser.publicKey) {
					const peerPublicKey: string = otherUser.publicKey

					async function runDecryption() {
						try {
							const ivArray = new Uint8Array(
								atob(lastMsg.iv)
									.split('')
									.map(c => c.charCodeAt(0))
							)
							const textArray = new Uint8Array(
								atob(lastMsg.text)
									.split('')
									.map(c => c.charCodeAt(0))
							)

							const sharedKey = await deriveSharedKey(peerPublicKey)
							const decrypted = await decryptMessage(
								sharedKey,
								ivArray,
								textArray
							)

							decryptedText = decrypted
						} catch (err) {
							console.error('Ошибка расшифровки lastMessage:', err)
						}
					}

					await runDecryption()
				}
				console.log(decryptedText)

				items.push({
					id: p.id,
					users: [p.user1, p.user2],
					name: otherUser.name,
					type: 'private',
					lastMessage: decryptedText,
					senderName: lastMsg?.sender?.name || '',
					avatarUrl: otherUser.avatar?.url,
				})
			}

			setChatItems(items)
		}

		buildChatItems(data.user)
	}, [data, user])

	const handleSelectChat = async (item: ChatItem) => {
		try {
			if (item.type === 'group') {
				const result = await loadGroupChatDetails({
					variables: { groupId: item.id },
				})
				if (result.data?.groupChat) {
					setSelectedChat({ chat: result.data.groupChat, type: 'group' })
					// console.log(result.data.groupChat)
					setIsUserPageOpen(false)
				}
			} else {
				const result = await loadPrivateChatDetails({
					variables: { chatId: item.id },
				})
				if (result.data?.privateChat) {
					setSelectedChat({ chat: result.data.privateChat, type: 'private' })
					setIsUserPageOpen(false)
				}
			}
		} catch (err) {
			if (err instanceof Error) setError(err.message)
			else setError('Unknown error occurred')
		}
	}

	const handleMenuToggle = () => {
		setIsMenuOpen(!isMenuOpen)
	}

	const handleMenuClose = () => {
		setIsMenuOpen(false)
	}

	console.log(chatItems)

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
									ChatsList={chatItems}
									handleSelectChat={handleSelectChat}
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
								{chatItems.map(item => (
									<ChatListItem
										key={item.id}
										item={item}
										onSelect={handleSelectChat}
									/>
								))}
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
