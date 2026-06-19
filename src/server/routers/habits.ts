import { TRPCError } from '@trpc/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import {
  buildHabitHeatmap,
  calculateHabitStreak,
  getDayBounds,
  getLatestEventForDay,
  toDateKey,
  type HabitCustomRule,
} from '@/lib/habits/analytics'
import { buildHabitInsights } from '@/lib/habits/insights'
import { addXP } from '@/lib/xp'
import { router, protectedProcedure } from '../trpc'
import {
  CompleteHabitSchema,
  CreateHabitSchema,
  HabitHeatmapInputSchema,
  HabitListInputSchema,
  UpdateHabitSchema,
} from '../schema/habit'

type HabitRow = {
  id: string
  user_id: string
  name: string
  frequency: string
  days_of_week: number[] | null
  custom_rule: HabitCustomRule | null
  time_of_day: string | null
  active: boolean
  created_at: string
}

type HabitLogRow = {
  id: string
  habit_id: string
  completed_at: string
  event_type?: 'complete' | 'uncomplete' | null
}

function getCompletionBounds(completedAt: string, dayStart?: string, dayEnd?: string) {
  if (dayStart && dayEnd) {
    return { dayStart, dayEnd }
  }

  return getDayBounds(toDateKey(completedAt))
}

function normalizeHabit(habit: HabitRow, logs: HabitLogRow[] = []) {
  const latestLog = logs
    .filter((log) => log.habit_id === habit.id)
    .sort((a, b) => b.completed_at.localeCompare(a.completed_at))[0]
  const eventType = latestLog?.event_type ?? 'complete'
  const completedToday = Boolean(latestLog && eventType === 'complete')

  return {
    ...habit,
    days_of_week: habit.days_of_week ?? [],
    custom_rule: habit.custom_rule ?? null,
    completedToday,
    lastCompletedAt: completedToday ? latestLog?.completed_at ?? null : null,
    lastEventType: latestLog ? eventType : null,
  }
}

function serializeHabitInput(input: {
  frequency?: string
  days_of_week?: number[]
  custom_rule?: HabitCustomRule | null
}) {
  const frequency = input.frequency

  return {
    days_of_week: frequency === 'daily' ? [] : input.days_of_week ?? [],
    custom_rule: frequency === 'custom' ? input.custom_rule ?? null : null,
  }
}

async function getActiveHabit(ctx: { supabase: SupabaseClient; user: { id: string } }, id: string) {
  const { data: habit, error } = await ctx.supabase
    .from('habits')
    .select('*')
    .eq('id', id)
    .eq('user_id', ctx.user.id)
    .eq('active', true)
    .single()

  if (error || !habit) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Hábito no encontrado' })
  }

  return habit as HabitRow
}

async function getDayLogs(
  ctx: { supabase: SupabaseClient },
  habitId: string,
  dayStart: string,
  dayEnd: string
) {
  const { data, error } = await ctx.supabase
    .from('habit_logs')
    .select('id, habit_id, completed_at, event_type')
    .eq('habit_id', habitId)
    .gte('completed_at', dayStart)
    .lte('completed_at', dayEnd)
    .order('completed_at', { ascending: true })

  if (error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  }

  return (data ?? []) as HabitLogRow[]
}

export const habitRouter = router({
  list: protectedProcedure.input(HabitListInputSchema).query(async ({ ctx, input }) => {
    let query = ctx.supabase
      .from('habits')
      .select('*')
      .eq('user_id', ctx.user.id)
      .order('created_at', { ascending: false })

    if (!input?.includeInactive) {
      query = query.eq('active', true)
    }

    const { data: habits, error } = await query

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    const habitRows = (habits ?? []) as HabitRow[]
    if (!habitRows.length || !input?.dayStart || !input?.dayEnd) {
      return habitRows.map((habit) => normalizeHabit(habit))
    }

    const { data: logs, error: logsError } = await ctx.supabase
      .from('habit_logs')
      .select('id, habit_id, completed_at, event_type')
      .in('habit_id', habitRows.map((habit) => habit.id))
      .gte('completed_at', input.dayStart)
      .lte('completed_at', input.dayEnd)

    if (logsError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: logsError.message })
    }

    return habitRows.map((habit) => normalizeHabit(habit, (logs ?? []) as HabitLogRow[]))
  }),

  create: protectedProcedure.input(CreateHabitSchema).mutation(async ({ ctx, input }) => {
    const serialized = serializeHabitInput(input)
    const { data, error } = await ctx.supabase
      .from('habits')
      .insert({
        user_id: ctx.user.id,
        name: input.name,
        frequency: input.frequency,
        days_of_week: serialized.days_of_week,
        custom_rule: serialized.custom_rule,
        time_of_day: input.time_of_day ?? null,
        active: input.active,
      })
      .select()
      .single()

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    return normalizeHabit(data as HabitRow)
  }),

  update: protectedProcedure.input(UpdateHabitSchema).mutation(async ({ ctx, input }) => {
    const { id, ...updates } = input
    const serialized = serializeHabitInput(updates)
    const payload = {
      ...updates,
      ...(updates.frequency ? serialized : {}),
    }

    const { data, error } = await ctx.supabase
      .from('habits')
      .update(payload)
      .eq('id', id)
      .eq('user_id', ctx.user.id)
      .select()
      .single()

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    return normalizeHabit(data as HabitRow)
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('habits')
        .update({ active: false })
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .select()
        .single()

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return normalizeHabit(data as HabitRow)
    }),

  complete: protectedProcedure.input(CompleteHabitSchema).mutation(async ({ ctx, input }) => {
    const completedAt = input.completed_at ?? new Date().toISOString()
    const bounds = getCompletionBounds(completedAt, input.dayStart, input.dayEnd)
    const habit = await getActiveHabit(ctx, input.id)
    const logs = await getDayLogs(ctx, input.id, bounds.dayStart, bounds.dayEnd)
    const latest = getLatestEventForDay(logs, input.id, toDateKey(completedAt))

    if ((latest?.event_type ?? 'complete') === 'complete' && latest) {
      return {
        ...latest,
        alreadyCompleted: true,
      }
    }

    const { data, error } = await ctx.supabase
      .from('habit_logs')
      .insert({
        habit_id: input.id,
        completed_at: completedAt,
        event_type: 'complete',
      })
      .select()
      .single()

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    await addXP(ctx.supabase, ctx.user.id, 'habit', input.id, 15, `Hábito completado: ${habit.name}`)

    return {
      ...(data as HabitLogRow),
      alreadyCompleted: false,
    }
  }),

  uncomplete: protectedProcedure.input(CompleteHabitSchema).mutation(async ({ ctx, input }) => {
    const completedAt = input.completed_at ?? new Date().toISOString()
    const bounds = getCompletionBounds(completedAt, input.dayStart, input.dayEnd)
    const habit = await getActiveHabit(ctx, input.id)
    const logs = await getDayLogs(ctx, input.id, bounds.dayStart, bounds.dayEnd)
    const latest = getLatestEventForDay(logs, input.id, toDateKey(completedAt))

    if (!latest || latest.event_type === 'uncomplete') {
      return {
        ...(latest ?? { id: null, habit_id: input.id, completed_at: completedAt, event_type: 'uncomplete' }),
        alreadyUncompleted: true,
      }
    }

    const { data, error } = await ctx.supabase
      .from('habit_logs')
      .insert({
        habit_id: input.id,
        completed_at: completedAt,
        event_type: 'uncomplete',
      })
      .select()
      .single()

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    await addXP(ctx.supabase, ctx.user.id, 'habit', input.id, -15, `Hábito desmarcado: ${habit.name}`)

    return {
      ...(data as HabitLogRow),
      alreadyUncompleted: false,
    }
  }),

  heatmap: protectedProcedure.input(HabitHeatmapInputSchema).query(async ({ ctx, input }) => {
    const { dayStart } = getDayBounds(input.startDate)
    const { dayEnd } = getDayBounds(input.endDate)

    const { data: habits, error } = await ctx.supabase
      .from('habits')
      .select('*')
      .eq('user_id', ctx.user.id)
      .eq('active', true)
      .order('created_at', { ascending: true })

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    const habitRows = (habits ?? []) as HabitRow[]
    if (!habitRows.length) {
      return {
        days: buildHabitHeatmap({
          habits: [],
          logs: [],
          startDate: input.startDate,
          endDate: input.endDate,
        }),
        streaks: [],
      }
    }

    const { data: logs, error: logsError } = await ctx.supabase
      .from('habit_logs')
      .select('id, habit_id, completed_at, event_type')
      .in('habit_id', habitRows.map((habit) => habit.id))
      .gte('completed_at', dayStart)
      .lte('completed_at', dayEnd)
      .order('completed_at', { ascending: true })

    if (logsError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: logsError.message })
    }

    const logRows = (logs ?? []) as HabitLogRow[]
    return {
      days: buildHabitHeatmap({
        habits: habitRows,
        logs: logRows,
        startDate: input.startDate,
        endDate: input.endDate,
      }),
      streaks: habitRows.map((habit) => ({
        habitId: habit.id,
        ...calculateHabitStreak({
          habitId: habit.id,
          logs: logRows,
          today: input.endDate,
        }),
      })),
    }
  }),

  insights: protectedProcedure.query(async ({ ctx }) => {
    const endDate = toDateKey(new Date())
    const start = new Date()
    start.setUTCDate(start.getUTCDate() - 119)
    const startDate = toDateKey(start)
    const { dayStart } = getDayBounds(startDate)
    const { dayEnd } = getDayBounds(endDate)

    const { data: habits, error } = await ctx.supabase
      .from('habits')
      .select('*')
      .eq('user_id', ctx.user.id)
      .eq('active', true)
      .order('created_at', { ascending: true })

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    const habitRows = (habits ?? []) as HabitRow[]
    if (!habitRows.length) {
      return { globalHint: null, byHabit: [] }
    }

    const { data: logs, error: logsError } = await ctx.supabase
      .from('habit_logs')
      .select('id, habit_id, completed_at, event_type')
      .in('habit_id', habitRows.map((habit) => habit.id))
      .gte('completed_at', dayStart)
      .lte('completed_at', dayEnd)
      .order('completed_at', { ascending: true })

    if (logsError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: logsError.message })
    }

    const logRows = (logs ?? []) as HabitLogRow[]

    const localInsights = buildHabitInsights({
      habits: habitRows,
      logs: logRows,
      days: buildHabitHeatmap({
        habits: habitRows,
        logs: logRows,
        startDate,
        endDate,
      }),
    })

    if (!process.env.GEMINI_API_KEY || process.env.NODE_ENV === 'test') {
      return localInsights
    }

    const { callGemini } = await import('@/lib/gemini/client')
    const { text } = await callGemini(
      `Analiza estos datos de hábitos y devuelve un único hint breve en español, sin emojis: ${JSON.stringify(localInsights)}`,
      {
        temperature: 0.2,
        maxOutputTokens: 120,
        systemInstruction: 'Responde solo una frase breve y accionable. No uses markdown.',
      }
    )

    return {
      ...localInsights,
      globalHint: text?.trim() || localInsights.globalHint,
    }
  }),
})
