import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildWeeklySummary,
  fetchDailyMotivation,
  formatDailyBriefingTelegram,
  formatWeeklySummaryTelegram,
  summarizeBriefingCounts,
  type DailyBriefing,
  type WeeklySummary,
} from './briefing'

type MockRow = Record<string, unknown>
type MockState = Record<string, MockRow[]>

class SupabaseQueryMock {
  private readonly filters: Array<(row: MockRow) => boolean> = []
  private sortBy: { column: string; ascending: boolean } | null = null
  private limitCount: number | null = null

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

  in(column: string, values: unknown[]) {
    this.filters.push((row) => values.includes(getColumnValue(row, column)))
    return this
  }

  gte(column: string, value: string | number) {
    this.filters.push((row) => compareColumn(row, column, value) >= 0)
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
      rows.sort((a, b) => {
        const left = getColumnValue(a, column)
        const right = getColumnValue(b, column)
        if (left === right) return 0
        return (left ?? '') > (right ?? '') === ascending ? 1 : -1
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

const baseBriefing: DailyBriefing = {
  generatedAt: '2026-06-18T11:00:00.000Z',
  dateLabel: 'jueves 18 de junio',
  quote: {
    text: 'No actues como si fueras a vivir diez mil anos.',
    author: 'Marco Aurelio',
    source: 'Meditaciones 4.17',
    degraded: true,
  },
  operationalSummary: {
    generatedAt: '2026-06-18T11:00:00.000Z',
    period: 'morning',
    fromCache: false,
    degraded: false,
    segments: [
      { text: 'Hoy tenes ', highlight: false },
      { text: '2 tareas', highlight: true },
      { text: ' y ', highlight: false },
      { text: '1 entrega', highlight: true },
      { text: ' cerca.', highlight: false },
    ],
  },
  weather: {
    temperature: 14,
    description: 'parcialmente nublado',
    degraded: false,
  },
  marDelPlataWeather: {
    temperature: 12,
    description: 'parcialmente nublado',
    degraded: false,
  },
  tasksToday: [
    { id: 'task-1', title: 'Entregar informe', dueAt: '2026-06-18T18:00:00.000Z' },
    { id: 'task-2', title: 'Repasar análisis', dueAt: '2026-06-18T20:00:00.000Z' },
  ],
  upcomingAssignments: [
    { id: 'assignment-1', title: 'Parcial de redes', subject: 'Redes', dueAt: '2026-06-20T12:00:00.000Z' },
  ],
  finance: {
    totalIncome: 120000,
    totalExpenses: 80000,
    balance: 40000,
    expenseCount: 6,
  },
  habits: {
    completedToday: 2,
    totalActive: 4,
    heatmap: [0, 1, 2, 3, 4, 1, 0],
  },
  lowStockItems: [
    { id: 'pantry-1', name: 'Arroz', quantity: 0.5, minStock: 1, unit: 'kg' },
  ],
  moodleEvents: [
    { id: 'moodle-1', title: 'Foro nuevo', courseName: 'Sistemas', type: 'forum', eventDate: '2026-06-19T12:00:00.000Z' },
  ],
  gmailDigest: {
    summary: 'Un correo de becas y una fecha administrativa para revisar.',
    extractedTasks: [
      { title: 'Revisar correo de becas', dueAt: '2026-06-19T12:00:00.000Z', sourceEmailId: 'email-1' },
    ],
    degraded: false,
  },
  degradedServices: [],
}

const originalMotivationApiUrl = process.env.MOTIVATION_API_URL

describe('daily motivation', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    if (originalMotivationApiUrl === undefined) {
      delete process.env.MOTIVATION_API_URL
    } else {
      process.env.MOTIVATION_API_URL = originalMotivationApiUrl
    }
  })

  it('uses the local daily phrase without network when no motivation provider is configured', async () => {
    const fetchMock = vi.fn()
    delete process.env.MOTIVATION_API_URL
    vi.stubGlobal('fetch', fetchMock)

    const quote = await fetchDailyMotivation(new Date('2026-06-18T12:00:00.000Z'))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(quote.degraded).toBe(false)
    expect(quote.author).toBeTruthy()
    expect(quote.author).not.toBe('Acrue')
    expect(quote.source).toBeTruthy()
  })

  it('keeps a local daily phrase available when the external quote provider fails', async () => {
    process.env.MOTIVATION_API_URL = 'https://quotes.example.test/random'
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('fetch failed')
    }))

    const quote = await fetchDailyMotivation(new Date('2026-06-18T12:00:00.000Z'))

    expect(quote.degraded).toBe(false)
    expect(quote.author).toBeTruthy()
    expect(quote.author).not.toBe('Acrue')
    expect(quote.source).toBeTruthy()
    expect(quote.text.trim().length).toBeGreaterThan(0)
  })
})

describe('briefing formatting', () => {
  it('formats the daily Telegram briefing with all active modules and restrained Spanish copy', () => {
    const text = formatDailyBriefingTelegram(baseBriefing)

    expect(text).toContain('acrue · buenos días.')
    expect(text).toContain('2 tareas para hoy')
    expect(text).toContain('Parcial de redes')
    expect(text).toContain('Saldo estimado: $40.000')
    expect(text).toContain('Hábitos: 2 / 4')
    expect(text).toContain('Arroz bajo stock')
    expect(text).toContain('Tandil: 14°, parcialmente nublado')
    expect(text).toContain('Gmail: Un correo de becas')
    expect(text).not.toMatch(/[!¡]/)
    expect(text).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u)
  })

  it('includes degraded services without failing the daily briefing', () => {
    const text = formatDailyBriefingTelegram({
      ...baseBriefing,
      gmailDigest: null,
      degradedServices: ['Gmail', 'Clima'],
    })

    expect(text).toContain('Servicios degradados: Gmail, Clima.')
    expect(text).toContain('2 tareas para hoy')
  })

  it('summarizes counts for the Inicio module without leaking internal data', () => {
    expect(summarizeBriefingCounts(baseBriefing)).toEqual({
      tasksToday: 2,
      upcomingAssignments: 1,
      lowStockItems: 1,
      moodleEvents: 1,
      extractedGmailTasks: 1,
      degradedServices: 0,
    })
  })
})

describe('weekly summary formatting', () => {
  it('counts weekly habit progress from scheduled days and latest append-only state', async () => {
    const summary = await buildWeeklySummary({
      userId: 'user-1',
      now: new Date('2026-06-21T23:00:00.000Z'),
      supabase: createSupabaseMock({
        xp_events: [],
        expenses: [],
        assignments: [],
        habits: [
          {
            id: 'habit-daily',
            user_id: 'user-1',
            name: 'Leer',
            frequency: 'daily',
            days_of_week: [],
            custom_rule: null,
            active: true,
          },
          {
            id: 'habit-weekly',
            user_id: 'user-1',
            name: 'Entrenar',
            frequency: 'weekly',
            days_of_week: [1, 3],
            custom_rule: null,
            active: true,
          },
          {
            id: 'habit-business-days',
            user_id: 'user-1',
            name: 'Estudiar',
            frequency: 'custom',
            days_of_week: [],
            custom_rule: { type: 'business_days' },
            active: true,
          },
          {
            id: 'habit-inactive',
            user_id: 'user-1',
            name: 'Archivar',
            frequency: 'daily',
            days_of_week: [],
            custom_rule: null,
            active: false,
          },
        ],
        habit_logs: [
          {
            habit_id: 'habit-daily',
            completed_at: '2026-06-16T10:00:00.000Z',
            event_type: 'complete',
          },
          {
            habit_id: 'habit-daily',
            completed_at: '2026-06-17T10:00:00.000Z',
            event_type: 'complete',
          },
          {
            habit_id: 'habit-daily',
            completed_at: '2026-06-17T11:00:00.000Z',
            event_type: 'uncomplete',
          },
          {
            habit_id: 'habit-weekly',
            completed_at: '2026-06-15T10:00:00.000Z',
            event_type: 'complete',
          },
          {
            habit_id: 'habit-business-days',
            completed_at: '2026-06-18T10:00:00.000Z',
            event_type: 'complete',
          },
        ],
      }) as never,
    })

    expect(summary.habitsExpected).toBe(13)
    expect(summary.habitsCompleted).toBe(3)
  })

  it('formats the weekly Telegram summary with compact progress metrics', () => {
    const summary: WeeklySummary = {
      generatedAt: '2026-06-21T23:00:00.000Z',
      weekLabel: 'semana del 15 al 21 de junio',
      xpEarned: 135,
      habitsCompleted: 16,
      habitsExpected: 21,
      weeklyExpenses: 48200,
      completedAssignments: 3,
      longestStreak: 9,
      degradedServices: [],
    }

    const text = formatWeeklySummaryTelegram(summary)

    expect(text).toContain('acrue · resumen semanal.')
    expect(text).toContain('XP ganado: 135')
    expect(text).toContain('Hábitos: 16 / 21')
    expect(text).toContain('Gastos: $48.200')
    expect(text).toContain('Entregas completadas: 3')
    expect(text).toContain('Racha más larga: 9 días')
    expect(text).not.toMatch(/[!¡]/)
  })
})
