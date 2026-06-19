CREATE TABLE IF NOT EXISTS public.google_integrations (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  refresh_token text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.google_integrations ENABLE ROW LEVEL SECURITY;

INSERT INTO public.google_integrations (user_id, refresh_token)
SELECT id, settings->>'google_refresh_token'
FROM public.users
WHERE settings ? 'google_refresh_token'
  AND settings->>'google_refresh_token' IS NOT NULL
ON CONFLICT (user_id) DO UPDATE
SET refresh_token = EXCLUDED.refresh_token,
    updated_at = now();

UPDATE public.users
SET settings = settings - 'google_refresh_token'
WHERE settings ? 'google_refresh_token';
