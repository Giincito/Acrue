import { Telegraf } from 'telegraf'
import { createClient } from '@supabase/supabase-js'

const botToken = process.env.TELEGRAM_BOT_TOKEN
const webhookDomain = process.env.NEXT_PUBLIC_SITE_URL

if (!botToken) {
  console.warn("TELEGRAM_BOT_TOKEN is missing. Bot won't start.")
}

// Next.js HMR safe global singleton pattern
const globalForTelegram = globalThis as unknown as { telegramBot: Telegraf | null }

if (!globalForTelegram.telegramBot && botToken) {
  const newBot = new Telegraf(botToken)
  globalForTelegram.telegramBot = newBot

  // Bot Commands Setup (Only run once upon instantiation)
  newBot.start(async (ctx) => {
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

  newBot.help((ctx) => {
    ctx.reply('Para operar conmigo debes iniciar la vinculación desde la web app de Acrue.')
  })

  // Start logic based on environment
  if (process.env.NODE_ENV === 'development') {
    newBot.telegram.deleteWebhook().then(() => {
      newBot.launch()
      console.log('🤖 Telegram bot started in long-polling mode (development).')
    }).catch((err) => console.error("Failed to start Telegram polling:", err));
    
    // Enable graceful stop for hot-reloads/shutdowns
    process.once('SIGINT', () => newBot.stop('SIGINT'))
    process.once('SIGTERM', () => newBot.stop('SIGTERM'))
  } else if (webhookDomain) {
    // Setup the webhook path for production
    newBot.telegram.setWebhook(`${webhookDomain}/api/telegram`).catch((err) => console.error("Failed to set webhook:", err))
  }
}

export const bot = globalForTelegram.telegramBot || null
