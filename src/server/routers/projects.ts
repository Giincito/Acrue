import { router, protectedProcedure } from '../trpc';
import { CreateProjectSchema, UpdateProjectSchema } from '../schema/project';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { addXP } from '@/lib/xp';

export const projectRouter = router({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('projects')
        .select(`
          *,
          tasks(id, status, deleted_at)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }
      return data;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('projects')
        .select(`
          *,
          tasks(id, title, status, priority, due_at, deleted_at, completed_at)
        `)
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .single();

      if (error) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: error.message,
        });
      }
      return data;
    }),

  create: protectedProcedure
    .input(CreateProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('projects')
        .insert({
          user_id: ctx.user.id,
          name: input.name,
          description: input.description,
          status: input.status,
          color: input.color,
          icon: input.icon,
          due_at: input.due_at,
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }
      return data;
    }),

  update: protectedProcedure
    .input(UpdateProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      
      // Fetch current status before update for XP tracking
      const { data: current } = await ctx.supabase
        .from('projects')
        .select('status, name')
        .eq('id', id)
        .eq('user_id', ctx.user.id)
        .single();

      const { data, error } = await ctx.supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .eq('user_id', ctx.user.id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      // Award XP when project is completed
      if (
        updates.status === 'completed' &&
        current?.status !== 'completed'
      ) {
        await addXP(
          ctx.supabase,
          ctx.user.id,
          'project',
          id,
          30,
          `Proyecto completado: ${current?.name || data.name}`
        );
      }

      return data;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('projects')
        .delete()
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }
      return data;
    }),
});
