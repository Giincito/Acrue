import type { SupabaseClient } from '@supabase/supabase-js'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { callGemini } from '@/lib/gemini/client'
import { isHabitDueOnDate, type HabitAnalyticsRow } from '@/lib/habits/analytics'
import { withFallback } from '@/lib/integrations/resilience'
import { redis } from '@/lib/redis'
import {
  createTasksFromGmailDigest,
  getRelevantEmailsWithStatus,
  summarizeGmailDigest,
  type GmailExtractedTask,
} from '@/lib/google-gmail'

export type BriefingTask = {
  id: string
  title: string
  dueAt: string | null
}

export type BriefingAssignment = {
  id: string
  title: string
  subject: string | null
  dueAt: string | null
}

export type BriefingFinance = {
  totalIncome: number
  totalExpenses: number
  balance: number
  expenseCount: number
}

export type BriefingHabits = {
  completedToday: number
  totalActive: number
  heatmap: number[]
}

export type BriefingPantryItem = {
  id: string
  name: string
  quantity: number
  minStock: number
  unit: string
}

export type BriefingMoodleEvent = {
  id: string
  title: string
  courseName: string | null
  type: string | null
  eventDate: string | null
}

export type BriefingWeather = {
  temperature: number | null
  description: string
  degraded: boolean
}

export type BriefingQuote = {
  text: string
  author: string | null
  source?: string
  degraded: boolean
}

export type BriefingSummarySegment = {
  text: string
  highlight: boolean
}

export type BriefingOperationalSummary = {
  generatedAt: string
  period: 'morning' | 'afternoon'
  segments: BriefingSummarySegment[]
  degraded: boolean
  fromCache: boolean
}

export type BriefingGmailDigest = {
  summary: string
  extractedTasks: GmailExtractedTask[]
  degraded: boolean
}

export type DailyBriefing = {
  generatedAt: string
  dateLabel: string
  quote: BriefingQuote
  operationalSummary: BriefingOperationalSummary
  weather: BriefingWeather
  marDelPlataWeather: BriefingWeather
  tasksToday: BriefingTask[]
  upcomingAssignments: BriefingAssignment[]
  finance: BriefingFinance
  habits: BriefingHabits
  lowStockItems: BriefingPantryItem[]
  moodleEvents: BriefingMoodleEvent[]
  gmailDigest: BriefingGmailDigest | null
  degradedServices: string[]
}

export type WeeklySummary = {
  generatedAt: string
  weekLabel: string
  xpEarned: number
  habitsCompleted: number
  habitsExpected: number
  weeklyExpenses: number
  completedAssignments: number
  longestStreak: number
  degradedServices: string[]
}

type BuildDailyBriefingInput = {
  userId: string
  supabase: SupabaseClient
  now?: Date
  createGmailTasks?: boolean
}

type BuildWeeklySummaryInput = {
  userId: string
  supabase: SupabaseClient
  now?: Date
}

type BuildOperationalSummaryInput = {
  userId: string
  now: Date
  tasksToday: BriefingTask[]
  upcomingAssignments: BriefingAssignment[]
  finance: BriefingFinance
  habits: BriefingHabits
  lowStockItems: BriefingPantryItem[]
  moodleEvents: BriefingMoodleEvent[]
  gmailDigest: BriefingGmailDigest | null
}

type TaskRow = { id: string; title: string; due_at: string | null }
type AssignmentRow = {
  id: string
  title: string
  due_at: string | null
  subjects?: { name?: string | null } | { name?: string | null }[] | null
}
type ExpenseRow = { amount: number | string | null }
type HabitRow = {
  id: string
  name?: string | null
  frequency?: string | null
  days_of_week?: number[] | null
  custom_rule?: HabitAnalyticsRow['custom_rule']
  active?: boolean | null
}
type HabitLogRow = { habit_id?: string | null; completed_at: string; event_type?: string | null }
type PantryRow = { id: string; name: string; quantity: number | string | null; min_stock: number | string | null; unit: string | null }
type MoodleEventRow = {
  id: string
  title: string
  course_name: string | null
  type: string | null
  event_date: string | null
}
type XPEventRow = { xp_delta: number | string | null }
type CompletedAssignmentRow = { id: string }

const FALLBACK_QUOTE: BriefingQuote = {
  text: 'No actues como si fueras a vivir diez mil anos.',
  author: 'Marco Aurelio',
  source: 'Meditaciones 4.17',
  degraded: false,
}

const FALLBACK_WEATHER: BriefingWeather = {
  temperature: null,
  description: 'clima no disponible',
  degraded: true,
}

const LOCAL_DAILY_QUOTES: Array<Omit<BriefingQuote, 'degraded'>> = [
  { text: 'No actues como si fueras a vivir diez mil anos.', author: 'Marco Aurelio', source: 'Meditaciones 4.17' },
  { text: 'No es que tengamos poco tiempo, sino que perdemos mucho.', author: 'Seneca', source: 'Sobre la brevedad de la vida 1.1' },
  { text: 'Primero dite a ti mismo que quieres ser; luego haz lo que debes hacer.', author: 'Epicteto', source: 'Discursos 3.23.1' },
  { text: 'Pienso, luego existo.', author: 'Rene Descartes', source: 'Discurso del metodo IV' },
  { text: 'Lo que no me mata me hace mas fuerte.', author: 'Friedrich Nietzsche', source: 'Crepusculo de los idolos, Maximas y flechas 8' },
  { text: 'Una vida sin examen no merece ser vivida.', author: 'Socrates', source: 'Platon, Apologia 38a' },
  { text: 'La vida es breve, el arte es largo.', author: 'Hipocrates', source: 'Aforismos 1' },
]

const WEATHER_CITIES = {
  tandil: {
    cacheKey: 'weather:tandil:current',
    latitude: -37.328,
    longitude: -59.136,
  },
  marDelPlata: {
    cacheKey: 'weather:mar-del-plata:current',
    latitude: -38.0055,
    longitude: -57.5426,
  },
} as const

const OPERATIONAL_SUMMARY_CACHE_TTL_SECONDS = 36 * 60 * 60
const operationalSummaryMemoryCache = new Map<string, BriefingOperationalSummary>()

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatCurrency(amount: number) {
  return `$${Math.round(amount).toLocaleString('es-AR')}`
}

function getBuenosAiresDateKey(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  return `${year}-${month}-${day}`
}

function getBuenosAiresHour(value: Date) {
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value).find((part) => part.type === 'hour')?.value

  const parsed = Number(hour ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function getOperationalSummaryPeriod(now: Date): BriefingOperationalSummary['period'] {
  return getBuenosAiresHour(now) < 14 ? 'morning' : 'afternoon'
}

function getOperationalSummaryCacheKey(userId: string, now: Date) {
  return `briefing:operational:${userId}:${getBuenosAiresDateKey(now)}:${getOperationalSummaryPeriod(now)}`
}

function normalizeOperationalSummarySegments(value: unknown): BriefingSummarySegment[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((segment) => {
    if (!segment || typeof segment !== 'object') return []
    const text = (segment as { text?: unknown }).text
    if (typeof text !== 'string' || text.trim().length === 0) return []

    return [{
      text: text.slice(0, 180),
      highlight: Boolean((segment as { highlight?: unknown }).highlight),
    }]
  }).slice(0, 12)
}

function parseOperationalSummaryText(text: string | null) {
  if (!text) return []

  try {
    const json = text
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
    const parsed = JSON.parse(json) as { segments?: unknown }
    return normalizeOperationalSummarySegments(parsed.segments)
  } catch {
    return []
  }
}

function parseCachedOperationalSummary(value: unknown): BriefingOperationalSummary | null {
  const parsed = typeof value === 'string' ? JSON.parse(value) as unknown : value
  if (!parsed || typeof parsed !== 'object') return null

  const candidate = parsed as Partial<BriefingOperationalSummary>
  const segments = normalizeOperationalSummarySegments(candidate.segments)
  if (
    typeof candidate.generatedAt !== 'string' ||
    (candidate.period !== 'morning' && candidate.period !== 'afternoon') ||
    segments.length === 0
  ) {
    return null
  }

  return {
    generatedAt: candidate.generatedAt,
    period: candidate.period,
    segments,
    degraded: Boolean(candidate.degraded),
    fromCache: true,
  }
}

async function readOperationalSummaryCache(cacheKey: string) {
  const memoryValue = operationalSummaryMemoryCache.get(cacheKey)
  if (memoryValue) return { ...memoryValue, fromCache: true }

  if (!redis) return null

  try {
    const cached = await redis.get<string>(cacheKey)
    if (!cached) return null
    const summary = parseCachedOperationalSummary(cached)
    if (summary) operationalSummaryMemoryCache.set(cacheKey, { ...summary, fromCache: false })
    return summary
  } catch {
    return null
  }
}

async function writeOperationalSummaryCache(cacheKey: string, summary: BriefingOperationalSummary) {
  operationalSummaryMemoryCache.set(cacheKey, { ...summary, fromCache: false })

  if (!redis) return

  try {
    await redis.set(cacheKey, JSON.stringify({ ...summary, fromCache: false }), {
      ex: OPERATIONAL_SUMMARY_CACHE_TTL_SECONDS,
    })
  } catch {
    // Cache writes are best-effort; the briefing itself should still render.
  }
}

function getBuenosAiresDayBounds(now: Date) {
  const localDate = getBuenosAiresDateKey(now)

  return {
    start: new Date(`${localDate}T00:00:00-03:00`),
    end: new Date(`${localDate}T23:59:59.999-03:00`),
    localDate,
  }
}

function getBuenosAiresMonthBounds(now: Date) {
  const { localDate } = getBuenosAiresDayBounds(now)
  const [year, month] = localDate.split('-').map(Number)
  const start = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00-03:00`)
  const endMonth = month === 12 ? 1 : month + 1
  const endYear = month === 12 ? year + 1 : year
  const end = new Date(`${endYear}-${String(endMonth).padStart(2, '0')}-01T00:00:00-03:00`)

  return { start, end }
}

function getLocalDailyQuote(now: Date): BriefingQuote {
  const dateKey = getBuenosAiresDateKey(now)
  const seed = Array.from(dateKey).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const quote = LOCAL_DAILY_QUOTES[seed % LOCAL_DAILY_QUOTES.length] ?? FALLBACK_QUOTE

  return {
    ...quote,
    degraded: false,
  }
}

function getBuenosAiresWeekBounds(now: Date) {
  const { start } = getBuenosAiresDayBounds(now)
  const day = start.getUTCDay() === 0 ? 7 : start.getUTCDay()
  const weekStart = new Date(start)
  weekStart.setUTCDate(start.getUTCDate() - day + 1)
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekStart.getUTCDate() + 7)

  return { start: weekStart, end: weekEnd }
}

function dateKeyToBuenosAiresNoon(dateKey: string) {
  return new Date(`${dateKey}T12:00:00-03:00`)
}

function getBuenosAiresDateRange(start: Date, endExclusive: Date) {
  const days: string[] = []
  const endKey = getBuenosAiresDateKey(endExclusive)
  const cursor = dateKeyToBuenosAiresNoon(getBuenosAiresDateKey(start))

  for (let dateKey = getBuenosAiresDateKey(cursor); dateKey < endKey; dateKey = getBuenosAiresDateKey(cursor)) {
    days.push(dateKey)
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return days
}

function toHabitAnalyticsRow(habit: HabitRow): HabitAnalyticsRow {
  return {
    id: habit.id,
    name: habit.name ?? '',
    frequency: habit.frequency ?? 'daily',
    days_of_week: habit.days_of_week ?? [],
    custom_rule: habit.custom_rule ?? null,
    active: habit.active ?? true,
  }
}

function getWeeklyHabitProgress(habits: HabitRow[], logs: HabitLogRow[], start: Date, end: Date) {
  const days = getBuenosAiresDateRange(start, end)
  const activeHabits = habits
    .filter((habit) => habit.active !== false)
    .map(toHabitAnalyticsRow)
  const activeHabitIds = new Set(activeHabits.map((habit) => habit.id))
  const dateKeys = new Set(days)
  const latestByHabitAndDate = new Map<string, HabitLogRow>()

  logs
    .filter((log) => log.habit_id && activeHabitIds.has(log.habit_id))
    .slice()
    .sort((left, right) => left.completed_at.localeCompare(right.completed_at))
    .forEach((log) => {
      const dateKey = getBuenosAiresDateKey(log.completed_at)
      if (log.habit_id && dateKeys.has(dateKey)) {
        latestByHabitAndDate.set(`${log.habit_id}:${dateKey}`, log)
      }
    })

  return activeHabits.reduce(
    (progress, habit) => {
      for (const dateKey of days) {
        if (!isHabitDueOnDate(habit, dateKeyToBuenosAiresNoon(dateKey))) continue

        progress.expected++
        const latest = latestByHabitAndDate.get(`${habit.id}:${dateKey}`)
        if ((latest?.event_type ?? 'complete') === 'complete' && latest) {
          progress.completed++
        }
      }
      return progress
    },
    { completed: 0, expected: 0 }
  )
}

async function captureSection<T>(
  degradedServices: string[],
  label: string,
  fallback: T,
  read: () => Promise<T>
) {
  try {
    return await read()
  } catch {
    degradedServices.push(label)
    return fallback
  }
}

function weatherCodeDescription(code: number | null | undefined) {
  if (code === 0) return 'despejado'
  if (code === 1 || code === 2) return 'parcialmente nublado'
  if (code === 3) return 'nublado'
  if (code !== undefined && code !== null && code >= 45 && code <= 48) return 'niebla'
  if (code !== undefined && code !== null && code >= 51 && code <= 67) return 'llovizna'
  if (code !== undefined && code !== null && code >= 80 && code <= 82) return 'lluvia'
  if (code !== undefined && code !== null && code >= 95) return 'tormenta'
  return 'clima no disponible'
}

async function fetchCityWeather(city: (typeof WEATHER_CITIES)[keyof typeof WEATHER_CITIES]): Promise<BriefingWeather> {
  const result = await withFallback<BriefingWeather>(
    async () => {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current=temperature_2m,weather_code&timezone=America%2FArgentina%2FBuenos_Aires`,
        { signal: AbortSignal.timeout(8000) }
      )

      if (!response.ok) {
        throw new Error(`Open-Meteo responded with ${response.status}`)
      }

      const payload = await response.json() as {
        current?: { temperature_2m?: number; weather_code?: number }
      }
      return {
        temperature: typeof payload.current?.temperature_2m === 'number'
          ? Math.round(payload.current.temperature_2m)
          : null,
        description: weatherCodeDescription(payload.current?.weather_code),
        degraded: false,
      }
    },
    FALLBACK_WEATHER,
    city.cacheKey,
    1800
  )

  return result.error ? { ...result.data, degraded: true } : result.data
}

export async function fetchTandilWeather(): Promise<BriefingWeather> {
  return fetchCityWeather(WEATHER_CITIES.tandil)
}

export async function fetchMarDelPlataWeather(): Promise<BriefingWeather> {
  return fetchCityWeather(WEATHER_CITIES.marDelPlata)
}

export async function fetchDailyMotivation(now = new Date()): Promise<BriefingQuote> {
  const fallbackQuote = getLocalDailyQuote(now)
  const providerUrl = process.env.MOTIVATION_API_URL

  if (!providerUrl) {
    return fallbackQuote
  }

  const result = await withFallback<BriefingQuote>(
    async () => {
      const response = await fetch(
        providerUrl,
        { signal: AbortSignal.timeout(8000) }
      )

      if (!response.ok) {
        throw new Error(`Motivation API responded with ${response.status}`)
      }

      const payload = await response.json() as {
        content?: unknown
        quote?: unknown
        text?: unknown
        author?: unknown
        source?: unknown
      }
      const text = [payload.content, payload.quote, payload.text].find((value) => typeof value === 'string')
      if (typeof text !== 'string' || text.trim().length === 0) {
        throw new Error('Motivation API returned an empty quote')
      }

      return {
        text: text.trim(),
        author: typeof payload.author === 'string' ? payload.author : null,
        source: typeof payload.source === 'string' ? payload.source : undefined,
        degraded: false,
      }
    },
    fallbackQuote,
    `motivation:${getBuenosAiresDateKey(now)}`,
    24 * 60 * 60
  )

  return result.data
}

async function getTasksToday(supabase: SupabaseClient, userId: string, now: Date): Promise<BriefingTask[]> {
  const { start, end } = getBuenosAiresDayBounds(now)
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, due_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .neq('status', 'completed')
    .neq('status', 'trash')
    .not('due_at', 'is', null)
    .gte('due_at', start.toISOString())
    .lte('due_at', end.toISOString())
    .order('due_at', { ascending: true })
    .limit(8)

  if (error) throw error
  return ((data ?? []) as TaskRow[]).map((task) => ({
    id: task.id,
    title: task.title,
    dueAt: task.due_at,
  }))
}

async function getUpcomingAssignments(supabase: SupabaseClient, userId: string, now: Date): Promise<BriefingAssignment[]> {
  const { start } = getBuenosAiresDayBounds(now)
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + 7)

  const { data, error } = await supabase
    .from('assignments')
    .select('id, title, due_at, subjects!inner(name, user_id)')
    .eq('subjects.user_id', userId)
    .eq('completed', false)
    .not('due_at', 'is', null)
    .gte('due_at', start.toISOString())
    .lte('due_at', end.toISOString())
    .order('due_at', { ascending: true })
    .limit(5)

  if (error) throw error
  return ((data ?? []) as AssignmentRow[]).map((assignment) => {
    const subject = Array.isArray(assignment.subjects) ? assignment.subjects[0] : assignment.subjects
    return {
      id: assignment.id,
      title: assignment.title,
      subject: subject?.name ?? null,
      dueAt: assignment.due_at,
    }
  })
}

async function getFinanceSummary(supabase: SupabaseClient, userId: string, now: Date): Promise<BriefingFinance> {
  const { start, end } = getBuenosAiresMonthBounds(now)
  const { data, error } = await supabase
    .from('expenses')
    .select('amount')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('date', start.toISOString().slice(0, 10))
    .lt('date', end.toISOString().slice(0, 10))

  if (error) throw error
  const amounts = ((data ?? []) as ExpenseRow[]).map((expense) => toNumber(expense.amount))
  const totalIncome = amounts.filter((amount) => amount > 0).reduce((sum, amount) => sum + amount, 0)
  const totalExpenses = amounts.filter((amount) => amount < 0).reduce((sum, amount) => sum + Math.abs(amount), 0)

  return {
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    expenseCount: amounts.filter((amount) => amount < 0).length,
  }
}

async function getHabitSummary(supabase: SupabaseClient, userId: string, now: Date): Promise<BriefingHabits> {
  const { start } = getBuenosAiresDayBounds(now)
  const monthBounds = getBuenosAiresMonthBounds(now)
  const monthDays = getBuenosAiresDateRange(monthBounds.start, monthBounds.end)
  const monthDaySet = new Set(monthDays)

  const { data: habits, error: habitsError } = await supabase
    .from('habits')
    .select('id')
    .eq('user_id', userId)
    .eq('active', true)

  if (habitsError) throw habitsError

  const habitRows = (habits ?? []) as HabitRow[]
  if (habitRows.length === 0) {
    return { completedToday: 0, totalActive: 0, heatmap: monthDays.map(() => 0) }
  }

  const { data: logs, error: logsError } = await supabase
    .from('habit_logs')
    .select('habit_id, completed_at, event_type')
    .in('habit_id', habitRows.map((habit) => habit.id))
    .gte('completed_at', monthBounds.start.toISOString())
    .lt('completed_at', monthBounds.end.toISOString())

  if (logsError) throw logsError
  const latestByHabitAndDate = new Map<string, HabitLogRow>()
  ;((logs ?? []) as HabitLogRow[])
    .filter((log) => log.habit_id)
    .slice()
    .sort((left, right) => left.completed_at.localeCompare(right.completed_at))
    .forEach((log) => {
      const dateKey = getBuenosAiresDateKey(log.completed_at)
      if (log.habit_id && monthDaySet.has(dateKey)) {
        latestByHabitAndDate.set(`${log.habit_id}:${dateKey}`, log)
      }
    })

  const completedByDate = new Map<string, Set<string>>()
  latestByHabitAndDate.forEach((log) => {
    if (!log.habit_id || (log.event_type ?? 'complete') !== 'complete') return

    const dateKey = getBuenosAiresDateKey(log.completed_at)
    const completedHabits = completedByDate.get(dateKey) ?? new Set<string>()
    completedHabits.add(log.habit_id)
    completedByDate.set(dateKey, completedHabits)
  })

  const todayKey = getBuenosAiresDateKey(start)
  const completedToday = completedByDate.get(todayKey)?.size ?? 0
  const heatmap = monthDays.map((dateKey) => completedByDate.get(dateKey)?.size ?? 0)

  return { completedToday, totalActive: habitRows.length, heatmap }
}

async function getLowStockItems(supabase: SupabaseClient, userId: string): Promise<BriefingPantryItem[]> {
  const { data, error } = await supabase
    .from('pantry_items')
    .select('id, name, quantity, min_stock, unit')
    .eq('user_id', userId)
    .order('name', { ascending: true })
    .limit(200)

  if (error) throw error
  return ((data ?? []) as PantryRow[])
    .filter((item) => toNumber(item.quantity) < toNumber(item.min_stock))
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      name: item.name,
      quantity: toNumber(item.quantity),
      minStock: toNumber(item.min_stock),
      unit: item.unit ?? 'u',
    }))
}

async function getMoodleEvents(supabase: SupabaseClient, userId: string, now: Date): Promise<BriefingMoodleEvent[]> {
  const { start } = getBuenosAiresDayBounds(now)
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + 7)

  const { data, error } = await supabase
    .from('moodle_events')
    .select('id, title, course_name, type, event_date')
    .eq('user_id', userId)
    .eq('is_completed', false)
    .not('event_date', 'is', null)
    .gte('event_date', start.toISOString())
    .lte('event_date', end.toISOString())
    .order('event_date', { ascending: true })
    .limit(5)

  if (error) throw error
  return ((data ?? []) as MoodleEventRow[]).map((event) => ({
    id: event.id,
    title: event.title,
    courseName: event.course_name,
    type: event.type,
    eventDate: event.event_date,
  }))
}

async function getGmailDigest(
  supabase: SupabaseClient,
  userId: string,
  now: Date,
  createGmailTasks: boolean
): Promise<BriefingGmailDigest | null> {
  const emailResult = await getRelevantEmailsWithStatus(userId, now)
  const digest = await summarizeGmailDigest(emailResult.emails)

  if (createGmailTasks && digest.extractedTasks.length > 0) {
    await createTasksFromGmailDigest(userId, digest.extractedTasks, supabase, {
      enableUndo: true,
    })
  }

  return emailResult.degraded ? { ...digest, degraded: true } : digest
}

function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural
}

function buildFallbackOperationalSummary({
  now,
  tasksToday,
  upcomingAssignments,
  finance,
  habits,
  lowStockItems,
  moodleEvents,
  gmailDigest,
}: BuildOperationalSummaryInput): BriefingOperationalSummary {
  const period = getOperationalSummaryPeriod(now)
  const taskLabel = `${tasksToday.length} ${pluralize(tasksToday.length, 'tarea', 'tareas')}`
  const assignmentLabel = `${upcomingAssignments.length} ${pluralize(upcomingAssignments.length, 'entrega', 'entregas')}`
  const habitLabel = `${habits.completedToday}/${habits.totalActive} hábitos`
  const firstFocus = tasksToday[0]?.title ?? upcomingAssignments[0]?.title ?? moodleEvents[0]?.title ?? null
  const stockText = lowStockItems.length > 0
    ? `${lowStockItems[0].name} bajo stock`
    : 'despensa sin alertas'
  const gmailText = gmailDigest?.summary ? ` Gmail: ${gmailDigest.summary}` : ''

  return {
    generatedAt: now.toISOString(),
    period,
    degraded: true,
    fromCache: false,
    segments: [
      { text: 'Hoy tenés ', highlight: false },
      { text: taskLabel, highlight: true },
      { text: ' y ', highlight: false },
      { text: assignmentLabel, highlight: true },
      { text: firstFocus ? '. Prioridad: ' : '. ', highlight: false },
      ...(firstFocus ? [{ text: firstFocus, highlight: true } satisfies BriefingSummarySegment] : []),
      { text: `. Hábitos: ${habitLabel}. Saldo: `, highlight: false },
      { text: formatCurrency(finance.balance), highlight: true },
      { text: `. ${stockText}.${gmailText}`, highlight: false },
    ],
  }
}

function buildOperationalSummaryPrompt(input: BuildOperationalSummaryInput) {
  const payload = {
    fecha: getBuenosAiresDateKey(input.now),
    momento: getOperationalSummaryPeriod(input.now) === 'morning' ? 'mañana' : 'tarde',
    tareasHoy: input.tasksToday.map((task) => ({ titulo: task.title, vence: task.dueAt })),
    entregas: input.upcomingAssignments.map((assignment) => ({
      titulo: assignment.title,
      materia: assignment.subject,
      vence: assignment.dueAt,
    })),
    finanzas: {
      saldo: input.finance.balance,
      movimientosGasto: input.finance.expenseCount,
    },
    habitos: {
      completadosHoy: input.habits.completedToday,
      activos: input.habits.totalActive,
    },
    despensa: input.lowStockItems.map((item) => ({
      nombre: item.name,
      cantidad: item.quantity,
      minimo: item.minStock,
      unidad: item.unit,
    })),
    moodle: input.moodleEvents.map((event) => ({
      titulo: event.title,
      curso: event.courseName,
      tipo: event.type,
      fecha: event.eventDate,
    })),
    gmail: input.gmailDigest
      ? {
          resumen: input.gmailDigest.summary,
          tareasDetectadas: input.gmailDigest.extractedTasks.map((task) => ({
            titulo: task.title,
            vence: task.dueAt,
          })),
        }
      : null,
  }

  return `Generá un briefing operativo de una sola frase para Inicio.
Debe resumir qué hacer hoy en base solo a estos datos, sin inventar.
Devuelve JSON válido con esta forma exacta: {"segments":[{"text":"...","highlight":false},{"text":"...","highlight":true}]}.
Usá highlight=true solo para números, títulos o conceptos importantes.
No uses markdown ni HTML. Máximo 65 palabras.

Datos:
${JSON.stringify(payload)}`
}

async function getOperationalSummary(input: BuildOperationalSummaryInput): Promise<BriefingOperationalSummary> {
  const cacheKey = getOperationalSummaryCacheKey(input.userId, input.now)
  const cached = await readOperationalSummaryCache(cacheKey)
  if (cached) return cached

  const fallback = buildFallbackOperationalSummary(input)
  let summary = fallback

  try {
    const result = await callGemini(buildOperationalSummaryPrompt(input), {
      temperature: 0.2,
      maxOutputTokens: 420,
      systemInstruction: 'Respondé solo JSON válido en español rioplatense. No uses markdown ni HTML.',
    })
    const segments = parseOperationalSummaryText(result.text)

    if (segments.length > 0) {
      summary = {
        generatedAt: input.now.toISOString(),
        period: getOperationalSummaryPeriod(input.now),
        segments,
        degraded: false,
        fromCache: false,
      }
    }
  } catch {
    summary = fallback
  }

  await writeOperationalSummaryCache(cacheKey, summary)
  return summary
}

export async function buildDailyBriefing({
  userId,
  supabase,
  now = new Date(),
  createGmailTasks = false,
}: BuildDailyBriefingInput): Promise<DailyBriefing> {
  const degradedServices: string[] = []

  const [
    quote,
    weather,
    marDelPlataWeather,
    tasksToday,
    upcomingAssignments,
    finance,
    habits,
    lowStockItems,
    moodleEvents,
    gmailDigest,
  ] = await Promise.all([
    captureSection(degradedServices, 'Frase diaria', FALLBACK_QUOTE, () => fetchDailyMotivation(now)),
    captureSection(degradedServices, 'Clima', FALLBACK_WEATHER, fetchTandilWeather),
    captureSection(degradedServices, 'Mar del Plata', FALLBACK_WEATHER, fetchMarDelPlataWeather),
    captureSection(degradedServices, 'Tareas', [] as BriefingTask[], () => getTasksToday(supabase, userId, now)),
    captureSection(degradedServices, 'Entregas', [] as BriefingAssignment[], () => getUpcomingAssignments(supabase, userId, now)),
    captureSection(degradedServices, 'Finanzas', { totalIncome: 0, totalExpenses: 0, balance: 0, expenseCount: 0 }, () => getFinanceSummary(supabase, userId, now)),
    captureSection(degradedServices, 'Hábitos', { completedToday: 0, totalActive: 0, heatmap: [0, 0, 0, 0, 0, 0, 0] }, () => getHabitSummary(supabase, userId, now)),
    captureSection(degradedServices, 'Despensa', [] as BriefingPantryItem[], () => getLowStockItems(supabase, userId)),
    captureSection(degradedServices, 'Moodle', [] as BriefingMoodleEvent[], () => getMoodleEvents(supabase, userId, now)),
    captureSection(degradedServices, 'Gmail', null as BriefingGmailDigest | null, () => getGmailDigest(supabase, userId, now, createGmailTasks)),
  ])

  if (quote.degraded && !degradedServices.includes('Frase diaria')) degradedServices.push('Frase diaria')
  if (weather.degraded && !degradedServices.includes('Clima')) degradedServices.push('Clima')
  if (marDelPlataWeather.degraded && !degradedServices.includes('Mar del Plata')) degradedServices.push('Mar del Plata')
  if (gmailDigest?.degraded && !degradedServices.includes('Gmail')) degradedServices.push('Gmail')

  const operationalSummary = await getOperationalSummary({
    userId,
    now,
    tasksToday,
    upcomingAssignments,
    finance,
    habits,
    lowStockItems,
    moodleEvents,
    gmailDigest,
  })

  if (operationalSummary.degraded && !degradedServices.includes('Resumen IA')) degradedServices.push('Resumen IA')

  return {
    generatedAt: now.toISOString(),
    dateLabel: format(now, "EEEE d 'de' MMMM", { locale: es }),
    quote,
    operationalSummary,
    weather,
    marDelPlataWeather,
    tasksToday,
    upcomingAssignments,
    finance,
    habits,
    lowStockItems,
    moodleEvents,
    gmailDigest,
    degradedServices,
  }
}

export async function buildWeeklySummary({
  userId,
  supabase,
  now = new Date(),
}: BuildWeeklySummaryInput): Promise<WeeklySummary> {
  const degradedServices: string[] = []
  const { start, end } = getBuenosAiresWeekBounds(now)
  const activeHabits = await captureSection(degradedServices, 'Hábitos', [] as HabitRow[], async () => {
    const { data, error } = await supabase
      .from('habits')
      .select('id, name, frequency, days_of_week, custom_rule, active')
      .eq('user_id', userId)
      .eq('active', true)
    if (error) throw error
    return (data ?? []) as HabitRow[]
  })
  const habitIds = activeHabits.map((habit) => habit.id)

  const [xpEarned, habitLogs, weeklyExpenses, completedAssignments, longestStreak] = await Promise.all([
    captureSection(degradedServices, 'XP', 0, async () => {
      const { data, error } = await supabase
        .from('xp_events')
        .select('xp_delta')
        .eq('user_id', userId)
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString())
      if (error) throw error
      return ((data ?? []) as XPEventRow[]).reduce((sum, event) => sum + toNumber(event.xp_delta), 0)
    }),
    captureSection(degradedServices, 'Hábitos', [] as HabitLogRow[], async () => {
      if (habitIds.length === 0) return []
      const { data, error } = await supabase
        .from('habit_logs')
        .select('habit_id, completed_at, event_type')
        .in('habit_id', habitIds)
        .gte('completed_at', start.toISOString())
        .lt('completed_at', end.toISOString())
      if (error) throw error
      return (data ?? []) as HabitLogRow[]
    }),
    captureSection(degradedServices, 'Finanzas', 0, async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .lt('amount', 0)
        .gte('date', start.toISOString().slice(0, 10))
        .lt('date', end.toISOString().slice(0, 10))
      if (error) throw error
      return ((data ?? []) as ExpenseRow[]).reduce((sum, expense) => sum + Math.abs(toNumber(expense.amount)), 0)
    }),
    captureSection(degradedServices, 'Entregas', 0, async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select('id, subjects!inner(user_id)')
        .eq('subjects.user_id', userId)
        .eq('completed', true)
        .gte('due_at', start.toISOString())
        .lt('due_at', end.toISOString())
      if (error) throw error
      return ((data ?? []) as CompletedAssignmentRow[]).length
    }),
    captureSection(degradedServices, 'Rachas', 0, async () => {
      if (habitIds.length === 0) return 0
      const streakStart = new Date(end)
      streakStart.setUTCDate(end.getUTCDate() - 90)
      const { data, error } = await supabase
        .from('habit_logs')
        .select('habit_id, completed_at, event_type')
        .in('habit_id', habitIds)
        .gte('completed_at', streakStart.toISOString())
        .lt('completed_at', end.toISOString())
        .order('completed_at', { ascending: true })
      if (error) throw error
      const completedDays = new Set(
        ((data ?? []) as HabitLogRow[])
          .filter((log) => (log.event_type ?? 'complete') === 'complete')
          .map((log) => getBuenosAiresDateKey(log.completed_at))
      )
      let longest = 0
      let current = 0
      for (let index = 0; index < 90; index++) {
        const day = new Date(streakStart)
        day.setUTCDate(streakStart.getUTCDate() + index)
        if (completedDays.has(getBuenosAiresDateKey(day))) {
          current++
          longest = Math.max(longest, current)
        } else {
          current = 0
        }
      }
      return longest
    }),
  ])

  const habitProgress = getWeeklyHabitProgress(activeHabits, habitLogs, start, end)

  return {
    generatedAt: now.toISOString(),
    weekLabel: `semana del ${format(start, "d 'de' MMMM", { locale: es })} al ${format(new Date(end.getTime() - 1), "d 'de' MMMM", { locale: es })}`,
    xpEarned,
    habitsCompleted: habitProgress.completed,
    habitsExpected: habitProgress.expected,
    weeklyExpenses,
    completedAssignments,
    longestStreak,
    degradedServices,
  }
}

export function summarizeBriefingCounts(briefing: DailyBriefing) {
  return {
    tasksToday: briefing.tasksToday.length,
    upcomingAssignments: briefing.upcomingAssignments.length,
    lowStockItems: briefing.lowStockItems.length,
    moodleEvents: briefing.moodleEvents.length,
    extractedGmailTasks: briefing.gmailDigest?.extractedTasks.length ?? 0,
    degradedServices: briefing.degradedServices.length,
  }
}

export function formatDailyBriefingTelegram(briefing: DailyBriefing) {
  const lines = [
    'acrue · buenos días.',
    '',
    `Hoy es ${briefing.dateLabel}.`,
    `"${briefing.quote.text}"${briefing.quote.author ? ` - ${briefing.quote.author}` : ''}`,
    '',
  ]

  if (briefing.tasksToday.length === 0) {
    lines.push('Nada vence hoy.')
  } else {
    lines.push(`${briefing.tasksToday.length} ${briefing.tasksToday.length === 1 ? 'tarea' : 'tareas'} para hoy:`)
    lines.push(...briefing.tasksToday.slice(0, 5).map((task) => `- ${task.title}`))
  }

  if (briefing.upcomingAssignments.length > 0) {
    lines.push('', `${briefing.upcomingAssignments.length} ${briefing.upcomingAssignments.length === 1 ? 'entrega próxima' : 'entregas próximas'}:`)
    lines.push(...briefing.upcomingAssignments.slice(0, 3).map((assignment) => {
      const subject = assignment.subject ? `${assignment.subject}: ` : ''
      return `- ${subject}${assignment.title}`
    }))
  }

  lines.push('', `Saldo estimado: ${formatCurrency(briefing.finance.balance)}.`)
  lines.push(`Hábitos: ${briefing.habits.completedToday} / ${briefing.habits.totalActive}.`)

  if (briefing.lowStockItems.length > 0) {
    lines.push(...briefing.lowStockItems.slice(0, 3).map((item) => `${item.name} bajo stock.`))
  }

  const weatherValue = briefing.weather.temperature === null
    ? briefing.weather.description
    : `${briefing.weather.temperature}°, ${briefing.weather.description}`
  lines.push(`Tandil: ${weatherValue}.`)

  if (briefing.moodleEvents.length > 0) {
    lines.push(`Moodle: ${briefing.moodleEvents[0].title}.`)
  }

  if (briefing.gmailDigest) {
    lines.push(`Gmail: ${briefing.gmailDigest.summary}`)
  }

  if (briefing.degradedServices.length > 0) {
    lines.push('', `Servicios degradados: ${briefing.degradedServices.join(', ')}.`)
  }

  return lines.join('\n').trim()
}

export function formatWeeklySummaryTelegram(summary: WeeklySummary) {
  const lines = [
    'acrue · resumen semanal.',
    '',
    summary.weekLabel,
    `XP ganado: ${summary.xpEarned}.`,
    `Hábitos: ${summary.habitsCompleted} / ${summary.habitsExpected}.`,
    `Gastos: ${formatCurrency(summary.weeklyExpenses)}.`,
    `Entregas completadas: ${summary.completedAssignments}.`,
    `Racha más larga: ${summary.longestStreak} días.`,
  ]

  if (summary.degradedServices.length > 0) {
    lines.push('', `Servicios degradados: ${summary.degradedServices.join(', ')}.`)
  }

  return lines.join('\n').trim()
}
