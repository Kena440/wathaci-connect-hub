-- Funding Hub schema
CREATE TABLE IF NOT EXISTS public.funding_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  provider_name text NOT NULL,
  provider_type text,
  country_focus text[] DEFAULT ARRAY['Zambia'],
  sectors text[] DEFAULT ARRAY[]::text[],
  ticket_size_min numeric,
  ticket_size_max numeric,
  currency text DEFAULT 'USD',
  instrument_type text[] DEFAULT ARRAY[]::text[],
  stage_focus text[] DEFAULT ARRAY[]::text[],
  min_years_operation int,
  revenue_min numeric,
  application_deadline timestamptz,
  link_to_apply text,
  contact_email text,
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  tags text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.funding_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funding_id uuid NOT NULL REFERENCES public.funding_opportunities(id) ON DELETE CASCADE,
  sme_id uuid NOT NULL,
  status text DEFAULT 'draft',
  matching_score numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.funding_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  context jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS funding_opportunities_set_updated_at ON public.funding_opportunities;
CREATE TRIGGER funding_opportunities_set_updated_at
BEFORE UPDATE ON public.funding_opportunities
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS funding_applications_set_updated_at ON public.funding_applications;
CREATE TRIGGER funding_applications_set_updated_at
BEFORE UPDATE ON public.funding_applications
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.funding_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_events ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can read active funding opportunities"
  ON public.funding_opportunities
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "SME can read own funding applications"
  ON public.funding_applications
  FOR SELECT
  USING (auth.uid() = sme_id);

CREATE POLICY "SME can create funding applications"
  ON public.funding_applications
  FOR INSERT
  WITH CHECK (auth.uid() = sme_id);

CREATE POLICY "SME can update own funding applications"
  ON public.funding_applications
  FOR UPDATE
  USING (auth.uid() = sme_id);

CREATE POLICY "Public can log funding events"
  ON public.funding_events
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can read funding events"
  ON public.funding_events
  FOR SELECT
  USING (true);
