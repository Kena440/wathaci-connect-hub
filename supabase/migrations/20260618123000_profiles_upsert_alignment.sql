BEGIN;

-- Ensure account_type_enum contains all values used by the application and legacy data
DO $$
DECLARE
  v text;
  required_values text[] := ARRAY['sme', 'professional', 'investor', 'donor', 'government_institution', 'sole_proprietor', 'government'];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'account_type_enum'
  ) THEN
    EXECUTE 'CREATE TYPE public.account_type_enum AS ENUM (''sme'',''professional'',''investor'',''donor'',''government_institution'',''sole_proprietor'',''government'')';
  ELSE
    FOREACH v IN ARRAY required_values LOOP
      BEGIN
        EXECUTE format('ALTER TYPE public.account_type_enum ADD VALUE IF NOT EXISTS %L', v);
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END;
    END LOOP;
  END IF;
END
$$;

-- Base profiles table definition
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  account_type public.account_type_enum NOT NULL DEFAULT 'sme',
  profile_completed boolean NOT NULL DEFAULT false,
  country text,
  city text,
  phone text,
  profile_photo_url text,
  short_bio text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Ensure required columns exist for signup/onboarding payloads
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS msisdn text,
  ADD COLUMN IF NOT EXISTS accepted_terms boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS newsletter_opt_in boolean NOT NULL DEFAULT false;

-- Keep constraints in place for upserts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_pkey'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;
  END IF;
END
$$;

ALTER TABLE public.profiles
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN profile_completed SET NOT NULL,
  ALTER COLUMN profile_completed SET DEFAULT false,
  ALTER COLUMN account_type SET NOT NULL,
  ALTER COLUMN account_type SET DEFAULT 'sme';

-- Maintain email and updated_at consistency
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.id;
  IF NEW.email IS NULL THEN
    NEW.email := user_email;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_email_trigger ON public.profiles;
CREATE TRIGGER sync_profile_email_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE public.sync_profile_email();

DROP TRIGGER IF EXISTS profiles_updated_at_trigger ON public.profiles;
CREATE TRIGGER profiles_updated_at_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- Keep MSISDN validation aligned with payload expectations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_msisdn_format_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_msisdn_format_check
      CHECK (msisdn IS NULL OR msisdn ~ '^\+?[0-9]{9,15}$');
  END IF;
END
$$;

-- RLS policies to allow authenticated users to manage their own profile
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_owner ON public.profiles;

CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_insert_owner ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Refresh PostgREST schema cache to avoid stale column errors
NOTIFY pgrst, 'reload schema';

COMMIT;
