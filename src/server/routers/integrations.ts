import { router, protectedProcedure } from '../trpc';
import { fetchGoogleCalendarEvents } from '@/lib/google-calendar';

export const integrationRouter = router({
  googleCalendarEvents: protectedProcedure
    .query(async ({ ctx }) => {
      // Graceful fallback internally managed by `fetchGoogleCalendarEvents`
      const events = await fetchGoogleCalendarEvents(ctx.user.id);
      return events.map((ev: any) => ({
        id: ev.id,
        title: `[Google] ${ev.summary}`,
        start: ev.start.dateTime || ev.start.date,
        end: ev.end.dateTime || ev.end.date,
      }));
    }),
});
