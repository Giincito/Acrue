import { router, protectedProcedure } from '../trpc'
import {
  ShoppingListFilterSchema,
  CreateShoppingListItemSchema,
  MarkCheckedSchema,
} from '../schema/pantry'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

export const shoppingListRouter = router({
  /** List shopping list items, ordered: unchecked first, checked at bottom */
  list: protectedProcedure
    .input(ShoppingListFilterSchema)
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('shopping_list')
        .select('*, pantry_items(id, name, unit)')
        .eq('user_id', ctx.user.id)
        .order('checked', { ascending: true })
        .order('created_at', { ascending: false })

      if (input?.checked !== undefined) {
        query = query.eq('checked', input.checked)
      }

      const { data, error } = await query

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }
      return data ?? []
    }),

  /** Add an item to the shopping list manually */
  create: protectedProcedure
    .input(CreateShoppingListItemSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('shopping_list')
        .insert({
          user_id: ctx.user.id,
          pantry_item_id: input.pantry_item_id,
          name: input.name,
          quantity: input.quantity,
          unit: input.unit,
          auto_generated: input.auto_generated,
          note: input.note,
        })
        .select()
        .single()

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }
      return data
    }),

  /**
   * Mark item as checked (bought).
   * Updates pantry_items quantity by adding the purchased amount.
   */
  markChecked: protectedProcedure
    .input(MarkCheckedSchema)
    .mutation(async ({ ctx, input }) => {
      // Fetch the shopping list item
      const { data: item, error: fetchErr } = await ctx.supabase
        .from('shopping_list')
        .select('*, pantry_items(id, quantity, min_stock)')
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .single()

      if (fetchErr || !item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Item no encontrado' })
      }

      // Mark as checked
      const { error: updateErr } = await ctx.supabase
        .from('shopping_list')
        .update({ checked: true })
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)

      if (updateErr) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updateErr.message })
      }

      // Update pantry quantity if linked to a pantry item
      if (item.pantry_item_id) {
        const pantryItem = item.pantry_items as { quantity?: number | string | null; min_stock?: number | string | null } | null
        const purchasedQty = input.quantity_purchased ?? Number(item.quantity) ?? 0
        const newQty = Number(pantryItem?.quantity ?? 0) + purchasedQty

        await ctx.supabase
          .from('pantry_items')
          .update({
            quantity: newQty,
            low_stock_alerted: newQty >= Number(pantryItem?.min_stock ?? 0) ? false : true,
          })
          .eq('id', item.pantry_item_id)
          .eq('user_id', ctx.user.id)
      }

      return { success: true }
    }),

  /** Remove all checked items from the shopping list */
  clearChecked: protectedProcedure.mutation(async ({ ctx }) => {
    const { error } = await ctx.supabase
      .from('shopping_list')
      .delete()
      .eq('user_id', ctx.user.id)
      .eq('checked', true)

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }
    return { success: true }
  }),

  /** Delete a single shopping list item */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('shopping_list')
        .delete()
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }
      return { success: true }
    }),
})
