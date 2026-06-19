import { router, protectedProcedure } from '../trpc';
import { updateGoogleCalendarEvent, deleteGoogleCalendarEvent } from '@/lib/google-calendar';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { logger } from '@/lib/server/logger'

interface CalendarEventRow {
  id: string
  gcal_event_id: string | null
  title: string
  description?: string | null
  start_at: string
  end_at: string | null
  source: string
}

export const integrationRouter = router({
  googleCalendarEvents: protectedProcedure
    .query(async ({ ctx }) => {
      // 1. Fetch cached Google Events from our DB
      const { data: events, error: gcalError } = await ctx.supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', ctx.user.id)
        .is('deleted_at', null)
        .order('start_at', { ascending: true });
      
      if (gcalError || !events || events.length === 0) return [];

      // 2. Fetch all local tasks and reminders that already have a gcal_event_id
      const { data: localTasks, error: tasksError } = await ctx.supabase
        .from('tasks')
        .select('gcal_event_id')
        .eq('user_id', ctx.user.id)
        .not('gcal_event_id', 'is', null);

      const { data: localReminders, error: remError } = await ctx.supabase
        .from('reminders')
        .select('gcal_event_id')
        .eq('user_id', ctx.user.id)
        .not('gcal_event_id', 'is', null);

      if (tasksError || remError) {
        logger.error('Error fetching local sync IDs for deduplication');
      }

      // 3. Create a Fast Lookup Set for existing IDs
      const localIds = new Set([
        ...(localTasks?.map(t => t.gcal_event_id) || []),
        ...(localReminders?.map(r => r.gcal_event_id) || [])
      ]);

      // 4. Transform and Filter Out the Duplicates
      const eventRows = events as CalendarEventRow[]
      return eventRows
        .filter((ev) => !localIds.has(ev.gcal_event_id))
        .map((ev) => ({
          id: ev.gcal_event_id ?? ev.id,
          gcalEventId: ev.gcal_event_id,
          source: ev.source || (ev.gcal_event_id ? 'google' : 'local'),
          title: ev.gcal_event_id ? `[Google] ${ev.title}` : ev.title,
          rawTitle: ev.title,
          description: ev.description || '',
          start: ev.start_at,
          end: ev.end_at,
          is_all_day: !ev.start_at.includes('T'),
        }));
    }),

  updateGoogleEvent: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().optional(),
      start_at: z.string(),
      end_at: z.string().optional(),
      is_all_day: z.boolean()
    }))
    .mutation(async ({ ctx, input }) => {
      const success = await updateGoogleCalendarEvent(ctx.user.id, input.id, {
        title: input.title,
        description: input.description || '',
        start_at: input.start_at,
        end_at: input.end_at || input.start_at,
        is_all_day: input.is_all_day
      });

      if (!success) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update Google Event' });
      }
      return { success: true };
    }),

  deleteGoogleEvent: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const success = await deleteGoogleCalendarEvent(ctx.user.id, input.id);
      if (!success) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete Google Event' });
      }
      return { success: true };
    }),
});
