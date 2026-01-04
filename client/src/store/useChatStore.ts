import { create } from 'zustand'
import type { ChatItem, newMessage } from '../components/type'

type ChatStore = {
	chats: ChatItem[]
	selectedChatId: string | null

	setChats: (chats: ChatItem[]) => void
	addChat: (chat: ChatItem) => void
	setSelectedChatId: (chatId: string | null) => void

	updateLastMessage: (chatId: string, msg: newMessage) => void
}

export const useChatStore = create<ChatStore>(set => ({
	chats: [],
	selectedChatId: null,

	setChats: (chats: ChatItem[] | ((prev: ChatItem[]) => ChatItem[])) =>
		set(state => ({
			chats: typeof chats === 'function' ? chats(state.chats) : chats,
		})),

	addChat: (chat: ChatItem) =>
		set(state => ({ chats: [...state.chats, chat] })),

	setSelectedChatId: (chatId: string | null) => set({ selectedChatId: chatId }),

	updateLastMessage: (chatId, msg) =>
		set(state => ({
			chats: state.chats.map(item => {
				if (item.chat.id !== chatId) return item

				if (item.type === 'group') {
					return {
						type: 'group',
						chat: {
							...item.chat,
							lastMessage: msg.text,
							senderName: msg.senderName ?? item.chat.senderName,
							iv: msg.iv,
							sentAt: msg.sentAt,
							updatedAt: msg.updatedAt,
						},
					}
				}

				// item.type === 'private'
				return {
					type: 'private',
					chat: {
						...item.chat,
						lastMessage: msg.text,
						senderName: msg.senderName ?? item.chat.senderName,
						iv: msg.iv,
						sentAt: msg.sentAt,
						updatedAt: msg.updatedAt,
					},
				}
			}),
		})),
}))

export const useSelectedChat = () =>
	useChatStore(
		state => state.chats.find(c => c.chat.id === state.selectedChatId) ?? null
	)
