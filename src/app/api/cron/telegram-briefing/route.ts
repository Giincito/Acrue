import { createClient } from '@supabase/supabase-js'
import { bot } from '@/lib/telegram'

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 })
    }

    if (!bot) {
      return new Response('Bot not configured', { status: 501 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Example logic: Send Morning Briefing (tasks for today)
    const { data: users, error: usersErr } = await supabase
      .from('users')
      .select('id, telegram_chat_id')
      .not('telegram_chat_id', 'is', null)

    if (usersErr) throw usersErr

    let sent = 0

    for (const user of users) {
      // Find today's tasks
      const todayStart = new Date()
      todayStart.setHours(0,0,0,0)
      const todayEnd = new Date()
      todayEnd.setHours(23,59,59,999)

      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'today')
        .is('deleted_at', null)
        .is('completed_at', null) // only pending

      if (tasks && tasks.length > 0) {
        const msg = `🌅 *Resumen de tu Día*\nTienes ${tasks.length} tareas pendientes hoy:\n\n` +
          tasks.map(t => `• ${t.title}`).join('\n')

        try {
          await bot.telegram.sendMessage(user.telegram_chat_id!, msg, { parse_mode: 'Markdown' })
          sent++
        } catch (e) {
          console.error("Failed to send message to user", user.id, e)
        }
      }
    }

    return new Response(JSON.stringify({ success: true, sent }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(error.message, { status: 500 })
  }
}
