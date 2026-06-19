import { afterEach, describe, expect, it, vi } from 'vitest'
import { createServiceClient } from '@/utils/supabase/service'
import { GET } from './route'

vi.mock('@/utils/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

vi.mock('@/lib/server/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

type DeleteResult = {
  count: number | null
  error: { message: string } | null
}

function createSupabaseMock(results: Record<string, DeleteResult>) {
  const calls: Array<{ table: string; column: string }> = []

  return {
    calls,
    supabase: {
      from(table: string) {
        return {
          delete() {
            return {
              async lt(column: string) {
                calls.push({ table, column })
                return results[table] ?? { count: 0, error: null }
              },
            }
          },
        }
      },
    },
  }
}

describe('cleanup trash cron', () => {
  const originalCronSecret = process.env.CRON_SECRET

  afterEach(() => {
    vi.clearAllMocks()
    if (originalCronSecret === undefined) {
      delete process.env.CRON_SECRET
    } else {
      process.env.CRON_SECRET = originalCronSecret
    }
  })

  it('fails the cron when any trash table cleanup fails', async () => {
    process.env.CRON_SECRET = 'cron-secret'
    const { calls, supabase } = createSupabaseMock({
      tasks: { count: 2, error: null },
      expenses: { count: null, error: { message: 'permission denied' } },
      meal_log: { count: 0, error: null },
      assignments: { count: 1, error: null },
      calendar_events: { count: 0, error: null },
    })
    vi.mocked(createServiceClient).mockReturnValue(supabase as never)

    const response = await GET(
      new Request('http://acrue.test/api/cron/cleanup-trash', {
        headers: { authorization: 'Bearer cron-secret' },
      })
    )

    await expect(response.json()).resolves.toEqual({
      error: 'No se pudo limpiar toda la papelera.',
      deleted: {
        tasks: 2,
        expenses: -1,
        meal_log: 0,
        assignments: 1,
        calendar_events: 0,
      },
      failedTables: ['expenses'],
    })
    expect(response.status).toBe(500)
    expect(calls).toEqual(
      expect.arrayContaining([
        { table: 'tasks', column: 'deleted_at' },
        { table: 'calendar_events', column: 'deleted_at' },
      ])
    )
  })
})
