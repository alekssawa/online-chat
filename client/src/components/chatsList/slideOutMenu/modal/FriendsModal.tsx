import { gql } from '@apollo/client'
import { useMutation } from '@apollo/client/react'
import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import styles from './Modal.module.css'

import type { Friend, User } from '../../../type'

interface FriendsModalProps {
	isOpen: boolean
	onClose: () => void
}

interface AddFriendData {
	addFriend: User
}

interface AddFriendVars {
	friendIdentifier: string
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

const modalRoot = document.getElementById('modal-root') || document.body

export const FriendsModal: React.FC<FriendsModalProps> = ({
	isOpen,
	onClose,
}) => {
	const [inputVisible, setInputVisible] = useState(false)
	const [inputValue, setInputValue] = useState('')

	// Держим локально user для мгновенного обновления списка друзей
	const [user, setUser] = useState<User | null>(() =>
		JSON.parse(localStorage.getItem('user') || 'null')
	)

	const [addFriend] = useMutation<AddFriendData, AddFriendVars>(ADD_FRIEND)

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

			setInputValue('')
			setInputVisible(false)
		} catch (err) {
			console.error('Ошибка добавления друга:', err)
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
								<li key={f.id}>
									<p>{f.friend.name}</p>
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
		</div>,
		modalRoot
	)
}
