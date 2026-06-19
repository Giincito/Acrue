import { NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/service'
import { predictStockout } from '@/lib/despensa/predictions'
import { sendTelegramToUser } from '@/lib/despensa/telegramHelper'
import { assertCronRequest } from '@/lib/server/cron-auth'
import { logger } from '@/lib/server/logger'

/**
 * GET /api/cron/pantry-prediction
 * Daily cron job that predicts stock depletion for all users.
 * Items depleting in < 3 days are auto-added to shopping_list
 * with Telegram alerts sent to the user.
 *
 * Graceful degradation: if prediction fails for a user, log and continue.
 */
export async function GET(request: Request) {
  const authError = assertCronRequest(request)
  if (authError) return authError

  const supabase = createServiceClient()

  // Fetch all users with a telegram_chat_id (for notifications)
  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('id')

  if (usersErr || !users?.length) {
    return NextResponse.json({ message: 'No users found', processed: 0 })
  }

  let processed = 0
  let alerts = 0

  for (const user of users) {
    try {
      const predictions = await predictStockout(user.id, supabase, 3)

      for (const pred of predictions) {
        // Check if already in shopping list
        const { data: existing } = await supabase
          .from('shopping_list')
          .select('id')
          .eq('user_id', user.id)
          .eq('pantry_item_id', pred.itemId)
          .eq('checked', false)
          .maybeSingle()

        if (!existing) {
          // Auto-add to shopping list
          await supabase.from('shopping_list').insert({
            user_id: user.id,
            pantry_item_id: pred.itemId,
            name: pred.itemName,
            quantity: Math.ceil(pred.avgDailyConsumption * 7), // Enough for a week
            unit: pred.unit,
            auto_generated: true,
            note: `Predicción: se agota en ~${pred.daysRemaining} días`,
          })

          // Send Telegram alert
          await sendTelegramToUser(
            user.id,
            `Predicción de stock\n\n*${pred.itemName}* se agotará en ~${pred.daysRemaining} días. Quedan ${pred.currentQuantity} ${pred.unit}.\nSe agregó automáticamente a tu lista de compras.`,
            supabase
          ).catch((error) => logger.error('Unhandled async error', error))

          alerts++
        }
      }

      processed++
    } catch (err) {
      logger.error(`[pantry-prediction] Error for user ${user.id}:`, err)
      // Continue processing other users — graceful degradation
    }
  }

  return NextResponse.json({
    message: 'Pantry prediction cron completed',
    processed,
    alerts,
  })
}
