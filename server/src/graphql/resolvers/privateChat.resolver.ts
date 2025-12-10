import { GraphQLError } from 'graphql'
import { withAuth } from '../../lib/authDecorator.js'
import filterUserByPrivacy from '../../lib/filterUserByPrivacy.js'
import prisma from '../../lib/prismaClient.js'
import type { Message } from '../types.js'

export const privateChatResolvers = {
	Query: {
		privateChats: withAuth(async (_: any, __: any, context: any) => {
			const currentUserId = context.userId

			// Предварительно загружаем всех друзей текущего пользователя
			const friends = await prisma.friends.findMany({
				where: { userId: currentUserId },
				select: { friendId: true },
			})
			const friendIds = new Set(friends.map(f => f.friendId))

			const chats = await prisma.private_chats.findMany({
				where: {
					OR: [{ user1Id: currentUserId }, { user2Id: currentUserId }],
				},
				include: {
					user1: { include: { privacy: true } },
					user2: { include: { privacy: true } },
					messages: {
						include: {
							sender: { include: { privacy: true } },
						},
						orderBy: { sentAt: 'asc' },
					},
				},
			})

			return chats.map(chat => {
				const otherUser =
					chat.user1Id === currentUserId ? chat.user2 : chat.user1
				const isOtherUserFriend = friendIds.has(otherUser.id)

				const filteredOtherUser = filterUserByPrivacy(
					otherUser,
					isOtherUserFriend
				)

				return {
					id: chat.id,
					user1Id: chat.user1Id,
					user2Id: chat.user2Id,
					user1:
						chat.user1Id === currentUserId ? chat.user1 : filteredOtherUser,
					user2:
						chat.user2Id === currentUserId ? chat.user2 : filteredOtherUser,
					createdAt: chat.createdAt.toISOString(),
					messages: chat.messages.map(m => ({
						id: m.id,
						text: m.text,
						iv: m.iv,
						senderId: m.senderId,
						sender: filterUserByPrivacy(m.sender, friendIds.has(m.senderId)),
						sentAt: m.sentAt.toISOString(),
						updatedAt: m.updatedAt.toISOString(),
					})),
				}
			})
		}),

		privateChat: withAuth(
			async (_: any, { chatId }: { chatId: string }, context: any) => {
				if (!chatId) {
					throw new GraphQLError('chatId обязателен', {
						extensions: { code: 'BAD_USER_INPUT' },
					})
				}

				const currentUserId = context.userId

				// Предварительно загружаем всех друзей текущего пользователя
				const friends = await prisma.friends.findMany({
					where: { userId: currentUserId },
					select: { friendId: true },
				})
				const friendIds = new Set(friends.map(f => f.friendId))

				const chat = await prisma.private_chats.findUnique({
					where: { id: chatId },
					include: {
						user1: {
							include: {
								privacy: true,
							},
						},
						user2: {
							include: {
								privacy: true,
							},
						},
						messages: {
							include: {
								sender: {
									include: {
										privacy: true,
									},
								},
							},
							orderBy: { sentAt: 'asc' },
						},
					},
				})

				if (!chat) {
					throw new GraphQLError('Чат не найден', {
						extensions: { code: 'NOT_FOUND' },
					})
				}

				// Проверяем, что текущий пользователь участник чата
				if (chat.user1Id !== currentUserId && chat.user2Id !== currentUserId) {
					throw new GraphQLError('Доступ запрещен', {
						extensions: { code: 'FORBIDDEN' },
					})
				}

				const otherUser =
					chat.user1Id === currentUserId ? chat.user2 : chat.user1
				const currentUser =
					chat.user1Id === currentUserId ? chat.user1 : chat.user2
				const isOtherUserFriend = friendIds.has(otherUser.id)

				const filteredOtherUser = filterUserByPrivacy(
					otherUser,
					isOtherUserFriend
				)
				const filteredCurrentUser = filterUserByPrivacy(currentUser, true) // Себя всегда показываем полностью

				return {
					id: chat.id,
					user1:
						chat.user1Id === currentUserId
							? filteredCurrentUser
							: filteredOtherUser,
					user2:
						chat.user2Id === currentUserId
							? filteredCurrentUser
							: filteredOtherUser,
					otherUser: filteredOtherUser,
					createdAt: chat.createdAt.toISOString(),
					messages: chat.messages.map(m => ({
						id: m.id,
						text: m.text,
						iv: m.iv,
						senderId: m.senderId,
						sender: filterUserByPrivacy(m.sender, friendIds.has(m.senderId)),
						sentAt: m.sentAt.toISOString(),
						updatedAt: m.updatedAt.toISOString(),
					})),
				}
			}
		),
	},

	Mutation: {
		createPrivateChat: withAuth(
			async (
				_: any,
				{ user1Id, user2Id }: { user1Id: string; user2Id: string }
			) => {
				if (!user1Id || !user2Id) {
					throw new GraphQLError('user1Id и user2Id обязательны', {
						extensions: { code: 'BAD_USER_INPUT' },
					})
				}

				if (user1Id === user2Id) {
					throw new GraphQLError('Нельзя создать чат с самим собой', {
						extensions: { code: 'BAD_USER_INPUT' },
					})
				}

				// Проверка на существующий чат (учитываем оба направления)
				const existingChat = await prisma.private_chats.findFirst({
					where: {
						OR: [
							{ user1Id, user2Id },
							{ user1Id: user2Id, user2Id: user1Id },
						],
					},
				})

				if (existingChat) {
					throw new GraphQLError(
						'Чат между этими пользователями уже существует',
						{ extensions: { code: 'BAD_USER_INPUT' } }
					)
				}

				const chat = await prisma.private_chats.create({
					data: { user1Id, user2Id },
				})

				return {
					id: chat.id,
					user1Id: chat.user1Id,
					user2Id: chat.user2Id,
					createdAt: chat.createdAt.toISOString(),
				}
			}
		),

		sendPrivateMessage: withAuth(
			async (
				_: any,
				{
					chatId,
					senderId,
					text,
					iv, // теперь мы ожидаем iv вместе с текстом
				}: { chatId: string; senderId: string; text: string; iv: string }
			): Promise<Message> => {
				if (!chatId || !senderId || !text || !iv) {
					throw new GraphQLError('chatId, senderId, text и iv обязательны', {
						extensions: { code: 'BAD_USER_INPUT' },
					})
				}

				const chat = await prisma.private_chats.findUnique({
					where: { id: chatId },
				})
				if (!chat)
					throw new GraphQLError('Чат не найден', {
						extensions: { code: 'NOT_FOUND' },
					})
				if (senderId !== chat.user1Id && senderId !== chat.user2Id) {
					throw new GraphQLError('Пользователь не состоит в этом чате', {
						extensions: { code: 'FORBIDDEN' },
					})
				}

				const message = await prisma.messages.create({
					data: { text, iv, senderId, privateChatId: chatId },
					include: { sender: true },
				})

				return {
					id: message.id,
					text: message.text,
					iv: message.iv,
					sentAt: message.sentAt.toISOString(),
					updatedAt: message.updatedAt.toISOString(),
					senderId: message.senderId,
					sender: {
						...message.sender,
						birthDate: message.sender.birthDate?.toISOString() || null,
						lastOnline: message.sender.lastOnline?.toISOString() || null,
						keyCreatedAt: message.sender.keyCreatedAt.toISOString(),
						keyUpdatedAt: message.sender.keyUpdatedAt.toISOString(),
					},
					privateChatId: message.privateChatId,
					groupId: null,
				}
			}
		),
	},
}
