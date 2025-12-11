import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@as-integrations/express4' // Изменено на express4
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { GraphQLUpload, graphqlUploadExpress } from 'graphql-upload-minimal'
import { createServer } from 'http'
import { Server } from 'socket.io'

import { resolvers } from './graphql/resolvers.js'
import { typeDefs } from './graphql/schema.js'
import prisma from './lib/prismaClient.js'

import avatarRoutes from './routes/avatar.routes.js'
import { registerSocketHandlers } from './sockets/socketHandler.js'

const app = express()

app.use(graphqlUploadExpress({ maxFileSize: 10_000_000, maxFiles: 1 }))

const httpServer = createServer(app)
const io = new Server(httpServer, {
	cors: {
		origin: process.env.API_URL_FRONTEND,
		credentials: true,
	},
})

const apolloServer = new ApolloServer({
	typeDefs,
	resolvers: {
		Upload: GraphQLUpload, // 👈 именно здесь
		...resolvers,
	},
})

await apolloServer.start()

// Разрешаем CORS для всех источников (можно ограничить доменами)
app.use(
	cors({
		origin: 'http://localhost:5173', // явно фронт
		credentials: true, // разрешаем cookie
	})
)

// Если нужны JSON-запросы
app.use(express.json())
app.use(cookieParser())

// GraphQL
app.use(
	'/graphql',
	expressMiddleware(apolloServer, {
		context: async ({ req, res }) => {
			const { operationName } = req.body
			const publicOperations = ['Register', 'Login', 'IntrospectionQuery']

			// Если операция публичная — возвращаем контекст без проверки
			if (publicOperations.includes(operationName)) {
				return { prisma, req, res, user: null }
			}

			// Для остальных операций — токен можно проверять уже **в конкретных резолверах**
			// Просто возвращаем req/res и prisma, без глобального middleware
			return { prisma, req, res, user: null }
		},
	})
)

app.use('/avatar', avatarRoutes)

registerSocketHandlers(io)

const PORT = 3000
const API_URL = process.env.API_URL
httpServer.listen(PORT, () => {
	console.log(`Server running at ${API_URL}`)
	console.log(`GraphQL endpoint at ${API_URL}/graphql`)
})
