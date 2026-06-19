export type OfflineActionType = 'tasks.create' | 'expenses.create'

export const OFFLINE_ACTION_DB_NAME = 'acrue-offline-actions'
export const OFFLINE_ACTION_STORE_NAME = 'actions'
export const OFFLINE_ACTION_QUEUED_EVENT = 'acrue:offline-action-queued'
const OFFLINE_ACTION_DB_VERSION = 1

export type QueuedOfflineAction = {
  id: string
  type: OfflineActionType
  payload: Record<string, unknown>
  createdAt: string
  attempts: number
  lastError?: string
}

export type OfflineActionStore = {
  add(action: QueuedOfflineAction): Promise<void>
  list(): Promise<QueuedOfflineAction[]>
  remove(id: string): Promise<void>
  update(action: QueuedOfflineAction): Promise<void>
}

export type OfflineActionDeps = {
  createId?: () => string
  now?: () => Date
}

type OfflineSyncResult = {
  pending: number
  synced: number
  failed: number
}

type OfflineSyncResponse = {
  results?: Array<{
    id: string
    ok: boolean
    error?: string
  }>
}

type OfflineSyncFetcher = (
  input: string,
  init: {
    method: 'POST'
    headers: { 'Content-Type': 'application/json' }
    body: string
  }
) => Promise<Response>

function defaultCreateId() {
  return crypto.randomUUID()
}

function defaultNow() {
  return new Date()
}

export function createQueuedOfflineAction(
  type: OfflineActionType,
  payload: Record<string, unknown>,
  deps: OfflineActionDeps = {}
): QueuedOfflineAction {
  return {
    id: (deps.createId ?? defaultCreateId)(),
    type,
    payload,
    createdAt: (deps.now ?? defaultNow)().toISOString(),
    attempts: 0,
  }
}

export async function enqueueOfflineAction(
  store: OfflineActionStore,
  type: OfflineActionType,
  payload: Record<string, unknown>,
  deps: OfflineActionDeps = {}
): Promise<QueuedOfflineAction> {
  const action = createQueuedOfflineAction(type, payload, deps)
  await store.add(action)
  return action
}

export function createIndexedDbOfflineActionStore(
  indexedDBRef: Pick<IDBFactory, 'open'> | undefined = globalThis.indexedDB
): OfflineActionStore {
  if (!indexedDBRef) {
    throw new Error('IndexedDB no está disponible en este navegador')
  }

  return {
    async add(action) {
      const store = await openOfflineActionStore(indexedDBRef, 'readwrite')
      await runIdbRequest(store.put(action))
    },
    async list() {
      const store = await openOfflineActionStore(indexedDBRef, 'readonly')
      return await runIdbRequest(store.getAll()) as QueuedOfflineAction[]
    },
    async remove(id) {
      const store = await openOfflineActionStore(indexedDBRef, 'readwrite')
      await runIdbRequest(store.delete(id))
    },
    async update(action) {
      const store = await openOfflineActionStore(indexedDBRef, 'readwrite')
      await runIdbRequest(store.put(action))
    },
  }
}

export async function syncQueuedOfflineActions(
  store: OfflineActionStore,
  fetcher: OfflineSyncFetcher
): Promise<OfflineSyncResult> {
  const actions = await store.list()

  if (actions.length === 0) {
    return { pending: 0, synced: 0, failed: 0 }
  }

  const response = await fetcher('/api/pwa/offline-sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actions }),
  })

  if (!response.ok) {
    await Promise.all(actions.map((action) => store.update(markActionFailed(action, response.statusText))))
    return { pending: actions.length, synced: 0, failed: actions.length }
  }

  const payload = await response.json() as OfflineSyncResponse
  const results = payload.results ?? []
  const resultById = new Map(results.map((result) => [result.id, result]))
  let synced = 0
  let failed = 0

  await Promise.all(actions.map(async (action) => {
    const result = resultById.get(action.id)

    if (result?.ok) {
      synced += 1
      await store.remove(action.id)
      return
    }

    failed += 1
    await store.update(markActionFailed(action, result?.error ?? 'No se pudo sincronizar'))
  }))

  return {
    pending: actions.length,
    synced,
    failed,
  }
}

function markActionFailed(action: QueuedOfflineAction, error: string): QueuedOfflineAction {
  return {
    ...action,
    attempts: action.attempts + 1,
    lastError: error || 'No se pudo sincronizar',
  }
}

async function openOfflineActionStore(
  indexedDBRef: Pick<IDBFactory, 'open'>,
  mode: IDBTransactionMode
): Promise<IDBObjectStore> {
  const db = await openOfflineActionDb(indexedDBRef)
  return db.transaction(OFFLINE_ACTION_STORE_NAME, mode).objectStore(OFFLINE_ACTION_STORE_NAME)
}

function openOfflineActionDb(indexedDBRef: Pick<IDBFactory, 'open'>): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDBRef.open(OFFLINE_ACTION_DB_NAME, OFFLINE_ACTION_DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(OFFLINE_ACTION_STORE_NAME)) {
        db.createObjectStore(OFFLINE_ACTION_STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('No se pudo abrir IndexedDB'))
  })
}

function runIdbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('No se pudo completar la operación offline'))
  })
}
