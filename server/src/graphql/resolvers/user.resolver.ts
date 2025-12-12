import { GraphQLError } from 'graphql'
import { withAuth } from '../../lib/authDecorator.js'
import prisma from '../../lib/prismaClient.js'
import type { User } from '../types.js'

import filterUserByPrivacy from '../../lib/filterUserByPrivacy.js'

export const userResolvers = {
	Query: {
		users: withAuth(async (_: any): Promise<User[]> => {
			const users = await prisma.users.findMany()
			return users.map(u => ({
				...u,
				birthDate: u.birthDate ? u.birthDate.toISOString() : null,
				lastOnline: u.lastOnline ? u.lastOnline.toISOString() : null,

				// 🔐 Crypto fields — отдаём только publicKey и даты ключа
				publicKey: u.publicKey,
				keyCreatedAt: u.keyCreatedAt.toISOString(),
				keyUpdatedAt: u.keyUpdatedAt.toISOString(),

				// ❌ Не отдаём encryptedPrivateKey, salt, iv, kdfIterations
				// ❌ Не отдаём пароль
			}))
		}),

		user: withAuth(
			async (_: any, { id }: { id: string }): Promise<User | null> => {
				const user = await prisma.users.findUnique({ where: { id } })
				if (!user) return null
				return {
					...user,
					birthDate: user.birthDate ? user.birthDate.toISOString() : null,
					lastOnline: user.lastOnline ? user.lastOnline.toISOString() : null,

					// 🔐 Crypto fields
					publicKey: user.publicKey,
					encryptedPrivateKey: user.encryptedPrivateKey,
					salt: user.salt,
					iv: user.iv,
					kdfIterations: user.kdfIterations,
					keyCreatedAt: user.keyCreatedAt.toISOString(),
					keyUpdatedAt: user.keyUpdatedAt.toISOString(),
				}
			}
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
				}: { id: string; email?: string; password?: string; name?: string }
			) => {
				const data: any = {}
				if (email) data.email = email
				if (password) data.password = password
				if (name) data.name = name
				return prisma.users.update({ where: { id }, data })
			}
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
			}
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
				}
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
			}
		),

		updateProfile: withAuth(
			async (
				_: any,
				{
					id,
					nickname,
					about,
					birthDate,
				}: {
					id: string
					nickname?: string
					about?: string
					birthDate?: string
				}
			) => {
				const data: any = {}
				if (nickname !== undefined) data.nickname = nickname
				if (about !== undefined) data.about = about
				if (birthDate !== undefined) data.birthDate = new Date(birthDate)
				return prisma.users.update({ where: { id }, data })
			}
		),

		addFriend: withAuth(
			async (
				_: any,
				{ friendIdentifier }: { friendIdentifier: string },
				context
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
			}
		),

		removeFriend: withAuth(
			async (
				_,
				{ friendIdentifier }: { friendIdentifier: string },
				context
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

				await prisma.friends.deleteMany({
					where: { userId, friendId: friend.id },
				})

				return prisma.users.findUnique({
					where: { id: userId },
				})
			}
		),

		deleteUser: withAuth(async (_: any, { id }: { id: string }) => {
			await prisma.users.delete({ where: { id } })
			return true
		}),
	},

	User: {
		avatar: async (parent: User) => {
			const avatar = await prisma.user_avatars.findUnique({
				where: { user_id: parent.id },
			})
			if (!avatar) return null
			return {
				id: avatar.id.toString(),
				filename: avatar.filename,
				mimeType: avatar.mime_type,
				uploadedAt: avatar.uploaded_at!.toISOString(),
				url: `${process.env.API_URL_BACKEND}/avatar/${avatar.user_id}`,
				user: { id: parent.id, email: parent.email, name: parent.name },
			}
		},

		groupChats: async (parent: User, _: any, context: any) => {
			const currentUserId = context.userId

			// Загружаем друзей для фильтрации приватности
			const friends = await prisma.friends.findMany({
				where: { userId: currentUserId },
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

				// Обрабатываем пользователей с учетом приватности
				const users = (group.users ?? []).map(groupUser => {
					const user = filterUserByPrivacy(
						groupUser.user,
						friendIds.has(groupUser.userId)
					) ?? {
						id: groupUser.userId,
						name: 'unknown',
						nickname: null,
						avatar: null,
						about: null,
						email: null,
						birthDate: null,
						lastOnline: null,
					}

					return {
						id: user.id,
						name: user.name,
						nickname: user.nickname,
						avatar: user.avatar
							? { url: `${process.env.API_URL_BACKEND}/avatar/${user.id}` }
							: null,
						about: user.about,
						email: user.email,
						birthDate: user.birthDate,
						lastOnline: user.lastOnline,
						__typename: 'GroupChatUser',
					}
				})

				// Обрабатываем сообщения с учетом приватности
				const messages = (group.messages ?? []).map(msg => {
					const sender = filterUserByPrivacy(
						msg.sender,
						friendIds.has(msg.senderId)
					) ?? {
						id: msg.senderId,
						name: 'unknown',
						nickname: null,
						avatar: null,
						about: null,
						email: null,
						birthDate: null,
						lastOnline: null,
					}

					return {
						id: msg.id,
						text: msg.text ?? '',
						sentAt: msg.sentAt.toISOString(),
						updatedAt: msg.updatedAt?.toISOString() ?? new Date().toISOString(),
						sender: {
							id: sender.id,
							name: sender.name,
							nickname: sender.nickname,
							avatar: sender.avatar
								? { url: `${process.env.API_URL_BACKEND}/avatar/${sender.id}` }
								: null,
							about: sender.about,
							email: sender.email,
							birthDate: sender.birthDate,
							lastOnline: sender.lastOnline,
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
					users: users,
					messages: messages, // Теперь messages всегда будет массивом
					__typename: 'GroupChat',
				}
			})
		},

		privateChats: async (parent: User) => {
			const chats = await prisma.private_chats.findMany({
				where: { OR: [{ user1Id: parent.id }, { user2Id: parent.id }] },
				include: {
					user1: true,
					user2: true,
					messages: { include: { sender: true } },
				},
			})
			return chats.map(chat => ({
				...chat,
				createdAt: chat.createdAt.toISOString(),
			}))
		},

		messages: async (parent: User) => {
			const msgs = await prisma.messages.findMany({
				where: { senderId: parent.id },
				include: { sender: true, privateChat: true, group: true },
			})
			return msgs.map(m => ({
				...m,
				sentAt: m.sentAt.toISOString(),
				updatedAt: m.updatedAt.toISOString(),
				sender: {
					...m.sender,
					birthDate: m.sender.birthDate
						? m.sender.birthDate.toISOString()
						: null,
					lastOnline: m.sender.lastOnline
						? m.sender.lastOnline.toISOString()
						: null,
				},
			}))
		},

		friends: async (parent: User) => {
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

			return friends.map(f => ({
				id: f.id,
				createdAt: f.createdAt.toISOString(), // ✅ добавляем createdAt
				friend: {
					id: f.friend.id,
					email: f.friend.email,
					name: f.friend.name,
					nickname: f.friend.nickname,
					about: f.friend.about,
					birthDate: f.friend.birthDate
						? f.friend.birthDate.toISOString()
						: null,
					lastOnline: f.friend.lastOnline
						? f.friend.lastOnline.toISOString()
						: null,
					avatar: f.friend.avatar
						? {
								id: f.friend.avatar.id,
								filename: f.friend.avatar.filename,
								mimeType: f.friend.avatar.mime_type,
								uploadedAt: f.friend.avatar.uploaded_at.toISOString(),
								url: `${process.env.API_URL}/avatar/${f.friend.avatar.user_id}`,
								user: {
									id: f.friend.id,
									email: f.friend.email,
									name: f.friend.name,
								},
						  }
						: null,
					privacy: f.friend.privacy
						? {
								showLastOnline: f.friend.privacy.showLastOnline,
								showAbout: f.friend.privacy.showAbout,
								showEmail: f.friend.privacy.showEmail,
								showBirthDate: f.friend.privacy.showBirthDate,
								allowCalls: f.friend.privacy.allowCalls,
						  }
						: null,
				},
			}))
		},

		privacy: async (parent: User) => {
			const settings = await prisma.privacy_settings.findUnique({
				where: { userId: parent.id },
			})
			if (!settings) return null
			return {
				showAbout: settings.showAbout,
				allowCalls: settings.allowCalls,
				showEmail: settings.showEmail,
				showLastOnline: settings.showLastOnline,
				showBirthDate: settings.showBirthDate,
				user: parent,
			}
		},
	},
}
