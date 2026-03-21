import { createClient } from '@supabase/supabase-js'
import { bot } from '@/lib/telegram'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 })
    }

    if (!bot) {
      return new Response('Telegram bot not configured', { status: 500 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    // Fetch all users that have a telegram_chat_id in their settings
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, settings')
      .not('settings', 'is', null)

    if (usersError) throw usersError

    let sentCount = 0

    const todayDate = new Date()
    todayDate.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(todayDate)
    endOfDay.setHours(23, 59, 59, 999)

    for (const user of users) {
      const chatId = user.settings?.telegram_chat_id
      if (!chatId) continue

      // Fetch pending tasks for today
      const { data: tasks, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'completed')
        .neq('status', 'trash')
        .not('due_at', 'is', null)
        .lte('due_at', endOfDay.toISOString())

      if (taskError) {
        console.error(`Failed to fetch tasks for user ${user.id}`, taskError)
        continue
      }

      const count = tasks.length
      
      let message = `🌅 *Good morning, Acrue!* \n\n`
      message += `Hoy es ${format(todayDate, "EEEE d 'de' MMMM", { locale: es })}.\n`
      
      if (count === 0) {
        message += `\n¡Día libre! No tienes tareas venciendo hoy. 🎉`
      } else {
        message += `\nTienes *${count}* tarea${count > 1 ? 's' : ''} para hoy:\n`
        tasks.slice(0, 5).forEach((t: any) => {
          message += `• ${t.title}\n`
        })
        if (count > 5) {
          message += `... y ${count - 5} más.`
        }
      }

      try {
        await bot.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' })
        sentCount++
      } catch (err) {
        console.error(`Failed to send telegram msg to ${chatId}`, err)
      }
    }

    return new Response(JSON.stringify({ success: true, sent: sentCount }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(error.message, { status: 500 })
  }
}
