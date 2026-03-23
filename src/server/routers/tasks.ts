import { router, protectedProcedure } from '../trpc';
import { CreateTaskSchema, UpdateTaskSchema } from '../schema/task';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const taskRouter = router({
  // GET /api/tasks essentially
  list: protectedProcedure
    .input(z.object({ 
      status: z.string().optional(),
      context_tag: z.string().optional(),
      priority: z.number().int().optional(),
      clientDate: z.string().datetime().optional(),
      project_id: z.string().uuid().optional()
    }).optional())
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (input?.status !== "trash") {
        query = query.is('deleted_at', null);
      }

      // Use client date or fallback to server time if not provided
      const todayEnd = input?.clientDate ? new Date(input.clientDate) : new Date();
      if (!input?.clientDate) {
        todayEnd.setHours(23, 59, 59, 999);
      }
      const todayEndIso = todayEnd.toISOString()

      const todayStart = new Date(todayEnd.getTime());
      todayStart.setHours(0, 0, 0, 0);
      const todayStartIso = todayStart.toISOString();

      if (input?.status === "inbox") {
        query = query.or(`status.eq.inbox,status.eq.someday`)
      } else if (input?.status === "active") {
        query = query.neq('status', 'completed').neq('status', 'trash')
      } else if (input?.status === "all") {
        query = query.neq('status', 'trash')
      } else if (input?.status === "completed") {
        query = query.eq('status', 'completed')
      } else if (input?.status === "trash") {
        query = query.eq('status', 'trash')
      } else if (input?.status === "today") {
        query = query.neq('status', 'completed').neq('status', 'trash').not('due_at', 'is', null).gte('due_at', todayStartIso).lte('due_at', todayEndIso)
      } else if (input?.status === "upcoming") {
        query = query.neq('status', 'completed').neq('status', 'trash').not('due_at', 'is', null).gt('due_at', todayEndIso)
      }

      if (input?.context_tag) {
        query = query.eq('context_tag', input.context_tag);
      }
      if (input?.priority) {
        query = query.eq('priority', input.priority);
      }
      if (input?.project_id) {
        query = query.eq('project_id', input.project_id);
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
          start_time: input.start_time,
          end_time: input.end_time,
          is_all_day: input.is_all_day,
          project_id: input.project_id,
          is_recurring: input.is_recurring,
          recurrence_rule: input.recurrence_rule,
          color: input.color,
          university_type: input.university_type,
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      // Background sync with Google Calendar
      if (data.due_at || data.start_time) {
        try {
          const gcalMod = await import('@/lib/google-calendar').catch(() => null);
          if (gcalMod?.pushGoogleCalendarEvent) {
             const payload = {
              title: data.title,
              description: data.description || '',
              start_at: data.start_time || data.due_at,
              end_at: data.end_time || data.start_time || data.due_at,
              is_all_day: data.is_all_day || false,
              color: data.color
            };
            const gcalEventId = await gcalMod.pushGoogleCalendarEvent(ctx.user.id, payload);
            if (gcalEventId) {
              await ctx.supabase.from('tasks').update({ gcal_event_id: gcalEventId }).eq('id', data.id);
            }
          }

        } catch (err) {
          console.error('Failed to push to GCal:', err);
        }
      }

      return data;
    }),

  // PATCH /api/tasks/[id]
  update: protectedProcedure
    .input(UpdateTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, description, ...updates } = input;
      
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

      // Background sync with Google Calendar
      if (data.gcal_event_id && (updates.title || updates.due_at || updates.start_time || updates.end_time || description !== undefined)) {
        try {
          const { updateGoogleCalendarEvent } = await import('@/lib/google-calendar');
          const payload = {
            title: data.title,
            description: data.description || '',
            start_at: data.start_time || data.due_at,
            end_at: data.end_time || data.start_time || data.due_at,
            is_all_day: data.is_all_day || false,
            color: data.color
          };
          await updateGoogleCalendarEvent(ctx.user.id, data.gcal_event_id!, payload);
        } catch (err) {
          console.error('Failed to update GCal:', err);
        }
      } else if (!data.gcal_event_id && (updates.due_at || updates.start_time)) {
        try {
          const { pushGoogleCalendarEvent } = await import('@/lib/google-calendar');
          const payload = {
            title: data.title,
            description: data.description || '',
            start_at: data.start_time || data.due_at,
            end_at: data.end_time || data.start_time || data.due_at,
            is_all_day: data.is_all_day || false,
            color: data.color
          };
          const gcalEventId = await pushGoogleCalendarEvent(ctx.user.id, payload);
          if (gcalEventId) {
            await ctx.supabase.from('tasks').update({ gcal_event_id: gcalEventId }).eq('id', data.id);
          }
        } catch (err) {
          console.error('Failed to push to GCal on set due:', err);
        }
      }

      return data;
    }),

  // DELETE /api/tasks/[id] - soft delete by moving to trash
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('tasks')
        .update({ status: 'trash', deleted_at: new Date().toISOString() })
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

      if (data.gcal_event_id) {
        try {
          const { deleteGoogleCalendarEvent } = await import('@/lib/google-calendar');
          await deleteGoogleCalendarEvent(ctx.user.id, data.gcal_event_id!);
        } catch (err) {
          console.error('Failed to delete GCal:', err);
        }
      }

      return data;
    }),

  // GET /api/tasks/trash
  trash: protectedProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('tasks')
        .select('*')
        .eq('status', 'trash')
        .order('deleted_at', { ascending: false });

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }
      return data;
    }),

  // POST /api/tasks/[id]/restore
  restore: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('tasks')
        .update({ deleted_at: null, status: 'inbox' })
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

  // DELETE /api/tasks/[id]/permanent
  permanentDelete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('tasks')
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

      if (data.gcal_event_id) {
        try {
          const { deleteGoogleCalendarEvent } = await import('@/lib/google-calendar');
          await deleteGoogleCalendarEvent(ctx.user.id, data.gcal_event_id!);
        } catch (err) {
          console.error('Failed to permanent delete GCal:', err);
        }
      }

      return data;
    }),
});
