import { bot } from '@/lib/telegram'

export async function POST(req: Request) {
  if (!bot) {
    return new Response('Telegram bot not configured', { status: 501 })
  }

  try {
    const body = await req.json()
    // Let Telegraf handle the webhook payload
    await bot.handleUpdate(body)
    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('Error handling telegram webhook', err)
    return new Response('Error', { status: 500 })
  }
}
