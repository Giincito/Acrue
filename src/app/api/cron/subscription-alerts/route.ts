import { createServiceClient } from '@/utils/supabase/service'
import { bot, sendTelegramMessage } from '@/lib/telegram'
import { NextResponse } from 'next/server'
import { assertCronRequest } from '@/lib/server/cron-auth'
import { logger } from '@/lib/server/logger'

interface SubscriptionAlertRow {
  name: string
  amount: number
  currency: string
  users?: {
    telegram_chat_id?: string | null
  } | null
}

/**
 * Cron: Subscription renewal alerts via Telegram.
 * Runs daily at 9:00 AM Argentina time (12:00 UTC).
 * Sends alerts for subscriptions renewing in 7 days and 1 day.
 */
export async function GET(req: Request) {
  try {
    const authError = assertCronRequest(req)
    if (authError) return authError

    const supabase = createServiceClient()

    // Get today's date in YYYY-MM-DD format
    const today = new Date()
    const formatDate = (d: Date) => d.toISOString().split('T')[0]

    // Calculate target dates
    const in7Days = new Date(today)
    in7Days.setDate(today.getDate() + 7)
    const in1Day = new Date(today)
    in1Day.setDate(today.getDate() + 1)

    const date7 = formatDate(in7Days)
    const date1 = formatDate(in1Day)

    // Query subscriptions renewing in 7 days
    const { data: subs7 } = await supabase
      .from('subscriptions')
      .select('*, users!inner(telegram_chat_id)')
      .eq('active', true)
      .eq('renewal_date', date7)

    // Query subscriptions renewing in 1 day
    const { data: subs1 } = await supabase
      .from('subscriptions')
      .select('*, users!inner(telegram_chat_id)')
      .eq('active', true)
      .eq('renewal_date', date1)

    let sentCount = 0
    const subs7List = (subs7 ?? []) as SubscriptionAlertRow[]
    const subs1List = (subs1 ?? []) as SubscriptionAlertRow[]

    // Send 7-day alerts
    for (const sub of subs7List) {
      const chatId = sub.users?.telegram_chat_id
      if (!chatId || !bot) continue

      try {
        const sent = await sendTelegramMessage(
          chatId,
          `Tu suscripción a *${sub.name}* vence en 7 días - $${sub.amount.toLocaleString('es-AR')} ${sub.currency}`,
          { parse_mode: 'Markdown' }
        )
        if (sent) sentCount++
      } catch (err) {
        logger.error(`[subscription-alerts] Failed to send 7d alert for ${sub.name}:`, err)
      }
    }

    // Send 1-day alerts
    for (const sub of subs1List) {
      const chatId = sub.users?.telegram_chat_id
      if (!chatId || !bot) continue

      try {
        const sent = await sendTelegramMessage(
          chatId,
          `Tu suscripción a *${sub.name}* vence *mañana* - $${sub.amount.toLocaleString('es-AR')} ${sub.currency}`,
          { parse_mode: 'Markdown' }
        )
        if (sent) sentCount++
      } catch (err) {
        logger.error(`[subscription-alerts] Failed to send 1d alert for ${sub.name}:`, err)
      }
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      subs7: subs7?.length ?? 0,
      subs1: subs1?.length ?? 0,
    })
  } catch (err) {
    logger.error('[subscription-alerts] Cron error:', err)
    // Return 200 to prevent Vercel retries
    return NextResponse.json({ success: false, error: 'Internal error' })
  }
}
