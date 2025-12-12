export interface Avatar {
	url: string
}

export interface User {
	id: string
	name: string
	email: string
	avatar?: Avatar
	nickname?: string | null
	about?: string | null
	birthDate?: string | null
	lastOnline?: string | null
	friends?: Friend[]
	privacy?: PrivacySettings | null
	// 🔹 E2EE
	publicKey?: string
	encryptedPrivateKey?: string
	salt?: string
	iv?: string
	kdfIterations?: number
	keyCreatedAt?: string // ISO string
	keyUpdatedAt?: string // ISO string
}

export interface Friend {
	id: string
	friend: User
	createdAt: string
}

export interface PrivacySettings {
	id: string
	showLastOnline: PrivacyLevel
	showAbout: PrivacyLevel
	showEmail: PrivacyLevel
	showBirthDate: PrivacyLevel // ✅ добавлено, как в Prisma
	allowCalls: PrivacyLevel
}

export type PrivacyLevel = 'ALL' | 'FRIENDS' | 'NONE'

export type SelectedChat =
	| { chat: GroupChat; type: 'group' }
	| { chat: PrivateChat; type: 'private' }

export interface ChatItem {
	id: string
	users: User[]
	name: string
	type: 'group' | 'private'
	lastMessage?: string
	senderName?: string
	avatarUrl?: string
}

export interface GroupChat {
	id: string
	name: string
	createdAt: string
	avatar?: GroupAvatar | null
	users?: User[]
	messages: Message[]
}

export interface GroupAvatar {
	url: string
}

// ✅ Участник группы
export interface GroupUser {
	id: string
	groupId: string
	userId: string
	joinedAt: string
	user: User
	group?: GroupChat
}

export interface PrivateChat {
	id: string
	user1Id: string
	user2Id: string
	user1: User
	user2: User
	createdAt: string
	messages: Message[]
}

export interface Message {
	id: string
	text: string
	iv: string
	senderId: string
	sentAt: string
	updatedAt: string
	sender?: User
	privateChatId?: string | null
	groupId?: string | null
}

export interface OnlineUser {
	userId: string
	online: boolean
}
