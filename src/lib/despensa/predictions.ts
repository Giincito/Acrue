import { SupabaseClient } from '@supabase/supabase-js'

interface StockoutPrediction {
  itemId: string
  itemName: string
  unit: string
  currentQuantity: number
  avgDailyConsumption: number
  daysRemaining: number
}

/**
 * Predicts when pantry items will run out based on meal_log consumption
 * from the last 30 days.
 *
 * Algorithm:
 * 1. Fetch all meal_log entries from last 30 days that reference recipes
 * 2. For each recipe cooked, sum up ingredient usage
 * 3. Calculate average daily consumption per ingredient
 * 4. Project: current_quantity / avg_daily_consumption = days_remaining
 * 5. Return items depleting within the specified threshold
 */
export async function predictStockout(
  userId: string,
  supabase: SupabaseClient,
  thresholdDays: number = 3
): Promise<StockoutPrediction[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Fetch meals from last 30 days that have a recipe_id
  const { data: meals, error: mealsErr } = await supabase
    .from('meal_log')
    .select('recipe_id, logged_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .not('recipe_id', 'is', null)
    .gte('logged_at', thirtyDaysAgo)

  if (mealsErr || !meals?.length) {
    return []
  }

  // Collect recipe IDs and how many times each was cooked
  const recipeCounts = new Map<string, number>()
  for (const meal of meals) {
    if (meal.recipe_id) {
      recipeCounts.set(meal.recipe_id, (recipeCounts.get(meal.recipe_id) ?? 0) + 1)
    }
  }

  if (recipeCounts.size === 0) return []

  // Fetch recipe ingredients for all cooked recipes
  const { data: ingredients, error: ingErr } = await supabase
    .from('recipe_ingredients')
    .select('recipe_id, pantry_item_id, quantity, unit')
    .in('recipe_id', Array.from(recipeCounts.keys()))

  if (ingErr || !ingredients?.length) return []

  // Calculate total consumption per pantry item over 30 days
  const consumptionMap = new Map<string, number>()
  for (const ing of ingredients) {
    const timesCookedRecipe = recipeCounts.get(ing.recipe_id) ?? 0
    const totalUsed = Number(ing.quantity) * timesCookedRecipe
    consumptionMap.set(
      ing.pantry_item_id,
      (consumptionMap.get(ing.pantry_item_id) ?? 0) + totalUsed
    )
  }

  // Fetch current pantry state for the items with consumption data
  const pantryItemIds = Array.from(consumptionMap.keys())
  if (pantryItemIds.length === 0) return []

  const { data: pantryItems, error: pantryErr } = await supabase
    .from('pantry_items')
    .select('id, name, quantity, unit')
    .eq('user_id', userId)
    .in('id', pantryItemIds)

  if (pantryErr || !pantryItems) return []

  const predictions: StockoutPrediction[] = []
  const daysInPeriod = 30

  for (const item of pantryItems) {
    const totalConsumed = consumptionMap.get(item.id) ?? 0
    const avgDaily = totalConsumed / daysInPeriod
    if (avgDaily <= 0) continue

    const currentQty = Number(item.quantity)
    const daysRemaining = currentQty / avgDaily

    if (daysRemaining <= thresholdDays) {
      predictions.push({
        itemId: item.id,
        itemName: item.name,
        unit: item.unit,
        currentQuantity: currentQty,
        avgDailyConsumption: Math.round(avgDaily * 100) / 100,
        daysRemaining: Math.round(daysRemaining * 10) / 10,
      })
    }
  }

  // Sort by most urgent first
  predictions.sort((a, b) => a.daysRemaining - b.daysRemaining)

  return predictions
}
