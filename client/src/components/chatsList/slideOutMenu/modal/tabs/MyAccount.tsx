import React, { useEffect, useMemo, useState } from 'react'
import styles from './MyAccount.module.css'

import DefaultUserAvatar from '../../../../../assets/icons/DefaultUserAvatar.svg?react'

export const MyAccount: React.FC = () => {
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
	const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const user = useMemo(() => {
		return JSON.parse(localStorage.getItem('user') || 'null')
	}, [])

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return

		setSelectedFile(file)
		setAvatarPreview(URL.createObjectURL(file))
	}

	const handleUpload = async () => {
		if (!selectedFile) return

		setLoading(true)
		setError(null)

		try {
			const formData = new FormData()

			// GraphQL mutation
			const operations = {
				query: `
          mutation UploadUserAvatar($file: Upload!) {
            uploadUserAvatar(file: $file) {
              id
              url
            }
          }
        `,
				variables: { file: null },
			}

			const map = { '0': ['variables.file'] }

			formData.append('operations', JSON.stringify(operations))
			formData.append('map', JSON.stringify(map))
			formData.append('0', selectedFile)
			const token = localStorage.getItem('accessToken')

			const response = await fetch(
				`${import.meta.env.VITE_URL_BACKEND}/graphql`,
				{
					method: 'POST',
					credentials: 'include',
					headers: {
						'Apollo-Require-Preflight': 'true', // важно для CSRF
						Authorization: `Bearer ${token}`,
					},

					body: formData,
				}
			)

			const result = await response.json()

			if (result.errors) {
				throw new Error(
					result.errors[0].message || 'Ошибка при загрузке аватара'
				)
			}

			setAvatarUrl(result.data.uploadUserAvatar.url)
			setAvatarPreview(null)
			setSelectedFile(null)
		} catch (err) {
			console.error(err)
		} finally {
			setLoading(false)
		}
	}

	// Очистка object URL при размонтировании / смене файла
	useEffect(() => {
		console.log(avatarPreview, avatarUrl)
		return () => {
			if (avatarPreview) URL.revokeObjectURL(avatarPreview)
		}
	}, [avatarPreview])

	return (
		<div className={styles.container}>
			<div style={{ marginTop: 20 }}>
				<h4>Смена аватарки</h4>

				<div style={{ marginBottom: 12 }}>
					{avatarPreview || avatarUrl || user?.avatar ? (
						<img
							src={avatarPreview || avatarUrl || user?.avatar.url}
							alt='avatar'
							style={{
								width: 110,
								height: 110,
								borderRadius: '50%',
								objectFit: 'cover',
								border: '2px solid #ccc',
							}}
						/>
					) : (
						<DefaultUserAvatar
							style={{ width: 110, height: 110, borderRadius: '50%' }}
						/>
					)}
				</div>

				<input
					type='file'
					accept='image/*'
					onChange={handleFileChange}
					disabled={loading}
				/>

				{selectedFile && (
					<button
						onClick={handleUpload}
						disabled={loading}
						style={{ marginTop: 10 }}
					>
						{loading ? 'Загрузка...' : 'Загрузить'}
					</button>
				)}

				{error && <p style={{ color: 'red' }}>{error}</p>}
			</div>
		</div>
	)
}
