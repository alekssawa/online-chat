import { useMutation, useApolloClient } from '@apollo/client/react'
import { gql } from '@apollo/client'

import styles from './ToolsbarAddRooms.module.css'

import ExitIcon from '../../../assets/icons/exitIcon.svg?react'
import AddIcon from '../../../assets/icons/addIcon.svg?react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

// import type { Room } from "../../type";

interface ToolsbarAddRoomsProps {
	onRoomCreated?: () => void
}

const LOGOUT_MUTATION = gql`
	mutation Logout {
		logout
	}
`

const ADD_ROOM_MUTATION = gql`
	mutation CreateRoom($name: String!, $userId: ID!) {
		createRoom(name: $name, userId: $userId) {
			id
			name
			createdAt
			users {
				id
				email
			}
		}
	}
`

function ToolsbarAddRooms({ onRoomCreated }: ToolsbarAddRoomsProps) {
	const navigate = useNavigate()
	const [logoutMutation, { loading: logoutLoading }] =
		useMutation(LOGOUT_MUTATION)
	const [addRoomMutation, { loading: addRoomLoading }] =
		useMutation(ADD_ROOM_MUTATION)
	const client = useApolloClient()

	const [isModalOpen, setIsModalOpen] = useState(false)
	const [roomName, setRoomName] = useState('')
	const [error, setError] = useState('')

	const handleExit = async () => {
		try {
			await logoutMutation()
			await client.clearStore()
		} catch (error) {
			console.error('Logout error:', error)
		} finally {
			localStorage.clear()
			sessionStorage.clear()
			document.cookie =
				'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
			navigate('/')
			setTimeout(() => {
				window.location.reload()
			}, 100)
		}
	}

	const openModalMenu = () => {
		setIsModalOpen(true)
		setRoomName('')
		setError('')
	}

	const closeModalMenu = () => {
		setIsModalOpen(false)
		setRoomName('')
		setError('')
	}

	const handleCreateRoom = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!roomName.trim()) {
			setError('Название комнаты не может быть пустым')
			return
		}

		try {
			const user: User | null = JSON.parse(
				localStorage.getItem('user') || 'null'
			)

			if (!user) {
				setError('Пользователь не найден')
				return
			}

			const result = await addRoomMutation({
				variables: {
					name: roomName.trim(),
					userId: user.id,
				},
			})

			// const data = result.data as { createRoom: Room } | undefined;

			if (data?.createRoom) {
				console.log('Комната создана:', data.createRoom)

				// Вызываем callback для обновления списка комнат
				if (onRoomCreated) {
					onRoomCreated()
				}
			}

			closeModalMenu()
		} catch (error: unknown) {
			if (error instanceof Error) {
				console.error('Ошибка создания комнаты:', error.message)
				setError(error.message)
			} else {
				console.error('Неизвестная ошибка:', error)
				setError('Неизвестная ошибка при создании комнаты')
			}
		}
	}

	return (
		<>
			<div className={styles.toolsbarAddRooms}>
				<button
					onClick={handleExit}
					disabled={logoutLoading}
					className={styles.exitButton}
				>
					<ExitIcon className={styles.exitIcon} />
				</button>
				<span className={styles.divider}></span>
				{/* <button className={`${styles.AddRoom} ${styles.addButton}`}>+</button> */}
				<button onClick={openModalMenu} className={styles.addButton}>
					<AddIcon className={styles.addIcon} />
				</button>
			</div>
			{isModalOpen && (
				<div className={styles.modalOverlay} onClick={closeModalMenu}>
					<div
						className={styles.modalContent}
						onClick={e => e.stopPropagation()}
					>
						<div className={styles.modalHeader}>
							<h3>Создать новую комнату</h3>
						</div>

						<form onSubmit={handleCreateRoom} className={styles.modalForm}>
							<div className={styles.formGroup}>
								<label htmlFor='roomName'>Название комнаты:</label>
								<input
									id='roomName'
									type='text'
									value={roomName}
									onChange={e => setRoomName(e.target.value)}
									placeholder='Введите название комнаты'
									className={styles.roomInput}
									autoFocus
								/>
							</div>

							{error && <div className={styles.errorMessage}>{error}</div>}

							<div className={styles.modalActions}>
								<button
									type='button'
									onClick={closeModalMenu}
									className={styles.cancelButton}
								>
									Отмена
								</button>
								<button
									type='submit'
									disabled={addRoomLoading || !roomName.trim()}
									className={styles.createButton}
								>
									{addRoomLoading ? 'Создание...' : 'Создать'}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</>
	)
}

export default ToolsbarAddRooms
