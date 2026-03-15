import { Telegraf } from 'telegraf'
import { createClient } from '@supabase/supabase-js'

const botToken = process.env.TELEGRAM_BOT_TOKEN
const webhookDomain = process.env.NEXT_PUBLIC_SITE_URL

if (!botToken) {
  console.warn("TELEGRAM_BOT_TOKEN is missing. Bot won't start.")
}

export const bot = botToken ? new Telegraf(botToken) : null

if (bot && webhookDomain) {
  // Setup the webhook path. 
  bot.telegram.setWebhook(`${webhookDomain}/api/telegram`)
}

// Bot Commands Setup
if (bot) {
  bot.start(async (ctx) => {
    // Expected link syntax: /start link_user_someuuid
    const text = ctx.message.text
    const parts = text.split(" ")
    
    if (parts.length > 1 && parts[1].startsWith("link_user_")) {
      const userId = parts[1].replace("link_user_", "")
      const telegramId = ctx.message.from.id.toString()

      // Save linkage directly to DB
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { error } = await supabase
        .from('users')
        .update({ telegram_chat_id: telegramId })
        .eq('id', userId)

      if (error) {
        ctx.reply("❌ Hubo un error al vincular tu cuenta. Intenta de nuevo desde la app.")
        console.error("Link err", error)
      } else {
        ctx.reply("✅ ¡Cuenta vinculada exitosamente! Recibirás tus notificaciones por aquí.")
      }

    } else {
      ctx.reply("¡Hola! Soy Acrue, tu asistente personal. Ingresa a la app para vincular tu cuenta con este chat.")
    }
  })

  bot.help((ctx) => {
    ctx.reply('Para operar conmigo debes iniciar la vinculación desde la web app de Acrue.')
  })
}
