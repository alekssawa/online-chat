// lib/cryptoStorage.ts
export const DB_NAME = 'user-keys-db'
export const STORE_NAME = 'keys'

export function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, 1)

		request.onupgradeneeded = () => {
			const db = request.result
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME)
			}
		}

		request.onsuccess = () => resolve(request.result)
		request.onerror = () => reject(request.error)
	})
}

export async function saveKey(keyName: string, data: ArrayBuffer) {
	const db = await openDB()
	return new Promise<void>((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readwrite')
		const store = tx.objectStore(STORE_NAME)
		// конвертируем ArrayBuffer в Uint8Array
		store.put(new Uint8Array(data), keyName)
		tx.oncomplete = () => resolve()
		tx.onerror = () => reject(tx.error)
	})
}

export async function loadKey(keyName: string): Promise<ArrayBuffer | null> {
	const db = await openDB()
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readonly')
		const store = tx.objectStore(STORE_NAME)
		const request = store.get(keyName)

		request.onsuccess = () => {
			if (request.result) {
				resolve(request.result as ArrayBuffer)
			} else {
				resolve(null)
			}
		}
		request.onerror = () => reject(request.error)
	})
}
