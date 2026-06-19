import type { HabitAnalyticsRow, HabitHeatmapDay, HabitLogAnalyticsRow } from './analytics'

export type HabitInsight = {
  habitId: string
  bestTimeHint: string | null
  consistencyHint: string
}

export type HabitInsights = {
  globalHint: string | null
  byHabit: HabitInsight[]
}

const WEEKDAY_NAMES = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabados']

export function buildHabitInsights({
  habits,
  logs,
  days,
}: {
  habits: HabitAnalyticsRow[]
  logs: HabitLogAnalyticsRow[]
  days: HabitHeatmapDay[]
}): HabitInsights {
  const globalHint = getWeakDayHint(days)

  return {
    globalHint,
    byHabit: habits.map((habit) => {
      const completedLogs = logs.filter(
        (log) => log.habit_id === habit.id && (log.event_type ?? 'complete') === 'complete'
      )

      return {
        habitId: habit.id,
        bestTimeHint: getBestTimeHint(completedLogs),
        consistencyHint: completedLogs.length >= 3
          ? 'Ya hay historial suficiente para revisar patron semanal.'
          : 'Todavia falta historial para detectar un patron confiable.',
      }
    }),
  }
}

function getWeakDayHint(days: HabitHeatmapDay[]): string | null {
  const missesByWeekday = new Map<number, number>()

  days.forEach((day) => {
    if (day.dueHabitCount > 0 && day.completedCount === 0) {
      const weekday = new Date(`${day.date}T12:00:00.000Z`).getUTCDay()
      missesByWeekday.set(weekday, (missesByWeekday.get(weekday) ?? 0) + 1)
    }
  })

  const weakest = Array.from(missesByWeekday.entries()).sort((a, b) => b[1] - a[1])[0]
  if (!weakest) return null

  return `El punto mas irregular aparece los ${WEEKDAY_NAMES[weakest[0]]}.`
}

function getBestTimeHint(logs: HabitLogAnalyticsRow[]): string | null {
  if (!logs.length) return null

  const averageHour = Math.round(
    logs.reduce((sum, log) => sum + new Date(log.completed_at).getUTCHours(), 0) / logs.length
  )

  return `Tu mejor horario aparece cerca de las ${String(averageHour).padStart(2, '0')}:00.`
}
