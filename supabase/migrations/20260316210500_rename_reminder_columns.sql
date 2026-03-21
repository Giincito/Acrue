ALTER TABLE public.reminders RENAME COLUMN remind_at TO trigger_at;
ALTER TABLE public.reminders RENAME COLUMN completed TO is_completed;
