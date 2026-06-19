-- Add is_default flag to categories for system-provided defaults
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- Seed default categories will be done per-user via application code on first finance access
