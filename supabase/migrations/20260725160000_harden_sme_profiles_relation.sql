BEGIN;

-- Ensure helper function for updated_at triggers exists
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

-- Create sme_profiles with the shape expected by the frontend
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
  social_links text[] DEFAULT '{}'::text[],
  main_challenges text[] DEFAULT '{}'::text[],
  support_needs text[] DEFAULT '{}'::text[],
  logo_url text,
  photos text[] DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Align any existing relation to the expected shape
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
  ADD COLUMN IF NOT EXISTS social_links text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS main_challenges text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS support_needs text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS photos text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc', now());

UPDATE public.sme_profiles SET business_name = 'Unnamed Business' WHERE business_name IS NULL;
UPDATE public.sme_profiles SET account_type = 'sme' WHERE account_type IS NULL;
UPDATE public.sme_profiles SET is_active = true WHERE is_active IS NULL;
UPDATE public.sme_profiles SET is_profile_complete = false WHERE is_profile_complete IS NULL;
UPDATE public.sme_profiles SET approval_status = 'pending' WHERE approval_status IS NULL;
UPDATE public.sme_profiles SET created_at = timezone('utc', now()) WHERE created_at IS NULL;
UPDATE public.sme_profiles SET updated_at = timezone('utc', now()) WHERE updated_at IS NULL;
UPDATE public.sme_profiles SET social_links = '{}'::text[] WHERE social_links IS NULL;
UPDATE public.sme_profiles SET main_challenges = '{}'::text[] WHERE main_challenges IS NULL;
UPDATE public.sme_profiles SET support_needs = '{}'::text[] WHERE support_needs IS NULL;
UPDATE public.sme_profiles SET photos = '{}'::text[] WHERE photos IS NULL;

ALTER TABLE public.sme_profiles
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN account_type SET NOT NULL,
  ALTER COLUMN is_active SET NOT NULL,
  ALTER COLUMN is_profile_complete SET NOT NULL,
  ALTER COLUMN approval_status SET NOT NULL,
  ALTER COLUMN business_name SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN social_links SET DEFAULT '{}'::text[],
  ALTER COLUMN main_challenges SET DEFAULT '{}'::text[],
  ALTER COLUMN support_needs SET DEFAULT '{}'::text[],
  ALTER COLUMN photos SET DEFAULT '{}'::text[];

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

-- Use user_id as the canonical primary identifier
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.sme_profiles'::regclass
      AND contype = 'p'
      AND conname <> 'sme_profiles_pkey'
  ) THEN
    ALTER TABLE public.sme_profiles DROP CONSTRAINT IF EXISTS sme_profiles_pkey;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.sme_profiles'::regclass
      AND contype = 'p'
      AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.sme_profiles'::regclass AND attname = 'user_id')]
  ) THEN
    ALTER TABLE public.sme_profiles ADD PRIMARY KEY (user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sme_profiles_user_id_key'
  ) THEN
    ALTER TABLE public.sme_profiles ADD CONSTRAINT sme_profiles_user_id_key UNIQUE (user_id);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS sme_profiles_user_id_idx ON public.sme_profiles(user_id);
CREATE INDEX IF NOT EXISTS sme_profiles_profile_id_idx ON public.sme_profiles(profile_id);

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
      FOR ALL TO authenticated
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sme_profiles TO authenticated;
GRANT ALL ON public.sme_profiles TO service_role;

-- Refresh PostgREST schema cache so the relation is immediately available
NOTIFY pgrst, 'reload schema';

COMMIT;
