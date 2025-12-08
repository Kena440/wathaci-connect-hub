BEGIN;

-- Ensure business_name exists on profiles for all account types
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_name text;

-- Align SME profile schema with onboarding payload
ALTER TABLE public.sme_profiles
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS registration_type text,
  ADD COLUMN IF NOT EXISTS subsector text,
  ADD COLUMN IF NOT EXISTS years_in_operation integer,
  ADD COLUMN IF NOT EXISTS employee_count integer,
  ADD COLUMN IF NOT EXISTS turnover_bracket text,
  ADD COLUMN IF NOT EXISTS products_overview text,
  ADD COLUMN IF NOT EXISTS target_market text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS business_email text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS social_links text[],
  ADD COLUMN IF NOT EXISTS main_challenges text[],
  ADD COLUMN IF NOT EXISTS support_needs text[],
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS photos text[];

-- Backfill user_id from profile_id where possible
UPDATE public.sme_profiles SET user_id = profile_id WHERE user_id IS NULL AND profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS sme_profiles_user_id_idx ON public.sme_profiles(user_id);

-- Align Professional profile schema with onboarding payload
ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS organisation_name text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS top_sectors text[],
  ADD COLUMN IF NOT EXISTS expected_rates text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS availability text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS portfolio_url text;

UPDATE public.professional_profiles SET user_id = profile_id WHERE user_id IS NULL AND profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS professional_profiles_user_id_idx ON public.professional_profiles(user_id);

-- Align Investor profile schema with onboarding payload
ALTER TABLE public.investor_profiles
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS contact_role text,
  ADD COLUMN IF NOT EXISTS preferred_sectors text[],
  ADD COLUMN IF NOT EXISTS country_focus text[],
  ADD COLUMN IF NOT EXISTS stage_preference text[],
  ADD COLUMN IF NOT EXISTS instruments text[],
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS contact_person text;

UPDATE public.investor_profiles SET user_id = profile_id WHERE user_id IS NULL AND profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS investor_profiles_user_id_idx ON public.investor_profiles(user_id);

-- Needs assessment tables used by onboarding flows
CREATE TABLE IF NOT EXISTS public.sme_needs_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_revenue numeric(18,2) DEFAULT 0,
  monthly_expenses numeric(18,2) DEFAULT 0,
  cash_flow_positive boolean DEFAULT false,
  debt_obligations numeric(18,2) DEFAULT 0,
  financial_records_organized boolean DEFAULT false,
  key_operational_challenges text[] DEFAULT ARRAY[]::text[],
  technology_gaps text[] DEFAULT ARRAY[]::text[],
  automation_level text,
  target_market_clarity integer,
  customer_acquisition_challenges text[] DEFAULT ARRAY[]::text[],
  competitive_position text,
  regulatory_compliance_status text,
  legal_structure_optimized boolean DEFAULT false,
  intellectual_property_protected boolean DEFAULT false,
  growth_strategy_defined boolean DEFAULT false,
  funding_requirements jsonb DEFAULT '{}'::jsonb,
  key_performance_metrics_tracked boolean DEFAULT false,
  immediate_support_areas text[] DEFAULT ARRAY[]::text[],
  budget_for_professional_services numeric(18,2) DEFAULT 0,
  overall_score numeric(18,2) DEFAULT 0,
  identified_gaps text[] DEFAULT ARRAY[]::text[],
  priority_areas text[] DEFAULT ARRAY[]::text[],
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.professional_needs_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  primary_profession text,
  years_of_experience integer,
  specialization_areas text[] DEFAULT ARRAY[]::text[],
  current_employment_status text,
  services_offered text[] DEFAULT ARRAY[]::text[],
  service_delivery_modes text[] DEFAULT ARRAY[]::text[],
  hourly_rate_min numeric(18,2) DEFAULT 0,
  hourly_rate_max numeric(18,2) DEFAULT 0,
  target_client_types text[] DEFAULT ARRAY[]::text[],
  client_size_preference text[] DEFAULT ARRAY[]::text[],
  industry_focus text[] DEFAULT ARRAY[]::text[],
  availability_hours_per_week integer,
  availability text,
  project_duration_preference text,
  travel_willingness text,
  remote_work_capability boolean,
  key_skills text[] DEFAULT ARRAY[]::text[],
  certification_status text[] DEFAULT ARRAY[]::text[],
  continuous_learning_interest boolean,
  mentorship_interest text,
  client_acquisition_challenges text[] DEFAULT ARRAY[]::text[],
  marketing_channels text[] DEFAULT ARRAY[]::text[],
  business_development_support_needed text[] DEFAULT ARRAY[]::text[],
  networking_preferences text[] DEFAULT ARRAY[]::text[],
  collaboration_interest boolean,
  partnership_types text[] DEFAULT ARRAY[]::text[],
  referral_system_interest boolean,
  professional_profile jsonb DEFAULT '{}'::jsonb,
  professional_strategy text[] DEFAULT ARRAY[]::text[],
  preferred_sme_segments jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.investor_needs_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investment_types text[] DEFAULT ARRAY[]::text[],
  ticket_size_min numeric(18,2) DEFAULT 0,
  ticket_size_max numeric(18,2) DEFAULT 0,
  sector_preferences text[] DEFAULT ARRAY[]::text[],
  stage_preferences text[] DEFAULT ARRAY[]::text[],
  geography_focus text[] DEFAULT ARRAY[]::text[],
  expected_return numeric(18,2) DEFAULT 0,
  time_horizon text,
  risk_tolerance text,
  involvement_level text,
  investment_criteria jsonb DEFAULT '{}'::jsonb,
  due_diligence_requirements text[] DEFAULT ARRAY[]::text[],
  value_add_services text[] DEFAULT ARRAY[]::text[],
  exit_preferences text[] DEFAULT ARRAY[]::text[],
  co_investment_interest boolean DEFAULT false,
  investor_profile jsonb DEFAULT '{}'::jsonb,
  investor_strategy text[] DEFAULT ARRAY[]::text[],
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.donor_needs_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  donor_type text,
  funding_focus text[] DEFAULT ARRAY[]::text[],
  annual_funding_budget numeric(18,2) DEFAULT 0,
  grant_size_range text,
  application_requirements text[] DEFAULT ARRAY[]::text[],
  decision_timeline text,
  preferred_sectors text[] DEFAULT ARRAY[]::text[],
  geography_preferences text[] DEFAULT ARRAY[]::text[],
  impact_measurement text[] DEFAULT ARRAY[]::text[],
  partnership_preferences text[] DEFAULT ARRAY[]::text[],
  donor_profile jsonb DEFAULT '{}'::jsonb,
  donor_strategy text[] DEFAULT ARRAY[]::text[],
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Lightweight RLS for the new needs assessment tables
ALTER TABLE public.sme_needs_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_needs_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_needs_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donor_needs_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS sme_needs_assessments_self ON public.sme_needs_assessments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS professional_needs_assessments_self ON public.professional_needs_assessments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS investor_needs_assessments_self ON public.investor_needs_assessments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS donor_needs_assessments_self ON public.donor_needs_assessments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS sme_needs_assessments_user_id_idx ON public.sme_needs_assessments(user_id);
CREATE INDEX IF NOT EXISTS professional_needs_assessments_user_id_idx ON public.professional_needs_assessments(user_id);
CREATE INDEX IF NOT EXISTS investor_needs_assessments_user_id_idx ON public.investor_needs_assessments(user_id);
CREATE INDEX IF NOT EXISTS donor_needs_assessments_user_id_idx ON public.donor_needs_assessments(user_id);

COMMIT;
