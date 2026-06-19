ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS custom_rule jsonb;

ALTER TABLE public.habit_logs
  ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'complete';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'habit_logs_event_type_check'
  ) THEN
    ALTER TABLE public.habit_logs
      ADD CONSTRAINT habit_logs_event_type_check
      CHECK (event_type IN ('complete', 'uncomplete'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'wishlist_items_status_check'
  ) THEN
    ALTER TABLE public.wishlist_items
      ADD CONSTRAINT wishlist_items_status_check
      CHECK (status IN ('wanted', 'saved', 'purchased'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_day
  ON public.habit_logs (habit_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_status
  ON public.wishlist_items (user_id, status, priority);

CREATE INDEX IF NOT EXISTS idx_xp_events_user_created_at
  ON public.xp_events (user_id, created_at DESC);
