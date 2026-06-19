import { router, protectedProcedure } from '../trpc'
import {
  CreatePantryItemSchema,
  UpdatePantryItemSchema,
  UpdateQuantitySchema,
} from '../schema/pantry'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { handleLowStockCheck } from '@/lib/despensa/stockAlerts'
import { logger } from '@/lib/server/logger'

export const pantryItemRouter = router({
  /** List all pantry items for the current user */
  list: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('pantry_items')
      .select('*')
      .eq('user_id', ctx.user.id)
      .order('name', { ascending: true })

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    return (data ?? []).map((item) => ({
      ...item,
      isLowStock: Number(item.quantity) < Number(item.min_stock),
    }))
  }),

  /** Get a single pantry item by ID */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('pantry_items')
        .select('*')
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .single()

      if (error) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Item no encontrado' })
      }
      return data
    }),

  /** Create a new pantry item */
  create: protectedProcedure
    .input(CreatePantryItemSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('pantry_items')
        .insert({
          user_id: ctx.user.id,
          name: input.name,
          quantity: input.quantity,
          unit: input.unit,
          min_stock: input.min_stock,
        })
        .select()
        .single()

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }
      return data
    }),

  /** Update a pantry item's details */
  update: protectedProcedure
    .input(UpdatePantryItemSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input
      const { data, error } = await ctx.supabase
        .from('pantry_items')
        .update(updates)
        .eq('id', id)
        .eq('user_id', ctx.user.id)
        .select()
        .single()

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }
      return data
    }),

  /**
   * Update quantity by delta (for inline +/- buttons).
   * Triggers low-stock check → auto shopping list + Telegram alert.
   */
  updateQuantity: protectedProcedure
    .input(UpdateQuantitySchema)
    .mutation(async ({ ctx, input }) => {
      // Fetch current item to get current quantity and alert state
      const { data: current, error: fetchErr } = await ctx.supabase
        .from('pantry_items')
        .select('*')
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .single()

      if (fetchErr || !current) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Item no encontrado' })
      }

      const newQuantity = Math.max(0, Number(current.quantity) + input.delta)

      const { data, error } = await ctx.supabase
        .from('pantry_items')
        .update({ quantity: newQuantity })
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .select()
        .single()

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      // Low stock check — runs async to not block the response
      handleLowStockCheck(
        ctx.supabase,
        ctx.user.id,
        input.id,
        newQuantity,
        Number(current.min_stock),
        current.name,
        current.unit,
        current.low_stock_alerted ?? false
      ).catch((err) => {
        logger.error('[pantryItems.updateQuantity] Stock check failed:', err)
      })

      return { ...data, isLowStock: newQuantity < Number(current.min_stock) }
    }),

  /** Delete a pantry item */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('pantry_items')
        .delete()
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }
      return { success: true }
    }),
})
