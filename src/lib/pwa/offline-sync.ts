import type { QueuedOfflineAction } from './offline-actions'

export type OfflineSyncCaller = {
  tasks: {
    create(input: Record<string, unknown>): Promise<unknown>
  }
  expenses: {
    create(input: Record<string, unknown>): Promise<unknown>
  }
}

export type OfflineSyncItemResult = {
  id: string
  ok: boolean
  error?: string
}

export async function applyQueuedOfflineActions(
  caller: OfflineSyncCaller,
  actions: QueuedOfflineAction[]
): Promise<OfflineSyncItemResult[]> {
  const results: OfflineSyncItemResult[] = []

  for (const action of actions) {
    try {
      if (action.type === 'tasks.create') {
        await caller.tasks.create(action.payload)
      } else {
        await caller.expenses.create(action.payload)
      }

      results.push({ id: action.id, ok: true })
    } catch (error) {
      results.push({
        id: action.id,
        ok: false,
        error: getErrorMessage(error),
      })
    }
  }

  return results
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'No se pudo sincronizar'
}
