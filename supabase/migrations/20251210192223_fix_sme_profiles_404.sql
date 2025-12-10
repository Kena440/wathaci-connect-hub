-- Fix sme_profiles 404 error (PGRST205)
-- This migration ensures the sme_profiles table schema is consistent
-- and accessible via PostgREST with proper RLS policies

BEGIN;

-- Ensure the sme_profiles table exists with correct schema
-- The table may have been created by earlier migrations with different schema
-- This uses CREATE TABLE IF NOT EXISTS to be idempotent

CREATE TABLE IF NOT EXISTS public.sme_profiles (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_type text NOT NULL DEFAULT 'sme',
  email text,
  msisdn text,
  full_name text,
  profile_slug text UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  is_profile_complete boolean NOT NULL DEFAULT false,
  approval_status text NOT NULL DEFAULT 'pending',
  business_name text NOT NULL,
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
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (user_id)
);

-- Add columns if they don't exist (for existing tables)
DO $$
BEGIN
  -- Add user_id if it doesn't exist and make it primary key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sme_profiles' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.sme_profiles 
      ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    
    -- Backfill user_id from profile_id where possible
    UPDATE public.sme_profiles 
    SET user_id = profile_id 
    WHERE user_id IS NULL AND profile_id IS NOT NULL;
    
    -- Make user_id NOT NULL
    ALTER TABLE public.sme_profiles ALTER COLUMN user_id SET NOT NULL;
  END IF;

  -- Ensure other required columns exist
  ALTER TABLE public.sme_profiles
    ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS account_type text,
    ADD COLUMN IF NOT EXISTS email text,
    ADD COLUMN IF NOT EXISTS msisdn text,
    ADD COLUMN IF NOT EXISTS full_name text,
    ADD COLUMN IF NOT EXISTS profile_slug text,
    ADD COLUMN IF NOT EXISTS is_active boolean,
    ADD COLUMN IF NOT EXISTS is_profile_complete boolean,
    ADD COLUMN IF NOT EXISTS approval_status text,
    ADD COLUMN IF NOT EXISTS business_name text,
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
    ADD COLUMN IF NOT EXISTS created_at timestamptz,
    ADD COLUMN IF NOT EXISTS updated_at timestamptz;

  -- Set defaults for columns that should have them
  ALTER TABLE public.sme_profiles
    ALTER COLUMN account_type SET DEFAULT 'sme',
    ALTER COLUMN is_active SET DEFAULT true,
    ALTER COLUMN is_profile_complete SET DEFAULT false,
    ALTER COLUMN approval_status SET DEFAULT 'pending',
    ALTER COLUMN created_at SET DEFAULT timezone('utc', now()),
    ALTER COLUMN updated_at SET DEFAULT timezone('utc', now());

  -- Make required columns NOT NULL
  ALTER TABLE public.sme_profiles
    ALTER COLUMN account_type SET NOT NULL,
    ALTER COLUMN is_active SET NOT NULL,
    ALTER COLUMN is_profile_complete SET NOT NULL,
    ALTER COLUMN approval_status SET NOT NULL,
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET NOT NULL;
END$$;

-- Ensure user_id is unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'sme_profiles_user_id_key' 
    AND conrelid = 'public.sme_profiles'::regclass
  ) THEN
    ALTER TABLE public.sme_profiles ADD CONSTRAINT sme_profiles_user_id_key UNIQUE (user_id);
  END IF;
EXCEPTION
  WHEN duplicate_table THEN
    NULL; -- Constraint already exists
END$$;

-- Ensure user_id is the primary key
DO $$
BEGIN
  -- Drop old primary key if it's on 'id' instead of 'user_id'
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'sme_profiles_pkey' 
    AND conrelid = 'public.sme_profiles'::regclass
    AND conkey = (SELECT array_agg(attnum) FROM pg_attribute 
                  WHERE attrelid = 'public.sme_profiles'::regclass 
                  AND attname = 'id')
  ) THEN
    ALTER TABLE public.sme_profiles DROP CONSTRAINT sme_profiles_pkey;
  END IF;

  -- Add primary key on user_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'sme_profiles_pkey' 
    AND conrelid = 'public.sme_profiles'::regclass
  ) THEN
    ALTER TABLE public.sme_profiles ADD PRIMARY KEY (user_id);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- If there's any error, just continue
    NULL;
END$$;

-- Create indexes
CREATE INDEX IF NOT EXISTS sme_profiles_user_id_idx ON public.sme_profiles(user_id);
CREATE INDEX IF NOT EXISTS sme_profiles_profile_id_idx ON public.sme_profiles(profile_id);

-- Ensure updated_at trigger exists
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sme_profiles_updated_at ON public.sme_profiles;
CREATE TRIGGER sme_profiles_updated_at
BEFORE UPDATE ON public.sme_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Enable RLS
ALTER TABLE public.sme_profiles ENABLE ROW LEVEL SECURITY;

-- Drop old policies to recreate them with correct logic
DROP POLICY IF EXISTS sme_profiles_manage_own ON public.sme_profiles;
DROP POLICY IF EXISTS sme_profiles_service_role_full ON public.sme_profiles;
DROP POLICY IF EXISTS sme_profiles_select_own ON public.sme_profiles;
DROP POLICY IF EXISTS sme_profiles_update_own ON public.sme_profiles;
DROP POLICY IF EXISTS sme_profiles_insert_own ON public.sme_profiles;
DROP POLICY IF EXISTS sme_profiles_directory ON public.sme_profiles;

-- Create comprehensive RLS policies
-- Policy for users to manage their own profile
CREATE POLICY sme_profiles_manage_own ON public.sme_profiles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy for service role to have full access
CREATE POLICY sme_profiles_service_role_full ON public.sme_profiles
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sme_profiles TO authenticated;
GRANT ALL ON public.sme_profiles TO service_role;

-- Notify PostgREST to reload schema cache
-- This is critical for PostgREST to recognize the table
NOTIFY pgrst, 'reload schema';

COMMIT;
