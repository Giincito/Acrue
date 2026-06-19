import { describe, expect, it } from 'vitest'
import {
  buildHabitHeatmap,
  formatHabitSchedule,
  isHabitDueOnDate,
  calculateHabitStreak,
} from './analytics'

const dailyHabit = {
  id: 'habit-daily',
  name: 'Leer',
  frequency: 'daily',
  days_of_week: [],
  custom_rule: null,
  active: true,
}

describe('habit analytics', () => {
  it('keeps weekly and custom schedules semantically different', () => {
    expect(
      formatHabitSchedule({
        ...dailyHabit,
        frequency: 'weekly',
        days_of_week: [1, 3],
      })
    ).toBe('Semanal - L, X')

    expect(
      formatHabitSchedule({
        ...dailyHabit,
        frequency: 'custom',
        days_of_week: [1],
        custom_rule: {
          type: 'every_n_weeks',
          intervalWeeks: 2,
          daysOfWeek: [1],
          anchorDate: '2026-06-01',
        },
      })
    ).toBe('Cada 2 semanas - L')

    expect(
      formatHabitSchedule({
        ...dailyHabit,
        frequency: 'custom',
        custom_rule: { type: 'month_start' },
      })
    ).toBe('Inicio de mes')

    expect(
      formatHabitSchedule({
        ...dailyHabit,
        frequency: 'custom',
        custom_rule: {
          type: 'every_n_days',
          intervalDays: 3,
          anchorDate: '2026-06-01',
        },
      })
    ).toBe('Cada 3 días')

    expect(
      formatHabitSchedule({
        ...dailyHabit,
        frequency: 'custom',
        custom_rule: { type: 'month_end' },
      })
    ).toBe('Fin de mes')
  })

  it('evaluates custom schedules beyond simple weekly days', () => {
    const everyTwoWeeks = {
      ...dailyHabit,
      frequency: 'custom',
      custom_rule: {
        type: 'every_n_weeks',
        intervalWeeks: 2,
        daysOfWeek: [1],
        anchorDate: '2026-06-01',
      },
    }

    expect(isHabitDueOnDate(everyTwoWeeks, new Date('2026-06-15T12:00:00.000Z'))).toBe(true)
    expect(isHabitDueOnDate(everyTwoWeeks, new Date('2026-06-08T12:00:00.000Z'))).toBe(false)
    expect(
      isHabitDueOnDate(
        { ...dailyHabit, frequency: 'custom', custom_rule: { type: 'month_start' } },
        new Date('2026-07-01T12:00:00.000Z')
      )
    ).toBe(true)
    expect(
      isHabitDueOnDate(
        {
          ...dailyHabit,
          frequency: 'custom',
          custom_rule: {
            type: 'every_n_days',
            intervalDays: 3,
            anchorDate: '2026-06-01',
          },
        },
        new Date('2026-06-10T12:00:00.000Z')
      )
    ).toBe(true)
    expect(
      isHabitDueOnDate(
        {
          ...dailyHabit,
          frequency: 'custom',
          custom_rule: {
            type: 'every_n_days',
            intervalDays: 3,
            anchorDate: '2026-06-01',
          },
        },
        new Date('2026-06-11T12:00:00.000Z')
      )
    ).toBe(false)
    expect(
      isHabitDueOnDate(
        { ...dailyHabit, frequency: 'custom', custom_rule: { type: 'month_end' } },
        new Date('2026-02-28T12:00:00.000Z')
      )
    ).toBe(true)
    expect(
      isHabitDueOnDate(
        { ...dailyHabit, frequency: 'custom', custom_rule: { type: 'month_end' } },
        new Date('2028-02-29T12:00:00.000Z')
      )
    ).toBe(true)
    expect(
      isHabitDueOnDate(
        { ...dailyHabit, frequency: 'custom', custom_rule: { type: 'business_days' } },
        new Date('2026-06-16T12:00:00.000Z')
      )
    ).toBe(true)
    expect(
      isHabitDueOnDate(
        { ...dailyHabit, frequency: 'custom', custom_rule: { type: 'non_business_days' } },
        new Date('2026-06-20T12:00:00.000Z')
      )
    ).toBe(true)
    expect(
      isHabitDueOnDate(
        { ...dailyHabit, frequency: 'custom', custom_rule: { type: 'argentina_holidays' } },
        new Date('2026-07-09T12:00:00.000Z')
      )
    ).toBe(true)
  })

  it('builds heatmap counts from the latest append-only event per habit and day', () => {
    const days = buildHabitHeatmap({
      habits: [
        dailyHabit,
        { ...dailyHabit, id: 'habit-workout', name: 'Entrenar' },
        { ...dailyHabit, id: 'habit-study', name: 'Estudiar' },
      ],
      logs: [
        {
          id: 'log-1',
          habit_id: 'habit-daily',
          completed_at: '2026-06-16T10:00:00.000Z',
          event_type: 'complete',
        },
        {
          id: 'log-2',
          habit_id: 'habit-daily',
          completed_at: '2026-06-16T12:00:00.000Z',
          event_type: 'uncomplete',
        },
        {
          id: 'log-3',
          habit_id: 'habit-workout',
          completed_at: '2026-06-16T11:00:00.000Z',
          event_type: 'complete',
        },
        {
          id: 'log-4',
          habit_id: 'habit-study',
          completed_at: '2026-06-17T11:00:00.000Z',
          event_type: 'complete',
        },
      ],
      startDate: '2026-06-16',
      endDate: '2026-06-17',
    })

    expect(days).toEqual([
      {
        date: '2026-06-16',
        completedCount: 1,
        totalHabitCount: 3,
        dueHabitCount: 3,
        level: 1,
      },
      {
        date: '2026-06-17',
        completedCount: 1,
        totalHabitCount: 3,
        dueHabitCount: 3,
        level: 1,
      },
    ])
  })

  it('calculates streaks without counting uncompleted days', () => {
    const streak = calculateHabitStreak({
      habitId: 'habit-daily',
      logs: [
        {
          id: 'log-1',
          habit_id: 'habit-daily',
          completed_at: '2026-06-14T10:00:00.000Z',
          event_type: 'complete',
        },
        {
          id: 'log-2',
          habit_id: 'habit-daily',
          completed_at: '2026-06-15T10:00:00.000Z',
          event_type: 'complete',
        },
        {
          id: 'log-3',
          habit_id: 'habit-daily',
          completed_at: '2026-06-16T10:00:00.000Z',
          event_type: 'complete',
        },
        {
          id: 'log-4',
          habit_id: 'habit-daily',
          completed_at: '2026-06-16T12:00:00.000Z',
          event_type: 'uncomplete',
        },
      ],
      today: '2026-06-16',
    })

    expect(streak.current).toBe(2)
    expect(streak.best).toBe(2)
  })
})
