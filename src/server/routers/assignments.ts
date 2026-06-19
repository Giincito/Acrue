import { router, protectedProcedure } from '../trpc';
import { CreateAssignmentSchema, UpdateAssignmentSchema } from '../schema/assignment';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { addXP } from '@/lib/xp';

export const assignmentRouter = router({
  listBySubject: protectedProcedure
    .input(z.object({ subject_id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('assignments')
        .select('*')
        .eq('subject_id', input.subject_id)
        .order('due_at', { ascending: true, nullsFirst: false });

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }
      return data;
    }),

  listGlobal: protectedProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('assignments')
        .select(`
          *,
          subjects(name, code, status)
        `)
        .order('due_at', { ascending: true, nullsFirst: false });
        
      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }
      
      // Since subjects table is owned by the user via RLS, this join inherently filters by user_id
      return data;
    }),

  create: protectedProcedure
    .input(CreateAssignmentSchema)
    .mutation(async ({ ctx, input }) => {
      // Enforce RLS by checking if subject belongs to user
      const { data: subject, error: subjectError } = await ctx.supabase
        .from('subjects')
        .select('id')
        .eq('id', input.subject_id)
        .eq('user_id', ctx.user.id)
        .single();
        
      if (subjectError || !subject) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Subject not found or does not belong to user',
        });
      }

      const { data, error } = await ctx.supabase
        .from('assignments')
        .insert({
          subject_id: input.subject_id,
          title: input.title,
          type: input.type,
          weight: input.weight,
          grade: input.grade,
          due_at: input.due_at,
          completed: input.completed,
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
    .input(UpdateAssignmentSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      const { data: previousAssignment, error: previousError } = await ctx.supabase
        .from('assignments')
        .select('id, subject_id, title, completed')
        .eq('id', id)
        .single();

      if (previousError || !previousAssignment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Assignment not found',
        });
      }

      const { data: subject, error: subjectError } = await ctx.supabase
        .from('subjects')
        .select('id')
        .eq('id', previousAssignment.subject_id)
        .eq('user_id', ctx.user.id)
        .single();

      if (subjectError || !subject) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Subject not found or does not belong to user',
        });
      }
      const wasCompleted = previousAssignment.completed === true;
      
      const { data, error } = await ctx.supabase
        .from('assignments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      if (updates.completed === true && !wasCompleted) {
        await addXP(ctx.supabase, ctx.user.id, 'assignment', id, 25, `Entrega completada: ${data.title}`)
      }

      return data;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('assignments')
        .delete()
        .eq('id', input.id)
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
