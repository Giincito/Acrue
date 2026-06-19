import { router, protectedProcedure } from '../trpc'
import {
  CreateMealLogSchema,
  MealLogFilterSchema,
  DuplicateDaySchema,
} from '../schema/recipes'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { logger } from '@/lib/server/logger'

export const mealLogRouter = router({
  /** List meal log entries with optional date filter */
  list: protectedProcedure
    .input(MealLogFilterSchema)
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('meal_log')
        .select('*, recipes(id, name, calories)')
        .eq('user_id', ctx.user.id)
        .is('deleted_at', null)
        .order('logged_at', { ascending: false })

      if (input?.dateFrom) {
        query = query.gte('logged_at', `${input.dateFrom}T00:00:00`)
      }
      if (input?.dateTo) {
        query = query.lte('logged_at', `${input.dateTo}T23:59:59`)
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

  /** Log a new meal */
  create: protectedProcedure
    .input(CreateMealLogSchema)
    .mutation(async ({ ctx, input }) => {
      // If recipe_id is provided, auto-fill calories from recipe
      let calories = input.calories
      if (input.recipe_id && !calories) {
        const { data: recipe } = await ctx.supabase
          .from('recipes')
          .select('calories')
          .eq('id', input.recipe_id)
          .eq('user_id', ctx.user.id)
          .single()

        if (recipe?.calories) {
          calories = recipe.calories
        }
      }

      const { data, error } = await ctx.supabase
        .from('meal_log')
        .insert({
          user_id: ctx.user.id,
          recipe_id: input.recipe_id,
          description: input.description,
          calories,
          meal_type: input.meal_type,
          logged_at: input.logged_at ?? new Date().toISOString(),
        })
        .select('*, recipes(id, name, calories)')
        .single()

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      // Optionally deduct ingredients from pantry
      if (input.deduct_ingredients && input.recipe_id) {
        const { data: ingredients } = await ctx.supabase
          .from('recipe_ingredients')
          .select('*')
          .eq('recipe_id', input.recipe_id)

        if (ingredients?.length) {
          for (const ing of ingredients) {
            const { data: pantryItem } = await ctx.supabase
              .from('pantry_items')
              .select('quantity, min_stock, name, unit, low_stock_alerted')
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

              // Low stock check
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
        }
      }

      return data
    }),

  /** Soft delete a meal log entry */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('meal_log')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .select()
        .single()

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }
      return data
    }),

  /** Get calorie summary for a specific day */
  getDaySummary: protectedProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('meal_log')
        .select('id, calories, meal_type, description, logged_at, recipes(name)')
        .eq('user_id', ctx.user.id)
        .is('deleted_at', null)
        .gte('logged_at', `${input.date}T00:00:00`)
        .lte('logged_at', `${input.date}T23:59:59`)
        .order('logged_at', { ascending: true })

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      const meals = data ?? []
      const totalCalories = meals.reduce((sum, m) => sum + (m.calories ?? 0), 0)

      return { meals, totalCalories, date: input.date }
    }),

  /** Get weekly calorie summary — 7 days starting from a given date */
  getWeekSummary: protectedProcedure
    .input(z.object({ startDate: z.string() }))
    .query(async ({ ctx, input }) => {
      const start = new Date(input.startDate)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)

      const { data, error } = await ctx.supabase
        .from('meal_log')
        .select('calories, logged_at, meal_type')
        .eq('user_id', ctx.user.id)
        .is('deleted_at', null)
        .gte('logged_at', `${input.startDate}T00:00:00`)
        .lte('logged_at', `${end.toISOString().split('T')[0]}T23:59:59`)
        .order('logged_at', { ascending: true })

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      // Group by day
      const dailyMap = new Map<string, number>()
      for (let i = 0; i < 7; i++) {
        const d = new Date(start)
        d.setDate(d.getDate() + i)
        dailyMap.set(d.toISOString().split('T')[0], 0)
      }

      for (const meal of (data ?? [])) {
        const day = new Date(meal.logged_at).toISOString().split('T')[0]
        dailyMap.set(day, (dailyMap.get(day) ?? 0) + (meal.calories ?? 0))
      }

      return Array.from(dailyMap.entries()).map(([date, calories]) => ({
        date,
        dayName: new Date(date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short' }),
        calories,
      }))
    }),

  /** Duplicate all meals from one day to another */
  duplicateDay: protectedProcedure
    .input(DuplicateDaySchema)
    .mutation(async ({ ctx, input }) => {
      // Fetch meals from source day
      const { data: sourceMeals, error: fetchErr } = await ctx.supabase
        .from('meal_log')
        .select('recipe_id, description, calories, meal_type')
        .eq('user_id', ctx.user.id)
        .is('deleted_at', null)
        .gte('logged_at', `${input.sourceDate}T00:00:00`)
        .lte('logged_at', `${input.sourceDate}T23:59:59`)

      if (fetchErr || !sourceMeals?.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `No se encontraron comidas registradas el ${input.sourceDate}`,
        })
      }

      // Create copies for the target day
      const newMeals = sourceMeals.map((meal) => ({
        user_id: ctx.user.id,
        recipe_id: meal.recipe_id,
        description: meal.description,
        calories: meal.calories,
        meal_type: meal.meal_type,
        logged_at: `${input.targetDate}T12:00:00`,
      }))

      const { data, error: insertErr } = await ctx.supabase
        .from('meal_log')
        .insert(newMeals)
        .select('*, recipes(id, name)')

      if (insertErr) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: insertErr.message })
      }

      return data ?? []
    }),
})
