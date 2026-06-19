import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addXP } from '@/lib/xp'
import { appRouter } from './_app'

vi.mock('@/lib/xp', () => ({
  addXP: vi.fn(),
}))

type TableName = 'focus_sessions' | 'users' | 'tasks'

type FocusSessionRow = {
  id: string
  user_id: string
  task_id: string | null
  mode: string
  work_minutes: number
  break_minutes: number
  completed_at: string
}

type UserRow = {
  id: string
  settings: Record<string, unknown> | null
}

type TaskRow = {
  id: string
  user_id: string
  title: string
  status: string
  priority: number
  due_at: string | null
  deleted_at: string | null
}

type Filter = { op: 'eq' | 'is' | 'neq' | 'gte' | 'lte'; column: string; value: unknown }

type SupabaseState = {
  focus_sessions: FocusSessionRow[]
  users: UserRow[]
  tasks: TaskRow[]
}

class QueryBuilder {
  private action: 'select' | 'insert' | 'update' = 'select'
  private payload: Record<string, unknown> | null = null
  private filters: Filter[] = []
  private limitCount: number | null = null

  constructor(
    private readonly table: TableName,
    private readonly state: SupabaseState
  ) {}

  select() {
    return this
  }

  insert(payload: Record<string, unknown>) {
    this.action = 'insert'
    this.payload = payload
    return this
  }

  update(payload: Record<string, unknown>) {
    this.action = 'update'
    this.payload = payload
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ op: 'eq', column, value })
    return this
  }

  is(column: string, value: unknown) {
    this.filters.push({ op: 'is', column, value })
    return this
  }

  neq(column: string, value: unknown) {
    this.filters.push({ op: 'neq', column, value })
    return this
  }

  gte(column: string, value: unknown) {
    this.filters.push({ op: 'gte', column, value })
    return this
  }

  lte(column: string, value: unknown) {
    this.filters.push({ op: 'lte', column, value })
    return this
  }

  order() {
    return this
  }

  limit(count: number) {
    this.limitCount = count
    return this
  }

  single() {
    return Promise.resolve(this.resolveSingle(false))
  }

  maybeSingle() {
    return Promise.resolve(this.resolveSingle(true))
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return Promise.resolve(this.resolveMany()).then(onfulfilled, onrejected)
  }

  private resolveMany() {
    if (this.action === 'insert') {
      const row = {
        id: `generated-${this.state[this.table].length + 1}`,
        ...this.payload,
      }
      this.state[this.table].push(row as never)
      return { data: row, error: null }
    }

    if (this.action === 'update') {
      const rows = this.matchingRows()
      rows.forEach((row) => Object.assign(row, this.payload))
      return { data: rows, error: null }
    }

    const rows = this.matchingRows()
    return { data: this.limitCount ? rows.slice(0, this.limitCount) : rows, error: null }
  }

  private resolveSingle(allowEmpty: boolean) {
    const result = this.resolveMany()
    const rows = Array.isArray(result.data) ? result.data : [result.data]
    const data = rows[0] ?? null

    if (!data && !allowEmpty) {
      return { data: null, error: { message: 'No rows returned' } }
    }

    return { data, error: null }
  }

  private matchingRows() {
    return this.state[this.table].filter((row) =>
      this.filters.every((filter) => {
        const value = row[filter.column as keyof typeof row]
        if (filter.op === 'eq') return value === filter.value
        if (filter.op === 'is') return value == null && filter.value === null
        if (filter.op === 'neq') return value !== filter.value
        if (filter.op === 'gte') return String(value) >= String(filter.value)
        return String(value) <= String(filter.value)
      })
    )
  }
}

function createSupabaseMock(initial?: Partial<SupabaseState>) {
  const state: SupabaseState = {
    focus_sessions: initial?.focus_sessions ?? [],
    users: initial?.users ?? [{ id: 'user-1', settings: null }],
    tasks: initial?.tasks ?? [],
  }

  return {
    state,
    supabase: {
      from(table: TableName) {
        return new QueryBuilder(table, state)
      },
    },
  }
}

function createCaller(supabase: unknown) {
  return appRouter.createCaller({
    supabase,
    user: { id: 'user-1' },
  } as never)
}

describe('focusRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns focus settings from the authenticated user profile', async () => {
    const { supabase } = createSupabaseMock({
      users: [
        {
          id: 'user-1',
          settings: {
            focus: {
              spotifyPlaylistUrl: 'https://open.spotify.com/playlist/abc123',
              workMinutes: 40,
              breakMinutes: 8,
            },
          },
        },
      ],
    })

    const settings = await createCaller(supabase).focus.settings()

    expect(settings).toMatchObject({
      spotifyPlaylistUrl: 'https://open.spotify.com/playlist/abc123',
      workMinutes: 40,
      breakMinutes: 8,
    })
  })

  it('records a completed focus session and awards focus XP', async () => {
    const { supabase, state } = createSupabaseMock()

    const session = await createCaller(supabase).focus.completeSession({
      taskId: '11111111-1111-4111-8111-111111111111',
      mode: 'pomodoro',
      workMinutes: 25,
      breakMinutes: 5,
      completedAt: '2026-06-17T13:00:00.000Z',
    })

    expect(session).toMatchObject({
      task_id: '11111111-1111-4111-8111-111111111111',
      user_id: 'user-1',
      mode: 'pomodoro',
      work_minutes: 25,
      break_minutes: 5,
    })
    expect(state.focus_sessions).toHaveLength(1)
    expect(addXP).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'foco',
      'generated-1',
      5,
      'Sesion de foco completada'
    )
  })
})
