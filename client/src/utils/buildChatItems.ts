import type {
	ChatItem,
	GroupChat,
	Message,
	PrivateChat,
} from '../components/type'

export async function buildChatItems(
	userData: { groupChats: GroupChat[]; privateChats: PrivateChat[] },
	currentUserId: string,
	deriveSharedKey: (peerPublicKey: string) => Promise<CryptoKey>,
	decryptMessage: (
		sharedKey: CryptoKey,
		iv: Uint8Array,
		text: Uint8Array
	) => Promise<string>
): Promise<ChatItem[]> {
	const sortMessagesByDate = (messages: Message[]) =>
		[...messages].sort(
			(a, b) =>
				new Date(Number(a.sentAt)).getTime() -
				new Date(Number(b.sentAt)).getTime()
		)

	const decryptLastMessage = async (
		lastMsg: Message,
		otherUserPublicKey?: string
	): Promise<string> => {
		if (!lastMsg.iv || !otherUserPublicKey) return lastMsg.text || ''
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
			const sharedKey = await deriveSharedKey(otherUserPublicKey)
			return await decryptMessage(sharedKey, ivArray, textArray)
		} catch (err) {
			console.error('Ошибка расшифровки lastMessage:', err)
			return lastMsg.text || ''
		}
	}

	const groupItems: ChatItem[] = userData.groupChats.map(g => {
		const lastMsg = sortMessagesByDate(g.messages).at(-1)
		const chat: GroupChat = {
			...g,
			lastMessage: lastMsg?.text,
			iv: lastMsg?.iv,
			senderName: lastMsg?.sender?.name,
			sentAt: lastMsg?.sentAt,
			avatar: g.avatar ?? null,
		}
		return { type: 'group', chat }
	})

	const privateItems: ChatItem[] = await Promise.all(
		userData.privateChats.map(async p => {
			const otherUser = p.user1.id === currentUserId ? p.user2 : p.user1
			const lastMsg = sortMessagesByDate(p.messages).at(-1)
			const decryptedText =
				lastMsg && otherUser.publicKey
					? await decryptLastMessage(lastMsg, otherUser.publicKey)
					: lastMsg?.text || ''

			const chat: PrivateChat = {
				...p,
				lastMessage: decryptedText,
				iv: lastMsg?.iv,
				sentAt: lastMsg?.sentAt,
				updatedAt: lastMsg?.updatedAt,
				senderName: lastMsg?.sender?.name || '',
			}
			return { type: 'private', chat }
		})
	)

	return [...groupItems, ...privateItems]
}
