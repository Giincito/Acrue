import { afterEach, describe, expect, it, vi } from 'vitest'

const callGeminiMock = vi.hoisted(() => vi.fn(async () => ({
  text: JSON.stringify({
    segments: [
      { text: 'Hoy tenés ', highlight: false },
      { text: '2 tareas', highlight: true },
      { text: ' y conviene priorizar ', highlight: false },
      { text: 'Moodle', highlight: true },
      { text: '.', highlight: false },
    ],
  }),
  fromCache: false,
})))

vi.mock('@/lib/google-gmail', () => ({
  createTasksFromGmailDigest: vi.fn(),
  getRelevantEmailsWithStatus: vi.fn(async () => ({
    emails: [],
    degraded: false,
  })),
  summarizeGmailDigest: vi.fn(async () => ({
    summary: 'Sin correos relevantes en las ultimas 24 horas.',
    extractedTasks: [],
    degraded: false,
  })),
}))

vi.mock('@/lib/gemini/client', () => ({
  callGemini: callGeminiMock,
}))

vi.mock('@/lib/redis', () => ({
  redis: null,
}))

vi.mock('@/lib/server/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

import { buildDailyBriefing } from './briefing'

type MockRow = Record<string, unknown>
type MockState = Record<string, MockRow[]>

class SupabaseQueryMock {
  private readonly filters: Array<(row: MockRow) => boolean> = []
  private limitCount: number | null = null
  private sortBy: { column: string; ascending: boolean } | null = null

  constructor(private readonly rows: MockRow[]) {}

  select() {
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push((row) => getColumnValue(row, column) === value)
    return this
  }

  is(column: string, value: unknown) {
    this.filters.push((row) => getColumnValue(row, column) === value)
    return this
  }

  neq(column: string, value: unknown) {
    this.filters.push((row) => getColumnValue(row, column) !== value)
    return this
  }

  not(column: string, operator: string, value: unknown) {
    if (operator === 'is' && value === null) {
      this.filters.push((row) => getColumnValue(row, column) !== null)
    }
    return this
  }

  in(column: string, values: unknown[]) {
    this.filters.push((row) => values.includes(getColumnValue(row, column)))
    return this
  }

  gte(column: string, value: string | number) {
    this.filters.push((row) => compareColumn(row, column, value) >= 0)
    return this
  }

  lte(column: string, value: string | number) {
    this.filters.push((row) => compareColumn(row, column, value) <= 0)
    return this
  }

  lt(column: string, value: string | number) {
    this.filters.push((row) => compareColumn(row, column, value) < 0)
    return this
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.sortBy = { column, ascending: options?.ascending ?? true }
    return this
  }

  limit(count: number) {
    this.limitCount = count
    return this
  }

  then<TResult1 = { data: MockRow[]; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: MockRow[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return Promise.resolve({ data: this.resolve(), error: null }).then(onfulfilled, onrejected)
  }

  private resolve() {
    const rows = this.filters.reduce((current, filter) => current.filter(filter), this.rows.slice())
    if (this.sortBy) {
      const { column, ascending } = this.sortBy
      rows.sort((left, right) => {
        const leftValue = getColumnValue(left, column)
        const rightValue = getColumnValue(right, column)
        if (leftValue === rightValue) return 0
        return (leftValue ?? '') > (rightValue ?? '') === ascending ? 1 : -1
      })
    }

    return this.limitCount === null ? rows : rows.slice(0, this.limitCount)
  }
}

function createSupabaseMock(state: MockState) {
  return {
    from(table: string) {
      return new SupabaseQueryMock(state[table] ?? [])
    },
  }
}

function getColumnValue(row: MockRow, column: string): unknown {
  return column.split('.').reduce<unknown>((value, key) => {
    if (!value || typeof value !== 'object') return undefined
    return (value as MockRow)[key]
  }, row)
}

function compareColumn(row: MockRow, column: string, value: string | number) {
  const raw = getColumnValue(row, column)
  if (typeof raw === 'number' && typeof value === 'number') return raw - value
  return String(raw ?? '').localeCompare(String(value))
}

function createFetchMock() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('open-meteo.com') && url.includes('-57.5426')) {
      return Response.json({
        current: { temperature_2m: 12, weather_code: 2 },
      })
    }
    if (url.includes('open-meteo.com')) {
      return Response.json({
        current: { temperature_2m: 9, weather_code: 3 },
      })
    }
    return Response.json({
      content: 'El progreso se nota cuando lo miras por semana.',
      author: 'Acrue',
    })
  })
}

describe('daily briefing data', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    callGeminiMock.mockClear()
  })

  it('builds a full current-month habit heatmap and includes Mar del Plata weather', async () => {
    vi.stubGlobal('fetch', createFetchMock())

    const briefing = await buildDailyBriefing({
      userId: 'user-1',
      now: new Date('2026-06-18T12:00:00.000Z'),
      supabase: createSupabaseMock({
        tasks: [],
        assignments: [],
        expenses: [],
        habits: [
          { id: 'habit-1', user_id: 'user-1', active: true },
          { id: 'habit-2', user_id: 'user-1', active: true },
        ],
        habit_logs: [
          { habit_id: 'habit-1', completed_at: '2026-06-01T10:00:00.000Z', event_type: 'complete' },
          { habit_id: 'habit-1', completed_at: '2026-06-18T10:00:00.000Z', event_type: 'complete' },
          { habit_id: 'habit-2', completed_at: '2026-06-18T11:00:00.000Z', event_type: 'complete' },
        ],
        pantry_items: [],
        moodle_events: [],
      }) as never,
    })

    expect(briefing.habits.heatmap).toHaveLength(30)
    expect(briefing.habits.heatmap[0]).toBe(1)
    expect(briefing.habits.heatmap[17]).toBe(2)
    expect(briefing.marDelPlataWeather).toMatchObject({
      temperature: 12,
      description: 'parcialmente nublado',
      degraded: false,
    })
    expect(briefing.degradedServices).not.toContain('Frase diaria')
  })

  it('builds an AI operational summary once per day period', async () => {
    vi.stubGlobal('fetch', createFetchMock())

    const supabase = createSupabaseMock({
      tasks: [
        {
          id: 'task-1',
          user_id: 'user-ai',
          title: 'Cerrar presupuesto',
          due_at: '2026-06-19T13:00:00.000Z',
          deleted_at: null,
          status: 'inbox',
        },
        {
          id: 'task-2',
          user_id: 'user-ai',
          title: 'Enviar resumen de estudio',
          due_at: '2026-06-19T18:00:00.000Z',
          deleted_at: null,
          status: 'inbox',
        },
      ],
      assignments: [],
      expenses: [],
      habits: [],
      habit_logs: [],
      pantry_items: [],
      moodle_events: [
        {
          id: 'moodle-1',
          user_id: 'user-ai',
          title: 'Cuestionario',
          course_name: 'TPO',
          type: 'quiz',
          event_date: '2026-06-19T18:00:00.000Z',
          is_completed: false,
        },
      ],
    }) as never

    const first = await buildDailyBriefing({
      userId: 'user-ai',
      now: new Date('2026-06-19T12:00:00.000Z'),
      supabase,
    })
    const second = await buildDailyBriefing({
      userId: 'user-ai',
      now: new Date('2026-06-19T13:00:00.000Z'),
      supabase,
    })
    const afternoon = await buildDailyBriefing({
      userId: 'user-ai',
      now: new Date('2026-06-19T18:00:00.000Z'),
      supabase,
    })

    expect(first.operationalSummary.period).toBe('morning')
    expect(first.operationalSummary.segments).toContainEqual({ text: '2 tareas', highlight: true })
    expect(second.operationalSummary.fromCache).toBe(true)
    expect(afternoon.operationalSummary.period).toBe('afternoon')
    expect(callGeminiMock).toHaveBeenCalledTimes(2)
  })
})
