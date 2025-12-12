import prisma from '../../lib/prismaClient.js'
import type { User, Message } from '../types.js'
import { GraphQLError } from 'graphql'
import { withAuth } from '../../lib/authDecorator.js'
import { GraphQLUpload } from 'graphql-upload-minimal'
import type { FileUpload } from 'graphql-upload-minimal'

import filterUserByPrivacy from '../../lib/filterUserByPrivacy.js'

export const groupResolvers = {
	Upload: GraphQLUpload,

	Query: {
		groupChats: withAuth(async (_: any, __: any, context: any) => {
			const currentUserId = context.userId

			const friends = await prisma.friends.findMany({
				where: { userId: currentUserId },
				select: { friendId: true },
			})
			const friendIds = new Set(friends.map(f => f.friendId))

			const userGroups = await prisma.group_users.findMany({
				where: { userId: currentUserId },
				include: {
					group: {
						include: {
							users: {
								include: { user: { include: { privacy: true, avatar: true } } },
							},
							messages: {
								include: {
									sender: { include: { privacy: true, avatar: true } },
								},
								orderBy: { sentAt: 'asc' },
							},
							avatar: true,
						},
					},
				},
			})

			return (userGroups ?? []).map(ug => {
				const group = ug.group

				// Обеспечиваем, что messages всегда будет массивом (даже пустым)
				const messages = (group.messages ?? []).map(msg => {
					const senderSafe = filterUserByPrivacy(
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
						id: msg.id ?? `msg-${Math.random()}`,
						text: msg.text ?? '',
						sentAt: msg.sentAt?.toISOString() ?? new Date().toISOString(),
						updatedAt: msg.updatedAt?.toISOString() ?? new Date().toISOString(),
						sender: {
							id: senderSafe.id,
							name: senderSafe.name,
							nickname: senderSafe.nickname,
							avatar: senderSafe.avatar
								? {
										url: `${process.env.API_URL_BACKEND}/avatar/${senderSafe.id}`,
								  }
								: null,
							about: senderSafe.about,
							email: senderSafe.email,
							birthDate: senderSafe.birthDate,
							lastOnline: senderSafe.lastOnline,
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
					users: (group.users ?? []).map(gu => {
						const u = filterUserByPrivacy(
							gu.user,
							friendIds.has(gu.userId)
						) ?? {
							id: gu.userId,
							name: 'unknown',
							nickname: null,
							avatar: null,
							about: null,
							email: null,
							birthDate: null,
							lastOnline: null,
						}

						return {
							id: u.id,
							name: u.name,
							nickname: u.nickname,
							avatar: u.avatar
								? { url: `${process.env.API_URL_BACKEND}/avatar/${u.id}` }
								: null,
							about: u.about,
							email: u.email,
							birthDate: u.birthDate,
							lastOnline: u.lastOnline,
							__typename: 'GroupChatUser',
						}
					}),
					messages: messages, // Гарантированно массив
					__typename: 'GroupChat', // Добавьте это
				}
			})
		}),

		groupChat: withAuth(
			async (_: any, { id }: { id: string }, context: any) => {
				const currentUserId = context.userId

				const userMembership = await prisma.group_users.findFirst({
					where: { userId: currentUserId, groupId: id },
				})

				if (!userMembership) {
					throw new GraphQLError('Доступ запрещен или группа не найдена', {
						extensions: { code: 'FORBIDDEN' },
					})
				}

				const friends = await prisma.friends.findMany({
					where: { userId: currentUserId },
					select: { friendId: true },
				})
				const friendIds = new Set(friends.map(f => f.friendId))

				const group = await prisma.groups.findUnique({
					where: { id },
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
				})

				if (!group) {
					throw new GraphQLError('Группа не найдена', {
						extensions: { code: 'NOT_FOUND' },
					})
				}

				// Гарантируем, что messages всегда массив
				const messages = (group.messages ?? []).map(message => {
					const s = filterUserByPrivacy(
						message.sender,
						friendIds.has(message.senderId)
					) ?? {
						id: message.senderId,
						name: 'unknown',
						nickname: null,
						avatar: null,
						about: null,
						email: null,
						birthDate: null,
						lastOnline: null,
					}
					return {
						id: message.id,
						text: message.text ?? '',
						sentAt: message.sentAt.toISOString(),
						updatedAt:
							message.updatedAt?.toISOString() ?? new Date().toISOString(),
						sender: {
							...s,
							avatar: s.avatar
								? { url: `${process.env.API_URL_BACKEND}/avatar/${s.id}` }
								: null,
							__typename: 'GroupChatUser',
						},
						__typename: 'Message',
					}
				})

				const sanitizedGroup = {
					id: group.id,
					name: group.name,
					createdAt: group.createdAt.toISOString(),
					avatar: group.avatar
						? { url: `${process.env.API_URL_BACKEND}/avatar/group/${group.id}` }
						: null,
					users: (group.users ?? []).map(groupUser => {
						const u = filterUserByPrivacy(
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
							id: u.id,
							name: u.name,
							nickname: u.nickname ?? null,
							avatar: u.avatar
								? { url: `${process.env.API_URL_BACKEND}/avatar/${u.id}` }
								: null,
							about: u.about ?? null,
							email: u.email ?? null,
							birthDate: u.birthDate ?? null,
							lastOnline: u.lastOnline ?? null,
							__typename: 'GroupChatUser',
						}
					}),
					messages: messages, // Гарантированно массив
					__typename: 'GroupChat', // Добавьте это
				}

				return sanitizedGroup
			}
		),
	},

	Mutation: {
		createGroupChat: withAuth(
			async (
				_: any,
				{ name, creatorId }: { name: string; creatorId: string }
			) => {
				if (!name || !creatorId) {
					throw new GraphQLError('name и creatorId обязательны', {
						extensions: { code: 'BAD_USER_INPUT' },
					})
				}

				const user = await prisma.users.findUnique({
					where: { id: creatorId },
				})
				if (!user) {
					throw new GraphQLError('Пользователь не найден', {
						extensions: { code: 'NOT_FOUND' },
					})
				}

				const group = await prisma.groups.create({ data: { name } })
				await prisma.group_users.create({
					data: { groupId: group.id, userId: creatorId },
				})

				return { ...group, createdAt: group.createdAt.toISOString() }
			}
		),

		addUserToGroup: withAuth(
			async (
				_: any,
				{ groupId, userId }: { groupId: string; userId: string }
			) => {
				if (!groupId || !userId) {
					throw new GraphQLError('groupId и userId обязательны', {
						extensions: { code: 'BAD_USER_INPUT' },
					})
				}

				const group = await prisma.groups.findUnique({
					where: { id: groupId },
					include: { users: { include: { user: true } } }, // чтобы вернуть пользователей
				})
				if (!group) {
					throw new GraphQLError('Группа не найдена', {
						extensions: { code: 'NOT_FOUND' },
					})
				}

				const user = await prisma.users.findUnique({ where: { id: userId } })
				if (!user) {
					throw new GraphQLError('Пользователь не найден', {
						extensions: { code: 'NOT_FOUND' },
					})
				}

				const existing = await prisma.group_users.findUnique({
					where: { groupId_userId: { groupId, userId } },
				})
				if (existing) {
					throw new GraphQLError('Пользователь уже в группе', {
						extensions: { code: 'BAD_USER_INPUT' },
					})
				}

				try {
					// Добавляем пользователя в группу
					await prisma.group_users.create({
						data: { groupId, userId },
					})

					// Возвращаем саму группу с актуальными пользователями
					const updatedGroup = await prisma.groups.findUnique({
						where: { id: groupId },
						include: { users: { include: { user: true } } },
					})

					if (!updatedGroup) {
						throw new GraphQLError('Группа не найдена после обновления', {
							extensions: { code: 'NOT_FOUND' },
						})
					}

					return updatedGroup
				} catch (err) {
					console.error('Ошибка добавления пользователя в группу:', err)
					throw new GraphQLError('Не удалось добавить пользователя в группу', {
						extensions: { code: 'INTERNAL_SERVER_ERROR' },
					})
				}
			}
		),

		removeUserFromGroup: withAuth(
			async (
				_: any,
				{ groupId, userId }: { groupId: string; userId: string }
			) => {
				if (!groupId || !userId) {
					throw new GraphQLError('groupId и userId обязательны', {
						extensions: { code: 'BAD_USER_INPUT' },
					})
				}

				const existing = await prisma.group_users.findUnique({
					where: { groupId_userId: { groupId, userId } },
				})
				if (!existing) {
					throw new GraphQLError('Пользователь не найден в группе', {
						extensions: { code: 'NOT_FOUND' },
					})
				}

				try {
					const groupUser = await prisma.group_users.delete({
						where: { groupId_userId: { groupId, userId } },
						include: { user: true, group: true },
					})
					return groupUser
				} catch (err) {
					console.error('Ошибка удаления пользователя из группы:', err)
					throw new GraphQLError('Не удалось удалить пользователя из группы', {
						extensions: { code: 'INTERNAL_SERVER_ERROR' },
					})
				}
			}
		),

		uploadGroupAvatar: withAuth(
			async (
				_: any,
				{ groupId, file }: { groupId: string; file: Promise<FileUpload> }
			) => {
				if (!groupId || !file) {
					throw new GraphQLError('groupId и file обязательны', {
						extensions: { code: 'BAD_USER_INPUT' },
					})
				}

				const group = await prisma.groups.findUnique({
					where: { id: groupId },
				})
				if (!group) {
					throw new GraphQLError('Группа не найдена', {
						extensions: { code: 'NOT_FOUND' },
					})
				}

				const { createReadStream, filename, mimetype } = await file
				const stream = createReadStream()
				const chunks: Uint8Array[] = []
				for await (const chunk of stream) chunks.push(chunk)
				const buffer = Buffer.concat(chunks)

				const avatar = await prisma.group_avatars.upsert({
					where: { group_id: groupId },
					update: {
						filename,
						mime_type: mimetype,
						data: buffer,
						uploaded_at: new Date(),
					},
					create: {
						group_id: groupId,
						filename,
						mime_type: mimetype,
						data: buffer,
					},
				})

				return {
					id: avatar.id.toString(),
					filename: avatar.filename,
					mimeType: avatar.mime_type,
					uploadedAt: avatar.uploaded_at.toISOString(),
					url: `${process.env.API_URL}/avatar/group/${group.id}`,
					group: {
						id: group.id,
						name: group.name,
						createdAt: group.createdAt.toISOString(),
					},
				}
			}
		),
	},

	// GroupChat: {
	//   messages: withAuth(async (parent: any) => {
	//     const msgs = await prisma.messages.findMany({
	//       where: { groupId: parent.id },
	//       include: { sender: true },
	//     });
	//     return msgs.map((m) => ({
	//       ...m,
	//       sentAt: m.sentAt.toISOString(),
	//       updatedAt: m.updatedAt.toISOString(),
	//     }));
	//   }),

	//   users: withAuth(async (parent: any) => {
	//     const users = await prisma.group_users.findMany({
	//       where: { groupId: parent.id },
	//       include: { user: true },
	//     });
	//     return users.map((u) => u.user);
	//   }),

	//   avatar: withAuth(async (parent: any) => {
	//     const avatar = await prisma.group_avatars.findUnique({
	//       where: { group_id: parent.id },
	//     });
	//     if (!avatar) return null;
	//     return {
	//       ...avatar,
	//       uploadedAt: avatar.uploaded_at.toISOString(),
	//       url: `${process.env.API_URL}/avatar/group/${parent.id}`,
	//     };
	//   }),
	// },
}
