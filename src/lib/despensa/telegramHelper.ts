import { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/server/logger'
import { sendTelegramMessage } from '@/lib/telegram'

/**
 * Sends a Telegram message to a user by looking up their chat_id from the DB.
 * Fire-and-forget — errors are logged but never block the caller.
 */
export async function sendTelegramToUser(
  userId: string,
  message: string,
  supabase: SupabaseClient
): Promise<void> {
  const { data: user } = await supabase
    .from('users')
    .select('telegram_chat_id')
    .eq('id', userId)
    .single()

  const chatId = user?.telegram_chat_id
  if (!chatId) {
    logger.warn(`[telegramHelper] User ${userId} has no telegram_chat_id`)
    return
  }

  const sent = await sendTelegramMessage(chatId, message, {
    parse_mode: 'Markdown',
  })

  if (!sent) {
    logger.warn(`[telegramHelper] Failed to send notification to user ${userId}`)
  }
}
