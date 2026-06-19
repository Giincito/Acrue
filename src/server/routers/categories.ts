import { router, protectedProcedure } from '../trpc'
import { CreateCategorySchema, UpdateCategorySchema } from '../schema/finance'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { logger } from '@/lib/server/logger'

/** Default categories seeded on first access */
const DEFAULT_CATEGORIES = [
  { name: 'Supermercado', icon: 'shopping-cart' },
  { name: 'Transporte', icon: 'bus' },
  { name: 'Servicios', icon: 'zap' },
  { name: 'Salud', icon: 'heart-pulse' },
  { name: 'Educación', icon: 'graduation-cap' },
  { name: 'Entretenimiento', icon: 'gamepad-2' },
  { name: 'Restaurantes', icon: 'utensils' },
  { name: 'Ropa', icon: 'shirt' },
  { name: 'Tecnología', icon: 'smartphone' },
  { name: 'Hogar', icon: 'home' },
  { name: 'Otros', icon: 'more-horizontal' },
] as const

export const categoryRouter = router({
  /** List all categories for the user. Seeds defaults on first call. */
  list: protectedProcedure
    .query(async ({ ctx }) => {
      // Check if user has any categories
      const { data: existing, error: checkError } = await ctx.supabase
        .from('categories')
        .select('id')
        .eq('user_id', ctx.user.id)
        .limit(1)

      if (checkError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: checkError.message,
        })
      }

      // Seed defaults on first access
      if (!existing || existing.length === 0) {
        const rows = DEFAULT_CATEGORIES.map(c => ({
          user_id: ctx.user.id,
          name: c.name,
          icon: c.icon,
          is_default: true,
        }))

        const { error: seedError } = await ctx.supabase
          .from('categories')
          .insert(rows)

        if (seedError) {
          logger.error('[categories] Failed to seed defaults:', seedError.message)
        }
      }

      const { data, error } = await ctx.supabase
        .from('categories')
        .select('*')
        .eq('user_id', ctx.user.id)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true })

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })
      }
      return data ?? []
    }),

  /** Create a custom category */
  create: protectedProcedure
    .input(CreateCategorySchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('categories')
        .insert({
          user_id: ctx.user.id,
          name: input.name,
          icon: input.icon ?? 'tag',
          is_default: false,
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

  /** Update a category (only user-created, not defaults) */
  update: protectedProcedure
    .input(UpdateCategorySchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input

      // Verify it's not a default category
      const { data: cat } = await ctx.supabase
        .from('categories')
        .select('is_default')
        .eq('id', id)
        .eq('user_id', ctx.user.id)
        .single()

      if (cat?.is_default) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No se pueden editar las categorías predeterminadas.',
        })
      }

      const { data, error } = await ctx.supabase
        .from('categories')
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

  /** Delete a category (only user-created, not defaults) */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify it's not a default category
      const { data: cat } = await ctx.supabase
        .from('categories')
        .select('is_default')
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .single()

      if (cat?.is_default) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No se pueden eliminar las categorías predeterminadas.',
        })
      }

      const { error } = await ctx.supabase
        .from('categories')
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

  /** Find category by name (for AI categorization) */
  findByName: protectedProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('categories')
        .select('id, name, icon')
        .eq('user_id', ctx.user.id)
        .ilike('name', `%${input.name}%`)
        .limit(1)
        .single()

      return data
    }),
})
