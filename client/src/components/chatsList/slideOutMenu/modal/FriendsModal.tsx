import { gql } from '@apollo/client'
import { useMutation } from '@apollo/client/react'
import React, { useEffect, useState } from 'react'
import { ToastContainer, toast } from 'react-toastify'
import ReactDOM from 'react-dom'
import styles from './Modal.module.css'

import type { ChatItem, Friend, User } from '../../../type'

interface FriendsModalProps {
	ChatsList: ChatItem[] | null
	handleSelectChat: (item: ChatItem) => void
	refreshChats: () => void
	isOpen: boolean
	onClose: () => void
}

interface AddFriendData {
	addFriend: User
}

interface AddFriendVars {
	friendIdentifier: string
}

interface CreatePrivateChatData {
	createPrivateChat: {
		id: string
		user1: User
		user2: User
	}
}

interface CreatePrivateChatVars {
	user2Id: string
}

const ADD_FRIEND = gql`
	mutation AddFriend($friendIdentifier: String!) {
		addFriend(friendIdentifier: $friendIdentifier) {
			id
			friends {
				id
				friend {
					id
					name
					email
					nickname
					about
					birthDate
					lastOnline
				}
				createdAt
			}
		}
	}
`

const CREATE_PRIVATE_CHAT = gql`
	mutation CreatePrivateChat($user2Id: ID!) {
		createPrivateChat(user2Id: $user2Id) {
			id
			user1 {
				id
				name
				email
				avatar {
					url
				}
			}
			user2 {
				id
				name
				email
				avatar {
					url
				}
			}
		}
	}
`

const modalRoot = document.getElementById('modal-root') || document.body

export const FriendsModal: React.FC<FriendsModalProps> = ({
	ChatsList,
	handleSelectChat,
	refreshChats,
	isOpen,
	onClose,
}) => {
	const [inputVisible, setInputVisible] = useState(false)
	const [inputValue, setInputValue] = useState('')
	const [user, setUser] = useState<User | null>(() =>
		JSON.parse(localStorage.getItem('user') || 'null')
	)
	const [addFriend] = useMutation<AddFriendData, AddFriendVars>(ADD_FRIEND)
	const [createPrivateChat] = useMutation<
		CreatePrivateChatData,
		CreatePrivateChatVars
	>(CREATE_PRIVATE_CHAT)

	useEffect(() => {
		if (!isOpen) {
			setInputVisible(false)
			setInputValue('')
		}
		document.body.style.overflow = isOpen ? 'hidden' : 'unset'
		return () => {
			document.body.style.overflow = 'unset'
		}
	}, [isOpen])

	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose()
		}
		if (isOpen) document.addEventListener('keydown', handleEscape)
		return () => document.removeEventListener('keydown', handleEscape)
	}, [isOpen, onClose])

	if (!isOpen) return null

	const handleSubmit = async () => {
		if (!inputValue.trim()) return

		try {
			const { data } = await addFriend({
				variables: { friendIdentifier: inputValue.trim() },
			})

			if (!data?.addFriend) return

			// Обновляем локальный user и список друзей
			setUser(prev => {
				const updatedUser: User = {
					...prev!,
					friends: data.addFriend.friends,
				}
				localStorage.setItem('user', JSON.stringify(updatedUser))
				return updatedUser
			})

			
			toast.success(`${data?.addFriend.friends?.find(f =>
			f.friend.email == inputValue
			)?.friend.name} added as a friend`)
			
			setInputValue('')
			setInputVisible(false)
		} catch (err) {
			console.error('Ошибка добавления друга:', err)
		}
	}

	console.log(ChatsList)

	const handleOpenChat = async (friendId: string) => {
		if (!ChatsList || !user) return

		const chatWithFriend = ChatsList.find(chat =>
			chat.users.some(u => u.id === friendId)
		)

		if (chatWithFriend) {
			handleSelectChat(chatWithFriend)
			onClose()
		} else {
			// Если чата нет — создаём его через Apollo
			try {
				const { data } = await createPrivateChat({
					variables: { user2Id: friendId },
				})
				if (data?.createPrivateChat) {
					handleSelectChat({
						id: data.createPrivateChat.id,
						users: [
							{
								id: user.id,
								name: user.name,
								email: user.email,
								avatar: user.avatar,
							},
							{
								id: data.createPrivateChat.user1.id,
								name: data.createPrivateChat.user1.name,
								email: data.createPrivateChat.user1.email,
								avatar: data.createPrivateChat.user1.avatar || undefined,
							},
						],
						name: '',
						type: 'private',
						lastMessage: undefined,
						senderName: undefined,
						avatarUrl: undefined,
					})
					refreshChats()
					console.log(refreshChats)
					onClose()
				}
			} catch (err) {
				console.error('Ошибка при создании чата:', err)
			}
		}
	}

	return ReactDOM.createPortal(
		<div className={styles.modalOverlay} onClick={onClose}>
			<div className={styles.modalContent} onClick={e => e.stopPropagation()}>
				<div className={styles.modalHeader}>
					<h2>Friends</h2>
				</div>

				<div className={styles.modalBody}>
					<ul>
						{user?.friends?.length ? (
							user.friends.map((f: Friend) => (
								<li key={f.id} onClick={() => handleOpenChat(f.friend.id)}>
									<p>{f.friend.name}</p>
									<div className={styles.user_info}>
										{user?.avatar ? (
											<img className={styles.user_avatar} src={user.avatar.url} />
										) : (
											<DefaultUserAvatar
												className={`${styles.user_avatar} ${styles.defaultAvatar}`}
											/>
										)}
										<div className={styles.user_details}>
											<h2 className={styles.user_name}>{user?.name}</h2>
											<h2 className={styles.user_email}>{user?.email}</h2>
										</div>
									</div>
									{f.friend.avatar && (
										<img src={f.friend.avatar.url} alt={f.friend.name} />
									)}
									{f.friend.nickname && <span>@{f.friend.nickname}</span>}
								</li>
							))
						) : (
							<li>Нет друзей</li>
						)}
					</ul>
				</div>

				<div className={styles.modalFooter}>
					{!inputVisible ? (
						<button
							className={styles.addButton}
							onClick={() => setInputVisible(true)}
						>
							Add friend
						</button>
					) : (
						<div className={styles.addForm}>
							<input
								type='text'
								placeholder='Enter ID / nickname / email'
								value={inputValue}
								onChange={e => setInputValue(e.target.value)}
								className={styles.input}
							/>
							<button className={styles.submitButton} onClick={handleSubmit}>
								Submit
							</button>
						</div>
					)}
				</div>
			</div>
			<ToastContainer
							position='top-center'
							pauseOnHover={false}
							pauseOnFocusLoss={false}
							hideProgressBar
							closeOnClick={false}
							draggable={false}
							limit={2}
							autoClose={1500}
							theme='dark'
						/>
		</div>,
		modalRoot
	)
}
