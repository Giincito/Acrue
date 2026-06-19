import { Telegraf } from 'telegraf'
import { createServiceClient } from '@/utils/supabase/service'
import { sendChatMessage } from '@/lib/gemini/chat'
import { executeAiAction } from '@/lib/gemini/actions'
import { analyzeReceipt } from '@/lib/gemini/vision'
import { withFallback } from '@/lib/integrations/resilience'
import { logger } from '@/lib/server/logger'

const botToken = process.env.TELEGRAM_BOT_TOKEN
const webhookDomain = process.env.NEXT_PUBLIC_SITE_URL
const LINK_PREFIX = 'link_user_'
const DEFAULT_CHAT_MODULES = ['tareas', 'calendario', 'finanzas', 'despensa', 'recetas', 'estudio', 'proyectos']

function isExecutableAiAction(action: Record<string, unknown>): action is { type: string; payload: unknown } {
  return typeof action.type === 'string' && 'payload' in action
}

function formatAmount(value: unknown) {
  const amount = Number(value ?? 0)
  return Number.isFinite(amount) ? Math.abs(amount).toLocaleString('es-AR') : '0'
}

type TelegramReplyContext = {
  reply: (message: string) => Promise<{ message_id?: number }>
}

type TelegramChatActionContext = {
  sendChatAction: (action: 'typing') => Promise<unknown>
}

type TelegramEditMessageContext = {
  telegram: {
    editMessageText: (
      chatId: string | number,
      messageId: number,
      inlineMessageId: undefined,
      text: string
    ) => Promise<unknown>
  }
}

type TelegramFileLinkContext = {
  telegram: {
    getFileLink: (fileId: string) => Promise<URL>
  }
}

async function safeTelegramReply(ctx: TelegramReplyContext, message: string) {
  const result = await withFallback(
    async () => ctx.reply(message),
    null as { message_id?: number } | null
  )

  return result.data
}

async function safeTelegramChatAction(ctx: TelegramChatActionContext) {
  await withFallback(
    async () => {
      await ctx.sendChatAction('typing')
      return true
    },
    false
  )
}

async function safeTelegramEditMessageText(
  ctx: TelegramEditMessageContext,
  chatId: string | number,
  messageId: number,
  text: string
) {
  await withFallback(
    async () => {
      await ctx.telegram.editMessageText(chatId, messageId, undefined, text)
      return true
    },
    false
  )
}

async function safeTelegramGetFileLink(ctx: TelegramFileLinkContext, fileId: string) {
  const result = await withFallback(
    async () => ctx.telegram.getFileLink(fileId),
    null as URL | null
  )

  return result.data
}

const globalForTelegram = globalThis as unknown as {
  telegramBot: Telegraf | null
  telegramRuntimeConfigured?: boolean
}

if (!globalForTelegram.telegramBot && botToken) {
  const newBot = new Telegraf(botToken)
  globalForTelegram.telegramBot = newBot

  newBot.start(async (ctx) => {
    const parts = ctx.message.text.split(' ')
    const telegramId = ctx.message.from.id.toString()

    if (parts.length > 1 && parts[1].startsWith(LINK_PREFIX)) {
      const userId = parts[1].replace(LINK_PREFIX, '')
      const supabase = createServiceClient()

      const { error } = await supabase
        .from('users')
        .update({ telegram_chat_id: telegramId })
        .eq('id', userId)

      if (error) {
        await safeTelegramReply(ctx, 'No pude vincular tu cuenta. Intentá de nuevo desde la app.')
        return
      }

      await safeTelegramReply(ctx, 'Cuenta vinculada. Vas a recibir tus notificaciones por este chat.')
      return
    }

    await safeTelegramReply(ctx, `Hola. Soy Acrue, tu asistente personal.\n\nTu ID de Telegram es: ${telegramId}\n\nIngresá a la app para vincular tu cuenta con este chat.`)
  })

  newBot.help((ctx) => {
    void safeTelegramReply(ctx, 'Podés pedirme que agende tareas, registre gastos o revise qué tenés pendiente para hoy.')
  })

  newBot.on('text', async (ctx) => {
    const text = ctx.message.text
    const chatId = ctx.message.chat.id.toString()
    const supabase = createServiceClient()

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('telegram_chat_id', chatId)
      .single()

    if (userError || !userData) {
      await safeTelegramReply(ctx, 'No reconozco este chat. Vinculá tu cuenta desde la app y volvé a intentar.')
      return
    }

    await safeTelegramChatAction(ctx)

    try {
      const { reply, action } = await sendChatMessage(
        userData.id,
        text,
        [],
        DEFAULT_CHAT_MODULES,
        supabase
      )

      if (!action) {
        await safeTelegramReply(ctx, reply)
        return
      }

      if (!isExecutableAiAction(action)) {
        await safeTelegramReply(ctx, reply)
        return
      }

      const result = await executeAiAction(userData.id, action, supabase)
      const finalReply = result.success
        ? [reply, result.message].filter(Boolean).join('\n\n')
        : `No pude completar la acción. ${result.message}`

      await safeTelegramReply(ctx, finalReply)
    } catch (error) {
      logger.error('[telegram] AI processing error:', error)
      await safeTelegramReply(ctx, 'Tuve un problema procesando tu mensaje. Probá de nuevo en unos segundos.')
    }
  })

  newBot.on('photo', async (ctx) => {
    const chatId = ctx.message.chat.id.toString()
    const supabase = createServiceClient()

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('telegram_chat_id', chatId)
      .single()

    if (userError || !userData) {
      await safeTelegramReply(ctx, 'No reconozco este chat. Vinculá tu cuenta desde la app y volvé a intentar.')
      return
    }

    const thinkingMsg = await safeTelegramReply(ctx, 'Analizando ticket...')
    if (typeof thinkingMsg?.message_id !== 'number') {
      return
    }

    try {
      const photo = ctx.message.photo.slice(-1)[0]
      if (!photo) {
        throw new Error('No photo found')
      }

      const fileLink = await safeTelegramGetFileLink(ctx, photo.file_id)
      if (!fileLink) {
        throw new Error('Failed to resolve Telegram photo link')
      }

      const photoResult = await withFallback<ArrayBuffer | null>(
        async () => {
          const response = await fetch(fileLink.toString(), {
            signal: AbortSignal.timeout(10000),
          })
          if (!response.ok) {
            throw new Error(`Telegram photo fetch failed: HTTP ${response.status}`)
          }

          return response.arrayBuffer()
        },
        null
      )

      if (!photoResult.data) {
        throw new Error(photoResult.error ?? 'Failed to fetch photo from Telegram')
      }

      const buffer = photoResult.data
      const base64 = Buffer.from(buffer).toString('base64')
      const receiptData = await analyzeReceipt(base64, 'image/jpeg')

      if (!receiptData) {
        await safeTelegramEditMessageText(ctx, chatId, thinkingMsg.message_id, 'No pude extraer información clara del ticket. Intentá con una foto más nítida.')
        return
      }

      const amount = Number(receiptData.monto ?? 0)
      if (!Number.isFinite(amount) || amount <= 0) {
        await safeTelegramEditMessageText(ctx, chatId, thinkingMsg.message_id, 'No pude detectar un monto válido en el ticket.')
        return
      }

      const result = await executeAiAction(
        userData.id,
        {
          type: 'create_expense',
          payload: {
            description: receiptData.comercio ?? 'Ticket escaneado',
            amount,
            date: receiptData.fecha ?? new Date().toISOString().split('T')[0],
            suggested_category: 'Supermercado',
          },
        },
        supabase
      )

      if (!result.success) {
        await safeTelegramEditMessageText(ctx, chatId, thinkingMsg.message_id, result.message)
        return
      }

      await safeTelegramEditMessageText(
        ctx,
        chatId,
        thinkingMsg.message_id,
        `Gasto registrado\n\nComercio: ${receiptData.comercio ?? 'Ticket escaneado'}\nMonto: $${formatAmount(receiptData.monto)}\nFecha: ${receiptData.fecha ?? 'sin fecha'}`
      )
    } catch (error) {
      logger.error('[telegram] Vision error:', error)
      await safeTelegramEditMessageText(ctx, chatId, thinkingMsg.message_id, 'Hubo un error procesando la imagen del ticket.')
    }
  })

}

export const bot = globalForTelegram.telegramBot || null

type TelegramSendMessageOptions = Parameters<NonNullable<typeof bot>['telegram']['sendMessage']>[2]

export async function sendTelegramMessage(
  chatId: string | number,
  message: string,
  options?: TelegramSendMessageOptions
): Promise<boolean> {
  if (!bot) {
    logger.warn('[telegram] Telegram bot not configured, skipping sendMessage')
    return false
  }

  const result = await withFallback(
    async () => {
      await bot.telegram.sendMessage(chatId, message, options)
      return true
    },
    false
  )

  return result.data
}

export async function configureTelegramRuntime() {
  if (globalForTelegram.telegramRuntimeConfigured) {
    return { configured: true, reason: 'already-configured' }
  }

  if (!bot) {
    return { configured: false, reason: 'missing-token' }
  }

  if (process.env.NODE_ENV === 'development') {
    if (process.env.TELEGRAM_ENABLE_DEV_POLLING !== 'true') {
      return { configured: false, reason: 'dev-polling-disabled' }
    }

    const webhookResult = await withFallback(
      async () => {
        await bot.telegram.deleteWebhook()
        return true
      },
      false
    )

    if (!webhookResult.data) {
      return { configured: false, reason: 'development-polling-unavailable' }
    }

    const pollingResult = await withFallback(
      async () => {
        await bot.launch()
        return true
      },
      false
    )

    if (!pollingResult.data) {
      return { configured: false, reason: 'development-polling-unavailable' }
    }

    process.once('SIGINT', () => bot.stop('SIGINT'))
    process.once('SIGTERM', () => bot.stop('SIGTERM'))
    globalForTelegram.telegramRuntimeConfigured = true

    return { configured: true, reason: 'development-polling' }
  }

  if (!webhookDomain) {
    return { configured: false, reason: 'missing-webhook-domain' }
  }

  const webhookResult = await withFallback(
    async () => {
      await bot.telegram.setWebhook(`${webhookDomain}/api/telegram`)
      return true
    },
    false
  )

  if (!webhookResult.data) {
    return { configured: false, reason: 'webhook-unavailable' }
  }

  globalForTelegram.telegramRuntimeConfigured = true

  return { configured: true, reason: 'webhook' }
}
