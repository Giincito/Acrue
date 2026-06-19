export type FocusMode = 'pomodoro' | 'custom'

export type FocusTaskInput = {
  title: string
  priority: number | null
  due_at: string | null
}

export type FocusSelectableTask = {
  id: string
  title: string
}

export type FocusSettingsInput = {
  mode: FocusMode
  workMinutes?: number | null
  breakMinutes?: number | null
}

export type FocusSettings = {
  mode: FocusMode
  workMinutes: number
  breakMinutes: number
  workSeconds: number
  breakSeconds: number
}

export type FocusSuggestionInput = {
  now?: Date
  tasks: FocusTaskInput[]
  completedFocusSessionsToday: number
}

export type FocusSuggestion = {
  shouldSuggest: boolean
  urgentCount: number
  suggestedMinutes: number
  reason: string
}

const CLASSIC_WORK_MINUTES = 25
const CLASSIC_BREAK_MINUTES = 5
const MIN_INTERVAL_MINUTES = 1
const MAX_INTERVAL_MINUTES = 60
const FOCUS_GOAL_PER_DAY = 4
const SPOTIFY_PLAYLIST_ID_RE = /^[a-zA-Z0-9]{10,}$/
export const FOCUS_FREE_SESSION_ID = 'free-session'

function clampMinutes(value: number | null | undefined, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(MAX_INTERVAL_MINUTES, Math.max(MIN_INTERVAL_MINUTES, Math.round(value)))
}

export function buildFocusSettings(input: FocusSettingsInput): FocusSettings {
  if (input.mode === 'pomodoro') {
    return {
      mode: 'pomodoro',
      workMinutes: CLASSIC_WORK_MINUTES,
      breakMinutes: CLASSIC_BREAK_MINUTES,
      workSeconds: CLASSIC_WORK_MINUTES * 60,
      breakSeconds: CLASSIC_BREAK_MINUTES * 60,
    }
  }

  const workMinutes = clampMinutes(input.workMinutes, CLASSIC_WORK_MINUTES)
  const breakMinutes = clampMinutes(input.breakMinutes, CLASSIC_BREAK_MINUTES)

  return {
    mode: 'custom',
    workMinutes,
    breakMinutes,
    workSeconds: workMinutes * 60,
    breakSeconds: breakMinutes * 60,
  }
}

export function formatFocusTime(totalSeconds: number) {
  const boundedSeconds = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(boundedSeconds / 60)
  const seconds = boundedSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function getFocusTaskSelectLabel(
  tasks: FocusSelectableTask[],
  selectedTaskId: string | null | undefined
) {
  if (!selectedTaskId || selectedTaskId === FOCUS_FREE_SESSION_ID || selectedTaskId === 'sin-tarea') {
    return 'Sesión libre'
  }

  return tasks.find((task) => task.id === selectedTaskId)?.title ?? 'Sesión libre'
}

export function getFocusProgress({
  totalSeconds,
  remainingSeconds,
}: {
  totalSeconds: number
  remainingSeconds: number
}) {
  if (totalSeconds <= 0) return 0
  const elapsed = totalSeconds - remainingSeconds
  return Math.min(100, Math.max(0, Math.round((elapsed / totalSeconds) * 100)))
}

export function normalizeSpotifyPlaylistUrl(value: string | null | undefined) {
  const rawValue = value?.trim()
  if (!rawValue) return null

  const uriMatch = rawValue.match(/^spotify:playlist:([a-zA-Z0-9]+)$/)
  const urlMatch = rawValue.match(/open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/)
  const directId = SPOTIFY_PLAYLIST_ID_RE.test(rawValue) ? rawValue : null
  const playlistId = uriMatch?.[1] ?? urlMatch?.[1] ?? directId

  if (!playlistId) return null

  return {
    playlistId,
    embedUrl: `https://open.spotify.com/embed/playlist/${playlistId}`,
  }
}

function isTaskUrgent(task: FocusTaskInput, now: Date) {
  if ((task.priority ?? 3) <= 1) return true
  if (!task.due_at) return false

  const dueDate = new Date(task.due_at)
  if (Number.isNaN(dueDate.getTime())) return false

  const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60)
  return hoursUntilDue >= 0 && hoursUntilDue <= 48
}

function isGoodStudyWindow(now: Date) {
  const hour = now.getHours()
  return (hour >= 8 && hour <= 12) || (hour >= 16 && hour <= 20)
}

export function getFocusSuggestion(input: FocusSuggestionInput): FocusSuggestion {
  const now = input.now ?? new Date()
  const urgentCount = input.tasks.filter((task) => isTaskUrgent(task, now)).length
  const shouldSuggest =
    urgentCount >= 2 &&
    isGoodStudyWindow(now) &&
    input.completedFocusSessionsToday < FOCUS_GOAL_PER_DAY

  return {
    shouldSuggest,
    urgentCount,
    suggestedMinutes: CLASSIC_WORK_MINUTES,
    reason: shouldSuggest
      ? `Tenes ${urgentCount} tareas urgentes y esta es una buena ventana para estudiar.`
      : 'No hay una ventana clara para sugerir foco ahora.',
  }
}
