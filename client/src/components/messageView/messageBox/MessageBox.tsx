import { useUserKeys } from '../../../hooks/useGenerateUserKeys'

import styles from './MessageBox.module.css'

import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'

import { useEffect, useState } from 'react'
import type { SelectedChat, User } from '../../type'

interface MessageBoxProps {
	id: string
	text: string
	iv: string
	senderId: string
	chatId: string
	sentAt: string
	updatedAt: string
	sender?: User
	privateChatId?: string | null
	groupId?: string | null
	selectedChat: SelectedChat | null
}

function MessageBox({
	text,
	iv,
	sentAt,
	sender,
	selectedChat,
}: MessageBoxProps) {
	const [decrypted, setDecrypted] = useState<string | null>(null)
	const user: User | null = JSON.parse(localStorage.getItem('user') || 'null')
	const { deriveSharedKey, decryptMessage } = useUserKeys()

	useEffect(() => {
		if (!selectedChat || !user) return

		const peerPublicKey =
			selectedChat.type === 'private'
				? selectedChat.chat.user1.id === user.id
					? selectedChat.chat.user2.publicKey
					: selectedChat.chat.user1.publicKey
				: null

		console.log('peerPublicKey', peerPublicKey)
		// console.log(user.id)
		// const test =
		// 	selectedChat.type === 'private'
		// 		? selectedChat.chat.user1.id === user.id
		// 			? console.log('user2: ', selectedChat.chat.user2.publicKey)
		// 			: console.log('user1: ', selectedChat.chat.user1.publicKey)
		// 		: null
		// console.log('test', test)
		// console.log(selectedChat)

		if (!peerPublicKey || typeof peerPublicKey !== 'string') return

		async function runDecryption() {
			try {
				const ivArray = new Uint8Array(
					atob(iv)
						.split('')
						.map(c => c.charCodeAt(0))
				)
				const textArray = new Uint8Array(
					atob(text)
						.split('')
						.map(c => c.charCodeAt(0))
				)

				const sharedKey = await deriveSharedKey(peerPublicKey as string)
				const decryptedText = await decryptMessage(
					sharedKey,
					ivArray,
					textArray
				)

				setDecrypted(decryptedText)
			} catch (err) {
				console.error('Ошибка расшифровки:', err)
			}
		}

		runDecryption()
	}, [iv, text, selectedChat, user])

	const processText = (text: string): string => {
		return text
			.replace(/__([^_]+)__/g, '<u>$1</u>')
			.replace(/~([^~]+)~/g, '<s>$1</s>')
	}

	const components = {
		// Заменяем p на div чтобы избежать ошибки с pre внутри p
		p: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
		u: ({ children }: { children?: React.ReactNode }) => (
			<span style={{ textDecoration: 'underline' }}>{children}</span>
		),
		s: ({ children }: { children?: React.ReactNode }) => (
			<span style={{ textDecoration: 'line-through' }}>{children}</span>
		),
		code: ({
			children,
			inline,
		}: {
			children?: React.ReactNode
			inline?: boolean
		}) => {
			if (inline) {
				return (
					<code
						style={{
							fontFamily: 'monospace',
							backgroundColor: '#0a141e',
							color: '#9dc6f2',
							padding: '2px 4px',
							borderRadius: '3px',
						}}
					>
						{children}
					</code>
				)
			}
			// Блок кода (многострочный)
			return (
				<pre
					style={{
						fontFamily: 'monospace',
						backgroundColor: '#0a141e',
						color: '#9dc6f2',
						padding: '12px',
						borderRadius: '3px',
						overflow: 'auto',
						margin: '10px 0',
					}}
				>
					<code>{children}</code>
				</pre>
			)
		},
		a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
			<a href={href} style={{ color: '#007acc', textDecoration: 'underline' }}>
				{children}
			</a>
		),
	}

	const processedText = processText(decrypted ? decrypted : '')

	return (
		<div
			className={
				user?.id === sender?.id
					? styles.MyMessageWrapper
					: styles.message_wrapper
			}
		>
			<div
				className={
					user?.id === sender?.id ? styles.Mycontainer : styles.container
				}
			>
				{user?.id === sender?.id ? null : (
					<h2 className={styles.author}>{sender!.name}</h2>
				)}
				<div className={styles.message}>
					<div className={styles.messageContent}>
						<ReactMarkdown
							remarkPlugins={[remarkGfm]}
							rehypePlugins={[rehypeRaw]}
							components={components}
						>
							{processedText}
						</ReactMarkdown>
					</div>
					<span
						className={
							user?.id === sender?.id ? styles.MyTimestamp : styles.timestamp
						}
					>
						{new Date(sentAt).toLocaleString(undefined, {
							// month: "numeric",
							// day: "numeric",
							hour: '2-digit',
							minute: '2-digit',
						})}
					</span>
				</div>
			</div>
		</div>
	)
}

export default MessageBox

// TODO: Сделать формат для комнат
// TODO: Сделать формат для списка users
// TODO: добавить форматирование текста (markdown)
