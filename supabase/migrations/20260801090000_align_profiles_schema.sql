BEGIN;

-- Ensure helper for updated_at triggers exists
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

-- Ensure account type enum includes all onboarding values
DO $$
DECLARE
  v text;
  required_values text[] := ARRAY['sme','professional','investor','donor','government_institution'];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type_enum') THEN
    CREATE TYPE public.account_type_enum AS ENUM ('sme','professional','investor','donor','government_institution');
  END IF;

  FOREACH v IN ARRAY required_values LOOP
    BEGIN
      EXECUTE format('ALTER TYPE public.account_type_enum ADD VALUE IF NOT EXISTS %L', v);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END;
$$;

-- Base profiles table alignment
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  account_type public.account_type_enum,
  business_name text,
  phone text,
  msisdn text,
  profile_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS msisdn text,
  ADD COLUMN IF NOT EXISTS profile_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT timezone('utc', now());

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type public.account_type_enum;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='account_type' AND udt_name='account_type_enum'
  ) THEN
    UPDATE public.profiles SET account_type = COALESCE(account_type, 'sme'::public.account_type_enum);
    ALTER TABLE public.profiles ALTER COLUMN account_type SET DEFAULT 'sme'::public.account_type_enum;
  ELSE
    UPDATE public.profiles SET account_type = COALESCE(account_type, 'sme');
    ALTER TABLE public.profiles ALTER COLUMN account_type SET DEFAULT 'sme';
  END IF;
END;
$$;

ALTER TABLE public.profiles ALTER COLUMN account_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_profiles_updated_at') THEN
    CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
  END IF;
END;
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_manage_own'
  ) THEN
    CREATE POLICY profiles_manage_own ON public.profiles
      FOR ALL TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END;
$$;

-- SME profiles alignment
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

ALTER TABLE public.sme_profiles
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
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

UPDATE public.sme_profiles SET business_name = COALESCE(business_name, 'Unnamed Business');
UPDATE public.sme_profiles SET account_type = 'sme' WHERE account_type IS NULL;
UPDATE public.sme_profiles SET is_active = true WHERE is_active IS NULL;
UPDATE public.sme_profiles SET is_profile_complete = false WHERE is_profile_complete IS NULL;
UPDATE public.sme_profiles SET approval_status = 'pending' WHERE approval_status IS NULL;
UPDATE public.sme_profiles SET social_links = '{}'::text[] WHERE social_links IS NULL;
UPDATE public.sme_profiles SET main_challenges = '{}'::text[] WHERE main_challenges IS NULL;
UPDATE public.sme_profiles SET support_needs = '{}'::text[] WHERE support_needs IS NULL;
UPDATE public.sme_profiles SET photos = '{}'::text[] WHERE photos IS NULL;

ALTER TABLE public.sme_profiles ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.sme_profiles ALTER COLUMN business_name SET NOT NULL;
ALTER TABLE public.sme_profiles ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.sme_profiles ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE public.sme_profiles ALTER COLUMN social_links SET DEFAULT '{}'::text[];
ALTER TABLE public.sme_profiles ALTER COLUMN main_challenges SET DEFAULT '{}'::text[];
ALTER TABLE public.sme_profiles ALTER COLUMN support_needs SET DEFAULT '{}'::text[];
ALTER TABLE public.sme_profiles ALTER COLUMN photos SET DEFAULT '{}'::text[];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sme_profiles_user_id_key'
  ) THEN
    ALTER TABLE public.sme_profiles ADD CONSTRAINT sme_profiles_user_id_key UNIQUE (user_id);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS sme_profiles_user_id_idx ON public.sme_profiles(user_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sme_profiles_updated_at') THEN
    CREATE TRIGGER trg_sme_profiles_updated_at
    BEFORE UPDATE ON public.sme_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
  END IF;
END;
$$;

ALTER TABLE public.sme_profiles ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sme_profiles' AND policyname='sme_profiles_manage_own'
  ) THEN
    CREATE POLICY sme_profiles_manage_own ON public.sme_profiles
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;

-- Professional profiles alignment
CREATE TABLE IF NOT EXISTS public.professional_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  id uuid DEFAULT gen_random_uuid(),
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
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'professional',
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS msisdn text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS profile_slug text,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_profile_complete boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending',
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
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc', now());

ALTER TABLE public.professional_profiles ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.professional_profiles ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.professional_profiles ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'professional_profiles_user_id_key'
  ) THEN
    ALTER TABLE public.professional_profiles ADD CONSTRAINT professional_profiles_user_id_key UNIQUE (user_id);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS professional_profiles_user_id_idx ON public.professional_profiles(user_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_professional_profiles_updated_at') THEN
    CREATE TRIGGER trg_professional_profiles_updated_at
    BEFORE UPDATE ON public.professional_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
  END IF;
END;
$$;

ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='professional_profiles' AND policyname='professional_profiles_manage_own'
  ) THEN
    CREATE POLICY professional_profiles_manage_own ON public.professional_profiles
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;

-- Investor profiles alignment
CREATE TABLE IF NOT EXISTS public.investor_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  id uuid DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_type text NOT NULL DEFAULT 'investor',
  email text,
  msisdn text,
  full_name text,
  profile_slug text UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  is_profile_complete boolean NOT NULL DEFAULT false,
  approval_status text NOT NULL DEFAULT 'pending',
  organisation_name text NOT NULL,
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
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.investor_profiles
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'investor',
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS msisdn text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS profile_slug text,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_profile_complete boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending',
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
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc', now());

UPDATE public.investor_profiles SET account_type = 'investor' WHERE account_type IS NULL;

ALTER TABLE public.investor_profiles ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.investor_profiles ALTER COLUMN organisation_name SET NOT NULL;
ALTER TABLE public.investor_profiles ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.investor_profiles ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'investor_profiles_user_id_key'
  ) THEN
    ALTER TABLE public.investor_profiles ADD CONSTRAINT investor_profiles_user_id_key UNIQUE (user_id);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS investor_profiles_user_id_idx ON public.investor_profiles(user_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_investor_profiles_updated_at') THEN
    CREATE TRIGGER trg_investor_profiles_updated_at
    BEFORE UPDATE ON public.investor_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
  END IF;
END;
$$;

ALTER TABLE public.investor_profiles ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='investor_profiles' AND policyname='investor_profiles_manage_own'
  ) THEN
    CREATE POLICY investor_profiles_manage_own ON public.investor_profiles
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;

-- Donor profiles alignment (used by donor flows)
CREATE TABLE IF NOT EXISTS public.donor_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  id uuid DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_type text NOT NULL DEFAULT 'donor',
  email text,
  msisdn text,
  full_name text,
  profile_slug text UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  is_profile_complete boolean NOT NULL DEFAULT false,
  approval_status text NOT NULL DEFAULT 'pending',
  organisation_name text,
  donor_type text,
  contact_person_name text,
  contact_email text,
  contact_phone text,
  website text,
  hq_country text,
  hq_city text,
  countries_focus text[],
  thematic_focus text[],
  funding_modalities text[],
  typical_grant_min numeric,
  typical_grant_max numeric,
  grant_currency text,
  eligible_beneficiaries text[],
  current_programmes text,
  open_calls_url text,
  application_cycles text,
  reporting_requirements_summary text,
  impact_themes jsonb,
  accepting_applications boolean,
  tags text[],
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.donor_profiles
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'donor',
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS msisdn text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS profile_slug text,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_profile_complete boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS organisation_name text,
  ADD COLUMN IF NOT EXISTS donor_type text,
  ADD COLUMN IF NOT EXISTS contact_person_name text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS hq_country text,
  ADD COLUMN IF NOT EXISTS hq_city text,
  ADD COLUMN IF NOT EXISTS countries_focus text[],
  ADD COLUMN IF NOT EXISTS thematic_focus text[],
  ADD COLUMN IF NOT EXISTS funding_modalities text[],
  ADD COLUMN IF NOT EXISTS typical_grant_min numeric,
  ADD COLUMN IF NOT EXISTS typical_grant_max numeric,
  ADD COLUMN IF NOT EXISTS grant_currency text,
  ADD COLUMN IF NOT EXISTS eligible_beneficiaries text[],
  ADD COLUMN IF NOT EXISTS current_programmes text,
  ADD COLUMN IF NOT EXISTS open_calls_url text,
  ADD COLUMN IF NOT EXISTS application_cycles text,
  ADD COLUMN IF NOT EXISTS reporting_requirements_summary text,
  ADD COLUMN IF NOT EXISTS impact_themes jsonb,
  ADD COLUMN IF NOT EXISTS accepting_applications boolean,
  ADD COLUMN IF NOT EXISTS tags text[],
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc', now());

ALTER TABLE public.donor_profiles ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.donor_profiles ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.donor_profiles ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'donor_profiles_user_id_key'
  ) THEN
    ALTER TABLE public.donor_profiles ADD CONSTRAINT donor_profiles_user_id_key UNIQUE (user_id);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS donor_profiles_user_id_idx ON public.donor_profiles(user_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_donor_profiles_updated_at') THEN
    CREATE TRIGGER trg_donor_profiles_updated_at
    BEFORE UPDATE ON public.donor_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
  END IF;
END;
$$;

ALTER TABLE public.donor_profiles ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='donor_profiles' AND policyname='donor_profiles_manage_own'
  ) THEN
    CREATE POLICY donor_profiles_manage_own ON public.donor_profiles
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;

-- Government institution profiles (present for future flows)
CREATE TABLE IF NOT EXISTS public.government_institution_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  id uuid DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_type text NOT NULL DEFAULT 'government_institution',
  institution_name text,
  institution_type text,
  mandate_summary text,
  ministry_or_parent text,
  contact_person_name text,
  contact_email text,
  contact_phone text,
  website text,
  hq_address text,
  hq_city text,
  hq_country text,
  sme_relevant_services text[],
  service_portal_url text,
  key_programmes text,
  regulatory_scope text[],
  target_segments text[],
  response_time_sla text,
  office_hours text,
  tags text[],
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.government_institution_profiles
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'government_institution',
  ADD COLUMN IF NOT EXISTS institution_name text,
  ADD COLUMN IF NOT EXISTS institution_type text,
  ADD COLUMN IF NOT EXISTS mandate_summary text,
  ADD COLUMN IF NOT EXISTS ministry_or_parent text,
  ADD COLUMN IF NOT EXISTS contact_person_name text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS hq_address text,
  ADD COLUMN IF NOT EXISTS hq_city text,
  ADD COLUMN IF NOT EXISTS hq_country text,
  ADD COLUMN IF NOT EXISTS sme_relevant_services text[],
  ADD COLUMN IF NOT EXISTS service_portal_url text,
  ADD COLUMN IF NOT EXISTS key_programmes text,
  ADD COLUMN IF NOT EXISTS regulatory_scope text[],
  ADD COLUMN IF NOT EXISTS target_segments text[],
  ADD COLUMN IF NOT EXISTS response_time_sla text,
  ADD COLUMN IF NOT EXISTS office_hours text,
  ADD COLUMN IF NOT EXISTS tags text[],
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc', now());

ALTER TABLE public.government_institution_profiles ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.government_institution_profiles ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.government_institution_profiles ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'government_institution_profiles_user_id_key'
  ) THEN
    ALTER TABLE public.government_institution_profiles ADD CONSTRAINT government_institution_profiles_user_id_key UNIQUE (user_id);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS government_institution_profiles_user_id_idx ON public.government_institution_profiles(user_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_government_institution_profiles_updated_at') THEN
    CREATE TRIGGER trg_government_institution_profiles_updated_at
    BEFORE UPDATE ON public.government_institution_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
  END IF;
END;
$$;

ALTER TABLE public.government_institution_profiles ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='government_institution_profiles' AND policyname='government_institution_profiles_manage_own'
  ) THEN
    CREATE POLICY government_institution_profiles_manage_own ON public.government_institution_profiles
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';

COMMIT;
