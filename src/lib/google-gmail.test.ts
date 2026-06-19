import { afterEach, describe, expect, it, vi } from 'vitest'
import { google } from 'googleapis'

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn(function OAuth2Mock() {
        return {
          setCredentials: vi.fn(),
        }
      }),
    },
    gmail: vi.fn(() => ({
      users: {
        messages: {
          list: vi.fn(async () => ({
            data: {
              messages: [{ id: 'email-1' }],
            },
          })),
          get: vi.fn(async () => ({
            data: {
              id: 'email-1',
              threadId: 'thread-1',
              snippet: 'Entrega administrativa mañana',
              payload: {
                headers: [
                  { name: 'Subject', value: 'Fecha importante' },
                  { name: 'From', value: 'facultad@example.com' },
                  { name: 'Date', value: 'Thu, 18 Jun 2026 09:00:00 -0300' },
                ],
              },
            },
          })),
        },
      },
    })),
  },
}))

vi.mock('@/utils/supabase/service', () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { refresh_token: 'refresh-token' },
            error: null,
          }),
        }),
      }),
    }),
  }),
}))

vi.mock('@/lib/integrations/resilience', () => ({
  withFallback: vi.fn(async (fn: () => Promise<unknown>, fallback: unknown) => {
    try {
      return { data: await fn(), fromCache: false }
    } catch (error) {
      return {
        data: fallback,
        fromCache: false,
        error: error instanceof Error ? error.message : 'Servicio no disponible',
      }
    }
  }),
}))

vi.mock('@/lib/server/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

describe('Google Gmail digest', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('fetches relevant emails through withFallback and returns normalized metadata', async () => {
    const { getRelevantEmails } = await import('./google-gmail')
    const { withFallback } = await import('@/lib/integrations/resilience')

    const emails = await getRelevantEmails('user-1', new Date('2026-06-18T12:00:00.000Z'))

    expect(withFallback).toHaveBeenCalled()
    expect(emails).toEqual([
      {
        id: 'email-1',
        threadId: 'thread-1',
        subject: 'Fecha importante',
        from: 'facultad@example.com',
        date: 'Thu, 18 Jun 2026 09:00:00 -0300',
        snippet: 'Entrega administrativa mañana',
      },
    ])
  }, 10000)

  it('marks Gmail reads as degraded when the Gmail API falls back', async () => {
    vi.mocked(google.gmail).mockReturnValueOnce({
      users: {
        messages: {
          list: vi.fn(async () => {
            throw new Error('invalid_grant')
          }),
          get: vi.fn(),
        },
      },
    } as never)

    const { getRelevantEmailsWithStatus } = await import('./google-gmail')

    const result = await getRelevantEmailsWithStatus('user-1', new Date('2026-06-18T12:00:00.000Z'))

    expect(result).toEqual({
      emails: [],
      degraded: true,
      error: 'invalid_grant',
    })
  })

  it('creates extracted Gmail tasks with undo payloads for UndoToast', async () => {
    const { createTasksFromGmailDigest } = await import('./google-gmail')
    const redis = { set: vi.fn(async () => null) }
    const maybeSingle = vi.fn(async () => ({ data: null, error: null }))
    const single = vi.fn(async () => ({ data: { id: 'task-1' }, error: null }))
    const existingQuery = {
      eq: vi.fn(() => existingQuery),
      maybeSingle,
    }
    const selectExisting = vi.fn(() => existingQuery)
    const selectInserted = vi.fn(() => ({ single }))
    const insert = vi.fn(() => ({ select: selectInserted }))
    const from = vi.fn(() => ({
      select: selectExisting,
      insert,
    }))
    const supabase = { from }

    const result = await createTasksFromGmailDigest(
      'user-1',
      [{ title: 'Responder beca', dueAt: '2026-06-19T12:00:00-03:00', sourceEmailId: 'email-1' }],
      supabase as never,
      { redis, enableUndo: true }
    )

    expect(result).toEqual({
      created: 1,
      skipped: 0,
      createdTasks: [
        {
          title: 'Responder beca',
          recordId: 'task-1',
          undoId: 'undo:user-1:task-1',
        },
      ],
    })
    expect(redis.set).toHaveBeenCalledWith(
      'undo:user-1:task-1',
      expect.any(String),
      { ex: 5 }
    )
    const payload = JSON.parse(redis.set.mock.calls[0][1] as string)
    expect(payload).toMatchObject({
      userId: 'user-1',
      table: 'tasks',
      recordId: 'task-1',
      action: 'insert',
    })
    expect(payload.timestamp).toEqual(expect.any(Number))
  })

  it('does not return an undo id when Redis cannot store the undo payload', async () => {
    const { createTasksFromGmailDigest } = await import('./google-gmail')
    const redis = { set: vi.fn(async () => { throw new Error('redis unavailable') }) }
    const maybeSingle = vi.fn(async () => ({ data: null, error: null }))
    const single = vi.fn(async () => ({ data: { id: 'task-1' }, error: null }))
    const existingQuery = {
      eq: vi.fn(() => existingQuery),
      maybeSingle,
    }
    const selectExisting = vi.fn(() => existingQuery)
    const selectInserted = vi.fn(() => ({ single }))
    const insert = vi.fn(() => ({ select: selectInserted }))
    const from = vi.fn(() => ({
      select: selectExisting,
      insert,
    }))
    const supabase = { from }

    const result = await createTasksFromGmailDigest(
      'user-1',
      [{ title: 'Responder beca', dueAt: null, sourceEmailId: 'email-1' }],
      supabase as never,
      { redis, enableUndo: true }
    )

    expect(result).toEqual({
      created: 1,
      skipped: 0,
      createdTasks: [
        {
          title: 'Responder beca',
          recordId: 'task-1',
          undoId: undefined,
        },
      ],
    })
  })
})
