BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS msisdn text;

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS profile_type text;

CREATE OR REPLACE FUNCTION public.ensure_profile_exists(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_msisdn text,
  p_profile_type text DEFAULT 'customer'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, msisdn, profile_type)
  VALUES (p_user_id, p_email, p_full_name, p_msisdn, COALESCE(p_profile_type, 'customer'))
  ON CONFLICT (id) DO UPDATE
    SET
      email = COALESCE(NULLIF(public.profiles.email, ''), EXCLUDED.email),
      full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
      msisdn = CASE
        WHEN public.profiles.msisdn IS NULL OR public.profiles.msisdn = '' THEN EXCLUDED.msisdn
        ELSE public.profiles.msisdn
      END,
      profile_type = COALESCE(public.profiles.profile_type, EXCLUDED.profile_type, 'customer'),
      updated_at = now();
END;
$$;

COMMIT;
