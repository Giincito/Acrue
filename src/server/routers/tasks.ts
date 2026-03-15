import { router, protectedProcedure } from '../trpc';
import { CreateTaskSchema, UpdateTaskSchema } from '../schema/task';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const taskRouter = router({
  // GET /api/tasks essentially
  list: protectedProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('tasks')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (input?.status) {
        query = query.eq('status', input.status);
      }

      const { data, error } = await query;

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }
      return data;
    }),

  // POST /api/tasks
  create: protectedProcedure
    .input(CreateTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('tasks')
        .insert({
          user_id: ctx.user.id,
          title: input.title,
          context_tag: input.context_tag,
          status: input.status,
          priority: input.priority,
          due_at: input.due_at,
          project_id: input.project_id,
          is_recurring: input.is_recurring,
          recurrence_rule: input.recurrence_rule,
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

  // PATCH /api/tasks/[id]
  update: protectedProcedure
    .input(UpdateTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      
      const { data, error } = await ctx.supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .eq('user_id', ctx.user.id) // Extra safety 
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

  // DELETE /api/tasks/[id]
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('tasks')
        .update({ deleted_at: new Date().toISOString() })
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
