import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { addXP } from '@/lib/xp'
import { buildFocusSettings, getFocusSuggestion } from '@/lib/focus/pomodoro'
import { protectedProcedure, router } from '../trpc'

const focusModeSchema = z.enum(['pomodoro', 'custom'])

const focusSettingsSchema = z.object({
  spotifyPlaylistUrl: z.string().max(300).optional().nullable(),
  workMinutes: z.number().int().min(1).max(60).optional(),
  breakMinutes: z.number().int().min(1).max(60).optional(),
})

type UserSettings = {
  focus?: {
    spotifyPlaylistUrl?: string | null
    workMinutes?: number
    breakMinutes?: number
  }
}

function getFocusSettingsFromUserSettings(settings: unknown) {
  const parsed = settings && typeof settings === 'object' ? settings as UserSettings : {}

  return {
    spotifyPlaylistUrl: parsed.focus?.spotifyPlaylistUrl ?? '',
    workMinutes: parsed.focus?.workMinutes ?? 25,
    breakMinutes: parsed.focus?.breakMinutes ?? 5,
  }
}

async function readUserSettings(ctx: { supabase: { from: (table: 'users') => unknown }; user: { id: string } }) {
  const { data, error } = await (ctx.supabase.from('users') as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: { settings: unknown } | null; error: { message: string } | null }>
      }
    }
  })
    .select('settings')
    .eq('id', ctx.user.id)
    .maybeSingle()

  if (error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
  }

  return data?.settings ?? {}
}

export const focusRouter = router({
  settings: protectedProcedure.query(async ({ ctx }) => {
    const settings = await readUserSettings(ctx)
    return getFocusSettingsFromUserSettings(settings)
  }),

  saveSettings: protectedProcedure
    .input(focusSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const currentSettings = await readUserSettings(ctx)
      const settingsObject = currentSettings && typeof currentSettings === 'object'
        ? currentSettings as UserSettings
        : {}
      const nextSettings = {
        ...settingsObject,
        focus: {
          ...(settingsObject.focus ?? {}),
          ...input,
        },
      }

      const { error } = await ctx.supabase
        .from('users')
        .update({ settings: nextSettings })
        .eq('id', ctx.user.id)

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return getFocusSettingsFromUserSettings(nextSettings)
    }),

  pendingTasks: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('tasks')
      .select('id, title, priority, due_at')
      .eq('user_id', ctx.user.id)
      .is('deleted_at', null)
      .neq('status', 'completed')
      .neq('status', 'trash')
      .order('due_at', { ascending: true })
      .limit(30)

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    return data ?? []
  }),

  todaySummary: protectedProcedure
    .input(z.object({
      dayStart: z.string().datetime(),
      dayEnd: z.string().datetime(),
    }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('focus_sessions')
        .select('id, task_id, mode, work_minutes, break_minutes, completed_at')
        .eq('user_id', ctx.user.id)
        .gte('completed_at', input.dayStart)
        .lte('completed_at', input.dayEnd)
        .order('completed_at', { ascending: false })

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return {
        completedSessions: data?.length ?? 0,
        sessions: data ?? [],
      }
    }),

  suggestion: protectedProcedure
    .input(z.object({
      now: z.string().datetime().optional(),
      dayStart: z.string().datetime(),
      dayEnd: z.string().datetime(),
    }))
    .query(async ({ ctx, input }) => {
      const [{ data: tasks, error: taskError }, { data: sessions, error: sessionError }] = await Promise.all([
        ctx.supabase
          .from('tasks')
          .select('title, priority, due_at')
          .eq('user_id', ctx.user.id)
          .is('deleted_at', null)
          .neq('status', 'completed')
          .neq('status', 'trash')
          .limit(20),
        ctx.supabase
          .from('focus_sessions')
          .select('id')
          .eq('user_id', ctx.user.id)
          .gte('completed_at', input.dayStart)
          .lte('completed_at', input.dayEnd),
      ])

      if (taskError || sessionError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: taskError?.message ?? sessionError?.message ?? 'No se pudo calcular la sugerencia.',
        })
      }

      return getFocusSuggestion({
        now: input.now ? new Date(input.now) : new Date(),
        tasks: tasks ?? [],
        completedFocusSessionsToday: sessions?.length ?? 0,
      })
    }),

  completeSession: protectedProcedure
    .input(z.object({
      taskId: z.string().uuid().optional().nullable(),
      mode: focusModeSchema,
      workMinutes: z.number().int().min(1).max(60),
      breakMinutes: z.number().int().min(1).max(60),
      completedAt: z.string().datetime().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const settings = buildFocusSettings({
        mode: input.mode,
        workMinutes: input.workMinutes,
        breakMinutes: input.breakMinutes,
      })

      const { data, error } = await ctx.supabase
        .from('focus_sessions')
        .insert({
          user_id: ctx.user.id,
          task_id: input.taskId ?? null,
          mode: settings.mode,
          work_minutes: settings.workMinutes,
          break_minutes: settings.breakMinutes,
          completed_at: input.completedAt ?? new Date().toISOString(),
        })
        .select()
        .single()

      if (error || !data) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message ?? 'No se pudo registrar la sesion.',
        })
      }

      await addXP(ctx.supabase, ctx.user.id, 'foco', data.id, 5, 'Sesion de foco completada')

      return data
    }),
})
