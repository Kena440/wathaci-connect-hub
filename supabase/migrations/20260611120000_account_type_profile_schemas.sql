BEGIN;

-- Ensure account_type_enum exists with required values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t WHERE t.typname = 'account_type_enum'
  ) THEN
    CREATE TYPE public.account_type_enum AS ENUM (
      'sme',
      'professional',
      'investor',
      'donor',
      'government_institution'
    );
  END IF;
END
$$;

-- Add any missing enum values
DO $$
DECLARE
  v label := '';
  required_values text[] := ARRAY[
    'sme',
    'professional',
    'investor',
    'donor',
    'government_institution'
  ];
BEGIN
  FOREACH v IN ARRAY required_values LOOP
    BEGIN
      EXECUTE format('ALTER TYPE public.account_type_enum ADD VALUE IF NOT EXISTS %L', v);
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END;
  END LOOP;
END
$$;

-- Standardise profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  account_type public.account_type_enum,
  profile_completed boolean NOT NULL DEFAULT false,
  country text,
  city text,
  phone text,
  profile_photo_url text,
  short_bio text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.profiles
  ALTER COLUMN profile_completed SET DEFAULT false,
  ALTER COLUMN profile_completed SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT timezone('utc', now()),
  ALTER COLUMN created_at SET DEFAULT timezone('utc', now());

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS profile_photo_url text,
  ADD COLUMN IF NOT EXISTS short_bio text;

-- Keep profile email synced with auth.users
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

-- Keep updated_at current
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

-- SME profiles
CREATE TABLE IF NOT EXISTS public.sme_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  registration_status text,
  registration_number text,
  legal_form text,
  year_established integer,
  sector text,
  sub_sector text,
  description text,
  website text,
  primary_products_services text,
  employees_full_time integer,
  employees_part_time integer,
  annual_turnover_band text,
  growth_stage text,
  funding_need boolean NOT NULL DEFAULT false,
  funding_purpose text,
  funding_amount_min numeric(18,2),
  funding_amount_max numeric(18,2),
  impact_focus jsonb,
  location_city text,
  location_country text,
  markets_served text,
  preferred_support_types text[],
  is_visible boolean NOT NULL DEFAULT true,
  tags text[],
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Professional profiles
CREATE TABLE IF NOT EXISTS public.professional_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  is_company boolean NOT NULL DEFAULT false,
  professional_bio text,
  primary_expertise text[],
  secondary_skills text[],
  years_of_experience integer,
  current_organisation text,
  qualifications text[],
  top_sectors_served text[],
  notable_projects text,
  services_offered text[],
  rate_type text,
  rate_currency text,
  rate_min numeric(18,2),
  rate_max numeric(18,2),
  availability text,
  location_city text,
  location_country text,
  phone text,
  email text,
  website text,
  linkedin_url text,
  portfolio_url text,
  languages text[],
  willing_to_travel boolean,
  remote_only boolean,
  serves_regions text[],
  accepting_new_clients boolean NOT NULL DEFAULT true,
  tags text[],
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Investor profiles
CREATE TABLE IF NOT EXISTS public.investor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organisation_name text NOT NULL,
  investor_type text,
  contact_person_name text,
  contact_email text,
  contact_phone text,
  website text,
  hq_country text,
  hq_city text,
  regions_focus text[],
  ticket_size_min numeric(18,2),
  ticket_size_max numeric(18,2),
  ticket_currency text,
  investment_stage text[],
  instruments text[],
  sectors_focus text[],
  exclusion_list text[],
  impact_focus jsonb,
  average_horizon_years integer,
  portfolio_size integer,
  portfolio_highlights text,
  ticket_frequency text,
  is_accepting_deals boolean NOT NULL DEFAULT true,
  deal_filters jsonb,
  tags text[],
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Donor profiles
CREATE TABLE IF NOT EXISTS public.donor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organisation_name text NOT NULL,
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
  typical_grant_min numeric(18,2),
  typical_grant_max numeric(18,2),
  grant_currency text,
  eligible_beneficiaries text[],
  current_programmes text,
  open_calls_url text,
  application_cycles text,
  reporting_requirements_summary text,
  impact_themes jsonb,
  accepting_applications boolean NOT NULL DEFAULT true,
  tags text[],
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Government institution profiles
CREATE TABLE IF NOT EXISTS public.government_institution_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  institution_name text NOT NULL,
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

-- Updated-at triggers for new tables
CREATE TRIGGER sme_profiles_updated_at
BEFORE UPDATE ON public.sme_profiles
FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

CREATE TRIGGER professional_profiles_updated_at
BEFORE UPDATE ON public.professional_profiles
FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

CREATE TRIGGER investor_profiles_updated_at
BEFORE UPDATE ON public.investor_profiles
FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

CREATE TRIGGER donor_profiles_updated_at
BEFORE UPDATE ON public.donor_profiles
FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

CREATE TRIGGER government_institution_profiles_updated_at
BEFORE UPDATE ON public.government_institution_profiles
FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sme_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.government_institution_profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
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

-- SME policies
DROP POLICY IF EXISTS sme_profiles_select_own ON public.sme_profiles;
DROP POLICY IF EXISTS sme_profiles_update_own ON public.sme_profiles;
DROP POLICY IF EXISTS sme_profiles_insert_own ON public.sme_profiles;
DROP POLICY IF EXISTS sme_profiles_directory ON public.sme_profiles;

CREATE POLICY sme_profiles_select_own ON public.sme_profiles
  FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY sme_profiles_update_own ON public.sme_profiles
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY sme_profiles_insert_own ON public.sme_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY sme_profiles_directory ON public.sme_profiles
  FOR SELECT TO authenticated
  USING (is_visible IS TRUE);

-- Professional policies
DROP POLICY IF EXISTS professional_profiles_select_own ON public.professional_profiles;
DROP POLICY IF EXISTS professional_profiles_update_own ON public.professional_profiles;
DROP POLICY IF EXISTS professional_profiles_insert_own ON public.professional_profiles;
DROP POLICY IF EXISTS professional_profiles_directory ON public.professional_profiles;

CREATE POLICY professional_profiles_select_own ON public.professional_profiles
  FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY professional_profiles_update_own ON public.professional_profiles
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY professional_profiles_insert_own ON public.professional_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY professional_profiles_directory ON public.professional_profiles
  FOR SELECT TO authenticated
  USING (accepting_new_clients IS TRUE);

-- Investor policies
DROP POLICY IF EXISTS investor_profiles_select_own ON public.investor_profiles;
DROP POLICY IF EXISTS investor_profiles_update_own ON public.investor_profiles;
DROP POLICY IF EXISTS investor_profiles_insert_own ON public.investor_profiles;
DROP POLICY IF EXISTS investor_profiles_directory ON public.investor_profiles;

CREATE POLICY investor_profiles_select_own ON public.investor_profiles
  FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY investor_profiles_update_own ON public.investor_profiles
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY investor_profiles_insert_own ON public.investor_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY investor_profiles_directory ON public.investor_profiles
  FOR SELECT TO authenticated
  USING (is_accepting_deals IS TRUE);

-- Donor policies
DROP POLICY IF EXISTS donor_profiles_select_own ON public.donor_profiles;
DROP POLICY IF EXISTS donor_profiles_update_own ON public.donor_profiles;
DROP POLICY IF EXISTS donor_profiles_insert_own ON public.donor_profiles;
DROP POLICY IF EXISTS donor_profiles_directory ON public.donor_profiles;

CREATE POLICY donor_profiles_select_own ON public.donor_profiles
  FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY donor_profiles_update_own ON public.donor_profiles
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY donor_profiles_insert_own ON public.donor_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY donor_profiles_directory ON public.donor_profiles
  FOR SELECT TO authenticated
  USING (accepting_applications IS TRUE);

-- Government institution policies
DROP POLICY IF EXISTS government_profiles_select_own ON public.government_institution_profiles;
DROP POLICY IF EXISTS government_profiles_update_own ON public.government_institution_profiles;
DROP POLICY IF EXISTS government_profiles_insert_own ON public.government_institution_profiles;
DROP POLICY IF EXISTS government_profiles_directory ON public.government_institution_profiles;

CREATE POLICY government_profiles_select_own ON public.government_institution_profiles
  FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY government_profiles_update_own ON public.government_institution_profiles
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY government_profiles_insert_own ON public.government_institution_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY government_profiles_directory ON public.government_institution_profiles
  FOR SELECT TO authenticated
  USING (true);

COMMIT;
