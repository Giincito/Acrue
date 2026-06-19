import { router, protectedProcedure } from '../trpc'
import {
  CreateDebtSchema,
  UpdateDebtSchema,
  AddDebtPaymentSchema,
  SettleDebtSchema,
} from '../schema/finance'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

export const debtRouter = router({
  /** List all active and past debts */
  list: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('debts')
      .select('*')
      .eq('user_id', ctx.user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      })
    }
    return data ?? []
  }),

  /** Create a new debt */
  create: protectedProcedure
    .input(CreateDebtSchema)
    .mutation(async ({ ctx, input }) => {
      const status = 'pending'

      const { data, error } = await ctx.supabase
        .from('debts')
        .insert({
          user_id: ctx.user.id,
          name: input.name,
          person: input.person,
          type: input.type,
          total_amount: input.total_amount,
          paid_amount: 0,
          currency: input.currency,
          due_date: input.due_date,
          notes: input.notes,
          status,
        })
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

  /** Update an existing debt */
  update: protectedProcedure
    .input(UpdateDebtSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input

      const { data, error } = await ctx.supabase
        .from('debts')
        .update(updates)
        .eq('id', id)
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

  /** Default delete logic */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('debts')
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

  /** Add a partial payment to a debt */
  addPayment: protectedProcedure
    .input(AddDebtPaymentSchema)
    .mutation(async ({ ctx, input }) => {
      // 1. Fetch current debt to check amounts
      const { data: debt, error: fetchError } = await ctx.supabase
        .from('debts')
        .select('*')
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .single()

      if (fetchError || !debt) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Deuda no encontrada',
        })
      }

      if (debt.status === 'settled') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Esta deuda ya está saldada',
        })
      }

      const newPaidAmount = debt.paid_amount + input.amount
      let newStatus = 'partial'
      
      // Prevent over-paying unless authorized, but mathematically limit it:
      const finalPaidAmount = Math.min(newPaidAmount, debt.total_amount)
      if (finalPaidAmount >= debt.total_amount) {
        newStatus = 'settled'
      }

      const { data, error } = await ctx.supabase
        .from('debts')
        .update({ 
            paid_amount: finalPaidAmount, 
            status: newStatus 
        })
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

  /** Settle a debt immediately and create an expense */
  settle: protectedProcedure
    .input(SettleDebtSchema)
    .mutation(async ({ ctx, input }) => {
      const { data: debt, error: fetchError } = await ctx.supabase
        .from('debts')
        .select('*')
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .single()

      if (fetchError || !debt) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Deuda no encontrada',
        })
      }

      if (debt.status === 'settled') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Esta deuda ya está saldada',
        })
      }

      // Mark as settled
      const { data: updatedDebt, error: updateError } = await ctx.supabase
        .from('debts')
        .update({ 
            paid_amount: debt.total_amount, 
            status: 'settled' 
        })
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .select()
        .single()

      if (updateError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: updateError.message,
        })
      }

      // Automatically create the expense/income for settling the remaining amount
      const remainingAmount = debt.total_amount - debt.paid_amount

      if (remainingAmount > 0) {
          const isIncome = debt.type === 'owed_to_me'
          const expenseAmount = isIncome ? remainingAmount : -remainingAmount
          
          await ctx.supabase
            .from('expenses')
            .insert({
                user_id: ctx.user.id,
                amount: expenseAmount,
                currency: debt.currency,
                description: `Paga saldada de deuda: ${debt.name} (${debt.person})`,
                date: new Date().toISOString().split('T')[0],
                source: 'debt_settlement'
            })
      }

      return updatedDebt
    }),

  /** Undo a settle action */
  undoSettle: protectedProcedure
    .input(z.object({ 
        id: z.string().uuid(),
        previous_paid_amount: z.number(),
        previous_status: z.enum(["pending", "partial"])
    }))
    .mutation(async ({ ctx, input }) => {
      // Revert the debt
      const { data, error } = await ctx.supabase
        .from('debts')
        .update({ 
            paid_amount: input.previous_paid_amount, 
            status: input.previous_status 
        })
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

      // We also try to delete the created expense based on the source and description if possible
      // This is a best effort cleanup
      await ctx.supabase
        .from('expenses')
        .delete() // Hard delete since it was just a mistaken generation
        .eq('user_id', ctx.user.id)
        .eq('source', 'debt_settlement')
        .like('description', `Paga saldada de deuda: ${data.name}%`)
        
      return data
    }),
})
