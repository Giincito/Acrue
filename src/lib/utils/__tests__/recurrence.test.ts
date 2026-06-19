import { describe, expect, it } from 'vitest'
import { buildRecurringTaskInstance } from '../recurrence'

const recurringTask = {
  id: 'task-1',
  user_id: 'user-1',
  project_id: 'project-1',
  title: 'Repasar analisis',
  context_tag: '@universidad',
  priority: 1,
  due_at: '2026-06-10T14:30:00.000Z',
  created_at: '2026-06-01T12:00:00.000Z',
  recurrence_rule: 'FREQ=DAILY;INTERVAL=1',
  metadata: { origin: 'manual' },
}

describe('recurrence task generation', () => {
  it('does not generate a clone for the master task original day', () => {
    const instance = buildRecurringTaskInstance(recurringTask, new Date('2026-06-10T03:00:00.000Z'))

    expect(instance).toBeNull()
  })

  it('creates a non-recurring daily instance with the original due time and trace metadata', () => {
    const instance = buildRecurringTaskInstance(recurringTask, new Date('2026-06-11T03:00:00.000Z'))

    expect(instance).toEqual({
      user_id: 'user-1',
      title: 'Repasar analisis',
      context_tag: '@universidad',
      status: 'today',
      priority: 1,
      due_at: '2026-06-11T14:30:00.000Z',
      project_id: 'project-1',
      is_recurring: false,
      recurrence_rule: null,
      source: 'recurrence',
      metadata: {
        origin: 'manual',
        recurrence_source_task_id: 'task-1',
        recurrence_occurrence_date: '2026-06-11',
      },
    })
  })

  it('does not generate duplicate instances for the same source task and day', () => {
    const instance = buildRecurringTaskInstance(
      recurringTask,
      new Date('2026-06-11T03:00:00.000Z'),
      new Set(['task-1:2026-06-11'])
    )

    expect(instance).toBeNull()
  })

  it('does not generate when the target day is outside the RRULE', () => {
    const weeklyTask = {
      ...recurringTask,
      recurrence_rule: 'FREQ=WEEKLY;INTERVAL=1',
    }

    const instance = buildRecurringTaskInstance(weeklyTask, new Date('2026-06-11T03:00:00.000Z'))

    expect(instance).toBeNull()
  })
})
