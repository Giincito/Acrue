import { router, protectedProcedure } from '../trpc'
import { CreateSavingGoalSchema, UpdateSavingGoalSchema, AddToGoalSchema } from '../schema/finance'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { addXP } from '@/lib/xp'

export const savingGoalRouter = router({
  /** List all saving goals */
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('saving_goals')
        .select('*')
        .eq('user_id', ctx.user.id)
        .order('created_at', { ascending: false })

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })
      }
      return data ?? []
    }),

  /** Create a new saving goal */
  create: protectedProcedure
    .input(CreateSavingGoalSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('saving_goals')
        .insert({
          user_id: ctx.user.id,
          name: input.name,
          target_amount: input.target_amount,
          current_amount: 0,
          deadline: input.deadline,
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

  /** Update a saving goal */
  update: protectedProcedure
    .input(UpdateSavingGoalSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input
      const { data, error } = await ctx.supabase
        .from('saving_goals')
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

  /** Add money to a saving goal. Awards 50 XP on 100% completion. */
  addAmount: protectedProcedure
    .input(AddToGoalSchema)
    .mutation(async ({ ctx, input }) => {
      // First get current state
      const { data: goal, error: fetchError } = await ctx.supabase
        .from('saving_goals')
        .select('*')
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .single()

      if (fetchError || !goal) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Meta de ahorro no encontrada.',
        })
      }

      const wasBelowTarget = goal.current_amount < goal.target_amount
      const newAmount = Math.min(goal.current_amount + input.amount, goal.target_amount)

      const { data, error } = await ctx.supabase
        .from('saving_goals')
        .update({ current_amount: newAmount })
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

      // Award 50 XP when goal reaches 100%
      if (wasBelowTarget && newAmount >= goal.target_amount) {
        await addXP(
          ctx.supabase,
          ctx.user.id,
          'finance_goal',
          goal.id,
          50,
          `Meta de ahorro alcanzada: ${goal.name}`
        )
      }

      return data
    }),

  /** Delete a saving goal */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('saving_goals')
        .delete()
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })
      }
      return { success: true }
    }),
})
