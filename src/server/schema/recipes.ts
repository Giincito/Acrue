import { z } from 'zod'

// ─── Recipes ────────────────────────────────────────────────────────

const DietTagEnum = z.enum(['vegetariano', 'vegano', 'sin_gluten', 'omnivoro'])
const MealTypeEnum = z.enum(['desayuno', 'almuerzo', 'merienda', 'cena', 'snack'])

export const RecipeIngredientInput = z.object({
  pantry_item_id: z.string().uuid(),
  quantity: z.number().min(0),
  unit: z.string().min(1),
  is_optional: z.boolean().default(false),
})

export const CreateRecipeSchema = z.object({
  name: z.string().min(1).max(200),
  instructions: z.string().optional().nullable(),
  calories: z.number().int().min(0).optional().nullable(),
  diet_tags: z.array(DietTagEnum).default([]),
  is_favorite: z.boolean().default(false),
  image_url: z.string().url().optional().nullable(),
  ingredients: z.array(RecipeIngredientInput).default([]),
})

export const UpdateRecipeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  instructions: z.string().optional().nullable(),
  calories: z.number().int().min(0).optional().nullable(),
  diet_tags: z.array(DietTagEnum).optional(),
  is_favorite: z.boolean().optional(),
  image_url: z.string().url().optional().nullable(),
  ingredients: z.array(RecipeIngredientInput).optional(),
})

export const RecipeFilterSchema = z.object({
  diet: DietTagEnum.optional(),
  caloriesMin: z.number().int().min(0).optional(),
  caloriesMax: z.number().int().min(0).optional(),
  favorite: z.boolean().optional(),
  search: z.string().optional(),
  availableInPantry: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
}).optional()

// ─── Meal Log ───────────────────────────────────────────────────────

export const CreateMealLogSchema = z.object({
  recipe_id: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  calories: z.number().int().min(0).optional().nullable(),
  meal_type: MealTypeEnum,
  logged_at: z.string().optional(), // ISO datetime, defaults to now on server
  deduct_ingredients: z.boolean().default(false),
})

export const MealLogFilterSchema = z.object({
  dateFrom: z.string().optional(), // YYYY-MM-DD
  dateTo: z.string().optional(), // YYYY-MM-DD
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
}).optional()

export const DuplicateDaySchema = z.object({
  sourceDate: z.string(), // YYYY-MM-DD — the day to copy from
  targetDate: z.string(), // YYYY-MM-DD — the day to copy to
})

// Re-export enums for external use
export { DietTagEnum, MealTypeEnum }
