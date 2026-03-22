import { NextResponse } from 'next/server'
import { bot } from '@/lib/telegram'
import { detectIntent } from '@/lib/gemini/router'
import { createClient } from '@/utils/supabase/server'

const CONFIDENCE_THRESHOLD = 0.90

/**
 * Handles Telegram photo messages by forwarding to the vision endpoint.
 */
async function handlePhoto(chatId: number, fileId: string, userId: string) {
  if (!bot) return

  // Get file URL from Telegram
  const file = await bot.telegram.getFile(fileId)
  const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`

  // Fetch the image from Telegram servers
  const imgResponse = await fetch(fileUrl)
  const buffer = await imgResponse.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const mimeType = file.file_path?.endsWith('.png') ? 'image/png' : 'image/jpeg'

  // Call vision endpoint internally
  const visionResponse = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://acrue-app.vercel.app'}/api/ai/vision`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64, mimeType }),
    }
  )

  const visionData = await visionResponse.json()

  if (visionData.success && visionData.data) {
    const d = visionData.data
    await bot.telegram.sendMessage(
      chatId,
      `✅ *Ticket escaneado exitosamente*\n\n🏪 *Comercio:* ${d.comercio ?? 'Desconocido'}\n💰 *Monto:* $${Math.abs(d.monto ?? 0).toLocaleString('es-AR')}\n📅 *Fecha:* ${d.fecha ?? 'Sin fecha'}\n💳 *Método:* ${d.metodo_pago ?? 'No especificado'}\n\nEl gasto fue registrado en Finanzas.`,
      { parse_mode: 'Markdown' }
    )
  } else {
    await bot.telegram.sendMessage(
      chatId,
      '❌ No pude leer el ticket. Intentá con una foto más clara y con buena iluminación.'
    )
  }
}

export async function POST(req: Request) {
  try {
    if (!bot) {
      return new Response('Telegram bot not configured', { status: 500 })
    }

    const body = await req.json()

    // ── Extract message and chat context ─────────────────────────────────
    const message = body?.message
    const chatId: number | undefined = message?.chat?.id
    const telegramUserId = message?.from?.id?.toString()

    if (!chatId || !message) {
      // Let Telegraf handle system updates (edited messages, inline queries, etc.)
      await bot.handleUpdate(body)
      return new Response('OK', { status: 200 })
    }

    // ── Photo message → Vision ────────────────────────────────────────────
    if (message.photo && message.photo.length > 0) {
      const largestPhoto = message.photo[message.photo.length - 1]

      // Find user by telegram_chat_id
      const supabase = await createClient()
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_chat_id', chatId.toString())
        .single()

      if (!userData) {
        await bot.telegram.sendMessage(chatId, '⚠️ No encontré tu cuenta vinculada. Vinculá tu cuenta desde Ajustes en la app.')
        return new Response('OK', { status: 200 })
      }

      await bot.telegram.sendMessage(chatId, '🔍 Analizando el ticket...')
      await handlePhoto(chatId, largestPhoto.file_id, userData.id)
      return new Response('OK', { status: 200 })
    }

    // ── Text message → Intent Router ──────────────────────────────────────
    const text = message.text as string | undefined
    if (!text) {
      await bot.handleUpdate(body)
      return new Response('OK', { status: 200 })
    }

    // Let Telegraf handle commands (/start, /help, etc.)
    if (text.startsWith('/')) {
      await bot.handleUpdate(body)
      return new Response('OK', { status: 200 })
    }

    // Find linked user
    const supabase = await createClient()
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_chat_id', chatId.toString())
      .single()

    if (!userData) {
      await bot.telegram.sendMessage(
        chatId,
        '⚠️ No encontré tu cuenta vinculada. Abrí Acrue → Ajustes → Telegram para vincular tu cuenta.'
      )
      return new Response('OK', { status: 200 })
    }

    // Detect intent
    const result = await detectIntent(text)

    if (!result) {
      await bot.telegram.sendMessage(
        chatId,
        '❌ La IA no está disponible en este momento. Podés registrar el dato directamente en la app.'
      )
      return new Response('OK', { status: 200 })
    }

    const { intent, confidence, payload } = result

    if (confidence <= CONFIDENCE_THRESHOLD || intent === 'desconocido') {
      // Low confidence: ask for confirmation with inline keyboard
      const previewText = Object.entries(payload)
        .map(([k, v]) => `• *${k}:* ${v}`)
        .join('\n')

      await bot.telegram.sendMessage(
        chatId,
        `🤔 *¿Es esto lo que querés registrar?*\n\n${previewText}`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Confirmar', callback_data: `confirm:${JSON.stringify({ intent, payload })}` },
              { text: '❌ Cancelar', callback_data: 'cancel' },
            ]],
          },
        }
      )
      return new Response('OK', { status: 200 })
    }

    // High confidence: insert directly into Supabase
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://acrue-app.vercel.app'}/api/ai/router`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Pass userId via a trusted internal header since this is a server-to-server call
          'x-acrue-user-id': userData.id,
        },
        body: JSON.stringify({ text }),
      }
    )

    const data = await res.json()

    if (data.executed) {
      await bot.telegram.sendMessage(chatId, `✅ ${data.message}`)
    } else {
      await bot.telegram.sendMessage(chatId, `❌ ${data.message}`)
    }

    return new Response('OK', { status: 200 })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return new Response(error.message, { status: 500 })
  }
}
