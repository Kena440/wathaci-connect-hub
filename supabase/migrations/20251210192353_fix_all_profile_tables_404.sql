-- Fix all profile tables 404 errors (PGRST205)
-- This migration ensures professional_profiles and investor_profiles tables
-- are consistent and accessible via PostgREST with proper RLS policies

BEGIN;

-- Ensure updated_at trigger function exists
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

-- =============================================================================
-- PROFESSIONAL PROFILES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.professional_profiles (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_type text NOT NULL DEFAULT 'professional',
  email text,
  msisdn text,
  full_name text,
  profile_slug text UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  is_profile_complete boolean NOT NULL DEFAULT false,
  approval_status text NOT NULL DEFAULT 'pending',
  entity_type text,
  organisation_name text,
  bio text,
  primary_expertise text[],
  secondary_skills text[],
  years_of_experience integer,
  current_organisation text,
  qualifications text,
  top_sectors text[],
  notable_projects text,
  services_offered text[],
  expected_rates text,
  location_city text,
  location_country text,
  phone text,
  linkedin_url text,
  website_url text,
  portfolio_url text,
  availability text,
  notes text,
  profile_photo_url text,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (user_id)
);

-- Add columns if they don't exist (for existing tables)
DO $$
BEGIN
  -- Add user_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'professional_profiles' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.professional_profiles 
      ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    
    UPDATE public.professional_profiles 
    SET user_id = profile_id 
    WHERE user_id IS NULL AND profile_id IS NOT NULL;
    
    ALTER TABLE public.professional_profiles ALTER COLUMN user_id SET NOT NULL;
  END IF;

  -- Ensure all required columns exist
  ALTER TABLE public.professional_profiles
    ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS account_type text,
    ADD COLUMN IF NOT EXISTS email text,
    ADD COLUMN IF NOT EXISTS msisdn text,
    ADD COLUMN IF NOT EXISTS full_name text,
    ADD COLUMN IF NOT EXISTS profile_slug text,
    ADD COLUMN IF NOT EXISTS is_active boolean,
    ADD COLUMN IF NOT EXISTS is_profile_complete boolean,
    ADD COLUMN IF NOT EXISTS approval_status text,
    ADD COLUMN IF NOT EXISTS entity_type text,
    ADD COLUMN IF NOT EXISTS organisation_name text,
    ADD COLUMN IF NOT EXISTS bio text,
    ADD COLUMN IF NOT EXISTS primary_expertise text[],
    ADD COLUMN IF NOT EXISTS secondary_skills text[],
    ADD COLUMN IF NOT EXISTS years_of_experience integer,
    ADD COLUMN IF NOT EXISTS current_organisation text,
    ADD COLUMN IF NOT EXISTS qualifications text,
    ADD COLUMN IF NOT EXISTS top_sectors text[],
    ADD COLUMN IF NOT EXISTS notable_projects text,
    ADD COLUMN IF NOT EXISTS services_offered text[],
    ADD COLUMN IF NOT EXISTS expected_rates text,
    ADD COLUMN IF NOT EXISTS location_city text,
    ADD COLUMN IF NOT EXISTS location_country text,
    ADD COLUMN IF NOT EXISTS phone text,
    ADD COLUMN IF NOT EXISTS linkedin_url text,
    ADD COLUMN IF NOT EXISTS website_url text,
    ADD COLUMN IF NOT EXISTS portfolio_url text,
    ADD COLUMN IF NOT EXISTS availability text,
    ADD COLUMN IF NOT EXISTS notes text,
    ADD COLUMN IF NOT EXISTS profile_photo_url text,
    ADD COLUMN IF NOT EXISTS logo_url text,
    ADD COLUMN IF NOT EXISTS created_at timestamptz,
    ADD COLUMN IF NOT EXISTS updated_at timestamptz;

  -- Set defaults
  ALTER TABLE public.professional_profiles
    ALTER COLUMN account_type SET DEFAULT 'professional',
    ALTER COLUMN is_active SET DEFAULT true,
    ALTER COLUMN is_profile_complete SET DEFAULT false,
    ALTER COLUMN approval_status SET DEFAULT 'pending',
    ALTER COLUMN created_at SET DEFAULT timezone('utc', now()),
    ALTER COLUMN updated_at SET DEFAULT timezone('utc', now());

  -- Update NULL values before setting NOT NULL constraints
  UPDATE public.professional_profiles SET account_type = 'professional' WHERE account_type IS NULL;
  UPDATE public.professional_profiles SET is_active = true WHERE is_active IS NULL;
  UPDATE public.professional_profiles SET is_profile_complete = false WHERE is_profile_complete IS NULL;
  UPDATE public.professional_profiles SET approval_status = 'pending' WHERE approval_status IS NULL;
  UPDATE public.professional_profiles SET created_at = timezone('utc', now()) WHERE created_at IS NULL;
  UPDATE public.professional_profiles SET updated_at = timezone('utc', now()) WHERE updated_at IS NULL;

  -- Set NOT NULL where required
  ALTER TABLE public.professional_profiles
    ALTER COLUMN account_type SET NOT NULL,
    ALTER COLUMN is_active SET NOT NULL,
    ALTER COLUMN is_profile_complete SET NOT NULL,
    ALTER COLUMN approval_status SET NOT NULL,
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET NOT NULL;
END$$;

-- Ensure user_id is unique and primary key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'professional_profiles_user_id_key' 
    AND conrelid = 'public.professional_profiles'::regclass
  ) THEN
    ALTER TABLE public.professional_profiles ADD CONSTRAINT professional_profiles_user_id_key UNIQUE (user_id);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Constraint already exists
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not add unique constraint on user_id: %', SQLERRM;
END$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'professional_profiles_pkey' 
    AND conrelid = 'public.professional_profiles'::regclass
    AND conkey = (SELECT array_agg(attnum) FROM pg_attribute 
                  WHERE attrelid = 'public.professional_profiles'::regclass 
                  AND attname = 'id')
  ) THEN
    ALTER TABLE public.professional_profiles DROP CONSTRAINT professional_profiles_pkey;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'professional_profiles_pkey' 
    AND conrelid = 'public.professional_profiles'::regclass
  ) THEN
    ALTER TABLE public.professional_profiles ADD PRIMARY KEY (user_id);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not set primary key on user_id: %', SQLERRM;
END$$;

CREATE INDEX IF NOT EXISTS professional_profiles_user_id_idx ON public.professional_profiles(user_id);
CREATE INDEX IF NOT EXISTS professional_profiles_profile_id_idx ON public.professional_profiles(profile_id);

DROP TRIGGER IF EXISTS professional_profiles_updated_at ON public.professional_profiles;
CREATE TRIGGER professional_profiles_updated_at
BEFORE UPDATE ON public.professional_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS professional_profiles_manage_own ON public.professional_profiles;
DROP POLICY IF EXISTS professional_profiles_service_role_full ON public.professional_profiles;
DROP POLICY IF EXISTS professional_profiles_select_own ON public.professional_profiles;
DROP POLICY IF EXISTS professional_profiles_update_own ON public.professional_profiles;
DROP POLICY IF EXISTS professional_profiles_insert_own ON public.professional_profiles;
DROP POLICY IF EXISTS professional_profiles_directory ON public.professional_profiles;

CREATE POLICY professional_profiles_manage_own ON public.professional_profiles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY professional_profiles_service_role_full ON public.professional_profiles
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.professional_profiles TO authenticated;
GRANT ALL ON public.professional_profiles TO service_role;

-- =============================================================================
-- INVESTOR PROFILES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.investor_profiles (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_type text NOT NULL DEFAULT 'investor',
  email text,
  msisdn text,
  full_name text,
  profile_slug text UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  is_profile_complete boolean NOT NULL DEFAULT false,
  approval_status text NOT NULL DEFAULT 'pending',
  organisation_name text,
  investor_type text,
  ticket_size_min numeric,
  ticket_size_max numeric,
  preferred_sectors text[],
  country_focus text[],
  stage_preference text[],
  instruments text[],
  impact_focus text[],
  contact_person text,
  contact_role text,
  website_url text,
  linkedin_url text,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (user_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'investor_profiles' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.investor_profiles 
      ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    
    UPDATE public.investor_profiles 
    SET user_id = profile_id 
    WHERE user_id IS NULL AND profile_id IS NOT NULL;
    
    ALTER TABLE public.investor_profiles ALTER COLUMN user_id SET NOT NULL;
  END IF;

  ALTER TABLE public.investor_profiles
    ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS account_type text,
    ADD COLUMN IF NOT EXISTS email text,
    ADD COLUMN IF NOT EXISTS msisdn text,
    ADD COLUMN IF NOT EXISTS full_name text,
    ADD COLUMN IF NOT EXISTS profile_slug text,
    ADD COLUMN IF NOT EXISTS is_active boolean,
    ADD COLUMN IF NOT EXISTS is_profile_complete boolean,
    ADD COLUMN IF NOT EXISTS approval_status text,
    ADD COLUMN IF NOT EXISTS organisation_name text,
    ADD COLUMN IF NOT EXISTS investor_type text,
    ADD COLUMN IF NOT EXISTS ticket_size_min numeric,
    ADD COLUMN IF NOT EXISTS ticket_size_max numeric,
    ADD COLUMN IF NOT EXISTS preferred_sectors text[],
    ADD COLUMN IF NOT EXISTS country_focus text[],
    ADD COLUMN IF NOT EXISTS stage_preference text[],
    ADD COLUMN IF NOT EXISTS instruments text[],
    ADD COLUMN IF NOT EXISTS impact_focus text[],
    ADD COLUMN IF NOT EXISTS contact_person text,
    ADD COLUMN IF NOT EXISTS contact_role text,
    ADD COLUMN IF NOT EXISTS website_url text,
    ADD COLUMN IF NOT EXISTS linkedin_url text,
    ADD COLUMN IF NOT EXISTS logo_url text,
    ADD COLUMN IF NOT EXISTS created_at timestamptz,
    ADD COLUMN IF NOT EXISTS updated_at timestamptz;

  ALTER TABLE public.investor_profiles
    ALTER COLUMN account_type SET DEFAULT 'investor',
    ALTER COLUMN is_active SET DEFAULT true,
    ALTER COLUMN is_profile_complete SET DEFAULT false,
    ALTER COLUMN approval_status SET DEFAULT 'pending',
    ALTER COLUMN created_at SET DEFAULT timezone('utc', now()),
    ALTER COLUMN updated_at SET DEFAULT timezone('utc', now());

  -- Update NULL values before setting NOT NULL constraints
  UPDATE public.investor_profiles SET account_type = 'investor' WHERE account_type IS NULL;
  UPDATE public.investor_profiles SET is_active = true WHERE is_active IS NULL;
  UPDATE public.investor_profiles SET is_profile_complete = false WHERE is_profile_complete IS NULL;
  UPDATE public.investor_profiles SET approval_status = 'pending' WHERE approval_status IS NULL;
  UPDATE public.investor_profiles SET created_at = timezone('utc', now()) WHERE created_at IS NULL;
  UPDATE public.investor_profiles SET updated_at = timezone('utc', now()) WHERE updated_at IS NULL;

  ALTER TABLE public.investor_profiles
    ALTER COLUMN account_type SET NOT NULL,
    ALTER COLUMN is_active SET NOT NULL,
    ALTER COLUMN is_profile_complete SET NOT NULL,
    ALTER COLUMN approval_status SET NOT NULL,
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET NOT NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'investor_profiles_user_id_key' 
    AND conrelid = 'public.investor_profiles'::regclass
  ) THEN
    ALTER TABLE public.investor_profiles ADD CONSTRAINT investor_profiles_user_id_key UNIQUE (user_id);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Constraint already exists
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not add unique constraint on user_id: %', SQLERRM;
END$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'investor_profiles_pkey' 
    AND conrelid = 'public.investor_profiles'::regclass
    AND conkey = (SELECT array_agg(attnum) FROM pg_attribute 
                  WHERE attrelid = 'public.investor_profiles'::regclass 
                  AND attname = 'id')
  ) THEN
    ALTER TABLE public.investor_profiles DROP CONSTRAINT investor_profiles_pkey;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'investor_profiles_pkey' 
    AND conrelid = 'public.investor_profiles'::regclass
  ) THEN
    ALTER TABLE public.investor_profiles ADD PRIMARY KEY (user_id);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not set primary key on user_id: %', SQLERRM;
END$$;

CREATE INDEX IF NOT EXISTS investor_profiles_user_id_idx ON public.investor_profiles(user_id);
CREATE INDEX IF NOT EXISTS investor_profiles_profile_id_idx ON public.investor_profiles(profile_id);

DROP TRIGGER IF EXISTS investor_profiles_updated_at ON public.investor_profiles;
CREATE TRIGGER investor_profiles_updated_at
BEFORE UPDATE ON public.investor_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.investor_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS investor_profiles_manage_own ON public.investor_profiles;
DROP POLICY IF EXISTS investor_profiles_service_role_full ON public.investor_profiles;
DROP POLICY IF EXISTS investor_profiles_select_own ON public.investor_profiles;
DROP POLICY IF EXISTS investor_profiles_update_own ON public.investor_profiles;
DROP POLICY IF EXISTS investor_profiles_insert_own ON public.investor_profiles;
DROP POLICY IF EXISTS investor_profiles_directory ON public.investor_profiles;

CREATE POLICY investor_profiles_manage_own ON public.investor_profiles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY investor_profiles_service_role_full ON public.investor_profiles
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.investor_profiles TO authenticated;
GRANT ALL ON public.investor_profiles TO service_role;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
