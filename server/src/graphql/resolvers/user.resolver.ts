import { GraphQLError } from 'graphql'
import { withAuth } from '../../lib/authDecorator.js'
import prisma from '../../lib/prismaClient.js'
import type { User } from '../types.js'

import { buildPrivacyContext } from '../../domain/user/user.policy.js'
import { applyUserPolicy } from '../../domain/user/user.policy.service.js'
import { mapUserToUserWithPrivacy } from '../../domain/user/user.policyMap.js'

// Вспомогательная функция, чтобы не дублировать код получения друзей
async function getViewerFriendIds(
	prisma: any,
	viewerId: string | undefined,
): Promise<Set<string>> {
	if (!viewerId) return new Set()

	const friends = await prisma.friends.findMany({
		where: { userId: viewerId },
		select: { friendId: true },
	})

	return new Set(friends.map((f: any) => f.friendId))
}

export const userResolvers = {
	Query: {
		users: withAuth(async (_: any, __: any, context: any): Promise<any[]> => {
			const viewerId = context.userId

			// 1. Загружаем пользователей ВМЕСТЕ с настройками приватности
			const users = await prisma.users.findMany({
				include: {
					privacy: true,
					avatar: true, // Если аватар нужен в списке
				},
			})

			// 2. Получаем список друзей смотрящего (один раз для всего списка)
			const friendIds = await getViewerFriendIds(prisma, viewerId)

			// 3. Прогоняем каждого через политику безопасности
			return users.map(u => {
				const ctx = buildPrivacyContext(viewerId, u.id, friendIds)
				const userWithPrivacy = mapUserToUserWithPrivacy(u)
				return applyUserPolicy(userWithPrivacy, ctx)
			})
		}),

		user: withAuth(
			async (
				_: any,
				{ id }: { id: string },
				context: any,
			): Promise<any | null> => {
				const viewerId = context.userId

				// 1. Загружаем конкретного пользователя с privacy
				const user = await prisma.users.findUnique({
					where: { id },
					include: {
						privacy: true,
						avatar: true,
					},
				})

				if (!user) return null

				// 2. Получаем список друзей смотрящего
				const friendIds = await getViewerFriendIds(prisma, viewerId)

				// 3. Строим контекст (Я это или Друг?)
				const ctx = buildPrivacyContext(viewerId, user.id, friendIds)

				// 4. Маппим данные для функции
				const userWithPrivacy = mapUserToUserWithPrivacy(user)

				// 5. Применяем политику.
				// ВАЖНО: Она сама скроет encryptedPrivateKey, если ctx.isSelf === false
				return applyUserPolicy(userWithPrivacy, ctx)
			},
		),
	},

	Mutation: {
		updateUser: withAuth(
			async (
				_: any,
				{
					id,
					email,
					password,
					name,
				}: { id: string; email?: string; password?: string; name?: string },
			) => {
				const data: any = {}
				if (email) data.email = email
				if (password) data.password = password
				if (name) data.name = name
				return prisma.users.update({ where: { id }, data })
			},
		),

		uploadUserAvatar: withAuth(
			async (_: any, { file }: { file: Promise<any> }, context) => {
				const userId = context.req.user?.userId
				if (!userId) throw new Error('Unauthorized')

				const { createReadStream, filename, mimetype } = await file
				const stream = createReadStream()

				const chunks: Uint8Array[] = []
				for await (const chunk of stream) chunks.push(chunk)
				const buffer = Buffer.concat(chunks)

				const avatar = await prisma.user_avatars.upsert({
					where: { user_id: userId },
					update: {
						filename,
						mime_type: mimetype,
						data: buffer,
						uploaded_at: new Date(),
					},
					create: {
						user_id: userId,
						filename,
						mime_type: mimetype,
						data: buffer,
					},
					include: { user: true },
				})

				return {
					id: avatar.id.toString(),
					filename: avatar.filename,
					mimeType: avatar.mime_type,
					uploadedAt: avatar.uploaded_at.toISOString(),
					url: `${process.env.API_URL}/avatar/${avatar.user.id}`,
					user: avatar.user,
				}
			},
		),

		updatePrivacySettings: withAuth(
			async (
				_: any,
				{
					userId,
					showEmail,
					showLastOnline,
					showBirthDate,
				}: {
					userId: string
					showEmail?: boolean
					showLastOnline?: boolean
					showBirthDate?: boolean
				},
			) => {
				const data: any = {}
				if (showEmail !== undefined) data.showEmail = showEmail
				if (showLastOnline !== undefined) data.showLastOnline = showLastOnline
				if (showBirthDate !== undefined) data.showBirthDate = showBirthDate

				const updated = await prisma.privacy_settings.upsert({
					where: { userId },
					update: data,
					create: {
						userId,
						...data,
						showAbout: 'ALL',
						allowCalls: 'FRIENDS',
						showLastOnline: data.showLastOnline || 'ALL',
						showEmail: data.showEmail || 'FRIENDS',
						showBirthDate: data.showBirthDate || 'FRIENDS',
					},
					include: { user: true },
				})

				return {
					showAbout: updated.showAbout,
					allowCalls: updated.allowCalls,
					showEmail: updated.showEmail,
					showLastOnline: updated.showLastOnline,
					showBirthDate: updated.showBirthDate,
					user: updated.user,
				}
			},
		),

		updateProfile: withAuth(
			async (
				_: any,
				{
					nickname,
					about,
					birthDate,
				}: {
					nickname?: string
					about?: string
					birthDate?: string
				},
				context,
			) => {
				const userId = context.req.user?.userId
				if (!userId) throw new Error('Unauthorized')
				const data: any = {}
				if (nickname !== undefined) data.nickname = nickname
				if (about !== undefined) data.about = about
				if (birthDate !== undefined) data.birthDate = new Date(birthDate)
				return prisma.users.update({ where: { id: userId }, data })
			},
		),

		addFriend: withAuth(
			async (
				_: any,
				{ friendIdentifier }: { friendIdentifier: string },
				context,
			) => {
				const userId = context.req.user?.userId
				if (!userId) throw new GraphQLError('Unauthorized')

				// Проверяем, похоже ли это на ObjectId (Mongo)
				const isObjectId = (id: string) => /^[a-f0-9]{24}$/i.test(id)

				let friend

				if (isObjectId(friendIdentifier)) {
					friend = await prisma.users.findUnique({
						where: { id: friendIdentifier },
					})
				} else {
					friend = await prisma.users.findFirst({
						where: {
							OR: [{ email: friendIdentifier }, { nickname: friendIdentifier }],
						},
					})
				}

				if (!friend) {
					throw new GraphQLError('Пользователь не найден', {
						extensions: { code: 'NOT_FOUND' },
					})
				}

				const existing = await prisma.friends.findFirst({
					where: { userId, friendId: friend.id },
				})
				if (existing) {
					throw new GraphQLError('Этот пользователь уже в друзьях', {
						extensions: { code: 'BAD_USER_INPUT' },
					})
				}

				await prisma.friends.create({ data: { userId, friendId: friend.id } })
				return prisma.users.findUnique({ where: { id: userId } })
			},
		),

		removeFriend: withAuth(
			async (
				_,
				{ friendIdentifier }: { friendIdentifier: string },
				context,
			) => {
				const userId = context.req.user?.userId
				if (!userId) {
					throw new GraphQLError('Unauthorized')
				}

				const friend = await prisma.users.findFirst({
					where: {
						OR: [
							{ id: friendIdentifier },
							{ nickname: friendIdentifier },
							{ email: friendIdentifier },
						],
					},
				})

				if (!friend) {
					throw new GraphQLError('Пользователь не найден', {
						extensions: { code: 'NOT_FOUND' },
					})
				}

				await prisma.$transaction(async tx => {
					// 1️⃣ найти приватный чат
					const privateChat = await tx.private_chats.findFirst({
						where: {
							OR: [
								{ user1Id: userId, user2Id: friend.id },
								{ user1Id: friend.id, user2Id: userId },
							],
						},
						select: { id: true },
					})

					// 2️⃣ удалить сообщения чата
					if (privateChat) {
						await tx.messages.deleteMany({
							where: { privateChatId: privateChat.id },
						})

						// 3️⃣ удалить чат
						await tx.private_chats.delete({
							where: { id: privateChat.id },
						})
					}

					// 4️⃣ удалить друга
					await tx.friends.deleteMany({
						where: {
							userId,
							friendId: friend.id,
						},
					})
				})

				return prisma.users.findUnique({
					where: { id: userId },
				})
			},
		),

		deleteUser: withAuth(async (_: any, { id }: { id: string }) => {
			await prisma.users.delete({ where: { id } })
			return true
		}),
	},

	User: {
		avatar: withAuth(async (parent: User) => {
			const avatar = await prisma.user_avatars.findUnique({
				where: { user_id: parent.id },
			})
			if (!avatar) return null

			console.log(`${process.env.API_URL_BACKEND}/avatar/${avatar.user_id}`)
			return {
				id: avatar.id.toString(),
				filename: avatar.filename,
				mimeType: avatar.mime_type,
				uploadedAt: avatar.uploaded_at!.toISOString(),
				url: `${process.env.API_URL_BACKEND}/avatar/${avatar.user_id}`,
				user: { id: parent.id, email: parent.email, name: parent.name },
			}
		}),

		groupChats: withAuth(async (parent: User, _: any, context: any) => {
			const viewerId = context.userId

			// Друзья текущего пользователя
			const friends = await prisma.friends.findMany({
				where: { userId: viewerId },
				select: { friendId: true },
			})
			const friendIds = new Set(friends.map(f => f.friendId))

			const groupUsers = await prisma.group_users.findMany({
				where: { userId: parent.id },
				include: {
					group: {
						include: {
							users: {
								include: {
									user: {
										include: {
											privacy: true,
											avatar: true,
										},
									},
								},
							},
							messages: {
								include: {
									sender: {
										include: {
											privacy: true,
											avatar: true,
										},
									},
								},
								orderBy: { sentAt: 'asc' },
							},
							avatar: true,
						},
					},
				},
			})

			return groupUsers.map(gu => {
				const group = gu.group

				const users = group.users.map(groupUser => {
					const ctx = buildPrivacyContext(
						viewerId,
						groupUser.user.id,
						friendIds,
					)

					const userWithPrivacy = mapUserToUserWithPrivacy(groupUser.user)
					const userDto = applyUserPolicy(userWithPrivacy, ctx)

					return {
						...userDto,
						__typename: 'GroupChatUser',
					}
				})

				const messages = group.messages.map(msg => {
					const ctx = buildPrivacyContext(viewerId, msg.sender.id, friendIds)

					const senderWithPrivacy = mapUserToUserWithPrivacy(msg.sender)
					const senderDto = applyUserPolicy(senderWithPrivacy, ctx)

					return {
						id: msg.id,
						text: msg.text ?? '',
						sentAt: msg.sentAt.toISOString(),
						updatedAt: msg.updatedAt?.toISOString(),
						sender: {
							...senderDto,
							__typename: 'GroupChatUser',
						},
						__typename: 'Message',
					}
				})

				return {
					id: group.id,
					name: group.name,
					createdAt: group.createdAt.toISOString(),
					avatar: group.avatar
						? { url: `${process.env.API_URL_BACKEND}/avatar/group/${group.id}` }
						: null,
					users,
					messages,
					__typename: 'GroupChat',
				}
			})
		}),

		privateChats: withAuth(async (parent: User, _: any, context: any) => {
			const viewerId = context.userId

			const chats = await prisma.private_chats.findMany({
				where: { OR: [{ user1Id: parent.id }, { user2Id: parent.id }] },
				include: {
					user1: {
						include: {
							privacy: true,
							avatar: true,
						},
					},
					user2: {
						include: {
							privacy: true,
							avatar: true,
						},
					},
					messages: { include: { sender: true } },
				},
			})

			const friends = await prisma.friends.findMany({
				where: { userId: viewerId },
				select: { friendId: true },
			})
			const friendIds = new Set(friends.map(f => f.friendId))

			return chats.map(chat => {
				console.log('chat', chat.user1.privacy)
				console.log('chat', chat.user2.privacy)
				const ctxUser1 = buildPrivacyContext(viewerId, chat.user1.id, friendIds)

				const ctxUser2 = buildPrivacyContext(viewerId, chat.user2.id, friendIds)

				console.log('--- DEBUG ---')
				console.log('Viewer ID:', viewerId, typeof viewerId)
				console.log('User1 ID:', chat.user1.id, typeof chat.user1.id)
				console.log('Are they equal?', viewerId === chat.user1.id)

				const user1WithPrivacy = mapUserToUserWithPrivacy(chat.user1)
				const user2WithPrivacy = mapUserToUserWithPrivacy(chat.user2)

				return {
					...chat,
					createdAt: chat.createdAt.toISOString(),
					user1: applyUserPolicy(user1WithPrivacy, ctxUser1),
					user2: applyUserPolicy(user2WithPrivacy, ctxUser2),
					messages: chat.messages.map(msg => {
						const ctxMsgSender = buildPrivacyContext(
							viewerId,
							msg.senderId,
							friendIds,
						)
						return {
							...msg,
							sentAt: msg.sentAt.toISOString(),
							updatedAt: msg.updatedAt.toISOString(),
							sender: applyUserPolicy(
								mapUserToUserWithPrivacy(msg.sender),
								ctxMsgSender,
							),
						}
					}),
				}
			})
		}),

		messages: withAuth(async (parent: User, _: any, context: any) => {
			const viewerId = context.userId

			const msgs = await prisma.messages.findMany({
				where: { senderId: parent.id },
				include: {
					sender: {
						include: {
							privacy: true,
							avatar: true,
						},
					},
					privateChat: true,
					group: true,
				},
			})

			// друзья viewer
			const friends = viewerId
				? await prisma.friends.findMany({
						where: { userId: viewerId },
						select: { friendId: true },
					})
				: []

			const friendIds = new Set(friends.map(f => f.friendId))

			return msgs.map(m => {
				const ctx = buildPrivacyContext(viewerId, m.sender.id, friendIds)

				const senderWithPrivacy = mapUserToUserWithPrivacy(m.sender)
				const senderDto = applyUserPolicy(senderWithPrivacy, ctx)

				return {
					id: m.id,
					text: m.text,
					sentAt: m.sentAt.toISOString(),
					updatedAt: m.updatedAt.toISOString(),
					sender: senderDto,
					privateChat: m.privateChat,
					group: m.group,
				}
			})
		}),

		friends: withAuth(async (parent: User, _: any, context: any) => {
			const viewerId = context.userId

			// Получаем всех друзей текущего viewer
			const viewerFriends = await prisma.friends.findMany({
				where: { userId: viewerId },
				select: { friendId: true },
			})
			const friendIds = new Set(viewerFriends.map(f => f.friendId))

			const friends = await prisma.friends.findMany({
				where: { userId: parent.id },
				include: {
					friend: {
						include: {
							avatar: true,
							privacy: true,
						},
					},
				},
			})

			return friends.map(f => {
				const ctx = buildPrivacyContext(viewerId, f.friend.id, friendIds)
				const userWithPrivacy = mapUserToUserWithPrivacy(f.friend)
				const userDto = applyUserPolicy(userWithPrivacy, ctx)

				return {
					id: f.id,
					createdAt: f.createdAt.toISOString(),
					friend: userDto,
				}
			})
		}),

		// privacy: async (parent: User) => {
		// 	const settings = await prisma.privacy_settings.findUnique({
		// 		where: { userId: parent.id },
		// 	})
		// 	if (!settings) return null
		// 	return {
		// 		showAbout: settings.showAbout,
		// 		allowCalls: settings.allowCalls,
		// 		showEmail: settings.showEmail,
		// 		showLastOnline: settings.showLastOnline,
		// 		showBirthDate: settings.showBirthDate,
		// 		user: parent,
		// 	}
		// },
	},
}
