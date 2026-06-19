import { describe, expect, it, vi } from 'vitest'
import {
  createQueuedOfflineAction,
  createIndexedDbOfflineActionStore,
  enqueueOfflineAction,
  syncQueuedOfflineActions,
  OFFLINE_ACTION_DB_NAME,
  OFFLINE_ACTION_STORE_NAME,
  type OfflineActionStore,
  type QueuedOfflineAction,
} from './offline-actions'

function createMemoryStore(initial: QueuedOfflineAction[] = []): OfflineActionStore {
  const actions = new Map(initial.map((action) => [action.id, action]))

  return {
    async add(action) {
      actions.set(action.id, action)
    },
    async list() {
      return Array.from(actions.values())
    },
    async remove(id) {
      actions.delete(id)
    },
    async update(action) {
      actions.set(action.id, action)
    },
  }
}

describe('offline actions queue', () => {
  it('creates queued actions with deterministic metadata', () => {
    const action = createQueuedOfflineAction('tasks.create', { title: 'Leer PRD' }, {
      createId: () => 'offline-1',
      now: () => new Date('2026-06-15T12:00:00.000Z'),
    })

    expect(action).toEqual({
      id: 'offline-1',
      type: 'tasks.create',
      payload: { title: 'Leer PRD' },
      createdAt: '2026-06-15T12:00:00.000Z',
      attempts: 0,
    })
  })

  it('enqueues task and expense actions in the provided store', async () => {
    const store = createMemoryStore()

    await enqueueOfflineAction(store, 'tasks.create', { title: 'Offline task' }, {
      createId: () => 'task-action',
      now: () => new Date('2026-06-15T13:00:00.000Z'),
    })
    await enqueueOfflineAction(store, 'expenses.create', { amount: -1200, date: '2026-06-15' }, {
      createId: () => 'expense-action',
      now: () => new Date('2026-06-15T13:05:00.000Z'),
    })

    expect(await store.list()).toMatchObject([
      { id: 'task-action', type: 'tasks.create' },
      { id: 'expense-action', type: 'expenses.create' },
    ])
  })

  it('syncs queued actions, removes successful items, and keeps failed items with retry metadata', async () => {
    const store = createMemoryStore([
      {
        id: 'task-action',
        type: 'tasks.create',
        payload: { title: 'Offline task' },
        createdAt: '2026-06-15T13:00:00.000Z',
        attempts: 0,
      },
      {
        id: 'expense-action',
        type: 'expenses.create',
        payload: { amount: -1200, date: '2026-06-15' },
        createdAt: '2026-06-15T13:05:00.000Z',
        attempts: 1,
      },
    ])
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({
        results: [
          { id: 'task-action', ok: true },
          { id: 'expense-action', ok: false, error: 'Categoria invalida' },
        ],
      }), { status: 200 })
    )

    const result = await syncQueuedOfflineActions(store, fetcher)

    expect(fetcher).toHaveBeenCalledWith('/api/pwa/offline-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actions: [
          {
            id: 'task-action',
            type: 'tasks.create',
            payload: { title: 'Offline task' },
            createdAt: '2026-06-15T13:00:00.000Z',
            attempts: 0,
          },
          {
            id: 'expense-action',
            type: 'expenses.create',
            payload: { amount: -1200, date: '2026-06-15' },
            createdAt: '2026-06-15T13:05:00.000Z',
            attempts: 1,
          },
        ],
      }),
    })
    expect(result).toEqual({ pending: 2, synced: 1, failed: 1 })
    expect(await store.list()).toEqual([
      {
        id: 'expense-action',
        type: 'expenses.create',
        payload: { amount: -1200, date: '2026-06-15' },
        createdAt: '2026-06-15T13:05:00.000Z',
        attempts: 2,
        lastError: 'Categoria invalida',
      },
    ])
  })

  it('does not call the sync endpoint when the queue is empty', async () => {
    const fetcher = vi.fn()
    const result = await syncQueuedOfflineActions(createMemoryStore(), fetcher)

    expect(fetcher).not.toHaveBeenCalled()
    expect(result).toEqual({ pending: 0, synced: 0, failed: 0 })
  })

  it('persists queued actions in IndexedDB-compatible storage', async () => {
    const fakeIndexedDb = createFakeIndexedDb()
    const store = createIndexedDbOfflineActionStore(fakeIndexedDb)
    const firstAction = createQueuedOfflineAction('tasks.create', { title: 'IndexedDB task' }, {
      createId: () => 'idb-task',
      now: () => new Date('2026-06-15T14:00:00.000Z'),
    })

    await store.add(firstAction)
    expect(await store.list()).toEqual([firstAction])

    await store.update({ ...firstAction, attempts: 1, lastError: 'Sin conexion' })
    expect(await store.list()).toEqual([{ ...firstAction, attempts: 1, lastError: 'Sin conexion' }])

    await store.remove(firstAction.id)
    expect(await store.list()).toEqual([])
    expect(fakeIndexedDb.openCalls).toEqual([
      { name: OFFLINE_ACTION_DB_NAME, version: 1 },
      { name: OFFLINE_ACTION_DB_NAME, version: 1 },
      { name: OFFLINE_ACTION_DB_NAME, version: 1 },
      { name: OFFLINE_ACTION_DB_NAME, version: 1 },
      { name: OFFLINE_ACTION_DB_NAME, version: 1 },
      { name: OFFLINE_ACTION_DB_NAME, version: 1 },
    ])
  })
})

type FakeRequest<T> = {
  result: T
  error: Error | null
  onsuccess: ((event: Event) => void) | null
  onerror: ((event: Event) => void) | null
  onupgradeneeded?: ((event: Event) => void) | null
}

function createFakeIndexedDb() {
  const records = new Map<string, QueuedOfflineAction>()
  let hasStore = false
  const fakeDb = {
    objectStoreNames: {
      contains(name: string) {
        return name === OFFLINE_ACTION_STORE_NAME && hasStore
      },
    },
    createObjectStore(name: string) {
      if (name === OFFLINE_ACTION_STORE_NAME) {
        hasStore = true
      }
    },
    transaction() {
      return {
        objectStore() {
          return {
            put(action: QueuedOfflineAction) {
              const request = createRequest<IDBValidKey>()
              queueMicrotask(() => {
                records.set(action.id, action)
                request.result = action.id
                request.onsuccess?.(new Event('success'))
              })
              return request
            },
            getAll() {
              const request = createRequest<QueuedOfflineAction[]>()
              queueMicrotask(() => {
                request.result = Array.from(records.values())
                request.onsuccess?.(new Event('success'))
              })
              return request
            },
            delete(id: string) {
              const request = createRequest<undefined>()
              queueMicrotask(() => {
                records.delete(id)
                request.result = undefined
                request.onsuccess?.(new Event('success'))
              })
              return request
            },
          }
        },
      }
    },
  }
  const fakeIndexedDb = {
    openCalls: [] as Array<{ name: string; version: number }>,
    open(name: string, version: number) {
      fakeIndexedDb.openCalls.push({ name, version })
      const request = createRequest<typeof fakeDb>()
      queueMicrotask(() => {
        request.result = fakeDb
        if (!hasStore) {
          request.onupgradeneeded?.(new Event('upgradeneeded'))
        }
        request.onsuccess?.(new Event('success'))
      })
      return request
    },
  }

  return fakeIndexedDb as typeof fakeIndexedDb & IDBFactory
}

function createRequest<T>(): FakeRequest<T> {
  return {
    result: undefined as T,
    error: null,
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
  }
}
