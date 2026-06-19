import { NextResponse } from 'next/server'
import { assertCronRequest } from '@/lib/server/cron-auth'
import { logger } from '@/lib/server/logger'
import { bot, sendTelegramMessage } from '@/lib/telegram'
import { createServiceClient } from '@/utils/supabase/service'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const authError = assertCronRequest(req)
    if (authError) return authError

    if (!bot) {
      return NextResponse.json({ error: 'Telegram bot not configured' }, { status: 500 })
    }

    const supabase = createServiceClient()

    // Calculate the date 30 days ago
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const cutoffDate = thirtyDaysAgo.toISOString()

    const { data: debts, error: debtsError } = await supabase
      .from('debts')
      .select('*')
      .in('status', ['pending', 'partial'])
      .lt('created_at', cutoffDate)
      .is('deleted_at', null)

    if (debtsError) {
      logger.error('Error fetching debts:', debtsError)
      return NextResponse.json({ error: 'Database error fetching debts' }, { status: 500 })
    }

    if (!debts || debts.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: 'No old debts found' })
    }

    const processedUsers = new Set<string>()
    let sentCount = 0

    for (const debt of debts) {
        if (!processedUsers.has(debt.user_id)) {
            processedUsers.add(debt.user_id)

            const { data: userRecord } = await supabase
                .from('users')
                .select('telegram_chat_id')
                .eq('id', debt.user_id)
                .single()
                
            const telegramChatId = userRecord?.telegram_chat_id

            if (telegramChatId) {
                // Find all old debts for this user
                const userOldDebts = debts.filter(d => d.user_id === debt.user_id)
                
                let message = `<b>Recordatorio de deudas pendientes</b>\n\n`
                message += `Tenés ${userOldDebts.length} deudas registradas hace más de 30 días:\n\n`
                
                for (const ud of userOldDebts) {
                    const remaining = ud.total_amount - ud.paid_amount
                    if (ud.type === 'owed_to_me') {
                        message += `• <b>${ud.person}</b> te debe $${remaining.toLocaleString('es-AR')} <i>(${ud.name})</i>\n`
                    } else {
                        message += `• Le debés $${remaining.toLocaleString('es-AR')} a <b>${ud.person}</b> <i>(${ud.name})</i>\n`
                    }
                }
                
                message += `\n<i>Podés saldarlas desde la sección Finanzas de Acrue.</i>`
                
                if (await sendTelegramMessage(telegramChatId, message, { parse_mode: 'HTML' })) {
                    sentCount++
                }
            }
        }
    }

    return NextResponse.json({ success: true, count: sentCount })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno'
    logger.error('Unhandled cron error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
