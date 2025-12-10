// store/userKeys.ts
import { create } from 'zustand'

interface UserKeysState {
	privateKey: ArrayBuffer | null
	setPrivateKey: (key: ArrayBuffer | null) => void
	clearPrivateKey: () => void
}

export const useUserKeysStore = create<UserKeysState>(set => ({
	privateKey: null,
	setPrivateKey: key => set({ privateKey: key }),
	clearPrivateKey: () => set({ privateKey: null }),
}))
