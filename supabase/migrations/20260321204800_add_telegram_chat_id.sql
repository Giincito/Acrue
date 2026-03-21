-- Add column for Telegram Chat ID if it does not exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
