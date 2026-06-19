import { NextResponse } from 'next/server'
import {
  buildWeeklySummary,
  formatWeeklySummaryTelegram,
} from '@/lib/gemini/briefing'
import { assertCronRequest } from '@/lib/server/cron-auth'
import { createDeliveryCronResponse } from '@/lib/server/delivery-cron-response'
import { logger } from '@/lib/server/logger'
import { sendTelegramMessage } from '@/lib/telegram'
import { createServiceClient } from '@/utils/supabase/service'

type SummaryUser = {
  id: string
  telegram_chat_id: string | number | null
}

export async function GET(req: Request) {
  const authError = assertCronRequest(req)
  if (authError) return authError

  try {
    const supabase = createServiceClient()
    const { data: users, error } = await supabase
      .from('users')
      .select('id, telegram_chat_id')
      .not('telegram_chat_id', 'is', null)

    if (error) throw error

    let sent = 0
    let failed = 0

    for (const user of (users ?? []) as SummaryUser[]) {
      if (!user.telegram_chat_id) continue

      try {
        const summary = await buildWeeklySummary({
          userId: user.id,
          supabase,
        })
        const delivered = await sendTelegramMessage(
          user.telegram_chat_id,
          formatWeeklySummaryTelegram(summary)
        )

        if (delivered) {
          sent++
        } else {
          failed++
        }
      } catch (userError) {
        failed++
        logger.error('[weekly-summary] User summary failed:', userError, { userId: user.id })
      }
    }

    return createDeliveryCronResponse({
      sent,
      failed,
      allFailedError: 'No se pudo enviar ningun resumen semanal.',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno'
    logger.error('[weekly-summary] Unexpected error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
