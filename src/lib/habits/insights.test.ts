import { describe, expect, it } from 'vitest'
import { buildHabitInsights } from './insights'

describe('habit insights', () => {
  it('detects weak days and suggests the best completion time per habit', () => {
    const insights = buildHabitInsights({
      habits: [
        {
          id: 'habit-1',
          name: 'Leer',
          frequency: 'daily',
          days_of_week: [],
          custom_rule: null,
          active: true,
        },
      ],
      logs: [
        {
          id: 'log-1',
          habit_id: 'habit-1',
          completed_at: '2026-06-16T08:10:00.000Z',
          event_type: 'complete',
        },
        {
          id: 'log-2',
          habit_id: 'habit-1',
          completed_at: '2026-06-17T08:25:00.000Z',
          event_type: 'complete',
        },
      ],
      days: [
        {
          date: '2026-06-15',
          completedCount: 0,
          totalHabitCount: 1,
          dueHabitCount: 1,
          level: 0,
        },
        {
          date: '2026-06-16',
          completedCount: 1,
          totalHabitCount: 1,
          dueHabitCount: 1,
          level: 1,
        },
      ],
    })

    expect(insights.globalHint).toBe('El punto mas irregular aparece los lunes.')
    expect(insights.byHabit[0]).toMatchObject({
      habitId: 'habit-1',
      bestTimeHint: 'Tu mejor horario aparece cerca de las 08:00.',
    })
  })
})
