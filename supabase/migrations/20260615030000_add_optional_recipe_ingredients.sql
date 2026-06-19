ALTER TABLE public.recipe_ingredients
ADD COLUMN IF NOT EXISTS is_optional boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_optional
ON public.recipe_ingredients(recipe_id, is_optional);
