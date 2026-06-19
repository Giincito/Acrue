ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_calendar_events_deleted_at
  ON public.calendar_events(deleted_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_events_user_gcal_event_id_unique
  ON public.calendar_events(user_id, gcal_event_id);
