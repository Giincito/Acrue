import { router, protectedProcedure } from '../trpc';
import { CreateProjectSchema, UpdateProjectSchema } from '../schema/project';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const projectRouter = router({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('projects')
        .select(`
          *,
          tasks(id, status)
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
