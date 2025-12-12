import { useEffect, useRef, useState } from 'react'
import { Socket } from 'socket.io-client'
import TurndownService from 'turndown'
import { useUserKeys } from '../../../hooks/useGenerateUserKeys'
import { useUserKeysStore } from '../../../store/userKeys'

import styles from './SendMessage.module.css'

import type { SelectedChat, User } from '../../type'

interface SendMessageProps {
	selectedChat: SelectedChat | null
	socket: typeof Socket | null
	isSocketConnected: boolean
	updateChatLastMessage: (
		chatId: string,
		newMessage: { text: string; senderName?: string }
	) => void
}

interface ContextMenuPosition {
	x: number
	y: number
}

function SendMessage({
	selectedChat,
	socket,
	isSocketConnected,
	updateChatLastMessage,
}: SendMessageProps) {
	const { privateKey } = useUserKeysStore()
	const { deriveSharedKey, encryptMessage } = useUserKeys()
	const editorRef = useRef<HTMLDivElement>(null)
	const contextMenuRef = useRef<HTMLDivElement>(null)
	const [text, setText] = useState('') // Markdown
	const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(
		null
	)
	const [selectedText, setSelectedText] = useState('')
	const [savedSelection, setSavedSelection] = useState<Range | null>(null)
	const [showLinkInput, setShowLinkInput] = useState(false)
	const [linkUrl, setLinkUrl] = useState('')
	const [showCodeInput, setShowCodeInput] = useState(false)
	const [codeLanguage, setCodeLanguage] = useState('')

	const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			handleSend()
		}
	}

	const turndown = new TurndownService({
		codeBlockStyle: 'fenced',
		emDelimiter: '_',
	})

	// кастом для underline
	turndown.addRule('underline', {
		filter: ['u'],
		replacement: content => `__${content}__`,
	})

	// Зачеркнутый
	turndown.addRule('strikethrough', {
		filter: node =>
			node.nodeName === 'S' ||
			node.nodeName === 'STRIKE' ||
			node.nodeName === 'DEL',
		replacement: content => `~${content}~`,
	})

	// Ссылки
	turndown.addRule('link', {
		filter: ['a'],
		replacement: (content, node) => {
			const href = (node as HTMLLinkElement).getAttribute('href')
			return href ? `[${content}](${href})` : content
		},
	})

	// Код
	turndown.addRule('code', {
		filter: ['code', 'pre'],
		replacement: (content, node) => {
			const element = node as HTMLElement
			const isBlock =
				element.nodeName === 'PRE' || element.parentElement?.nodeName === 'PRE'

			if (isBlock) {
				const language = element.getAttribute('data-language') || ''
				const fence = '```'
				return `\n\n${fence}${language}\n${content}\n${fence}\n\n`
			} else {
				return `\`${content}\``
			}
		},
	})

	// Получаем пользователя из localStorage
	const user: User | null = JSON.parse(localStorage.getItem('user') || 'null')

	// Функция для сохранения и восстановления выделения
	const saveSelection = (): Range | null => {
		const selection = window.getSelection()
		if (
			selection &&
			selection.rangeCount > 0 &&
			editorRef.current?.contains(selection.anchorNode)
		) {
			return selection.getRangeAt(0)
		}
		return null
	}

	const restoreSelection = (range: Range | null) => {
		if (range && editorRef.current) {
			const selection = window.getSelection()
			selection?.removeAllRanges()
			selection?.addRange(range)
		}
	}

	// Функция для обновления состояния Markdown
	const updateMarkdownState = () => {
		if (editorRef.current) {
			const html = editorRef.current.innerHTML || ''
			// console.log("HTML для конвертации:", html);

			const markdown = turndown.turndown(html)
			// console.log("Markdown после turndown:", markdown);

			const finalMarkdown = markdown.replace(/\\([*_~`[\]()])/g, '$1')
			// console.log("Final Markdown:", finalMarkdown);

			setText(finalMarkdown)
		}
	}

	// Обработчик контекстного меню
	const handleContextMenu = (e: React.MouseEvent) => {
		e.preventDefault()

		const selection = window.getSelection()
		const selectedText = selection?.toString().trim() || ''

		const anchorNode = selection?.anchorNode
		const isInEditor =
			anchorNode && editorRef.current?.contains(anchorNode as Node)

		if (selectedText && isInEditor) {
			setSelectedText(selectedText)
			const range = saveSelection()
			setContextMenu({
				x: e.clientX + 30,
				y: e.clientY - 300,
			})
			setShowLinkInput(false)
			setShowCodeInput(false)
			setLinkUrl('')
			setCodeLanguage('')
			setSavedSelection(range)
		} else {
			setContextMenu(null)
		}
	}

	// Закрытие контекстного меню при клике вне его
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				contextMenuRef.current &&
				!contextMenuRef.current.contains(e.target as Node)
			) {
				setContextMenu(null)
				setShowLinkInput(false)
				setShowCodeInput(false)
				setLinkUrl('')
				setCodeLanguage('')
			}
		}

		document.addEventListener('mousedown', handleClickOutside)
		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [])

	// Форматирование через контекстное меню
	const formatWithContextMenu = (command: string, value?: string) => {
		if (!editorRef.current) return

		// Сохраняем выделение
		const savedRange = saveSelection()

		restoreSelection(savedSelection)

		if (value) {
			document.execCommand(command, false, value)
		} else {
			document.execCommand(command, false)
		}

		// Восстанавливаем выделение и обновляем состояние
		restoreSelection(savedRange)
		updateMarkdownState()

		setContextMenu(null)
		setShowLinkInput(false)
		setShowCodeInput(false)
		setLinkUrl('')
		setCodeLanguage('')
		setSelectedText('')
		setSavedSelection(null)
		editorRef.current.focus()
	}

	// Обработчик добавления ссылки
	const handleAddLink = () => {
		if (linkUrl.trim()) {
			let url = linkUrl.trim()
			if (!url.startsWith('http://') && !url.startsWith('https://')) {
				url = 'https://' + url
			}
			formatWithContextMenu('createLink', url)
		}
	}

	// Альтернативный подход для кода - более надежный
	const handleAddCodeAlt = (isBlock: boolean = false) => {
		// console.log("=== handleAddCodeAlt вызван ===");
		// console.log("selectedText:", selectedText);
		// console.log("isBlock:", isBlock);
		// console.log("codeLanguage:", codeLanguage);
		// console.log("editorRef.current:", editorRef.current);

		if (selectedText && editorRef.current) {
			let markdownCode = ''

			if (isBlock) {
				const language = codeLanguage.trim()
				markdownCode = `\`\`\`${language}\n${selectedText}\n\`\`\``
			} else {
				markdownCode = `\`${selectedText}\``
			}

			// console.log("markdownCode для вставки:", markdownCode);

			restoreSelection(savedSelection)

			// Вставляем Markdown напрямую в редактор
			const selection = window.getSelection()
			// console.log("selection:", selection);
			// console.log("rangeCount:", selection?.rangeCount);

			if (selection && selection.rangeCount > 0) {
				const range = selection.getRangeAt(0)
				// console.log("range до удаления:", range.toString());
				// console.log("range содержимое до:", range.cloneContents().textContent);

				range.deleteContents()
				// console.log("range после удаления:", range.toString());

				const textNode = document.createTextNode(markdownCode)
				range.insertNode(textNode)

				// console.log("textNode вставлен:", textNode.textContent);

				// Перемещаем курсор после вставленного текста
				range.setStartAfter(textNode)
				range.setEndAfter(textNode)
				selection.removeAllRanges()
				selection.addRange(range)

				// console.log("range после вставки:", range.toString());
			} else {
				// console.log("Нет активного выделения!");
			}

			// Проверяем содержимое редактора после вставки
			// console.log(
			//   "editor innerHTML после вставки:",
			//   editorRef.current.innerHTML
			// );

			updateMarkdownState()

			// Проверяем состояние после обновления
			// console.log("text состояние после updateMarkdownState:", text);

			setContextMenu(null)
			setShowCodeInput(false)
			setCodeLanguage('')
			setSelectedText('')
			setSavedSelection(null)
			editorRef.current.focus()
		} else {
			// console.log("Условие не выполнено - нет selectedText или editorRef");
		}
	}

	const handleSend = async () => {
		if (!socket || !user || !selectedChat) return

		const html = editorRef.current?.innerHTML || ''
		let markdown = turndown.turndown(html)
		markdown = markdown.replace(/\\([*_~`[\]()])/g, '$1')

		if (!markdown.trim()) return

		if (!privateKey) {
			console.error('❌ Не удалось загрузить приватный ключ')
			return
		}

		// console.log(selectedChat)

		const peerPublicKey =
			selectedChat.type === 'private'
				? selectedChat.chat.user1.id === user.id
					? selectedChat.chat.user2.publicKey
					: selectedChat.chat.user1.publicKey
				: null

		if (!peerPublicKey) {
			console.error('❌ Не найден публичный ключ собеседника')
			return
		}

		const sharedKey = await deriveSharedKey(peerPublicKey)
		const encrypted = await encryptMessage(sharedKey, markdown)

		// console.log('🔐 Сообщение зашифровано и готово к отправке:', encrypted)
		const ivB64 = btoa(String.fromCharCode(...encrypted.iv))
		const ciphertextB64 = btoa(String.fromCharCode(...encrypted.ciphertext))

		if (selectedChat.type === 'group') {
			// Сообщение в групповой чат
			socket.emit('sendGroupChatMessage', {
				groupId: selectedChat.chat.id,
				senderId: user.id,
				text: ciphertextB64,
				iv: ivB64,
			})
			updateChatLastMessage(selectedChat.chat.id, {
				text: markdown,
				senderName: user.name,
			})
		} else {
			// Сообщение в приватный чат
			socket.emit('sendPrivateChatMessage', {
				chatId: selectedChat.chat.id,
				senderId: user.id,
				text: ciphertextB64,
				iv: ivB64,
			})
			updateChatLastMessage(selectedChat.chat.id, {
				text: markdown,
				senderName: user.name,
			})

			console.log(markdown)
		}

		// Очистка редактора
		if (editorRef.current) editorRef.current.innerHTML = ''
		setText('')
	}

	const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		handleSend()
	}

	// Также добавим логирование в handleInput
	const handleInput = () => {
		updateMarkdownState()
	}

	return (
		<div className={styles.wrapper}>
			{/* Контекстное меню */}
			{contextMenu && (
				<div
					ref={contextMenuRef}
					className={styles.contextMenu}
					style={{
						position: 'fixed',
						left: contextMenu.x,
						top: contextMenu.y,
						zIndex: 1000,
					}}
				>
					{!showLinkInput && !showCodeInput ? (
						<>
							<div className={styles.contextMenuHeader}>
								Форматировать: "{selectedText}"
							</div>
							<button
								type='button'
								onClick={() => formatWithContextMenu('bold')}
								className={styles.contextMenuItem}
							>
								<strong>Жирный</strong>
							</button>
							<button
								type='button'
								onClick={() => formatWithContextMenu('italic')}
								className={styles.contextMenuItem}
							>
								<em>Курсив</em>
							</button>
							<button
								type='button'
								onClick={() => formatWithContextMenu('underline')}
								className={styles.contextMenuItem}
							>
								<u>Подчеркнутый</u>
							</button>
							<button
								type='button'
								onClick={() => formatWithContextMenu('strikeThrough')}
								className={styles.contextMenuItem}
							>
								<s>Зачеркнутый</s>
							</button>
							<button
								type='button'
								onClick={() => setShowLinkInput(true)}
								className={styles.contextMenuItem}
							>
								🔗 Ссылка
							</button>
							<button
								type='button'
								onClick={() => setShowCodeInput(true)}
								className={styles.contextMenuItem}
							>
								{'</>'} Код
							</button>
							<button
								type='button'
								onClick={() => formatWithContextMenu('removeFormat')}
								className={styles.contextMenuItem}
							>
								Очистить формат
							</button>
						</>
					) : showLinkInput ? (
						<>
							<div className={styles.contextMenuHeader}>
								Добавить ссылку для: "{selectedText}"
							</div>
							<div className={styles.linkInputContainer}>
								<input
									type='text'
									placeholder='https://example.com'
									value={linkUrl}
									onChange={e => setLinkUrl(e.target.value)}
									className={styles.linkInput}
									autoFocus
								/>
								<div className={styles.linkButtons}>
									<button
										type='button'
										onClick={handleAddLink}
										className={styles.linkButton}
									>
										Добавить
									</button>
									<button
										type='button'
										onClick={() => setShowLinkInput(false)}
										className={styles.linkButton}
									>
										Отмена
									</button>
								</div>
							</div>
						</>
					) : (
						<>
							<div className={styles.contextMenuHeader}>
								Форматировать код: "{selectedText}"
							</div>
							<div className={styles.codeInputContainer}>
								<div className={styles.codeTypeButtons}>
									<button
										type='button'
										onClick={() => handleAddCodeAlt(false)}
										className={styles.codeTypeButton}
									>
										Строчный код (`code`)
									</button>
									<button
										type='button'
										onClick={() => handleAddCodeAlt(true)}
										className={styles.codeTypeButton}
									>
										Блочный код (```code```)
									</button>
								</div>
								{/* <input
                  type="text"
                  placeholder="Язык (javascript, python, etc.) - опционально"
                  value={codeLanguage}
                  onChange={(e) => setCodeLanguage(e.target.value)}
                  className={styles.codeInput}
                  autoFocus
                /> */}
								<div className={styles.codeButtons}>
									{/* <button
                    type="button"
                    onClick={() => handleAddCodeAlt(true)}
                    className={styles.codeButton}
                  >
                    Добавить с языком
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCodeLanguage("");
                      handleAddCodeAlt(true);
                    }}
                    className={styles.codeButton}
                  >
                    Добавить без языка
                  </button> */}
									<button
										type='button'
										onClick={() => setShowCodeInput(false)}
										className={styles.codeButton}
									>
										Отмена
									</button>
								</div>
							</div>
						</>
					)}
				</div>
			)}

			{/* форма */}
			<form className={styles.container} onSubmit={onSubmit}>
				{text === '' && (
					<div className={styles.placeholder}>Enter your message...</div>
				)}
				<div
					ref={editorRef}
					className={styles.editor}
					contentEditable
					onInput={handleInput}
					onKeyDown={handleKeyDown}
					onContextMenu={handleContextMenu}
					suppressContentEditableWarning
				></div>
				<button type='submit' disabled={!isSocketConnected || !text.trim()}>
					Send
				</button>
			</form>
		</div>
	)
}

export default SendMessage
