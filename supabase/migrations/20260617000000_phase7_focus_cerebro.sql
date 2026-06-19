-- Phase 7: Focus sessions and Cerebro metadata.

CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  mode text NOT NULL CHECK (mode IN ('pomodoro', 'custom')),
  work_minutes integer NOT NULL CHECK (work_minutes BETWEEN 1 AND 60),
  break_minutes integer NOT NULL CHECK (break_minutes BETWEEN 1 AND 60),
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow individual read/write access" ON public.focus_sessions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.note_embeddings
  ADD COLUMN IF NOT EXISTS notebook_title text,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS snippet text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS note_embeddings_identity_idx
  ON public.note_embeddings(user_id, notebook_id, note_id);

CREATE OR REPLACE FUNCTION public.match_note_embeddings(
  p_user_id uuid,
  p_query_embedding vector(768),
  p_limit integer DEFAULT 6
)
RETURNS TABLE (
  notebook_id text,
  notebook_title text,
  note_id text,
  title text,
  snippet text,
  source_url text,
  similarity double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ne.notebook_id,
    ne.notebook_title,
    ne.note_id,
    ne.title,
    ne.snippet,
    ne.source_url,
    1 - (ne.embedding <=> p_query_embedding) AS similarity
  FROM public.note_embeddings ne
  WHERE ne.user_id = p_user_id
    AND ne.embedding IS NOT NULL
  ORDER BY ne.embedding <=> p_query_embedding
  LIMIT LEAST(GREATEST(p_limit, 1), 12);
$$;
