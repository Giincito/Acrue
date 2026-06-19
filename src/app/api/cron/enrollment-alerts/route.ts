import { NextResponse } from 'next/server'
import { assertCronRequest } from '@/lib/server/cron-auth'
import { logger } from '@/lib/server/logger'
import { createServiceClient } from '@/utils/supabase/service'
import { bot, sendTelegramMessage } from '@/lib/telegram'

/**
 * Cron job: Daily enrollment alert check.
 * Checks if any subject has enrollment_open_date === today
 * and sends a Telegram notification to the user.
 */
export async function GET(request: Request) {
  const authError = assertCronRequest(request)
  if (authError) return authError

  try {
    if (!bot) {
      return NextResponse.json({ error: 'Telegram bot not configured' }, { status: 500 })
    }

    const supabaseAdmin = createServiceClient()
    const today = new Date().toISOString().split('T')[0]
    
    // Find subjects with enrollment opening today
    const { data: subjects, error } = await supabaseAdmin
      .from('subjects')
      .select('id, name, code, user_id')
      .gte('enrollment_open_date', `${today}T00:00:00Z`)
      .lte('enrollment_open_date', `${today}T23:59:59Z`)

    if (error) {
      logger.error('[CRON:enrollment-alerts] Query error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!subjects || subjects.length === 0) {
      return NextResponse.json({ message: 'No enrollment alerts today', count: 0 })
    }

    // Group by user
    const userSubjects = new Map<string, typeof subjects>()
    for (const s of subjects) {
      const existing = userSubjects.get(s.user_id) || []
      existing.push(s)
      userSubjects.set(s.user_id, existing)
    }

    let sentCount = 0

    for (const [userId, subs] of userSubjects) {
      // Get user's telegram chat id
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('telegram_chat_id')
        .eq('id', userId)
        .single()

      if (!user?.telegram_chat_id) continue

      const subjectList = subs
        .map((s) => `- *${s.name}*${s.code ? ` (${s.code})` : ''}`)
        .join('\n')

      const message = `*Inscripcion abierta hoy*\n\n${subjectList}\n\nInscribite desde el campus cuando puedas.`

      const sent = await sendTelegramMessage(user.telegram_chat_id, message, {
        parse_mode: 'Markdown',
      })
      if (sent) sentCount++
    }

    return NextResponse.json({
      message: `Sent ${sentCount} enrollment alerts`,
      count: sentCount,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error interno'
    logger.error('[CRON:enrollment-alerts] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
