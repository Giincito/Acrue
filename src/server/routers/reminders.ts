import { router, protectedProcedure } from '../trpc';
import { CreateReminderSchema, UpdateReminderSchema } from '../schema/reminder';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const reminderRouter = router({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('reminders')
        .select('*')
        .order('trigger_at', { ascending: true }); // Soonest first

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }
      return data;
    }),

  create: protectedProcedure
    .input(CreateReminderSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('reminders')
        .insert({
          user_id: ctx.user.id,
          title: input.title,
          description: input.description,
          trigger_at: input.trigger_at,
          trigger_end_at: input.trigger_end_at || null,
          color: input.color,
          is_completed: input.is_completed || false,
          is_all_day: input.is_all_day || false,
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
      if (data.trigger_at) {
        try {
          const { pushGoogleCalendarEvent } = await import('@/lib/google-calendar');
          const gcalEventId = await pushGoogleCalendarEvent(ctx.user.id, {
            title: data.title,
            description: data.description || '',
            start_at: data.trigger_at,
            end_at: data.trigger_end_at || data.trigger_at,
            is_all_day: data.is_all_day || false,
            color: data.color
          });
          if (gcalEventId) {
            await ctx.supabase.from('reminders').update({ gcal_event_id: gcalEventId }).eq('id', data.id);
          }
        } catch (err) {
          console.error('Failed to push reminder to GCal:', err);
        }
      }

      return data;
    }),

  update: protectedProcedure
    .input(UpdateReminderSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      
      const { data, error } = await ctx.supabase
        .from('reminders')
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

      // Background sync with Google Calendar
      if (data.gcal_event_id && (updates.title || updates.trigger_at || updates.trigger_end_at !== undefined || updates.description !== undefined || updates.is_all_day !== undefined)) {
        try {
          const { updateGoogleCalendarEvent } = await import('@/lib/google-calendar');
          await updateGoogleCalendarEvent(ctx.user.id, data.gcal_event_id!, {
            title: data.title,
            description: data.description || '',
            start_at: data.trigger_at,
            end_at: data.trigger_end_at || data.trigger_at,
            is_all_day: data.is_all_day || false
          });
        } catch (err) {
          console.error('Failed to update reminder on GCal:', err);
        }
      } else if (!data.gcal_event_id && updates.trigger_at) {
        try {
          const { pushGoogleCalendarEvent } = await import('@/lib/google-calendar');
          const gcalEventId = await pushGoogleCalendarEvent(ctx.user.id, {
            title: data.title,
            description: data.description || '',
            start_at: data.trigger_at,
            end_at: data.trigger_end_at || data.trigger_at,
            is_all_day: data.is_all_day || false,
            color: data.color
          });
          if (gcalEventId) {
            await ctx.supabase.from('reminders').update({ gcal_event_id: gcalEventId }).eq('id', data.id);
          }
        } catch (err) {
          console.error('Failed to push reminder to GCal on set trigger:', err);
        }
      }

      return data;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('reminders')
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
          console.error('Failed to delete reminder on GCal:', err);
        }
      }

      return data;
    }),
});
