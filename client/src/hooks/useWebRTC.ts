// useWebRTC.tsx (исправлённый)
import { useCallback, useEffect, useRef, useState } from 'react'
import { Socket } from 'socket.io-client'

interface WebRTCSignal {
	type: 'offer' | 'answer' | 'ice-candidate'
	offer?: RTCSessionDescriptionInit
	answer?: RTCSessionDescriptionInit
	candidate?: RTCIceCandidateInit // при передаче по сокету используем сериализованный объект
}

interface SocketSignalData {
	from: string
	signal: WebRTCSignal
}

export interface IncomingCall {
	callId: string
	from: string
	fromSocketId: string
	roomId: string
	type: 'audio' | 'video'
	callerName: string
}

interface useWebRTCProps {
	socket: typeof Socket | null
	roomId: string | null
	currentUserId: string
	onCallStatusChange: (status: string) => void
	onCallActiveChange: (active: boolean) => void
	onConnectedChange: (connected: boolean) => void
}

export function useWebRTC({
	socket,
	roomId,
	currentUserId,
	onCallStatusChange,
	onCallActiveChange,
	onConnectedChange,
}: useWebRTCProps) {
	// Refs для WebRTC
	const localAudioRef = useRef<HTMLAudioElement>(null)
	const remoteAudioRef = useRef<HTMLAudioElement>(null)

	// WebRTC variables
	const localStreamRef = useRef<MediaStream | null>(null)
	const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
	const currentRoomRef = useRef<string | null>(null)
	const currentCallRef = useRef<string | null>(null)
	const pendingIceCandidatesRef = useRef<Map<string, RTCIceCandidate[]>>(
		new Map()
	)
	const connectionRolesRef = useRef<Map<string, 'initiator' | 'responder'>>(
		new Map()
	)

	// State для входящих звонков
	const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)
	const [isCallInitiator, setIsCallInitiator] = useState<boolean>(false)

	// Update status message
	const updateCallStatus = useCallback(
		(message: string) => {
			onCallStatusChange(message)
			console.log('Call Status:', message)
		},
		[onCallStatusChange]
	)

	// Определяем, кто инициирует соединение между двумя пользователями.
	// Простая детерминированная стратегия: инициатор — тот у кого строковый id > другого (можно поменять на другой критерий).
	const shouldInitiate = useCallback(
		(otherUserId: string) => {
			// если одинаковые — не инициируем
			if (!currentUserId || !otherUserId) return false
			return currentUserId > otherUserId
		},
		[currentUserId]
	)

	// Create peer connection for a specific user
	const createPeerConnection = useCallback(
		(
			userId: string,
			role: 'initiator' | 'responder' = 'initiator'
		): RTCPeerConnection => {
			updateCallStatus(
				`Создание соединения с пользователем ${userId.slice(-6)} (${role})`
			)

			const pc = new RTCPeerConnection({
				iceServers: [
					{ urls: 'stun:stun.l.google.com:19302' },
					{ urls: 'stun:stun1.l.google.com:19302' },
				],
			})

			// Add local tracks
			if (localStreamRef.current) {
				localStreamRef.current.getTracks().forEach(track => {
					try {
						pc.addTrack(track, localStreamRef.current!)
					} catch (e) {
						console.warn('Ошибка добавления трека:', e)
					}
				})
			}

			// Handle remote stream
			pc.ontrack = (event: RTCTrackEvent) => {
				updateCallStatus(
					`✅ Получен аудиопоток от пользователя ${userId.slice(-6)}`
				)
				const remoteStream = event.streams && event.streams[0]
				if (remoteStream && remoteAudioRef.current) {
					remoteAudioRef.current.srcObject = remoteStream
					onCallActiveChange(true)
				}
			}

			// ICE candidates
			pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
				if (event.candidate && socket) {
					// отправляем по сети сериализованный кандидат
					socket.emit('webrtc-signal', {
						to: userId,
						signal: {
							type: 'ice-candidate',
							candidate: event.candidate.toJSON(),
						} as WebRTCSignal,
					})
				}
			}

			// Connection state changes
			pc.onconnectionstatechange = () => {
				updateCallStatus(
					`Соединение с ${userId.slice(-6)}: ${pc.connectionState}`
				)

				if (pc.connectionState === 'connected') {
					onCallActiveChange(true)
				} else if (
					pc.connectionState === 'disconnected' ||
					pc.connectionState === 'failed'
				) {
					onCallActiveChange(false)
				}
			}

			// Обрабатываем ожидающие ICE кандидаты после установки remote description
			pc.onsignalingstatechange = async () => {
				// Когда signaling стал stable — применяем отложенные кандидаты
				if (pc.signalingState === 'stable') {
					const pendingCandidates = pendingIceCandidatesRef.current.get(userId)
					if (pendingCandidates && pendingCandidates.length > 0) {
						updateCallStatus(
							`🔄 Добавление ${pendingCandidates.length} ожидающих ICE кандидатов`
						)
						for (const candidate of pendingCandidates) {
							try {
								await pc.addIceCandidate(candidate)
							} catch (err) {
								console.error(
									'Error adding pending ICE candidate in onsignaling:',
									err
								)
							}
						}
						pendingIceCandidatesRef.current.delete(userId)
					}
				}
			}

			connectionRolesRef.current.set(userId, role)

			return pc
		},
		[socket, updateCallStatus, onCallActiveChange]
	)

	// Create and send offer (только для инициаторов)
	const createOffer = useCallback(
		async (userId: string): Promise<void> => {
			if (userId === currentUserId) {
				console.log('Skipping offer to self')
				return
			}

			// Детерминируем, кто должен инициировать
			if (!shouldInitiate(userId)) {
				updateCallStatus(
					`🔁 Не инициируем оффер для ${userId.slice(
						-6
					)} (по правилам детерминации)`
				)
				return
			}

			// Если мы уже отвечаем на оффер от этого пользователя, не создаем свой оффер
			if (connectionRolesRef.current.get(userId) === 'responder') {
				updateCallStatus(
					`⏳ Уже отвечаем на оффер от ${userId.slice(-6)}, ожидаем завершения`
				)
				return
			}

			// Если соединение уже существует и работает, не создаем новое
			const existingPc = peerConnectionsRef.current.get(userId)
			if (
				existingPc &&
				(existingPc.connectionState === 'connected' ||
					existingPc.signalingState === 'stable')
			) {
				console.log(`Already connected to ${userId.slice(-6)}`)
				return
			}

			// Закрываем существующее соединение если есть (чистим)
			if (existingPc) {
				try {
					existingPc.close()
				} catch (error) {
					console.warn(error)
				}
				peerConnectionsRef.current.delete(userId)
				pendingIceCandidatesRef.current.delete(userId)
				connectionRolesRef.current.delete(userId)
			}

			// Назначаем роль и создаём pc
			connectionRolesRef.current.set(userId, 'initiator')
			const pc = createPeerConnection(userId, 'initiator')
			peerConnectionsRef.current.set(userId, pc)

			try {
				// Небольшая задержка для стабилизации
				await new Promise(resolve => setTimeout(resolve, 250))

				const offer = await pc.createOffer()
				await pc.setLocalDescription(offer)

				// Отправляем сериализованный оффер
				socket?.emit('webrtc-signal', {
					to: userId,
					signal: {
						type: 'offer',
						offer: offer,
					} as WebRTCSignal,
				})

				updateCallStatus(
					`📤 Отправлено предложение пользователю ${userId.slice(-6)}`
				)
			} catch (error) {
				console.error('Error creating offer:', error)
				updateCallStatus(
					`❌ Ошибка создания предложения: ${(error as Error).message}`
				)
				// Очищаем неудачное соединение
				try {
					pc.close()
				} catch (error) {
					console.warn(error)
				}
				peerConnectionsRef.current.delete(userId)
				connectionRolesRef.current.delete(userId)
			}
		},
		[
			socket,
			createPeerConnection,
			updateCallStatus,
			currentUserId,
			shouldInitiate,
		]
	)

	// Handle incoming offer (становимся отвечающим)
	const handleOffer = useCallback(
		async (from: string, offer: RTCSessionDescriptionInit): Promise<void> => {
			updateCallStatus(
				`📨 Получено предложение от пользователя ${from.slice(-6)}`
			)

			// Если мы уже инициаторы для этого соединения, игнорируем входящий оффер
			if (connectionRolesRef.current.get(from) === 'initiator') {
				updateCallStatus(
					`🔄 Уже инициатор для ${from.slice(-6)}, игнорируем входящий оффер`
				)
				return
			}

			// Закрываем существующее соединение если есть
			const existingPc = peerConnectionsRef.current.get(from)
			if (existingPc) {
				try {
					existingPc.close()
				} catch (error) {
					console.warn(error)
				}
				peerConnectionsRef.current.delete(from)
				pendingIceCandidatesRef.current.delete(from)
				connectionRolesRef.current.delete(from)
			}

			// Создаём pc как responder
			connectionRolesRef.current.set(from, 'responder')
			const pc = createPeerConnection(from, 'responder')
			peerConnectionsRef.current.set(from, pc)

			try {
				// Устанавливаем remote description
				await pc.setRemoteDescription(new RTCSessionDescription(offer))
				// Создаём и отправляем answer
				const answer = await pc.createAnswer()
				await pc.setLocalDescription(answer)

				socket?.emit('webrtc-signal', {
					to: from,
					signal: {
						type: 'answer',
						answer: answer,
					} as WebRTCSignal,
				})

				updateCallStatus(`📤 Отправлен ответ пользователю ${from.slice(-6)}`)

				// Обрабатываем ожидающие ICE кандидаты (если были)
				const pendingCandidates = pendingIceCandidatesRef.current.get(from)
				if (pendingCandidates && pendingCandidates.length > 0) {
					updateCallStatus(
						`🔄 Добавление ${pendingCandidates.length} ожидающих ICE кандидатов`
					)
					for (const candidate of pendingCandidates) {
						try {
							await pc.addIceCandidate(candidate)
						} catch (error) {
							console.error('Error adding pending ICE candidate:', error)
						}
					}
					pendingIceCandidatesRef.current.delete(from)
				}
			} catch (error) {
				console.error('Error handling offer:', error)
				updateCallStatus(
					`❌ Ошибка обработки предложения: ${(error as Error).message}`
				)
				try {
					pc.close()
				} catch (error) {
					console.warn(error)
				}
				peerConnectionsRef.current.delete(from)
				connectionRolesRef.current.delete(from)
			}
		},
		[socket, createPeerConnection, updateCallStatus]
	)

	// Handle incoming answer
	const handleAnswer = useCallback(
		async (from: string, answer: RTCSessionDescriptionInit): Promise<void> => {
			updateCallStatus(`📨 Получен ответ от пользователя ${from.slice(-6)}`)

			const pc = peerConnectionsRef.current.get(from)
			if (!pc) {
				updateCallStatus(`❌ Соединение с ${from.slice(-6)} не найдено`)
				return
			}

			// Проверяем, что мы инициаторы для этого соединения
			if (connectionRolesRef.current.get(from) !== 'initiator') {
				updateCallStatus(
					`⚠️ Получили ответ, но не являемся инициатором для ${from.slice(-6)}`
				)
				// всё равно пробуем установить remoteDescription если возможно
			}

			try {
				// Некоторые браузеры/состояния требуют гибкости — не жёстко проверяем signalingState
				await pc.setRemoteDescription(new RTCSessionDescription(answer))
				updateCallStatus(
					`✅ Соединение установлено с пользователем ${from.slice(-6)}`
				)

				// Обрабатываем ожидающие ICE кандидаты
				const pendingCandidates = pendingIceCandidatesRef.current.get(from)
				if (pendingCandidates && pendingCandidates.length > 0) {
					updateCallStatus(
						`🔄 Добавление ${pendingCandidates.length} ожидающих ICE кандидатов`
					)
					for (const candidate of pendingCandidates) {
						try {
							await pc.addIceCandidate(candidate)
						} catch (error) {
							console.error('Error adding pending ICE candidate:', error)
						}
					}
					pendingIceCandidatesRef.current.delete(from)
				}
			} catch (error) {
				console.error('Error handling answer:', error)
				updateCallStatus(
					`❌ Ошибка обработки ответа: ${(error as Error).message}`
				)
			}
		},
		[updateCallStatus]
	)

	// Handle ICE candidate
	const handleIceCandidate = useCallback(
		async (from: string, candidateObj: RTCIceCandidateInit): Promise<void> => {
			// Входящий кандидат приходит как plain object — создаём RTCIceCandidate
			let candidate: RTCIceCandidate
			try {
				candidate = new RTCIceCandidate(candidateObj)
			} catch (err) {
				console.error('Invalid ICE candidate received', err)
				return
			}

			const pc = peerConnectionsRef.current.get(from)

			if (!pc) {
				updateCallStatus(
					`⏳ ICE кандидат от ${from.slice(-6)} ожидает соединения`
				)
				// Сохраняем кандидат для будущего использования
				if (!pendingIceCandidatesRef.current.has(from)) {
					pendingIceCandidatesRef.current.set(from, [])
				}
				pendingIceCandidatesRef.current.get(from)!.push(candidate)
				return
			}

			try {
				// Если remoteDescription уже установлен — можно сразу добавить
				if (pc.remoteDescription && pc.remoteDescription.type) {
					await pc.addIceCandidate(candidate)
					updateCallStatus(
						`🧊 Обмен ICE-кандидатами с пользователем ${from.slice(-6)}`
					)
				} else {
					// Откладываем добавление кандидата
					updateCallStatus(
						`⏳ ICE кандидат от ${from.slice(-6)} ожидает remote description`
					)
					if (!pendingIceCandidatesRef.current.has(from)) {
						pendingIceCandidatesRef.current.set(from, [])
					}
					pendingIceCandidatesRef.current.get(from)!.push(candidate)
				}
			} catch (error) {
				console.error('Error adding ICE candidate:', error)
			}
		},
		[updateCallStatus]
	)

	// Handle incoming signal
	const handleSignal = useCallback(
		async (data: SocketSignalData): Promise<void> => {
			const { from, signal } = data

			// Игнорируем сигналы от самого себя
			if (from === currentUserId) {
				console.log('Ignoring signal from self')
				return
			}

			console.log(`📨 Received ${signal.type} from ${from.slice(-6)}`)

			try {
				if (signal.type === 'offer') {
					await handleOffer(from, signal.offer!)
				} else if (signal.type === 'answer') {
					await handleAnswer(from, signal.answer!)
				} else if (signal.type === 'ice-candidate') {
					await handleIceCandidate(from, signal.candidate!)
				}
			} catch (error) {
				console.error(`Error handling ${signal.type} signal:`, error)
			}
		},
		[currentUserId, handleOffer, handleAnswer, handleIceCandidate]
	)

	// ==========================
	// 📞 ЛОГИКА ВХОДЯЩИХ ЗВОНКОВ
	// ==========================

	// Инициация звонка
	const initiateCall = useCallback(
		async (
			targetUserId: string,
			type: 'audio' | 'video' = 'audio'
		): Promise<void> => {
			if (!roomId || !socket) {
				alert('Пожалуйста, выберите комнату для звонка')
				return
			}

			try {
				updateCallStatus('🎤 Запрос доступа к микрофону...')

				// Get microphone access
				const stream = await navigator.mediaDevices.getUserMedia({
					audio: {
						echoCancellation: true,
						noiseSuppression: true,
						autoGainControl: true,
					},
					video: false,
				})

				localStreamRef.current = stream
				if (localAudioRef.current) {
					localAudioRef.current.srcObject = stream
				}
				updateCallStatus('✅ Доступ к микрофону получен')

				// Инициируем звонок
				socket.emit('initiate-call', {
					to: targetUserId,
					roomId: roomId,
					type: type,
				})

				setIsCallInitiator(true)
				updateCallStatus('🕐 Ожидание ответа...')
			} catch (error) {
				console.error('Error initiating call:', error)
				if (error instanceof DOMException && error.name === 'NotAllowedError') {
					updateCallStatus('❌ Доступ к микрофону запрещен')
					alert('Для аудиозвонков необходим доступ к микрофону.')
				} else {
					updateCallStatus(`❌ Ошибка: ${(error as Error).message}`)
				}
			}
		},
		[roomId, socket, updateCallStatus]
	)

	// Принятие входящего звонка
	const acceptCall = useCallback(async (): Promise<void> => {
		if (!incomingCall || !socket) return

		try {
			updateCallStatus('🎤 Запрос доступа к микрофону...')

			// Получаем доступ к микрофону
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
				},
				video: false,
			})

			localStreamRef.current = stream
			if (localAudioRef.current) {
				localAudioRef.current.srcObject = stream
			}
			updateCallStatus('✅ Доступ к микрофону получен')

			// Принимаем звонок
			socket.emit('accept-call', {
				callId: incomingCall.callId,
			})

			// Присоединяемся к комнате
			currentRoomRef.current = incomingCall.roomId
			socket.emit('join-room', incomingCall.roomId)
			onConnectedChange(true)

			// ⚡️ Становимся инициатором для этого входящего звонка
			const pc = createPeerConnection(incomingCall.fromSocketId, 'initiator')
			peerConnectionsRef.current.set(incomingCall.fromSocketId, pc)

			const offer = await pc.createOffer()
			await pc.setLocalDescription(offer)

			socket.emit('webrtc-signal', {
				to: incomingCall.fromSocketId,
				signal: { type: 'offer', offer },
			})

			setIncomingCall(null)
			setIsCallInitiator(true)
			updateCallStatus('✅ Звонок принят и оффер отправлен')
		} catch (error) {
			console.error('Error accepting call:', error)
			if (error instanceof DOMException && error.name === 'NotAllowedError') {
				updateCallStatus('❌ Доступ к микрофону запрещен')
				alert('Для аудиозвонков необходим доступ к микрофону.')
			} else {
				updateCallStatus(`❌ Ошибка: ${(error as Error).message}`)
			}
		}
	}, [
		incomingCall,
		socket,
		updateCallStatus,
		onConnectedChange,
		createPeerConnection,
	])

	// Отклонение входящего звонка
	const rejectCall = useCallback(
		(reason?: string): void => {
			if (!incomingCall || !socket) return

			socket.emit('reject-call', {
				callId: incomingCall.callId,
				reason: reason,
			})

			setIncomingCall(null)
			updateCallStatus('❌ Звонок отклонен')
		},
		[incomingCall, socket, updateCallStatus]
	)

	// Отмена исходящего звонка
	const cancelCall = useCallback((): void => {
		if (!currentCallRef.current || !socket) return

		socket.emit('cancel-call', {
			callId: currentCallRef.current,
		})

		currentCallRef.current = null
		setIsCallInitiator(false)

		// Останавливаем локальный поток
		if (localStreamRef.current) {
			localStreamRef.current.getTracks().forEach(track => track.stop())
			localStreamRef.current = null
		}

		updateCallStatus('🚫 Звонок отменен')
	}, [socket, updateCallStatus])

	// Leave call room
	const leaveCallRoom = useCallback((): void => {
		updateCallStatus('Выход из комнаты...')

		// Close all peer connections
		peerConnectionsRef.current.forEach(pc => {
			try {
				pc.close()
			} catch (error) {
				console.warn(error)
			}
		})
		peerConnectionsRef.current.clear()
		pendingIceCandidatesRef.current.clear()
		connectionRolesRef.current.clear()

		// Stop local stream
		if (localStreamRef.current) {
			localStreamRef.current.getTracks().forEach(track => track.stop())
			localStreamRef.current = null
		}

		// Reset UI
		if (localAudioRef.current) {
			localAudioRef.current.srcObject = null
		}
		if (remoteAudioRef.current) {
			remoteAudioRef.current.srcObject = null
		}

		onConnectedChange(false)
		onCallActiveChange(false)
		currentRoomRef.current = null
		currentCallRef.current = null
		setIsCallInitiator(false)

		updateCallStatus('Готов к звонку')
	}, [updateCallStatus, onConnectedChange, onCallActiveChange])

	// Завершение активного звонка
	const endCall = useCallback((): void => {
		if (!socket) return

		socket.emit('end-call', {
			callId: currentCallRef.current,
			roomId: currentRoomRef.current,
		})

		leaveCallRoom()
		currentCallRef.current = null
		setIsCallInitiator(false)
		setIncomingCall(null)
	}, [socket, leaveCallRoom])

	// Join room for calls (для автоматического присоединения)
	const joinCallRoom = useCallback(
		async (roomIdToJoin: string): Promise<void> => {
			if (!roomIdToJoin || !socket) return

			try {
				if (!localStreamRef.current) {
					updateCallStatus('🎤 Запрос доступа к микрофону...')
					const stream = await navigator.mediaDevices.getUserMedia({
						audio: {
							echoCancellation: true,
							noiseSuppression: true,
							autoGainControl: true,
						},
						video: false,
					})
					localStreamRef.current = stream
					if (localAudioRef.current) {
						localAudioRef.current.srcObject = stream
					}
					updateCallStatus('✅ Доступ к микрофону получен')
				}

				currentRoomRef.current = roomIdToJoin
				socket.emit('join-room', roomIdToJoin)
				onConnectedChange(true)
				updateCallStatus('🔌 Подключено к комнате звонков')
			} catch (error) {
				console.error('Error joining room:', error)
				if (error instanceof DOMException && error.name === 'NotAllowedError') {
					updateCallStatus('❌ Доступ к микрофону запрещен')
				} else {
					updateCallStatus(`❌ Ошибка: ${(error as Error).message}`)
				}
			}
		},
		[socket, updateCallStatus, onConnectedChange]
	)

	// Start audio call (старая функция - теперь для немедленного звонка)
	const startAudioCall = useCallback(async (): Promise<void> => {
		if (!roomId || !socket) {
			alert('Пожалуйста, выберите комнату для звонка')
			return
		}

		if (currentRoomRef.current) {
			endCall()
		} else {
			updateCallStatus('❌ Необходимо указать пользователя для звонка')
		}
	}, [roomId, socket, endCall, updateCallStatus])

	// ==========================
	// ОБРАБОТЧИКИ СОКЕТ-СОБЫТИЙ
	// ==========================

	// Setup socket listeners for WebRTC and calls
	useEffect(() => {
		if (!socket) return

		socket.on('users-in-room', (users: string[]) => {
			updateCallStatus(`👥 ${users.length} пользователей в комнате`)
			users.forEach(userId => {
				if (userId !== currentUserId) {
					// Создаём оффер только если детерминированно должны инициировать
					if (shouldInitiate(userId)) {
						// небольшая задержка, чтобы дать другим участникам время присоединиться
						setTimeout(() => createOffer(userId), 600)
					} else {
						console.log(`Not initiating to ${userId.slice(-6)} (deterministic)`)
					}
				}
			})
		})

		socket.on('user-joined', (userId: string) => {
			if (userId === currentUserId) return
			updateCallStatus(
				`🆕 Пользователь ${userId.slice(-6)} присоединился к комнате`
			)
			// Создаём оффер только если детерминированно должны инициировать
			if (shouldInitiate(userId)) {
				setTimeout(() => createOffer(userId), 1000)
			} else {
				console.log(
					`Not initiating to ${userId.slice(-6)} on join (deterministic)`
				)
			}
		})

		socket.on('user-left', (userId: string) => {
			if (userId === currentUserId) return
			updateCallStatus(`👋 Пользователь ${userId.slice(-6)} покинул комнату`)
			const pc = peerConnectionsRef.current.get(userId)
			if (pc) {
				try {
					pc.close()
				} catch (error) {
					console.warn(error)
				}
				peerConnectionsRef.current.delete(userId)
				pendingIceCandidatesRef.current.delete(userId)
				connectionRolesRef.current.delete(userId)
			}
		})

		socket.on('webrtc-signal', handleSignal)

		socket.on('incoming-call', (data: IncomingCall) => {
			console.log('📞 Входящий звонок:', data)
			setIncomingCall(data)
			updateCallStatus(`📞 Входящий звонок от ${data.callerName}`)
		})

		socket.on(
			'call-accepted',
			(data: { callId: string; acceptorSocketId: string }) => {
				console.log('✅ Звонок принят:', data)
				updateCallStatus('✅ Собеседник принял звонок')
				// Автоматически присоединяемся к комнате
				if (roomId) {
					joinCallRoom(roomId)
				}
			}
		)

		socket.on('call-rejected', (data: { callId: string; reason: string }) => {
			console.log('❌ Звонок отклонен:', data)
			updateCallStatus(`❌ Звонок отклонен: ${data.reason}`)
			setIsCallInitiator(false)
			currentCallRef.current = null

			// Останавливаем локальный поток
			if (localStreamRef.current) {
				localStreamRef.current.getTracks().forEach(track => track.stop())
				localStreamRef.current = null
			}
		})

		socket.on('call-cancelled', (data: { callId: string }) => {
			console.log('🚫 Звонок отменен:', data)
			setIncomingCall(null)
			updateCallStatus('🚫 Звонок отменен')
		})

		socket.on(
			'call-ended',
			(data: { callId?: string; reason: string; endedBy?: string }) => {
				console.log('📞 Звонок завершен:', data)
				updateCallStatus(`📞 ${data.reason}`)
				leaveCallRoom()
			}
		)

		socket.on('call-initiated', (data: { callId: string }) => {
			console.log('🕐 Звонок инициирован:', data)
			currentCallRef.current = data.callId
		})

		socket.on('call-failed', (data: { reason: string }) => {
			console.log('❌ Ошибка звонка:', data)
			updateCallStatus(`❌ ${data.reason}`)
			setIsCallInitiator(false)
			currentCallRef.current = null
		})

		socket.on('join-call-room', (data: { roomId: string }) => {
			if (currentRoomRef.current === roomId) return
			console.log('🔌 Присоединение к комнате:', data)
			joinCallRoom(data.roomId)
		})

		return () => {
			// Cleanup listeners
			socket.off('users-in-room')
			socket.off('user-joined')
			socket.off('user-left')
			socket.off('webrtc-signal')
			socket.off('incoming-call')
			socket.off('call-accepted')
			socket.off('call-rejected')
			socket.off('call-cancelled')
			socket.off('call-ended')
			socket.off('call-initiated')
			socket.off('call-failed')
			socket.off('join-call-room')
		}
	}, [
		socket,
		createOffer,
		handleSignal,
		updateCallStatus,
		currentUserId,
		leaveCallRoom,
		joinCallRoom,
		roomId,
		shouldInitiate,
	])

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			leaveCallRoom()
		}
	}, [leaveCallRoom])

	// Экспортируем методы для использования в родительском компоненте
	return {
		// Основные функции звонков
		startAudioCall,
		initiateCall,
		acceptCall,
		rejectCall,
		cancelCall,
		endCall,
		leaveCallRoom,

		// Состояния
		isConnected: !!currentRoomRef.current,
		isCallInitiator,
		incomingCall,

		// Refs
		localAudioRef,
		remoteAudioRef,
	}
}
