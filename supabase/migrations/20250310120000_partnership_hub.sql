-- Partnership Hub core tables

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

CREATE TABLE IF NOT EXISTS public.partnership_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  partner_org_name text NOT NULL,
  partner_org_type text,
  country_focus text[] DEFAULT '{}',
  sectors text[] DEFAULT '{}',
  partnership_type text[] DEFAULT '{}',
  target_beneficiaries text[] DEFAULT '{}',
  requirements_summary text,
  expected_value_for_partner text,
  expected_value_for_sme text,
  start_date date,
  end_date date,
  is_ongoing boolean DEFAULT true,
  link_to_more_info text,
  contact_email text,
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  tags text[] DEFAULT '{}',
  created_by_profile_id uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.partnership_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.partnership_opportunities(id) ON DELETE CASCADE,
  initiator_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text,
  status text DEFAULT 'new',
  matching_score numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.partnership_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_name text,
  org_type text,
  sectors text[] DEFAULT '{}',
  partnerships_sought text[] DEFAULT '{}',
  country_focus text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  description text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Indexes
CREATE INDEX IF NOT EXISTS partnership_opportunities_active_idx ON public.partnership_opportunities(is_active);
CREATE INDEX IF NOT EXISTS partnership_opportunities_tags_idx ON public.partnership_opportunities USING GIN(tags);
CREATE INDEX IF NOT EXISTS partnership_opportunities_sectors_idx ON public.partnership_opportunities USING GIN(sectors);
CREATE INDEX IF NOT EXISTS partnership_opportunities_partnership_type_idx ON public.partnership_opportunities USING GIN(partnership_type);
CREATE INDEX IF NOT EXISTS partnership_opportunities_country_idx ON public.partnership_opportunities USING GIN(country_focus);
CREATE INDEX IF NOT EXISTS partnership_interests_initiator_idx ON public.partnership_interests(initiator_profile_id);
CREATE INDEX IF NOT EXISTS partnership_interests_opportunity_idx ON public.partnership_interests(opportunity_id);

-- updated_at triggers
DROP TRIGGER IF EXISTS partnership_opportunities_updated_at ON public.partnership_opportunities;
CREATE TRIGGER partnership_opportunities_updated_at
BEFORE UPDATE ON public.partnership_opportunities
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS partnership_interests_updated_at ON public.partnership_interests;
CREATE TRIGGER partnership_interests_updated_at
BEFORE UPDATE ON public.partnership_interests
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS partnership_profiles_updated_at ON public.partnership_profiles;
CREATE TRIGGER partnership_profiles_updated_at
BEFORE UPDATE ON public.partnership_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Enable RLS
ALTER TABLE public.partnership_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partnership_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partnership_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can read active partnership opportunities"
ON public.partnership_opportunities
FOR SELECT
USING (is_active = true);

CREATE POLICY "Owner can create partnership opportunities"
ON public.partnership_opportunities
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by_profile_id);

CREATE POLICY "Owner can update own partnership opportunities"
ON public.partnership_opportunities
FOR UPDATE TO authenticated
USING (auth.uid() = created_by_profile_id)
WITH CHECK (auth.uid() = created_by_profile_id);

CREATE POLICY "Service role full access partnership opportunities"
ON public.partnership_opportunities
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "User can read own partnership interests"
ON public.partnership_interests
FOR SELECT TO authenticated
USING (auth.uid() = initiator_profile_id);

CREATE POLICY "User can create partnership interests"
ON public.partnership_interests
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = initiator_profile_id);

CREATE POLICY "Service role manage partnership interests"
ON public.partnership_interests
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Owner can manage partnership profile"
ON public.partnership_profiles
FOR ALL TO authenticated
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Service role manage partnership profiles"
ON public.partnership_profiles
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
