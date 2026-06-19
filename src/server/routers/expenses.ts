import { router, protectedProcedure } from '../trpc'
import {
  CreateExpenseSchema,
  UpdateExpenseSchema,
  ExpenseFilterSchema,
} from '../schema/finance'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

export const expenseRouter = router({
  /** List expenses with optional filters (category, date range, amount range) */
  list: protectedProcedure
    .input(ExpenseFilterSchema)
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('expenses')
        .select('*, categories(id, name, icon)')
        .eq('user_id', ctx.user.id)
        .is('deleted_at', null)
        .order('date', { ascending: false })

      if (input?.categoryId) {
        query = query.eq('category_id', input.categoryId)
      }
      if (input?.dateFrom) {
        query = query.gte('date', input.dateFrom)
      }
      if (input?.dateTo) {
        query = query.lte('date', input.dateTo)
      }
      if (input?.amountMin !== undefined) {
        // Expenses are negative, so min amount means "more negative than"
        query = query.lte('amount', -Math.abs(input.amountMin))
      }
      if (input?.amountMax !== undefined) {
        query = query.gte('amount', -Math.abs(input.amountMax))
      }

      const limit = input?.limit ?? 50
      const offset = input?.offset ?? 0
      query = query.range(offset, offset + limit - 1)

      const { data, error } = await query

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })
      }
      return data ?? []
    }),

  /** Create a new expense */
  create: protectedProcedure
    .input(CreateExpenseSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('expenses')
        .insert({
          user_id: ctx.user.id,
          amount: input.amount,
          currency: input.currency,
          category_id: input.category_id,
          description: input.description,
          date: input.date,
          source: input.source ?? 'manual',
        })
        .select('*, categories(id, name, icon)')
        .single()

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })
      }
      return data
    }),

  /** Update an existing expense */
  update: protectedProcedure
    .input(UpdateExpenseSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input
      const { data, error } = await ctx.supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .eq('user_id', ctx.user.id)
        .select('*, categories(id, name, icon)')
        .single()

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })
      }
      return data
    }),

  /** Soft delete an expense (set deleted_at) */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('expenses')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .select()
        .single()

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })
      }
      return data
    }),

  /** Restore a soft-deleted expense */
  restore: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('expenses')
        .update({ deleted_at: null })
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .select()
        .single()

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })
      }
      return data
    }),

  /** Get monthly summary: total income, total expenses, balance */
  getMonthSummary: protectedProcedure
    .input(z.object({
      year: z.number().int(),
      month: z.number().int().min(1).max(12),
    }).optional())
    .query(async ({ ctx, input }) => {
      const now = new Date()
      const year = input?.year ?? now.getFullYear()
      const month = input?.month ?? (now.getMonth() + 1)

      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const endDate = month === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, '0')}-01`

      const { data, error } = await ctx.supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', ctx.user.id)
        .is('deleted_at', null)
        .gte('date', startDate)
        .lt('date', endDate)

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })
      }

      const expenses = data ?? []
      const totalExpenses = expenses
        .filter(e => e.amount < 0)
        .reduce((sum, e) => sum + Math.abs(e.amount), 0)
      const totalIncome = expenses
        .filter(e => e.amount > 0)
        .reduce((sum, e) => sum + e.amount, 0)

      return {
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses,
        expenseCount: expenses.filter(e => e.amount < 0).length,
      }
    }),

  /** Get top categories by spending for current month */
  getTopCategories: protectedProcedure
    .input(z.object({
      year: z.number().int(),
      month: z.number().int().min(1).max(12),
      limit: z.number().int().min(1).max(10).default(3),
    }).optional())
    .query(async ({ ctx, input }) => {
      const now = new Date()
      const year = input?.year ?? now.getFullYear()
      const month = input?.month ?? (now.getMonth() + 1)
      const limit = input?.limit ?? 3

      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const endDate = month === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, '0')}-01`

      const { data, error } = await ctx.supabase
        .from('expenses')
        .select('amount, category_id, categories(id, name, icon)')
        .eq('user_id', ctx.user.id)
        .is('deleted_at', null)
        .lt('amount', 0) // Only expenses (negative)
        .gte('date', startDate)
        .lt('date', endDate)

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })
      }

      // Group by category
      const categoryMap = new Map<string, {
        categoryId: string | null
        categoryName: string
        categoryIcon: string | null
        total: number
        count: number
      }>()

      const totalSpending = (data ?? []).reduce((s, e) => s + Math.abs(e.amount), 0)

      for (const expense of (data ?? [])) {
        const cat = expense.categories as { name?: string | null; icon?: string | null } | null
        const key = expense.category_id ?? 'uncategorized'
        const existing = categoryMap.get(key)

        if (existing) {
          existing.total += Math.abs(expense.amount)
          existing.count++
        } else {
          categoryMap.set(key, {
            categoryId: expense.category_id,
            categoryName: cat?.name ?? 'Sin categoría',
            categoryIcon: cat?.icon ?? null,
            total: Math.abs(expense.amount),
            count: 1,
          })
        }
      }

      return Array.from(categoryMap.values())
        .map(c => ({ ...c, percentage: totalSpending > 0 ? (c.total / totalSpending) * 100 : 0 }))
        .sort((a, b) => b.total - a.total)
        .slice(0, limit)
    }),
})
