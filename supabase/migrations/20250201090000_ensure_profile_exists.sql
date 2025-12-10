BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- Ensure the profiles table exists before altering or inserting into it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
  ) THEN
    CREATE TABLE public.profiles (
      id uuid PRIMARY KEY,
      email text,
      full_name text,
      msisdn text,
      profile_type text DEFAULT 'customer',
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Add columns safely
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS msisdn text;

    ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS profile_type text;
  END IF;
END $$;

-- Safe definition of ensure_profile_exists function
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
AS $BODY$
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
$BODY$;

COMMIT;
