import { router, protectedProcedure } from '../trpc'
import { CreateSubscriptionSchema, UpdateSubscriptionSchema } from '../schema/finance'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

export const subscriptionRouter = router({
  /** List all subscriptions ordered by nearest renewal date */
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', ctx.user.id)
        .order('renewal_date', { ascending: true })

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })
      }

      // Compute days_until_renewal for each subscription
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      return (data ?? []).map(sub => {
        const renewalDate = new Date(sub.renewal_date)
        renewalDate.setHours(0, 0, 0, 0)
        const diffMs = renewalDate.getTime() - today.getTime()
        const daysUntilRenewal = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

        return {
          ...sub,
          days_until_renewal: daysUntilRenewal,
        }
      })
    }),

  /** Create a new subscription */
  create: protectedProcedure
    .input(CreateSubscriptionSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('subscriptions')
        .insert({
          user_id: ctx.user.id,
          name: input.name,
          amount: input.amount,
          currency: input.currency,
          renewal_date: input.renewal_date,
          active: input.active,
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

  /** Update a subscription */
  update: protectedProcedure
    .input(UpdateSubscriptionSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input
      const { data, error } = await ctx.supabase
        .from('subscriptions')
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

  /** Delete a subscription */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('subscriptions')
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
