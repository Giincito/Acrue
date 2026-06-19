import { createServiceClient } from '@/utils/supabase/service'
import { bot, sendTelegramMessage } from '@/lib/telegram'
import { NextResponse } from 'next/server'
import { assertCronRequest } from '@/lib/server/cron-auth'
import { logger } from '@/lib/server/logger'

interface ExpenseWithCategory {
  amount: number | string
  categories?: {
    name?: string | null
  } | null
}

/**
 * Cron: Spending alerts via Telegram.
 * Runs daily. Compares weekly category spending vs historical average.
 * If spending > 130% of average, sends Telegram alert.
 */
export async function GET(req: Request) {
  try {
    const authError = assertCronRequest(req)
    if (authError) return authError

    const supabase = createServiceClient()

    const { data: users } = await supabase
      .from('users')
      .select('id, telegram_chat_id')
      .not('telegram_chat_id', 'is', null)

    let alertsSent = 0

    for (const user of (users ?? [])) {
      if (!user.telegram_chat_id || !bot) continue

      try {
        const now = new Date()

        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay() + 1)
        const weekStartStr = weekStart.toISOString().split('T')[0]
        const todayStr = now.toISOString().split('T')[0]

        const { data: thisWeek } = await supabase
          .from('expenses')
          .select('amount, categories(name)')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .lt('amount', 0)
          .gte('date', weekStartStr)
          .lte('date', todayStr)

        const fourWeeksAgo = new Date(now)
        fourWeeksAgo.setDate(now.getDate() - 28)
        const fourWeeksStr = fourWeeksAgo.toISOString().split('T')[0]

        const { data: historical } = await supabase
          .from('expenses')
          .select('amount, categories(name)')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .lt('amount', 0)
          .gte('date', fourWeeksStr)
          .lt('date', weekStartStr)

        const thisWeekMap = new Map<string, number>()
        const thisWeekExpenses = (thisWeek ?? []) as ExpenseWithCategory[]
        for (const expense of thisWeekExpenses) {
          const category = expense.categories?.name ?? 'Sin categoría'
          const amount = Math.abs(Number(expense.amount))
          thisWeekMap.set(category, (thisWeekMap.get(category) ?? 0) + amount)
        }

        const historicalMap = new Map<string, number>()
        const historicalExpenses = (historical ?? []) as ExpenseWithCategory[]
        for (const expense of historicalExpenses) {
          const category = expense.categories?.name ?? 'Sin categoría'
          const amount = Math.abs(Number(expense.amount))
          historicalMap.set(category, (historicalMap.get(category) ?? 0) + amount)
        }

        const alerts: string[] = []
        for (const [category, thisWeekTotal] of thisWeekMap) {
          const historicalTotal = historicalMap.get(category) ?? 0
          const weeklyAvg = historicalTotal / 4

          if (weeklyAvg > 0 && thisWeekTotal > weeklyAvg * 1.3) {
            const overBy = Math.round(((thisWeekTotal / weeklyAvg) - 1) * 100)
            alerts.push(
              `- *${category}*: $${thisWeekTotal.toLocaleString('es-AR')} (+${overBy}% vs promedio semanal)`
            )
          }
        }

        if (alerts.length > 0) {
          const sent = await sendTelegramMessage(
            user.telegram_chat_id,
            `*Alerta de gasto excesivo*\n\nEstas categorías están por encima de tu promedio esta semana:\n\n${alerts.join('\n')}`,
            { parse_mode: 'Markdown' }
          )
          if (sent) alertsSent++
        }
      } catch (err) {
        logger.error(`[spending-alerts] Error for user ${user.id}:`, err)
      }
    }

    return NextResponse.json({ success: true, alertsSent })
  } catch (err) {
    logger.error('[spending-alerts] Cron error:', err)
    return NextResponse.json({ success: false, error: 'Internal error' })
  }
}
