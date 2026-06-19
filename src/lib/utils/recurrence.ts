import { RRule, Frequency } from 'rrule'

export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'custom'

export type RecurringTaskSeed = {
  id: string
  user_id: string
  project_id: string | null
  title: string
  context_tag: string | null
  priority: number
  due_at: string | null
  created_at: string
  recurrence_rule: string | null
  metadata?: unknown
}

export type RecurringTaskInstance = {
  user_id: string
  title: string
  context_tag: string | null
  status: 'today'
  priority: number
  due_at: string
  project_id: string | null
  is_recurring: false
  recurrence_rule: null
  source: 'recurrence'
  metadata: Record<string, unknown> & {
    recurrence_source_task_id: string
    recurrence_occurrence_date: string
  }
}

// Helper to generate a simple RRULE string based on type
export function generateRRule(type: RecurrenceType, interval: number = 1): string {
  let freq = Frequency.DAILY

  switch (type) {
    case 'weekly':
      freq = Frequency.WEEKLY
      break
    case 'monthly':
      freq = Frequency.MONTHLY
      break
    case 'daily':
    default:
      freq = Frequency.DAILY
      break
  }

  const rule = new RRule({
    freq,
    interval,
  })

  return rule.toString()
}

// Very basic rule to text parser
export function rruleToText(rruleString: string | null): string {
  if (!rruleString) return ''

  try {
    const rule = RRule.fromString(rruleString)
    return rule.toText() 
  } catch {
    return 'Regla repetitiva'
  }
}

export function getRecurrenceDateKey(date: Date): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

export function buildRecurringTaskInstance(
  task: RecurringTaskSeed,
  targetDate: Date,
  existingInstanceKeys: Set<string> = new Set()
): RecurringTaskInstance | null {
  if (!task.recurrence_rule) return null

  const occurrenceDate = getRecurrenceDateKey(targetDate)
  if (existingInstanceKeys.has(`${task.id}:${occurrenceDate}`)) return null

  const anchorDate = new Date(task.due_at ?? task.created_at)
  const anchorDay = getUtcDayStart(anchorDate)
  const targetDay = getUtcDayStart(targetDate)

  if (anchorDay.getTime() === targetDay.getTime()) return null

  const rule = new RRule({
    ...RRule.parseString(task.recurrence_rule),
    dtstart: anchorDay,
  })

  const targetDayEnd = new Date(targetDay.getTime() + 24 * 60 * 60 * 1000 - 1)
  const occursOnTargetDay = rule.between(targetDay, targetDayEnd, true).length > 0

  if (!occursOnTargetDay) return null

  return {
    user_id: task.user_id,
    title: task.title,
    context_tag: task.context_tag,
    status: 'today',
    priority: task.priority,
    due_at: withTargetDateAndAnchorTime(targetDay, anchorDate).toISOString(),
    project_id: task.project_id,
    is_recurring: false,
    recurrence_rule: null,
    source: 'recurrence',
    metadata: {
      ...toPlainMetadata(task.metadata),
      recurrence_source_task_id: task.id,
      recurrence_occurrence_date: occurrenceDate,
    },
  }
}

function getUtcDayStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function withTargetDateAndAnchorTime(targetDay: Date, anchorDate: Date): Date {
  return new Date(
    Date.UTC(
      targetDay.getUTCFullYear(),
      targetDay.getUTCMonth(),
      targetDay.getUTCDate(),
      anchorDate.getUTCHours(),
      anchorDate.getUTCMinutes(),
      anchorDate.getUTCSeconds(),
      anchorDate.getUTCMilliseconds()
    )
  )
}

function toPlainMetadata(metadata: unknown): Record<string, unknown> {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? { ...metadata }
    : {}
}
