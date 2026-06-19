import { bot } from '@/lib/telegram'
import { logger } from '@/lib/server/logger'

export async function POST(req: Request) {
  try {
    if (!bot) {
      return new Response('Telegram bot not configured', { status: 500 })
    }

    const update = await req.json()
    await bot.handleUpdate(update)

    return new Response('OK', { status: 200 })
  } catch (error) {
    logger.error('[api/telegram] Webhook error:', error)
    return new Response('Error interno', { status: 500 })
  }
}
