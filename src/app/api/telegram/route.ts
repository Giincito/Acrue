import { bot } from '@/lib/telegram'

export async function POST(req: Request) {
  try {
    if (!bot) {
      return new Response('Telegram bot not configured', { status: 500 })
    }

    const body = await req.json()
    await bot.handleUpdate(body)
    return new Response('OK', { status: 200 })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return new Response(error.message, { status: 500 })
  }
}
