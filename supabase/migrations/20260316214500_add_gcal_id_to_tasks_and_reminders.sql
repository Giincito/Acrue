-- Add gcal_event_id to tasks and reminders for bidirectional sync

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS gcal_event_id text;

ALTER TABLE public.reminders 
ADD COLUMN IF NOT EXISTS gcal_event_id text;
