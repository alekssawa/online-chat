import { gql } from '@apollo/client'
import { useMutation } from '@apollo/client/react'

import styles from './UserInfoPanel.module.css'

import ArrowLeft from '../../assets/icons/ArrowLeft.svg?react'
import ArrowShare from '../../assets/icons/ArrowShare.svg?react'
import BlockIcon from '../../assets/icons/BlockIcon.svg?react'
import DefaultUserAvatar from '../../assets/icons/DefaultUserAvatar.svg?react'
import PencilIcon from '../../assets/icons/PencilIcon.svg?react'
import TrashIcon from '../../assets/icons/TrashIcon.svg?react'

import type { User } from '../type'

import { ToastContainer, toast } from 'react-toastify'

import { useEffect } from 'react'
import { useChatStore, useSelectedChat } from '../../store/useChatStore'
import { useUserStore } from '../../store/useUserStore'
import { getUserStatus } from '../../utils/getUserStatus'

interface UserInfoPanelProps {
	selectedUser: User | null
	setIsUserPageOpen: (isUserPageOpen: boolean) => void
	onlineUsers: { userId: string; online: boolean }[]
}

interface RemoveFriendData {
	removeFriend: User
}

interface RemoveFriendVars {
	friendIdentifier: string
}

const REMOVE_FRIEND = gql`
	mutation RemoveFriend($friendIdentifier: String!) {
		removeFriend(friendIdentifier: $friendIdentifier) {
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
			}
		}
	}
`

function UserInfoPanel({
	selectedUser,
	setIsUserPageOpen,
	onlineUsers,
}: UserInfoPanelProps) {
	const user = useUserStore(s => s.user)
	const selectedChat = useSelectedChat()
	const refreshChatsList = useChatStore(s => s.refreshChatsList)
	const [removeFriend] = useMutation<RemoveFriendData, RemoveFriendVars>(
		REMOVE_FRIEND
	)

	useEffect(() => {
		console.log('Selected user changed:', selectedUser)
	}, [selectedUser])

	const handleDeleteContact = async () => {
		if (!user || !selectedChat || !refreshChatsList) return

		let userToDelete = selectedUser

		if (!userToDelete && selectedChat.type === 'private') {
			userToDelete =
				selectedChat.chat.user1.id === user.id
					? selectedChat.chat.user2
					: selectedChat.chat.user1
		}

		console.log('userToDelete user changed:', userToDelete)

		if (!userToDelete) return

		const { data } = await removeFriend({
			variables: { friendIdentifier: userToDelete.id },
		})

		if (!data?.removeFriend) return

		console.log('Contact deleted:', data.removeFriend)

		useUserStore.getState().refreshUser()
		refreshChatsList()
	}
	return (
		<div className={styles.container}>
			<div className={styles.header}>
				{selectedChat?.type === 'group' ? (
					<>
						<button
							className={`${styles.backButton} ${styles.chatText}`}
							onClick={() => setIsUserPageOpen(false)}
						>
							<ArrowLeft />
							<span>User info</span>
						</button>
					</>
				) : (
					<h2 className={styles.chatText}>User info</h2>
				)}

				<div className={styles.chatDetails}>
					<div className={styles.chat_avatar}>
						{selectedUser && selectedChat?.type === 'group' ? (
							selectedUser?.avatar ? (
								<img
									className={styles.user_avatar}
									src={selectedUser.avatar.url}
								/>
							) : (
								<DefaultUserAvatar
									className={`${styles.user_avatar} ${styles.defaultAvatar}`}
								/>
							)
						) : selectedChat?.type === 'private' ? (
							selectedChat.chat.user1.id === user?.id ? (
								selectedChat.chat.user2.avatar?.url ? (
									<img
										src={selectedChat.chat.user2.avatar.url}
										alt='User avatar'
									/>
								) : (
									<DefaultUserAvatar />
								)
							) : selectedChat.chat.user1.avatar?.url ? (
								<img
									src={selectedChat.chat.user1.avatar.url}
									alt='User avatar'
								/>
							) : (
								<DefaultUserAvatar />
							)
						) : selectedChat?.chat.avatar?.url ? (
							<img src={selectedChat?.chat.avatar?.url} alt='Group avatar' />
						) : (
							<DefaultUserAvatar />
						)}
					</div>
					<div className={styles.chatInfo}>
						<h2 className={styles.chatName}>
							{selectedUser && selectedChat?.type === 'group'
								? selectedUser?.name
								: selectedChat?.type === 'private'
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
										{getUserStatus(
											selectedUser?.id,
											selectedUser?.lastOnline,
											onlineUsers
										)}
									</span>
								</>
							)}
						</div>
					</div>
				</div>
			</div>
			<div className={styles.container_profile}>
				<div className={styles.userDetails}>
					{(() => {
						const nickname =
							selectedChat?.type === 'private'
								? selectedChat.chat.user1.id === user?.id
									? selectedChat.chat.user2.nickname
									: selectedChat.chat.user1.nickname
								: selectedUser?.nickname

						if (!nickname) return null

						const handleClick = () => {
							const nickWithAt = '@' + nickname
							navigator.clipboard.writeText(nickWithAt)

							toast('username copied to clipboard', {
								closeButton: false,
								toastId: 'unique-id',
								style: {
									width: 'auto',
									maxWidth: '300px',
									padding: '0 20px',
								},
							})
						}

						return (
							<p className={styles.nickname} onClick={handleClick}>
								{'@' + nickname}
							</p>
						)
					})()}

					<p>
						{selectedChat?.type === 'private'
							? selectedChat.chat.user1.id === user?.id
								? selectedChat.chat.user2.about
								: selectedChat.chat.user1.about
							: selectedUser?.about}
					</p>
					<p>
						{selectedChat?.type === 'private'
							? selectedChat.chat.user1.id === user?.id
								? selectedChat.chat.user2.email
								: selectedChat.chat.user1.email
							: selectedUser?.email}
					</p>
					<p>
						{(() => {
							const birthDate =
								selectedChat?.type === 'private'
									? selectedChat.chat.user1.id === user?.id
										? selectedChat.chat.user2.birthDate
										: selectedChat.chat.user1.birthDate
									: selectedUser?.birthDate

							if (!birthDate) return null

							const date = new Date(Number(birthDate))
							if (isNaN(date.getTime())) return null

							const day = String(date.getDate()).padStart(2, '0')
							const month = String(date.getMonth() + 1).padStart(2, '0') // месяцы с 0
							const year = date.getFullYear()

							return `${day}.${month}.${year}`
						})()}
					</p>
				</div>
				<div className={styles.actions}>
					<button className={styles.actionButton}>
						<ArrowShare /> Share contact
					</button>
					<button className={styles.actionButton}>
						<PencilIcon /> Edit contact
					</button>
					<button onClick={handleDeleteContact} className={styles.actionButton}>
						<TrashIcon /> Delete contact
					</button>
					<button className={`${styles.actionButton} ${styles.highlight}`}>
						<BlockIcon /> Block user
					</button>
				</div>
			</div>
			<ToastContainer
				position='bottom-right'
				pauseOnHover={false}
				pauseOnFocusLoss={false}
				hideProgressBar
				closeOnClick={false}
				draggable={false}
				limit={2}
				autoClose={1500}
				theme='dark'
			/>
		</div>
	)
}

export default UserInfoPanel
