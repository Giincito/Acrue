import { router, protectedProcedure } from '../trpc'
import {
  CreateStoreSchema,
  UpdateStoreSchema,
  UpsertStorePriceSchema,
} from '../schema/pantry'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

export const storeRouter = router({
  /** List all stores */
  listStores: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('stores')
      .select('*')
      .eq('user_id', ctx.user.id)
      .order('name', { ascending: true })

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }
    return data ?? []
  }),

  /** Create a new store */
  createStore: protectedProcedure
    .input(CreateStoreSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('stores')
        .insert({ user_id: ctx.user.id, name: input.name })
        .select()
        .single()

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }
      return data
    }),

  /** Update a store name */
  updateStore: protectedProcedure
    .input(UpdateStoreSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input
      const { data, error } = await ctx.supabase
        .from('stores')
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

  /** Delete a store */
  deleteStore: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('stores')
        .delete()
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }
      return { success: true }
    }),

  /** List all prices for shopping list items, grouped by store */
  listPrices: protectedProcedure.query(async ({ ctx }) => {
    // Get pantry_item_ids from the shopping list
    const { data: shoppingItems } = await ctx.supabase
      .from('shopping_list')
      .select('pantry_item_id')
      .eq('user_id', ctx.user.id)
      .eq('checked', false)
      .not('pantry_item_id', 'is', null)

    const pantryItemIds = (shoppingItems ?? [])
      .map((i) => i.pantry_item_id)
      .filter(Boolean) as string[]

    if (pantryItemIds.length === 0) return []

    const { data: prices, error } = await ctx.supabase
      .from('store_prices')
      .select('*, stores(id, name)')
      .in('pantry_item_id', pantryItemIds)
      .order('price', { ascending: true })

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }
    return prices ?? []
  }),

  /** Create or update a price for an item at a store */
  upsertPrice: protectedProcedure
    .input(UpsertStorePriceSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify store ownership
      const { data: store } = await ctx.supabase
        .from('stores')
        .select('id')
        .eq('id', input.store_id)
        .eq('user_id', ctx.user.id)
        .single()

      if (!store) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Tienda no encontrada' })
      }

      // Check if price exists
      const { data: existing } = await ctx.supabase
        .from('store_prices')
        .select('id')
        .eq('store_id', input.store_id)
        .eq('pantry_item_id', input.pantry_item_id)
        .maybeSingle()

      if (existing) {
        // Update existing
        const { data, error } = await ctx.supabase
          .from('store_prices')
          .update({ price: input.price, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select('*, stores(id, name)')
          .single()

        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
        return data
      } else {
        // Create new
        const { data, error } = await ctx.supabase
          .from('store_prices')
          .insert({
            store_id: input.store_id,
            pantry_item_id: input.pantry_item_id,
            price: input.price,
          })
          .select('*, stores(id, name)')
          .single()

        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
        return data
      }
    }),

  /** Calculate which store is cheapest for the entire shopping list */
  getCheapestStore: protectedProcedure.query(async ({ ctx }) => {
    // Get unchecked shopping items with pantry_item_id
    const { data: shoppingItems } = await ctx.supabase
      .from('shopping_list')
      .select('pantry_item_id, quantity')
      .eq('user_id', ctx.user.id)
      .eq('checked', false)
      .not('pantry_item_id', 'is', null)

    const pantryItemIds = (shoppingItems ?? [])
      .map((i) => i.pantry_item_id)
      .filter(Boolean) as string[]

    if (pantryItemIds.length === 0) return { stores: [], cheapest: null }

    // Get stores
    const { data: stores } = await ctx.supabase
      .from('stores')
      .select('id, name')
      .eq('user_id', ctx.user.id)

    if (!stores?.length) return { stores: [], cheapest: null }

    // Get all prices
    const { data: allPrices } = await ctx.supabase
      .from('store_prices')
      .select('store_id, pantry_item_id, price')
      .in('pantry_item_id', pantryItemIds)

    if (!allPrices?.length) return { stores: stores.map((s) => ({ ...s, total: 0 })), cheapest: null }

    // Build quantity map from shopping list
    const qtyMap = new Map<string, number>()
    for (const item of (shoppingItems ?? [])) {
      if (item.pantry_item_id) {
        qtyMap.set(item.pantry_item_id, Number(item.quantity) || 1)
      }
    }

    // Calculate total per store
    const storeTotals = stores.map((store) => {
      const storePrices = allPrices.filter((p) => p.store_id === store.id)
      let total = 0
      let itemsCovered = 0

      for (const sp of storePrices) {
        const qty = qtyMap.get(sp.pantry_item_id) ?? 1
        total += Number(sp.price) * qty
        itemsCovered++
      }

      return { ...store, total, itemsCovered }
    })

    storeTotals.sort((a, b) => a.total - b.total)

    return {
      stores: storeTotals,
      cheapest: storeTotals.length > 0 ? storeTotals[0] : null,
    }
  }),
})
