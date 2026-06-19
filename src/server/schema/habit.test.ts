import { describe, expect, it } from 'vitest'
import { CreateHabitSchema } from './habit'

describe('CreateHabitSchema', () => {
  it('accepts custom rules for every N days and month end', () => {
    expect(
      CreateHabitSchema.parse({
        name: 'Entrenar',
        frequency: 'custom',
        custom_rule: {
          type: 'every_n_days',
          intervalDays: 3,
          anchorDate: '2026-06-01',
        },
      }).custom_rule
    ).toEqual({
      type: 'every_n_days',
      intervalDays: 3,
      anchorDate: '2026-06-01',
    })

    expect(
      CreateHabitSchema.parse({
        name: 'Cierre mensual',
        frequency: 'custom',
        custom_rule: { type: 'month_end' },
      }).custom_rule
    ).toEqual({ type: 'month_end' })
  })
})
