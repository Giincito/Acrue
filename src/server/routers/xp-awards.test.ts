import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addXP } from '@/lib/xp'
import { appRouter } from './_app'

vi.mock('@/lib/xp', () => ({
  addXP: vi.fn(),
}))

type TableName = 'tasks' | 'assignments' | 'subjects'

type Row = Record<string, unknown>

type SupabaseState = Record<TableName, Row[]>

type Filter = { column: string; value: unknown }

class QueryBuilder {
  private action: 'select' | 'update' = 'select'
  private payload: Row | null = null
  private filters: Filter[] = []

  constructor(
    private readonly table: TableName,
    private readonly state: SupabaseState
  ) {}

  select() {
    return this
  }

  update(payload: Row) {
    this.action = 'update'
    this.payload = payload
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value })
    return this
  }

  single() {
    return Promise.resolve(this.resolveSingle())
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return Promise.resolve({ data: this.matchingRows(), error: null }).then(onfulfilled, onrejected)
  }

  private resolveSingle() {
    if (this.action === 'update') {
      const rows = this.matchingRows()
      rows.forEach((row) => Object.assign(row, this.payload))
      return { data: rows[0] ?? null, error: rows[0] ? null : { message: 'No rows returned' } }
    }

    const row = this.matchingRows()[0] ?? null
    return { data: row, error: row ? null : { message: 'No rows returned' } }
  }

  private matchingRows() {
    return this.state[this.table].filter((row) =>
      this.filters.every((filter) => row[filter.column] === filter.value)
    )
  }
}

function createCaller(state: SupabaseState) {
  const supabase = {
    from(table: TableName) {
      return new QueryBuilder(table, state)
    },
  }

  return {
    supabase,
    caller: appRouter.createCaller({
      supabase,
      user: { id: 'user-1' },
    } as never),
  }
}

describe('XP awards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('awards task XP only when a task transitions to completed', async () => {
    const taskId = '44444444-4444-4444-8444-444444444444'
    const { caller, supabase } = createCaller({
      tasks: [
        {
          id: taskId,
          user_id: 'user-1',
          title: 'Enviar informe',
          status: 'inbox',
          gcal_event_id: null,
        },
      ],
      assignments: [],
      subjects: [],
    })

    await caller.tasks.update({
      id: taskId,
      status: 'completed',
    })

    expect(addXP).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'task',
      taskId,
      10,
      'Tarea completada: Enviar informe'
    )
  })

  it('awards assignment XP only when an assignment transitions to completed', async () => {
    const assignmentId = '55555555-5555-4555-8555-555555555555'
    const subjectId = '66666666-6666-4666-8666-666666666666'
    const { caller, supabase } = createCaller({
      tasks: [],
      subjects: [
        {
          id: subjectId,
          user_id: 'user-1',
        },
      ],
      assignments: [
        {
          id: assignmentId,
          subject_id: subjectId,
          title: 'TP integrador',
          completed: false,
        },
      ],
    })

    await caller.assignments.update({
      id: assignmentId,
      completed: true,
    })

    expect(addXP).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'assignment',
      assignmentId,
      25,
      'Entrega completada: TP integrador'
    )
  })
})
