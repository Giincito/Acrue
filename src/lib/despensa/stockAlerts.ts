import { SupabaseClient } from '@supabase/supabase-js'
import { sendTelegramToUser } from '@/lib/despensa/telegramHelper'
import { logger } from '@/lib/server/logger'

/**
 * Checks if a pantry item has fallen below its minimum stock level.
 * If so, auto-adds to shopping list (if not already present) and sends
 * a one-time Telegram alert.
 *
 * Why one-time: the `low_stock_alerted` flag prevents spamming the user
 * on every quantity change. It resets when stock goes back above min_stock.
 */
export async function handleLowStockCheck(
  supabase: SupabaseClient,
  userId: string,
  itemId: string,
  newQuantity: number,
  minStock: number,
  itemName: string,
  unit: string,
  wasAlreadyAlerted: boolean
): Promise<void> {
  const isLowStock = newQuantity < minStock

  if (isLowStock && !wasAlreadyAlerted) {
    // Auto-add to shopping list if not already there
    const { data: existing } = await supabase
      .from('shopping_list')
      .select('id')
      .eq('user_id', userId)
      .eq('pantry_item_id', itemId)
      .eq('checked', false)
      .limit(1)
      .maybeSingle()

    if (!existing) {
      await supabase.from('shopping_list').insert({
        user_id: userId,
        pantry_item_id: itemId,
        name: itemName,
        quantity: minStock - newQuantity,
        unit,
        auto_generated: true,
        note: `Stock bajo: quedan ${newQuantity} ${unit}`,
      })
    }

    // Mark as alerted to prevent duplicate notifications
    await supabase
      .from('pantry_items')
      .update({ low_stock_alerted: true })
      .eq('id', itemId)
      .eq('user_id', userId)

    // Send Telegram alert (fire-and-forget)
    sendTelegramToUser(
      userId,
      `🛒 Stock bajo: ${itemName} — quedan ${newQuantity} ${unit}`,
      supabase
    ).catch((err) => {
      logger.error('[stockAlerts] Telegram notification failed:', err)
    })
  } else if (!isLowStock && wasAlreadyAlerted) {
    // Reset alert flag when stock recovers
    await supabase
      .from('pantry_items')
      .update({ low_stock_alerted: false })
      .eq('id', itemId)
      .eq('user_id', userId)
  }
}
