CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.moodle_credentials (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  encrypted_username bytea NOT NULL,
  encrypted_password bytea NOT NULL,
  token text,
  token_expires_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.moodle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  moodle_id bigint NOT NULL,
  parent_moodle_id bigint,
  course_id bigint,
  course_name text NOT NULL DEFAULT 'Curso',
  type text NOT NULL,
  title text NOT NULL,
  description text,
  url text,
  event_date timestamptz,
  is_completed boolean NOT NULL DEFAULT false,
  user_notes text,
  ai_summary text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_moodle_events_user_moodle_id_type
  ON public.moodle_events(user_id, moodle_id, type);

CREATE INDEX IF NOT EXISTS idx_moodle_events_user_event_date
  ON public.moodle_events(user_id, event_date);

ALTER TABLE public.moodle_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moodle_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'moodle_events'
      AND policyname = 'moodle_events_user_access'
  ) THEN
    CREATE POLICY moodle_events_user_access
      ON public.moodle_events
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.can_access_user_data(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT auth.role() = 'service_role' OR auth.uid() = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.store_moodle_creds(
  p_user_id uuid,
  p_username text,
  p_password text,
  p_key text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_access_user_data(p_user_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.moodle_credentials (
    user_id,
    encrypted_username,
    encrypted_password,
    updated_at
  )
  VALUES (
    p_user_id,
    pgp_sym_encrypt(p_username, p_key),
    pgp_sym_encrypt(p_password, p_key),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET encrypted_username = EXCLUDED.encrypted_username,
      encrypted_password = EXCLUDED.encrypted_password,
      token = NULL,
      token_expires_at = NULL,
      updated_at = now();
END;
$$;

DROP FUNCTION IF EXISTS public.decrypt_moodle_creds(uuid, text);

CREATE OR REPLACE FUNCTION public.decrypt_moodle_creds(
  p_user_id uuid,
  p_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  credential_record public.moodle_credentials%ROWTYPE;
BEGIN
  IF NOT public.can_access_user_data(p_user_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT *
  INTO credential_record
  FROM public.moodle_credentials
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'username', pgp_sym_decrypt(credential_record.encrypted_username, p_key),
    'password', pgp_sym_decrypt(credential_record.encrypted_password, p_key)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_moodle_creds(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_access_user_data(p_user_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM public.moodle_credentials WHERE user_id = p_user_id;
  DELETE FROM public.moodle_events WHERE user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_total_xp(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(xp_delta), 0)::integer
  FROM public.xp_events
  WHERE user_id = p_user_id
    AND public.can_access_user_data(p_user_id);
$$;

REVOKE ALL ON FUNCTION public.decrypt_moodle_creds(uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_moodle_creds(uuid, text) TO service_role;

GRANT EXECUTE ON FUNCTION public.store_moodle_creds(uuid, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_moodle_creds(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_total_xp(uuid) TO authenticated, service_role;
