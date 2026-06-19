import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addXP } from '@/lib/xp'
import { appRouter } from './_app'

vi.mock('@/lib/xp', () => ({
  addXP: vi.fn(),
}))

const HABIT_ID = '11111111-1111-4111-8111-111111111111'

type TableName = 'habits' | 'habit_logs'

type HabitRow = {
  id: string
  user_id: string
  name: string
  frequency: string
  days_of_week: number[]
  custom_rule?: Record<string, unknown> | null
  time_of_day: string | null
  active: boolean
  created_at: string
}

type HabitLogRow = {
  id: string
  habit_id: string
  completed_at: string
  event_type?: 'complete' | 'uncomplete'
}

type Filter =
  | { op: 'eq'; column: string; value: unknown }
  | { op: 'in'; column: string; value: unknown[] }
  | { op: 'gte'; column: string; value: string }
  | { op: 'lte'; column: string; value: string }

type SupabaseState = {
  habits: HabitRow[]
  habit_logs: HabitLogRow[]
}

class QueryBuilder {
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private payload: Record<string, unknown> | null = null
  private filters: Filter[] = []
  private limitCount: number | null = null

  constructor(
    private readonly table: TableName,
    private readonly state: SupabaseState,
    private readonly calls: string[]
  ) {}

  select() {
    if (this.action === 'select') {
      this.action = 'select'
    }
    return this
  }

  insert(payload: Record<string, unknown>) {
    this.action = 'insert'
    this.payload = payload
    this.calls.push(`${this.table}.insert`)
    return this
  }

  update(payload: Record<string, unknown>) {
    this.action = 'update'
    this.payload = payload
    this.calls.push(`${this.table}.update`)
    return this
  }

  delete() {
    this.action = 'delete'
    this.calls.push(`${this.table}.delete`)
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ op: 'eq', column, value })
    return this
  }

  in(column: string, value: unknown[]) {
    this.filters.push({ op: 'in', column, value })
    return this
  }

  gte(column: string, value: string) {
    this.filters.push({ op: 'gte', column, value })
    return this
  }

  lte(column: string, value: string) {
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
      return { data: this.insertRow(), error: null }
    }

    if (this.action === 'update') {
      const updated = this.matchingRows().map((row) => Object.assign(row, this.payload))
      return { data: updated, error: null }
    }

    if (this.action === 'delete') {
      const rows = this.matchingRows()
      this.state[this.table] = this.state[this.table].filter((row) => !rows.includes(row as never)) as never
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

  private insertRow() {
    const row = {
      id: `generated-${this.state[this.table].length + 1}`,
      created_at: '2026-06-16T12:00:00.000Z',
      completed_at: '2026-06-16T12:00:00.000Z',
      ...this.payload,
    }

    this.state[this.table].push(row as never)
    return row
  }

  private matchingRows() {
    return this.state[this.table].filter((row) =>
      this.filters.every((filter) => {
        const value = row[filter.column as keyof typeof row]
        if (filter.op === 'eq') return value === filter.value
        if (filter.op === 'in') return filter.value.includes(value)
        if (filter.op === 'gte') return String(value) >= filter.value
        return String(value) <= filter.value
      })
    )
  }
}

function createSupabaseMock(initial?: Partial<SupabaseState>) {
  const state: SupabaseState = {
    habits: initial?.habits ?? [],
    habit_logs: initial?.habit_logs ?? [],
  }
  const calls: string[] = []

  return {
    state,
    calls,
    supabase: {
      from(table: TableName) {
        return new QueryBuilder(table, state, calls)
      },
    },
  }
}

function createCaller(supabase: unknown, userId = 'user-1') {
  return appRouter.createCaller({
    supabase,
    user: { id: userId },
  } as never)
}

describe('habitRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates an active daily habit scoped to the authenticated user', async () => {
    const { supabase, state } = createSupabaseMock()
    const caller = createCaller(supabase)

    const habit = await caller.habits.create({ name: 'Leer' })

    expect(habit).toMatchObject({
      user_id: 'user-1',
      name: 'Leer',
      frequency: 'daily',
      days_of_week: [],
      active: true,
    })
    expect(state.habits).toHaveLength(1)
  })

  it('stores custom recurrence rules separately from weekly habits', async () => {
    const { supabase, state } = createSupabaseMock()
    const caller = createCaller(supabase)
    const customRule = {
      type: 'every_n_weeks' as const,
      intervalWeeks: 2,
      daysOfWeek: [1],
      anchorDate: '2026-06-01',
    }

    const habit = await caller.habits.create({
      name: 'Rutina larga',
      frequency: 'custom',
      days_of_week: [1],
      custom_rule: customRule,
    })

    expect(habit).toMatchObject({
      frequency: 'custom',
      days_of_week: [1],
      custom_rule: customRule,
    })
    expect(state.habits[0]?.custom_rule).toEqual(customRule)
  })

  it('deactivates a habit instead of deleting habit logs', async () => {
    const { supabase, state, calls } = createSupabaseMock({
      habits: [
        {
          id: HABIT_ID,
          user_id: 'user-1',
          name: 'Leer',
          frequency: 'daily',
          days_of_week: [],
          custom_rule: null,
          time_of_day: null,
          active: true,
          created_at: '2026-06-15T12:00:00.000Z',
        },
      ],
      habit_logs: [
        {
          id: 'log-1',
          habit_id: HABIT_ID,
          completed_at: '2026-06-16T12:00:00.000Z',
          event_type: 'complete',
        },
      ],
    })
    const caller = createCaller(supabase)

    await caller.habits.delete({ id: HABIT_ID })

    expect(state.habits[0]?.active).toBe(false)
    expect(state.habit_logs).toHaveLength(1)
    expect(calls).not.toContain('habits.delete')
  })

  it('logs a habit completion append-only and awards habit XP once', async () => {
    const { supabase, state } = createSupabaseMock({
      habits: [
        {
          id: HABIT_ID,
          user_id: 'user-1',
          name: 'Leer',
          frequency: 'daily',
          days_of_week: [],
          custom_rule: null,
          time_of_day: null,
          active: true,
          created_at: '2026-06-15T12:00:00.000Z',
        },
      ],
    })
    const caller = createCaller(supabase)

    const completion = await caller.habits.complete({
      id: HABIT_ID,
      completed_at: '2026-06-16T12:00:00.000Z',
      dayStart: '2026-06-16T00:00:00.000Z',
      dayEnd: '2026-06-16T23:59:59.999Z',
    })

    expect(completion.alreadyCompleted).toBe(false)
    expect(state.habit_logs).toHaveLength(1)
    expect(state.habit_logs[0]).toMatchObject({
      habit_id: HABIT_ID,
      completed_at: '2026-06-16T12:00:00.000Z',
      event_type: 'complete',
    })
    expect(addXP).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'habit',
      HABIT_ID,
      15,
      'Hábito completado: Leer'
    )
  })

  it('does not create duplicate logs or XP for the same habit day', async () => {
    const { supabase, state } = createSupabaseMock({
      habits: [
        {
          id: HABIT_ID,
          user_id: 'user-1',
          name: 'Leer',
          frequency: 'daily',
          days_of_week: [],
          custom_rule: null,
          time_of_day: null,
          active: true,
          created_at: '2026-06-15T12:00:00.000Z',
        },
      ],
      habit_logs: [
        {
          id: 'log-1',
          habit_id: HABIT_ID,
          completed_at: '2026-06-16T12:00:00.000Z',
          event_type: 'complete',
        },
      ],
    })
    const caller = createCaller(supabase)

    const completion = await caller.habits.complete({
      id: HABIT_ID,
      completed_at: '2026-06-16T15:00:00.000Z',
      dayStart: '2026-06-16T00:00:00.000Z',
      dayEnd: '2026-06-16T23:59:59.999Z',
    })

    expect(completion.alreadyCompleted).toBe(true)
    expect(state.habit_logs).toHaveLength(1)
    expect(addXP).not.toHaveBeenCalled()
  })

  it('uncompletes a habit by appending an event and reversing habit XP', async () => {
    const { supabase, state } = createSupabaseMock({
      habits: [
        {
          id: HABIT_ID,
          user_id: 'user-1',
          name: 'Leer',
          frequency: 'daily',
          days_of_week: [],
          custom_rule: null,
          time_of_day: null,
          active: true,
          created_at: '2026-06-15T12:00:00.000Z',
        },
      ],
      habit_logs: [
        {
          id: 'log-1',
          habit_id: HABIT_ID,
          completed_at: '2026-06-16T12:00:00.000Z',
          event_type: 'complete',
        },
      ],
    })
    const caller = createCaller(supabase)

    const result = await caller.habits.uncomplete({
      id: HABIT_ID,
      completed_at: '2026-06-16T15:00:00.000Z',
      dayStart: '2026-06-16T00:00:00.000Z',
      dayEnd: '2026-06-16T23:59:59.999Z',
    })

    expect(result.alreadyUncompleted).toBe(false)
    expect(state.habit_logs).toHaveLength(2)
    expect(state.habit_logs[1]).toMatchObject({
      habit_id: HABIT_ID,
      completed_at: '2026-06-16T15:00:00.000Z',
      event_type: 'uncomplete',
    })
    expect(addXP).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'habit',
      HABIT_ID,
      -15,
      'Hábito desmarcado: Leer'
    )
  })

  it('returns heatmap days based on latest complete/uncomplete events', async () => {
    const { supabase } = createSupabaseMock({
      habits: [
        {
          id: HABIT_ID,
          user_id: 'user-1',
          name: 'Leer',
          frequency: 'daily',
          days_of_week: [],
          custom_rule: null,
          time_of_day: null,
          active: true,
          created_at: '2026-06-15T12:00:00.000Z',
        },
        {
          id: '22222222-2222-4222-8222-222222222222',
          user_id: 'user-1',
          name: 'Entrenar',
          frequency: 'daily',
          days_of_week: [],
          custom_rule: null,
          time_of_day: null,
          active: true,
          created_at: '2026-06-15T12:00:00.000Z',
        },
      ],
      habit_logs: [
        {
          id: 'log-1',
          habit_id: HABIT_ID,
          completed_at: '2026-06-16T09:00:00.000Z',
          event_type: 'complete',
        },
        {
          id: 'log-2',
          habit_id: HABIT_ID,
          completed_at: '2026-06-16T10:00:00.000Z',
          event_type: 'uncomplete',
        },
        {
          id: 'log-3',
          habit_id: '22222222-2222-4222-8222-222222222222',
          completed_at: '2026-06-16T11:00:00.000Z',
          event_type: 'complete',
        },
      ],
    })
    const caller = createCaller(supabase)

    const heatmap = await caller.habits.heatmap({
      startDate: '2026-06-16',
      endDate: '2026-06-16',
    })

    expect(heatmap.days).toEqual([
      {
        date: '2026-06-16',
        completedCount: 1,
        totalHabitCount: 2,
        dueHabitCount: 2,
        level: 1,
      },
    ])
  })

  it('returns empty grey heatmap days when no habits exist', async () => {
    const { supabase } = createSupabaseMock({ habits: [], habit_logs: [] })
    const caller = createCaller(supabase)

    const heatmap = await caller.habits.heatmap({
      startDate: '2026-06-15',
      endDate: '2026-06-17',
    })

    expect(heatmap.days).toEqual([
      {
        date: '2026-06-15',
        completedCount: 0,
        totalHabitCount: 0,
        dueHabitCount: 0,
        level: 0,
      },
      {
        date: '2026-06-16',
        completedCount: 0,
        totalHabitCount: 0,
        dueHabitCount: 0,
        level: 0,
      },
      {
        date: '2026-06-17',
        completedCount: 0,
        totalHabitCount: 0,
        dueHabitCount: 0,
        level: 0,
      },
    ])
    expect(heatmap.streaks).toEqual([])
  })
})
