import { TRPCError } from '@trpc/server'
import { getLevelProgress, getTotalXP } from '@/lib/xp'
import { protectedProcedure, router } from '../trpc'

type XPEventRow = {
  id: string
  source_type: string
  source_id: string | null
  xp_delta: number
  description: string | null
  created_at: string
}

function getWeekStartIso() {
  const now = new Date()
  const weekday = now.getDay() === 0 ? 7 : now.getDay()
  const start = new Date(now)
  start.setDate(now.getDate() - weekday + 1)
  start.setHours(0, 0, 0, 0)
  return start.toISOString()
}

export const xpRouter = router({
  summary: protectedProcedure.query(async ({ ctx }) => {
    const totalXP = await getTotalXP(ctx.supabase, ctx.user.id)
    const weekStart = getWeekStartIso()
    const { data: events, error } = await ctx.supabase
      .from('xp_events')
      .select('id, source_type, source_id, xp_delta, description, created_at')
      .eq('user_id', ctx.user.id)
      .gte('created_at', weekStart)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    const recentEvents = (events ?? []) as XPEventRow[]

    return {
      ...getLevelProgress(totalXP),
      weeklyXP: recentEvents.reduce((sum, event) => sum + Number(event.xp_delta ?? 0), 0),
      recentEvents,
    }
  }),
})
