import { NextResponse } from 'next/server'
import { sendTelegramMessage } from '@/lib/telegram'

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const chatId = process.env.TELEGRAM_TEST_CHAT_ID

  if (!chatId || !process.env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json(
      { error: 'TELEGRAM_TEST_CHAT_ID o TELEGRAM_BOT_TOKEN no configurado' },
      { status: 500 }
    )
  }

  try {
    const sent = await sendTelegramMessage(chatId, `Acrue: prueba de conexión v5 - ${new Date().toISOString()}`)

    return NextResponse.json({
      success: sent,
      description: sent ? null : 'Telegram no disponible',
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
