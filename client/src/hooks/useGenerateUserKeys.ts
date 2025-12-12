import { useCallback, useEffect } from 'react'
import { useUserKeysStore } from '../store/userKeys'
import { loadKey, saveKey } from '../utils/cryptoStorage'

export function useUserKeys() {
	const { privateKey, setPrivateKey } = useUserKeysStore()

	// 🔓 Загрузка приватного ключа из IndexedDB при старте
	useEffect(() => {
		loadKey('privateKey').then(key => {
			if (key) setPrivateKey(key)
		})
	}, [setPrivateKey])

	// 💾 Сохраняем приватный ключ в IndexedDB при его изменении
	useEffect(() => {
		if (privateKey) saveKey('privateKey', privateKey)
	}, [privateKey])

	const generateKeys = useCallback(
		async (password: string) => {
			// 1️⃣ Генерация ECDH ключей
			const keyPair = await crypto.subtle.generateKey(
				{ name: 'ECDH', namedCurve: 'P-256' },
				true,
				['deriveKey']
			)

			const exportedPublic = await crypto.subtle.exportKey(
				'spki',
				keyPair.publicKey
			)
			const exportedPrivate = await crypto.subtle.exportKey(
				'pkcs8',
				keyPair.privateKey
			)

			// Сохраняем приватный ключ в Zustand (расшифрованный в памяти)
			setPrivateKey(exportedPrivate)

			// 2️⃣ Шифрование приватного ключа паролем для базы
			const salt = crypto.getRandomValues(new Uint8Array(16))
			const iv = crypto.getRandomValues(new Uint8Array(12))
			const iterations = 210_000

			const keyMaterial = await crypto.subtle.importKey(
				'raw',
				new TextEncoder().encode(password),
				'PBKDF2',
				false,
				['deriveKey']
			)

			const aesKey = await crypto.subtle.deriveKey(
				{ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
				keyMaterial,
				{ name: 'AES-GCM', length: 256 },
				false,
				['encrypt']
			)

			const encryptedBuffer = await crypto.subtle.encrypt(
				{ name: 'AES-GCM', iv },
				aesKey,
				exportedPrivate
			)

			// 3️⃣ Возвращаем данные для отправки на сервер
			return {
				publicKey: btoa(String.fromCharCode(...new Uint8Array(exportedPublic))),
				encryptedPrivateKey: btoa(
					String.fromCharCode(...new Uint8Array(encryptedBuffer))
				),
				salt: btoa(String.fromCharCode(...salt)),
				iv: btoa(String.fromCharCode(...iv)),
				iterations,
			}
		},
		[setPrivateKey]
	)

	const importPublicKey = useCallback(async (base64Key: string) => {
		const binary = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0))
		return crypto.subtle.importKey(
			'spki',
			binary.buffer,
			{ name: 'ECDH', namedCurve: 'P-256' },
			true,
			[]
		)
	}, [])

	const deriveSharedKey = useCallback(
		async (peerPublicKeyBase64: string) => {
			if (!privateKey) throw new Error('Private key not set')

			const privateCryptoKey = await crypto.subtle.importKey(
				'pkcs8',
				privateKey,
				{ name: 'ECDH', namedCurve: 'P-256' },
				true,
				['deriveKey']
			)

			const peerPublicKey = await importPublicKey(peerPublicKeyBase64)

			return crypto.subtle.deriveKey(
				{ name: 'ECDH', public: peerPublicKey },
				privateCryptoKey,
				{ name: 'AES-GCM', length: 256 },
				false,
				['encrypt', 'decrypt']
			)
		},
		[privateKey, importPublicKey]
	)

	const encryptMessage = useCallback(
		async (sharedKey: CryptoKey, message: string) => {
			const iv = crypto.getRandomValues(new Uint8Array(12))
			const encoded = new TextEncoder().encode(message)

			const ciphertext = await crypto.subtle.encrypt(
				{ name: 'AES-GCM', iv },
				sharedKey,
				encoded
			)

			return { iv, ciphertext: new Uint8Array(ciphertext) }
		},
		[]
	)

	const decryptMessage = useCallback(
		async (
			sharedKey: CryptoKey,
			iv: ArrayBuffer | Uint8Array,
			ciphertext: ArrayBuffer | Uint8Array
		) => {
			// Используем as для приведения типов
			const ivArray =
				iv instanceof Uint8Array
					? new Uint8Array(iv.buffer as ArrayBuffer)
					: new Uint8Array(iv)

			const ciphertextArray =
				ciphertext instanceof Uint8Array
					? new Uint8Array(ciphertext.buffer as ArrayBuffer)
					: new Uint8Array(ciphertext)

			const decryptedBuffer = await crypto.subtle.decrypt(
				{
					name: 'AES-GCM',
					iv: ivArray,
				},
				sharedKey,
				ciphertextArray
			)

			return new TextDecoder().decode(decryptedBuffer)
		},
		[]
	)

	// 🔓 Функция для расшифровки приватного ключа из базы при логине
	const decryptPrivateKey = useCallback(
		async (
			password: string,
			encryptedPrivateKeyB64: string,
			saltB64: string,
			ivB64: string,
			iterations: number
		) => {
			const encryptedBytes = Uint8Array.from(atob(encryptedPrivateKeyB64), c =>
				c.charCodeAt(0)
			)
			const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0))
			const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0))

			const keyMaterial = await crypto.subtle.importKey(
				'raw',
				new TextEncoder().encode(password),
				'PBKDF2',
				false,
				['deriveKey']
			)

			const aesKey = await crypto.subtle.deriveKey(
				{ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
				keyMaterial,
				{ name: 'AES-GCM', length: 256 },
				false,
				['decrypt']
			)

			const decryptedBuffer = await crypto.subtle.decrypt(
				{ name: 'AES-GCM', iv },
				aesKey,
				encryptedBytes
			)

			setPrivateKey(decryptedBuffer)

			return decryptedBuffer
		},
		[setPrivateKey]
	)

	return {
		generateKeys,
		decryptPrivateKey,
		deriveSharedKey,
		encryptMessage,
		decryptMessage,
	}
}
