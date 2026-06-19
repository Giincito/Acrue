export type HabitFrequency = 'daily' | 'weekly' | 'custom'

export type HabitCustomRule =
  | {
      type: 'every_n_days'
      intervalDays: number
      anchorDate?: string | null
    }
  | {
      type: 'every_n_weeks'
      intervalWeeks: number
      daysOfWeek: number[]
      anchorDate?: string | null
    }
  | { type: 'month_start' }
  | { type: 'month_end' }
  | { type: 'business_days' }
  | { type: 'non_business_days' }
  | { type: 'argentina_holidays' }

export type HabitAnalyticsRow = {
  id: string
  name: string
  frequency: string
  days_of_week?: number[] | null
  custom_rule?: HabitCustomRule | Record<string, unknown> | null
  active?: boolean | null
  time_of_day?: string | null
}

export type HabitLogAnalyticsRow = {
  id: string
  habit_id: string
  completed_at: string
  event_type?: 'complete' | 'uncomplete' | null
}

export type HabitHeatmapDay = {
  date: string
  completedCount: number
  totalHabitCount: number
  dueHabitCount: number
  level: 0 | 1 | 2 | 3
}

const WEEKDAY_LABELS = new Map([
  [1, 'L'],
  [2, 'M'],
  [3, 'X'],
  [4, 'J'],
  [5, 'V'],
  [6, 'S'],
  [7, 'D'],
])

const FIXED_ARGENTINA_HOLIDAYS = new Set([
  '01-01',
  '03-24',
  '04-02',
  '05-01',
  '05-25',
  '06-17',
  '06-20',
  '07-09',
  '12-08',
  '12-25',
])

export function toDateKey(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }

  return value.includes('T') ? new Date(value).toISOString().slice(0, 10) : value.slice(0, 10)
}

export function dateKeyToNoonUtc(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00.000Z`)
}

export function getUtcWeekday(date: Date): number {
  const day = date.getUTCDay()
  return day === 0 ? 7 : day
}

export function getDateRange(startDate: string, endDate: string): string[] {
  const start = dateKeyToNoonUtc(startDate)
  const end = dateKeyToNoonUtc(endDate)
  const days: string[] = []

  for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    days.push(toDateKey(cursor))
  }

  return days
}

export function getDayBounds(dateKey: string): { dayStart: string; dayEnd: string } {
  return {
    dayStart: `${dateKey}T00:00:00.000Z`,
    dayEnd: `${dateKey}T23:59:59.999Z`,
  }
}

export function formatHabitSchedule(habit: HabitAnalyticsRow): string {
  const frequency = habit.frequency as HabitFrequency
  const days = normalizeDays(habit.days_of_week)
  const customRule = parseCustomRule(habit.custom_rule)
  const parts: string[] = []

  if (frequency === 'daily') {
    parts.push('Diario')
  } else if (frequency === 'weekly') {
    parts.push('Semanal')
    if (days.length) {
      parts.push(formatDays(days))
    }
  } else if (customRule?.type === 'every_n_days') {
    parts.push(`Cada ${customRule.intervalDays} días`)
  } else if (customRule?.type === 'every_n_weeks') {
    parts.push(`Cada ${customRule.intervalWeeks} semanas`)
    if (customRule.daysOfWeek.length) {
      parts.push(formatDays(customRule.daysOfWeek))
    }
  } else if (customRule?.type === 'month_start') {
    parts.push('Inicio de mes')
  } else if (customRule?.type === 'month_end') {
    parts.push('Fin de mes')
  } else if (customRule?.type === 'business_days') {
    parts.push('Días hábiles')
  } else if (customRule?.type === 'non_business_days') {
    parts.push('Días no hábiles')
  } else if (customRule?.type === 'argentina_holidays') {
    parts.push('Feriados argentinos')
  } else {
    parts.push('Personalizado')
  }

  if (habit.time_of_day) {
    parts.push(habit.time_of_day.slice(0, 5))
  }

  return parts.join(' - ')
}

export function isHabitDueOnDate(habit: HabitAnalyticsRow, date: Date): boolean {
  if (habit.active === false) return false

  const frequency = habit.frequency as HabitFrequency
  const weekday = getUtcWeekday(date)

  if (frequency === 'daily') return true
  if (frequency === 'weekly') {
    const days = normalizeDays(habit.days_of_week)
    return days.length === 0 || days.includes(weekday)
  }

  const customRule = parseCustomRule(habit.custom_rule)
  if (!customRule) return true

  if (customRule.type === 'every_n_days') {
    const intervalDays = Math.max(1, Math.floor(customRule.intervalDays))
    const anchorKey = customRule.anchorDate ? toDateKey(customRule.anchorDate) : toDateKey(new Date())
    const diffDays = daysBetween(anchorKey, toDateKey(date))

    return diffDays >= 0 && diffDays % intervalDays === 0
  }
  if (customRule.type === 'month_start') return date.getUTCDate() === 1
  if (customRule.type === 'month_end') return isLastDayOfMonth(date)
  if (customRule.type === 'argentina_holidays') return isArgentinaHoliday(date)
  if (customRule.type === 'business_days') return weekday <= 5 && !isArgentinaHoliday(date)
  if (customRule.type === 'non_business_days') return weekday >= 6 || isArgentinaHoliday(date)

  const intervalWeeks = Math.max(1, Math.floor(customRule.intervalWeeks))
  const anchorKey = customRule.anchorDate ? toDateKey(customRule.anchorDate) : toDateKey(new Date())
  const anchor = dateKeyToNoonUtc(anchorKey)
  const diffMs = date.getTime() - anchor.getTime()

  if (diffMs < 0) return false

  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
  return diffWeeks % intervalWeeks === 0 && normalizeDays(customRule.daysOfWeek).includes(weekday)
}

export function buildHabitHeatmap({
  habits,
  logs,
  startDate,
  endDate,
}: {
  habits: HabitAnalyticsRow[]
  logs: HabitLogAnalyticsRow[]
  startDate: string
  endDate: string
}): HabitHeatmapDay[] {
  const activeHabits = habits.filter((habit) => habit.active !== false)
  const latestByHabitAndDate = getLatestEventsByHabitAndDate(logs)

  return getDateRange(startDate, endDate).map((dateKey) => {
    const date = dateKeyToNoonUtc(dateKey)
    const dueHabits = activeHabits.filter((habit) => isHabitDueOnDate(habit, date))
    const completedCount = activeHabits.filter((habit) => {
      const event = latestByHabitAndDate.get(`${habit.id}:${dateKey}`)
      return event?.event_type !== 'uncomplete' && event?.event_type !== undefined
    }).length

    return {
      date: dateKey,
      completedCount,
      totalHabitCount: activeHabits.length,
      dueHabitCount: dueHabits.length,
      level: Math.min(3, completedCount) as 0 | 1 | 2 | 3,
    }
  })
}

export function calculateHabitStreak({
  habitId,
  logs,
  today,
}: {
  habitId: string
  logs: HabitLogAnalyticsRow[]
  today: string
}): { current: number; best: number } {
  const latestByDay = new Map<string, HabitLogAnalyticsRow>()

  logs
    .filter((log) => log.habit_id === habitId)
    .sort((a, b) => a.completed_at.localeCompare(b.completed_at))
    .forEach((log) => {
      latestByDay.set(toDateKey(log.completed_at), log)
    })

  const completedDays = new Set(
    Array.from(latestByDay.entries())
      .filter(([, log]) => (log.event_type ?? 'complete') === 'complete')
      .map(([dateKey]) => dateKey)
  )

  let current = 0
  const currentStart = Array.from(completedDays)
    .filter((day) => day <= today)
    .sort()
    .at(-1)

  for (
    const cursor = dateKeyToNoonUtc(currentStart ?? today);
    completedDays.has(toDateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  ) {
    current += 1
  }

  let best = 0
  let run = 0
  const sortedDays = Array.from(completedDays).sort()
  let previous: string | null = null

  for (const day of sortedDays) {
    if (previous && daysBetween(previous, day) === 1) {
      run += 1
    } else {
      run = 1
    }
    best = Math.max(best, run)
    previous = day
  }

  return { current, best }
}

export function getLatestEventForDay(
  logs: HabitLogAnalyticsRow[],
  habitId: string,
  dateKey: string
): HabitLogAnalyticsRow | undefined {
  return getLatestEventsByHabitAndDate(logs).get(`${habitId}:${dateKey}`)
}

function getLatestEventsByHabitAndDate(logs: HabitLogAnalyticsRow[]) {
  const latest = new Map<string, HabitLogAnalyticsRow>()

  logs
    .slice()
    .sort((a, b) => a.completed_at.localeCompare(b.completed_at))
    .forEach((log) => {
      latest.set(`${log.habit_id}:${toDateKey(log.completed_at)}`, {
        ...log,
        event_type: log.event_type ?? 'complete',
      })
    })

  return latest
}

function formatDays(days: number[]): string {
  return normalizeDays(days)
    .map((day) => WEEKDAY_LABELS.get(day))
    .filter(Boolean)
    .join(', ')
}

function normalizeDays(days: number[] | null | undefined): number[] {
  return Array.from(new Set(days ?? []))
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
    .sort((a, b) => a - b)
}

function parseCustomRule(rule: HabitAnalyticsRow['custom_rule']): HabitCustomRule | null {
  if (!rule || typeof rule !== 'object' || !('type' in rule)) return null

  if (rule.type === 'every_n_weeks') {
    const intervalWeeks = Number('intervalWeeks' in rule ? rule.intervalWeeks : 1)
    const daysOfWeek = Array.isArray('daysOfWeek' in rule ? rule.daysOfWeek : [])
      ? ('daysOfWeek' in rule ? rule.daysOfWeek : [])
      : []

    return {
      type: 'every_n_weeks',
      intervalWeeks: Number.isFinite(intervalWeeks) ? Math.max(1, intervalWeeks) : 1,
      daysOfWeek: normalizeDays(daysOfWeek as number[]),
      anchorDate: typeof rule.anchorDate === 'string' ? rule.anchorDate : null,
    }
  }

  if (rule.type === 'every_n_days') {
    const intervalDays = Number('intervalDays' in rule ? rule.intervalDays : 1)

    return {
      type: 'every_n_days',
      intervalDays: Number.isFinite(intervalDays) ? Math.max(1, intervalDays) : 1,
      anchorDate: typeof rule.anchorDate === 'string' ? rule.anchorDate : null,
    }
  }

  if (
    rule.type === 'month_start' ||
    rule.type === 'month_end' ||
    rule.type === 'business_days' ||
    rule.type === 'non_business_days' ||
    rule.type === 'argentina_holidays'
  ) {
    return { type: rule.type }
  }

  return null
}

function isArgentinaHoliday(date: Date): boolean {
  return FIXED_ARGENTINA_HOLIDAYS.has(toDateKey(date).slice(5))
}

function isLastDayOfMonth(date: Date): boolean {
  const nextDay = new Date(date)
  nextDay.setUTCDate(date.getUTCDate() + 1)

  return nextDay.getUTCDate() === 1
}

function daysBetween(startDate: string, endDate: string): number {
  const start = dateKeyToNoonUtc(startDate).getTime()
  const end = dateKeyToNoonUtc(endDate).getTime()
  return Math.round((end - start) / (24 * 60 * 60 * 1000))
}
