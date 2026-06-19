import { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/server/logger'

interface SuggestedRecipe {
  id: string
  name: string
  calories: number | null
  diet_tags: string[]
  is_favorite: boolean
  image_url: string | null
  missingIngredients: { name: string; needed: number; available: number; unit: string }[]
}

interface SuggesterResult {
  /** Recipes where ALL ingredients are available in sufficient quantity */
  possible: SuggestedRecipe[]
  /** Recipes missing 1-2 ingredients */
  almostPossible: SuggestedRecipe[]
}

/**
 * Calculates which recipes the user can make now and which are close.
 * Pure algorithmic approach — no AI calls involved.
 *
 * Algorithm:
 * 1. Fetch all user recipes with ingredients
 * 2. Fetch current pantry quantities
 * 3. For each recipe, check ingredient availability
 * 4. Categorize into "possible" and "almost possible" (missing <= 2 ingredients)
 */
export async function getSuggestedRecipes(
  userId: string,
  supabase: SupabaseClient
): Promise<SuggesterResult> {
  // Fetch all recipes with their ingredients
  const { data: recipes, error: recipesErr } = await supabase
    .from('recipes')
    .select(`
      id, name, calories, diet_tags, is_favorite, image_url,
      recipe_ingredients(*)
    `)
    .eq('user_id', userId)

  if (recipesErr || !recipes) {
    logger.error('[suggester] Failed to fetch recipes:', recipesErr)
    return { possible: [], almostPossible: [] }
  }

  // Fetch pantry inventory as a lookup map
  const { data: pantryItems, error: pantryErr } = await supabase
    .from('pantry_items')
    .select('id, name, quantity, unit')
    .eq('user_id', userId)

  if (pantryErr || !pantryItems) {
    logger.error('[suggester] Failed to fetch pantry:', pantryErr)
    return { possible: [], almostPossible: [] }
  }

  const pantryMap = new Map(
    pantryItems.map((item) => [item.id, { name: item.name, quantity: Number(item.quantity), unit: item.unit }])
  )

  const possible: SuggestedRecipe[] = []
  const almostPossible: SuggestedRecipe[] = []

  for (const recipe of recipes) {
    const ingredients = (recipe.recipe_ingredients || []) as {
      id: string
      pantry_item_id: string
      quantity: number
      unit: string
      is_optional?: boolean | null
    }[]

    // Skip recipes with no ingredients — they can always be "made"
    if (ingredients.length === 0) continue

    const requiredIngredients = ingredients.filter((ingredient) => !ingredient.is_optional)
    const missing: SuggestedRecipe['missingIngredients'] = []

    for (const ing of requiredIngredients) {
      const pantryItem = pantryMap.get(ing.pantry_item_id)
      const available = pantryItem?.quantity ?? 0
      const needed = Number(ing.quantity)

      if (available < needed) {
        missing.push({
          name: pantryItem?.name ?? 'Desconocido',
          needed,
          available,
          unit: ing.unit,
        })
      }
    }

    const suggestion: SuggestedRecipe = {
      id: recipe.id,
      name: recipe.name,
      calories: recipe.calories,
      diet_tags: recipe.diet_tags || [],
      is_favorite: recipe.is_favorite,
      image_url: recipe.image_url,
      missingIngredients: missing,
    }

    if (missing.length === 0) {
      possible.push(suggestion)
    } else if (missing.length <= 2) {
      almostPossible.push(suggestion)
    }
    // Recipes missing 3+ ingredients are not shown
  }

  return { possible, almostPossible }
}
