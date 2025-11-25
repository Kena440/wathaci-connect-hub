-- Create professional_profiles table and supporting onboarding tables
-- Generated to align frontend onboarding flows for professional, SME, and investor/donor accounts

BEGIN;

-- Professional profiles core table
CREATE TABLE IF NOT EXISTS public.professional_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  full_name text NOT NULL,
  organisation_name text,
  bio text,
  primary_expertise text[] NOT NULL DEFAULT '{}',
  secondary_skills text[] DEFAULT '{}',
  years_of_experience int,
  current_organisation text,
  qualifications text,
  top_sectors text[] DEFAULT '{}',
  notable_projects text,
  services_offered text[] DEFAULT '{}',
  expected_rates text,
  location_city text,
  location_country text,
  phone text,
  email text,
  linkedin_url text,
  website_url text,
  portfolio_url text,
  availability text,
  notes text,
  profile_photo_url text,
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure additive columns exist if table was pre-created
DO $$
DECLARE
  col RECORD;
BEGIN
  FOR col IN
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'professional_profiles'
  LOOP
    -- placeholder to satisfy DO block structure
    NULL;
  END LOOP;
END $$;

-- Add missing columns defensively
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'professional_profiles' AND column_name = 'entity_type') THEN
    ALTER TABLE public.professional_profiles ADD COLUMN entity_type text NOT NULL DEFAULT 'individual';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'professional_profiles' AND column_name = 'services_offered') THEN
    ALTER TABLE public.professional_profiles ADD COLUMN services_offered text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'professional_profiles' AND column_name = 'primary_expertise') THEN
    ALTER TABLE public.professional_profiles ADD COLUMN primary_expertise text[] NOT NULL DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'professional_profiles' AND column_name = 'secondary_skills') THEN
    ALTER TABLE public.professional_profiles ADD COLUMN secondary_skills text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'professional_profiles' AND column_name = 'top_sectors') THEN
    ALTER TABLE public.professional_profiles ADD COLUMN top_sectors text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'professional_profiles' AND column_name = 'availability') THEN
    ALTER TABLE public.professional_profiles ADD COLUMN availability text;
  END IF;
END $$;

-- Unique professional profile per user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'professional_profiles_user_id_key'
  ) THEN
    ALTER TABLE public.professional_profiles
      ADD CONSTRAINT professional_profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Check constraint for supported entity types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'professional_entity_type_check'
  ) THEN
    ALTER TABLE public.professional_profiles
      ADD CONSTRAINT professional_entity_type_check
      CHECK (entity_type IN ('individual', 'firm', 'company'));
  END IF;
END $$;

-- Timestamp trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_professional_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_professional_profiles_updated_at ON public.professional_profiles;
CREATE TRIGGER trg_professional_profiles_updated_at
BEFORE UPDATE ON public.professional_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_professional_profiles_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS professional_profiles_user_id_idx ON public.professional_profiles(user_id);
CREATE INDEX IF NOT EXISTS professional_profiles_entity_type_idx ON public.professional_profiles(entity_type);

-- Row level security
ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS professional_profiles_select ON public.professional_profiles;
DROP POLICY IF EXISTS professional_profiles_modify ON public.professional_profiles;
DROP POLICY IF EXISTS professional_profiles_service_role ON public.professional_profiles;

CREATE POLICY professional_profiles_select
  ON public.professional_profiles
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role_name IN ('admin', 'super_admin')
    )
  );

CREATE POLICY professional_profiles_modify
  ON public.professional_profiles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY professional_profiles_service_role
  ON public.professional_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- SME onboarding profile table
CREATE TABLE IF NOT EXISTS public.sme_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  business_name text NOT NULL,
  registration_number text,
  registration_type text,
  sector text,
  subsector text,
  years_in_operation int,
  employee_count int,
  turnover_bracket text,
  products_overview text,
  target_market text,
  location_city text,
  location_country text,
  contact_name text,
  contact_phone text,
  business_email text,
  website_url text,
  social_links text[] DEFAULT '{}',
  main_challenges text[] DEFAULT '{}',
  support_needs text[] DEFAULT '{}',
  logo_url text,
  photos text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sme_profiles_user_id_key'
  ) THEN
    ALTER TABLE public.sme_profiles
      ADD CONSTRAINT sme_profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS sme_profiles_user_id_idx ON public.sme_profiles(user_id);
ALTER TABLE public.sme_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sme_profiles_select ON public.sme_profiles;
DROP POLICY IF EXISTS sme_profiles_modify ON public.sme_profiles;
DROP POLICY IF EXISTS sme_profiles_service_role ON public.sme_profiles;

CREATE POLICY sme_profiles_select
  ON public.sme_profiles
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role_name IN ('admin', 'super_admin')
    )
  );

CREATE POLICY sme_profiles_modify
  ON public.sme_profiles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY sme_profiles_service_role
  ON public.sme_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_sme_profiles_updated_at ON public.sme_profiles;
CREATE TRIGGER trg_sme_profiles_updated_at
BEFORE UPDATE ON public.sme_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_professional_profiles_updated_at();

-- Investor / Donor onboarding profile table
CREATE TABLE IF NOT EXISTS public.investor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  organisation_name text NOT NULL,
  investor_type text,
  ticket_size_min int,
  ticket_size_max int,
  preferred_sectors text[] DEFAULT '{}',
  country_focus text[] DEFAULT '{}',
  stage_preference text[] DEFAULT '{}',
  instruments text[] DEFAULT '{}',
  impact_focus text[] DEFAULT '{}',
  contact_person text,
  contact_role text,
  website_url text,
  linkedin_url text,
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'investor_profiles_user_id_key'
  ) THEN
    ALTER TABLE public.investor_profiles
      ADD CONSTRAINT investor_profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS investor_profiles_user_id_idx ON public.investor_profiles(user_id);
ALTER TABLE public.investor_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS investor_profiles_select ON public.investor_profiles;
DROP POLICY IF EXISTS investor_profiles_modify ON public.investor_profiles;
DROP POLICY IF EXISTS investor_profiles_service_role ON public.investor_profiles;

CREATE POLICY investor_profiles_select
  ON public.investor_profiles
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role_name IN ('admin', 'super_admin')
    )
  );

CREATE POLICY investor_profiles_modify
  ON public.investor_profiles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY investor_profiles_service_role
  ON public.investor_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_investor_profiles_updated_at ON public.investor_profiles;
CREATE TRIGGER trg_investor_profiles_updated_at
BEFORE UPDATE ON public.investor_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_professional_profiles_updated_at();

-- Private storage bucket for profile media
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-media', 'profile-media', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Storage policies for owner and service role access
DROP POLICY IF EXISTS "Profile media user access" ON storage.objects;
DROP POLICY IF EXISTS "Profile media service role access" ON storage.objects;

CREATE POLICY "Profile media user access"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'profile-media' AND auth.uid() = owner)
  WITH CHECK (bucket_id = 'profile-media' AND auth.uid() = owner);

CREATE POLICY "Profile media service role access"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
