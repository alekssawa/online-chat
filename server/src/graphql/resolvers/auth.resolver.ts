import argon2 from 'argon2'
import { GraphQLError } from 'graphql'
import prisma from '../../lib/prismaClient.js'

import type { Response } from 'express'
import { generateTokens } from '../../lib/tokenService.js'
import type { RefreshRequest } from '../../middlewares/refresh.middleware.js'
import { refreshTokenCheck } from '../../middlewares/refresh.middleware.js'

export const authResolvers = {
	Mutation: {
		register: async (
			_: any,
			{
				email,
				password, // пароль для входа (НЕ для ключа)
				name,
				publicKey,
				encryptedPrivateKey,
				salt,
				iv,
				kdfIterations,
			}: {
				email: string
				password: string
				name?: string

				publicKey: string
				encryptedPrivateKey: string
				salt: string
				iv: string
				kdfIterations: number
			},
			context: { res: Response }
		) => {
			// Проверяем, существует ли пользователь
			const existingUser = await prisma.users.findUnique({ where: { email } })
			if (existingUser) {
				throw new Error('User with this email already exists')
			}

			// Хэшируем пароль (пароль от аккаунта)
			const hashedPassword = await argon2.hash(password)

			// Создаём пользователя
			const user = await prisma.users.create({
				data: {
					email,
					password: hashedPassword,
					name: name ?? 'unknown',

					// 🔐 Сохраняем ключи, переданные клиентом
					publicKey,
					encryptedPrivateKey,
					salt,
					iv,
					kdfIterations,

					privacy: {
						create: {
							showLastOnline: 'ALL',
							showAbout: 'ALL',
							showEmail: 'ALL',
							showBirthDate: 'FRIENDS',
							allowCalls: 'FRIENDS',
						},
					},
				},
				include: {
					privacy: true,
					avatar: true,
					friends: {
						include: {
							friend: {
								include: {
									avatar: true,
									privacy: true,
								},
							},
						},
					},
				},
			})

			// Генерируем токены
			const { accessToken, refreshToken } = await generateTokens(user.id)

			// Сохраняем refresh token в cookie
			context.res.cookie('refreshToken', refreshToken, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'strict',
				path: '/refresh_token',
				maxAge: 7 * 24 * 60 * 60 * 1000,
			})

			return { accessToken, user }
		},

		login: async (
			_: any,
			{ email, password }: { email: string; password: string },
			context: { res: Response }
		) => {
			const user = await prisma.users.findUnique({
				where: { email },
				include: {
					// ✅ добавить include
					privacy: true,
					avatar: true,
					friends: {
						include: {
							friend: {
								include: {
									avatar: true,
									privacy: true,
								},
							},
						},
					},
				},
			})
			if (!user) throw new Error('User not found')

			const valid = await argon2.verify(user.password, password)
			if (!valid) throw new Error('Invalid password')

			const { accessToken, refreshToken } = await generateTokens(user.id)
			const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

			// Удаляем старый токен
			await prisma.refreshToken.deleteMany({ where: { userId: user.id } })

			// Создаём новый
			await prisma.refreshToken.create({
				data: { token: refreshToken, userId: user.id, expiresAt },
			})

			context.res.cookie('refreshToken', refreshToken, {
				httpOnly: true,
				secure: false, // локально
				sameSite: 'lax',
				path: '/',
				maxAge: 7 * 24 * 60 * 60 * 1000,
			})

			return { accessToken, user }
		},

		refreshToken: async (
			_: any,
			__: any,
			context: { req: RefreshRequest; res: Response }
		) => {
			try {
				const tokenFromCookie = context.req.cookies?.refreshToken

				// Проверка токена
				const userId = await refreshTokenCheck(tokenFromCookie)

				// Генерация новых токенов
				const { accessToken, refreshToken } = await generateTokens(userId)
				const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

				// Удаляем старый и сохраняем новый токен
				await prisma.refreshToken.deleteMany({ where: { userId } })
				await prisma.refreshToken.create({
					data: { token: refreshToken, userId, expiresAt },
				})

				// Ставим cookie
				context.res.cookie('refreshToken', refreshToken, {
					httpOnly: true,
					secure: false,
					sameSite: 'lax',
					path: '/',
					maxAge: 7 * 24 * 60 * 60 * 1000,
				})

				// Возвращаем новые токены и пользователя
				const user = await prisma.users.findUnique({
					where: { id: userId },
					include: {
						privacy: true,
						avatar: true,
						friends: {
							include: {
								friend: {
									include: {
										avatar: true,
										privacy: true,
									},
								},
							},
						},
					},
				})

				if (!user) {
					throw new Error('User not found')
				}

				return { accessToken, user }
			} catch (err: any) {
				// Логируем и выбрасываем корректный GraphQLError
				console.error('refreshToken error:', err)
				throw new GraphQLError(err.message || 'Failed to refresh token', {
					extensions: { code: 'UNAUTHENTICATED' },
				})
			}
		},

		logout: async (_: any, __: any, { user, req }: any) => {
			// Получаем refresh token из cookies
			const refreshToken = req.cookies?.refreshToken

			if (!user && !refreshToken) {
				throw new Error('Not authenticated')
			}

			try {
				// Если есть пользователь из контекста, удаляем по userId
				if (user) {
					await prisma.refreshToken.deleteMany({ where: { userId: user.id } })
				}
				// Если нет пользователя, но есть refresh token, ищем и удаляем по токену
				else if (refreshToken) {
					await prisma.refreshToken.deleteMany({
						where: { token: refreshToken },
					})
				}

				// Очищаем cookie на сервере
				req.res?.cookie('refreshToken', '', {
					expires: new Date(0),
					httpOnly: true,
					path: '/',
				})

				return true
			} catch (error) {
				console.error('Logout error:', error)
				throw new Error('Logout failed')
			}
		},
	},
}
