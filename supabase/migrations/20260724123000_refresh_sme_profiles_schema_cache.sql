BEGIN;

-- Safety: ensure updated_at helper exists for triggers below
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

-- Recreate/ensure sme_profiles with the expected schema
-- user_id is the canonical primary key (aligned with auth.users.id)
-- id is retained only for legacy references; new code should rely on user_id and should not introduce new dependencies on id
CREATE TABLE IF NOT EXISTS public.sme_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  id uuid DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_type text NOT NULL DEFAULT 'sme',
  email text,
  msisdn text,
  full_name text,
  profile_slug text UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  is_profile_complete boolean NOT NULL DEFAULT false,
  approval_status text NOT NULL DEFAULT 'pending',
  business_name text NOT NULL DEFAULT 'Unnamed Business',
  registration_number text,
  registration_type text,
  sector text,
  subsector text,
  years_in_operation integer,
  employee_count integer,
  turnover_bracket text,
  products_overview text,
  target_market text,
  location_city text,
  location_country text,
  contact_name text,
  contact_phone text,
  business_email text,
  website_url text,
  social_links text[],
  main_challenges text[],
  support_needs text[],
  logo_url text,
  photos text[],
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Align any older tables to the expected shape
ALTER TABLE public.sme_profiles
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS profile_id uuid,
  ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'sme',
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS msisdn text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS profile_slug text,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_profile_complete boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS business_name text DEFAULT 'Unnamed Business',
  ADD COLUMN IF NOT EXISTS registration_number text,
  ADD COLUMN IF NOT EXISTS registration_type text,
  ADD COLUMN IF NOT EXISTS sector text,
  ADD COLUMN IF NOT EXISTS subsector text,
  ADD COLUMN IF NOT EXISTS years_in_operation integer,
  ADD COLUMN IF NOT EXISTS employee_count integer,
  ADD COLUMN IF NOT EXISTS turnover_bracket text,
  ADD COLUMN IF NOT EXISTS products_overview text,
  ADD COLUMN IF NOT EXISTS target_market text,
  ADD COLUMN IF NOT EXISTS location_city text,
  ADD COLUMN IF NOT EXISTS location_country text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS business_email text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS social_links text[],
  ADD COLUMN IF NOT EXISTS main_challenges text[],
  ADD COLUMN IF NOT EXISTS support_needs text[],
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS photos text[],
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc', now());

UPDATE public.sme_profiles
SET business_name = 'Unnamed Business'
WHERE business_name IS NULL;

ALTER TABLE public.sme_profiles
  ALTER COLUMN business_name SET DEFAULT 'Unnamed Business',
  ALTER COLUMN business_name SET NOT NULL;

UPDATE public.sme_profiles SET account_type = 'sme' WHERE account_type IS NULL;
UPDATE public.sme_profiles SET is_active = true WHERE is_active IS NULL;
UPDATE public.sme_profiles SET is_profile_complete = false WHERE is_profile_complete IS NULL;
UPDATE public.sme_profiles SET approval_status = 'pending' WHERE approval_status IS NULL;
UPDATE public.sme_profiles SET created_at = timezone('utc', now()) WHERE created_at IS NULL;
UPDATE public.sme_profiles SET updated_at = timezone('utc', now()) WHERE updated_at IS NULL;

ALTER TABLE public.sme_profiles
  ALTER COLUMN account_type SET DEFAULT 'sme',
  ALTER COLUMN account_type SET NOT NULL,
  ALTER COLUMN is_active SET DEFAULT true,
  ALTER COLUMN is_active SET NOT NULL,
  ALTER COLUMN is_profile_complete SET DEFAULT false,
  ALTER COLUMN is_profile_complete SET NOT NULL,
  ALTER COLUMN approval_status SET DEFAULT 'pending',
  ALTER COLUMN approval_status SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT timezone('utc', now()),
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT timezone('utc', now()),
  ALTER COLUMN updated_at SET NOT NULL;

-- Backfill user_id if legacy rows still rely on profile_id
UPDATE public.sme_profiles
SET user_id = p.id
FROM public.profiles p
JOIN auth.users u ON u.id = p.id -- profiles.id matches auth.users.id
WHERE public.sme_profiles.user_id IS NULL
  AND public.sme_profiles.profile_id = p.id;

DELETE FROM public.sme_profiles sp
WHERE sp.user_id IS NULL
  OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = sp.user_id);

ALTER TABLE public.sme_profiles ALTER COLUMN user_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sme_profiles_user_id_fkey'
  ) THEN
    ALTER TABLE public.sme_profiles
      ADD CONSTRAINT sme_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sme_profiles_profile_id_fkey'
  ) THEN
    ALTER TABLE public.sme_profiles
      ADD CONSTRAINT sme_profiles_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  -- If user_id is not already the primary key, enforce uniqueness and index
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.sme_profiles'::regclass
      AND c.contype = 'p'
      AND c.conkey = ARRAY[
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.sme_profiles'::regclass AND attname = 'user_id')
      ]
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'sme_profiles_user_id_key'
    ) THEN
      ALTER TABLE public.sme_profiles ADD CONSTRAINT sme_profiles_user_id_key UNIQUE (user_id);
    END IF;

    CREATE INDEX IF NOT EXISTS sme_profiles_user_id_idx ON public.sme_profiles(user_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sme_profiles_updated_at'
  ) THEN
    CREATE TRIGGER trg_sme_profiles_updated_at
    BEFORE UPDATE ON public.sme_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
  END IF;
END$$;

ALTER TABLE public.sme_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sme_profiles' AND policyname = 'sme_profiles_manage_own'
  ) THEN
    CREATE POLICY sme_profiles_manage_own ON public.sme_profiles
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sme_profiles' AND policyname = 'sme_profiles_service_role_full'
  ) THEN
    CREATE POLICY sme_profiles_service_role_full ON public.sme_profiles
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END$$;

-- Force PostgREST to refresh its schema cache so sme_profiles becomes immediately available
NOTIFY pgrst, 'reload schema';

COMMIT;
