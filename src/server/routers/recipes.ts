import { router, protectedProcedure } from '../trpc'
import {
  CreateRecipeSchema,
  UpdateRecipeSchema,
  RecipeFilterSchema,
} from '../schema/recipes'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { getSuggestedRecipes } from '@/lib/recetas/suggester'
import { logger } from '@/lib/server/logger'

type RecipeIngredientRow = {
  recipe_id: string
  pantry_item_id: string
  quantity: number
  unit: string
  is_optional: boolean
}

function isMissingOptionalIngredientColumn(error: { message?: string } | null) {
  return Boolean(error?.message?.includes('is_optional'))
}

function withoutOptionalIngredientFlag(row: RecipeIngredientRow) {
  return {
    recipe_id: row.recipe_id,
    pantry_item_id: row.pantry_item_id,
    quantity: row.quantity,
    unit: row.unit,
  }
}

export const recipeRouter = router({
  /** List recipes with filters */
  list: protectedProcedure
    .input(RecipeFilterSchema)
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('recipes')
        .select('*, recipe_ingredients(*)')
        .eq('user_id', ctx.user.id)
        .order('created_at', { ascending: false })

      if (input?.diet) {
        query = query.contains('diet_tags', [input.diet])
      }
      if (input?.caloriesMin !== undefined) {
        query = query.gte('calories', input.caloriesMin)
      }
      if (input?.caloriesMax !== undefined) {
        query = query.lte('calories', input.caloriesMax)
      }
      if (input?.favorite !== undefined) {
        query = query.eq('is_favorite', input.favorite)
      }
      if (input?.search) {
        query = query.ilike('name', `%${input.search}%`)
      }

      const limit = input?.limit ?? 50
      const offset = input?.offset ?? 0
      query = query.range(offset, offset + limit - 1)

      const { data, error } = await query

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }
      return data ?? []
    }),

  /** Get a single recipe with full ingredient details */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('recipes')
        .select(`
          *,
          recipe_ingredients(*,
            pantry_items(id, name, quantity, unit)
          )
        `)
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .single()

      if (error) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Receta no encontrada' })
      }
      return data
    }),

  /** Create a new recipe with ingredients */
  create: protectedProcedure
    .input(CreateRecipeSchema)
    .mutation(async ({ ctx, input }) => {
      const { ingredients, ...recipeData } = input

      // Insert recipe
      const { data: recipe, error: recipeErr } = await ctx.supabase
        .from('recipes')
        .insert({
          user_id: ctx.user.id,
          name: recipeData.name,
          instructions: recipeData.instructions,
          calories: recipeData.calories,
          diet_tags: recipeData.diet_tags,
          is_favorite: recipeData.is_favorite,
          image_url: recipeData.image_url,
        })
        .select()
        .single()

      if (recipeErr || !recipe) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: recipeErr?.message ?? 'Error al crear receta',
        })
      }

      // Insert ingredients if any
      if (ingredients.length > 0) {
        const ingredientRows: RecipeIngredientRow[] = ingredients.map((ing) => ({
          recipe_id: recipe.id,
          pantry_item_id: ing.pantry_item_id,
          quantity: ing.quantity,
          unit: ing.unit,
          is_optional: ing.is_optional,
        }))

        let { error: ingErr } = await ctx.supabase
          .from('recipe_ingredients')
          .insert(ingredientRows)

        if (isMissingOptionalIngredientColumn(ingErr)) {
          const fallback = await ctx.supabase
            .from('recipe_ingredients')
            .insert(ingredientRows.map(withoutOptionalIngredientFlag))
          ingErr = fallback.error
        }

        if (ingErr) {
          logger.error('[recipes.create] Failed to insert ingredients:', ingErr)
        }
      }

      return recipe
    }),

  /** Update a recipe and its ingredients */
  update: protectedProcedure
    .input(UpdateRecipeSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ingredients, ...updates } = input

      // Update recipe fields
      const { data: recipe, error: recipeErr } = await ctx.supabase
        .from('recipes')
        .update(updates)
        .eq('id', id)
        .eq('user_id', ctx.user.id)
        .select()
        .single()

      if (recipeErr) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: recipeErr.message })
      }

      // Replace ingredients if provided
      if (ingredients !== undefined) {
        // Delete existing
        await ctx.supabase.from('recipe_ingredients').delete().eq('recipe_id', id)

        // Insert new
        if (ingredients.length > 0) {
          const ingredientRows: RecipeIngredientRow[] = ingredients.map((ing) => ({
            recipe_id: id,
            pantry_item_id: ing.pantry_item_id,
            quantity: ing.quantity,
            unit: ing.unit,
            is_optional: ing.is_optional,
          }))

          let { error: ingErr } = await ctx.supabase.from('recipe_ingredients').insert(ingredientRows)

          if (isMissingOptionalIngredientColumn(ingErr)) {
            const fallback = await ctx.supabase
              .from('recipe_ingredients')
              .insert(ingredientRows.map(withoutOptionalIngredientFlag))
            ingErr = fallback.error
          }

          if (ingErr) {
            logger.error('[recipes.update] Failed to insert ingredients:', ingErr)
          }
        }
      }

      return recipe
    }),

  /** Delete a recipe (cascades ingredients via FK) */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('recipes')
        .delete()
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }
      return { success: true }
    }),

  /** Toggle favorite status */
  toggleFavorite: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch current
      const { data: current } = await ctx.supabase
        .from('recipes')
        .select('is_favorite')
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .single()

      if (!current) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Receta no encontrada' })
      }

      const { data, error } = await ctx.supabase
        .from('recipes')
        .update({ is_favorite: !current.is_favorite })
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .select()
        .single()

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }
      return data
    }),

  /**
   * Cook a recipe — deducts ingredient quantities from pantry.
   * Returns the deducted amounts for UndoToast.
   */
  cook: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch recipe with ingredients
      const { data: recipe, error } = await ctx.supabase
        .from('recipes')
        .select(`
          id, name, calories,
          recipe_ingredients(*)
        `)
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .single()

      if (error || !recipe) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Receta no encontrada' })
      }

      const ingredients = (recipe.recipe_ingredients || []) as {
        pantry_item_id: string
        quantity: number
        unit: string
        is_optional?: boolean | null
      }[]

      const deductions: { pantry_item_id: string; amount: number; name?: string }[] = []

      // Deduct each ingredient
      for (const ing of ingredients) {
        const { data: pantryItem } = await ctx.supabase
          .from('pantry_items')
          .select('id, name, quantity, min_stock, low_stock_alerted, unit')
          .eq('id', ing.pantry_item_id)
          .eq('user_id', ctx.user.id)
          .single()

        if (pantryItem) {
          if (ing.is_optional && Number(pantryItem.quantity) < Number(ing.quantity)) {
            continue
          }

          const newQty = Math.max(0, Number(pantryItem.quantity) - Number(ing.quantity))

          await ctx.supabase
            .from('pantry_items')
            .update({ quantity: newQty })
            .eq('id', ing.pantry_item_id)
            .eq('user_id', ctx.user.id)

          deductions.push({
            pantry_item_id: ing.pantry_item_id,
            amount: Number(ing.quantity),
            name: pantryItem.name,
          })

          // Check low stock after deduction
          const { handleLowStockCheck } = await import('@/lib/despensa/stockAlerts')
          handleLowStockCheck(
            ctx.supabase,
            ctx.user.id,
            ing.pantry_item_id,
            newQty,
            Number(pantryItem.min_stock),
            pantryItem.name,
            pantryItem.unit,
            pantryItem.low_stock_alerted ?? false
          ).catch((error) => logger.error('Unhandled async error', error))
        }
      }

      return {
        recipeId: recipe.id,
        recipeName: recipe.name,
        calories: recipe.calories,
        deductions,
      }
    }),

  /** Get suggested recipes based on pantry inventory */
  getSuggestions: protectedProcedure.query(async ({ ctx }) => {
    return getSuggestedRecipes(ctx.user.id, ctx.supabase)
  }),
})
