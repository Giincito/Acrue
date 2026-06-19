import { z } from 'zod'

export const HabitFrequencySchema = z.enum(['daily', 'weekly', 'custom'])

export const HabitCustomRuleSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('every_n_days'),
    intervalDays: z.number().int().min(1).max(365).default(2),
    anchorDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  }),
  z.object({
    type: z.literal('every_n_weeks'),
    intervalWeeks: z.number().int().min(1).max(12).default(2),
    daysOfWeek: z.array(z.number().int().min(1).max(7)).min(1).max(7),
    anchorDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  }),
  z.object({ type: z.literal('month_start') }),
  z.object({ type: z.literal('month_end') }),
  z.object({ type: z.literal('business_days') }),
  z.object({ type: z.literal('non_business_days') }),
  z.object({ type: z.literal('argentina_holidays') }),
])

const timeOfDaySchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Hora inválida')
  .optional()
  .nullable()

const daysOfWeekSchema = z
  .array(z.number().int().min(1).max(7))
  .max(7)
  .default([])

export const CreateHabitSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido').max(120),
  frequency: HabitFrequencySchema.default('daily'),
  days_of_week: daysOfWeekSchema,
  custom_rule: HabitCustomRuleSchema.optional().nullable().default(null),
  time_of_day: timeOfDaySchema,
  active: z.boolean().default(true),
})

export const UpdateHabitSchema = CreateHabitSchema.partial().extend({
  id: z.string().uuid(),
})

export const CompleteHabitSchema = z.object({
  id: z.string().uuid(),
  completed_at: z.string().datetime().optional(),
  dayStart: z.string().datetime().optional(),
  dayEnd: z.string().datetime().optional(),
})

export const HabitHeatmapInputSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export const HabitListInputSchema = z
  .object({
    dayStart: z.string().datetime().optional(),
    dayEnd: z.string().datetime().optional(),
    includeInactive: z.boolean().default(false),
  })
  .optional()

export type CreateHabitInput = z.infer<typeof CreateHabitSchema>
export type UpdateHabitInput = z.infer<typeof UpdateHabitSchema>
export type CompleteHabitInput = z.infer<typeof CompleteHabitSchema>
export type HabitHeatmapInput = z.infer<typeof HabitHeatmapInputSchema>
export type HabitFrequency = z.infer<typeof HabitFrequencySchema>
