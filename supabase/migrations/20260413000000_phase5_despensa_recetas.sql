-- Phase 5: Despensa y Recetas — Schema Enhancements

-- Add meal_type to meal_log for meal classification (desayuno|almuerzo|merienda|cena|snack)
ALTER TABLE public.meal_log ADD COLUMN IF NOT EXISTS meal_type text;

-- Add auto_generated flag and note to shopping_list for AI-generated entries
ALTER TABLE public.shopping_list ADD COLUMN IF NOT EXISTS auto_generated boolean NOT NULL DEFAULT false;
ALTER TABLE public.shopping_list ADD COLUMN IF NOT EXISTS note text;

-- Add low_stock_alerted flag to pantry_items to prevent duplicate Telegram alerts
ALTER TABLE public.pantry_items ADD COLUMN IF NOT EXISTS low_stock_alerted boolean NOT NULL DEFAULT false;

-- Add image_url to recipes for optional recipe photos (URL reference only — no Storage upload)
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS image_url text;
