-- Enable pg_cron extension if not already enabled (Supabase usually has it available)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Create function to clean up deleted records (older than 7 days)
CREATE OR REPLACE FUNCTION clean_up_trash()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.tasks WHERE deleted_at < now() - interval '7 days';
  DELETE FROM public.assignments WHERE deleted_at < now() - interval '7 days';
  DELETE FROM public.expenses WHERE deleted_at < now() - interval '7 days';
  DELETE FROM public.meal_log WHERE deleted_at < now() - interval '7 days';
END;
$$;

-- Schedule job to run once a day at 3 AM
-- Note: Requires pg_cron, if it conflicts, use update cron.schedule
SELECT cron.schedule('clean-up-trash-job', '0 3 * * *', 'SELECT clean_up_trash()');
