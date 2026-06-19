import { router, protectedProcedure } from '../trpc';
import { CreateSubjectSchema, UpdateSubjectSchema } from '../schema/subject';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const subjectRouter = router({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('subjects')
        .select(`
          *,
          assignments(id, type, grade, weight, completed)
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
        .from('subjects')
        .select(`
          *,
          assignments(*)
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
    .input(CreateSubjectSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('subjects')
        .insert({
          user_id: ctx.user.id,
          name: input.name,
          code: input.code,
          commission: input.commission,
          status: input.status,
          target_grade: input.target_grade,
          prerequisites: input.prerequisites,
          weekly_hours: input.weekly_hours,
          enrollment_open_date: input.enrollment_open_date,
          schedules: input.schedules,
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
    .input(UpdateSubjectSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      
      const { data, error } = await ctx.supabase
        .from('subjects')
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
        .from('subjects')
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
