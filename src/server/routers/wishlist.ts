import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { addXP } from '@/lib/xp'
import { protectedProcedure, router } from '../trpc'
import {
  CreateWishlistItemSchema,
  UpdateWishlistItemSchema,
  WishlistListInputSchema,
  WishlistSuggestionInputSchema,
} from '../schema/wishlist'

type WishlistRow = {
  id: string
  user_id: string
  name: string
  description: string | null
  price: number | null
  currency: string
  store: string | null
  url: string | null
  priority: number
  status: 'wanted' | 'saved' | 'purchased'
  created_at: string
}

function getMonthBounds(input?: { year: number; month: number }) {
  const now = new Date()
  const year = input?.year ?? now.getFullYear()
  const month = input?.month ?? now.getMonth() + 1
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, '0')}-01`

  return { startDate, endDate }
}

export const wishlistRouter = router({
  list: protectedProcedure.input(WishlistListInputSchema).query(async ({ ctx, input }) => {
    let query = ctx.supabase
      .from('wishlist_items')
      .select('*')
      .eq('user_id', ctx.user.id)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })

    if (input?.status) {
      query = query.eq('status', input.status)
    }

    const { data, error } = await query

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    return data ?? []
  }),

  create: protectedProcedure.input(CreateWishlistItemSchema).mutation(async ({ ctx, input }) => {
    const { data, error } = await ctx.supabase
      .from('wishlist_items')
      .insert({
        user_id: ctx.user.id,
        name: input.name,
        description: input.description ?? null,
        price: input.price ?? null,
        currency: input.currency,
        store: input.store ?? null,
        url: input.url ?? null,
        priority: input.priority,
        status: input.status,
      })
      .select()
      .single()

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    return data
  }),

  update: protectedProcedure.input(UpdateWishlistItemSchema).mutation(async ({ ctx, input }) => {
    const { id, ...updates } = input
    const { data: previous, error: previousError } = await ctx.supabase
      .from('wishlist_items')
      .select('*')
      .eq('id', id)
      .eq('user_id', ctx.user.id)
      .single()

    if (previousError || !previous) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Item no encontrado' })
    }
    const previousStatus = (previous as WishlistRow).status

    const { data, error } = await ctx.supabase
      .from('wishlist_items')
      .update(updates)
      .eq('id', id)
      .eq('user_id', ctx.user.id)
      .select()
      .single()

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    const item = data as WishlistRow
    if (updates.status === 'purchased' && previousStatus !== 'purchased') {
      await addXP(ctx.supabase, ctx.user.id, 'wishlist', id, 20, `Compra planificada: ${item.name}`)
    }

    return data
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('wishlist_items')
        .delete()
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .select()
        .single()

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return data
    }),

  suggestions: protectedProcedure.input(WishlistSuggestionInputSchema).query(async ({ ctx, input }) => {
    const { startDate, endDate } = getMonthBounds(input)
    const { data: expenses, error: expensesError } = await ctx.supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', ctx.user.id)
      .is('deleted_at', null)
      .gte('date', startDate)
      .lt('date', endDate)

    if (expensesError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: expensesError.message })
    }

    const availableBalance = (expenses ?? []).reduce((sum, expense) => {
      return sum + Number(expense.amount ?? 0)
    }, 0)

    const { data: items, error: itemError } = await ctx.supabase
      .from('wishlist_items')
      .select('*')
      .eq('user_id', ctx.user.id)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })

    if (itemError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: itemError.message })
    }

    const activeItems = ((items ?? []) as WishlistRow[]).filter((item) => item.status !== 'purchased')

    const result = {
      availableBalance,
      currency: 'ARS',
      aiSummary: null as string | null,
      items: activeItems.map((item) => {
        const price = Number(item.price ?? 0)
        const canBuy = price > 0 && price <= availableBalance
        const remainingAfterPurchase = price > 0 ? availableBalance - price : availableBalance

        return {
          ...item,
          canBuy,
          remainingAfterPurchase,
          suggestion: canBuy
            ? `Saldo estimado suficiente. Quedarian $${remainingAfterPurchase.toLocaleString('es-AR')}.`
            : `Faltan $${Math.max(0, price - availableBalance).toLocaleString('es-AR')}.`,
        }
      }),
    }

    if (!process.env.GEMINI_API_KEY || process.env.NODE_ENV === 'test') {
      return result
    }

    const { callGemini } = await import('@/lib/gemini/client')
    const { text } = await callGemini(
      `Cruza este saldo disponible con la wishlist y devuelve un unico hint breve en espanol, sin emojis: ${JSON.stringify(result)}`,
      {
        temperature: 0.2,
        maxOutputTokens: 120,
        systemInstruction: 'Responde solo una frase breve y accionable. No uses markdown.',
      }
    )

    return {
      ...result,
      aiSummary: text?.trim() || null,
    }
  }),
})
