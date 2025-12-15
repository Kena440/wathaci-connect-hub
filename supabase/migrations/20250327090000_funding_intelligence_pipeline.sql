-- Funding Intelligence pipeline schema updates
-- Ensure funding_opportunities matches strict Zambia-ready schema
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'funding_opportunities'
  ) THEN
    CREATE TABLE public.funding_opportunities (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      description text,
      funding_type text NOT NULL DEFAULT 'other',
      funder_name text,
      eligible_countries text[] NOT NULL DEFAULT ARRAY[]::text[],
      target_sectors text[] NOT NULL DEFAULT ARRAY[]::text[],
      eligible_applicants text[] NOT NULL DEFAULT ARRAY[]::text[],
      funding_amount_min numeric,
      funding_amount_max numeric,
      currency text,
      deadline date,
      status text NOT NULL DEFAULT 'open',
      source_url text NOT NULL,
      source_domain text,
      source_title text,
      tags text[] DEFAULT ARRAY[]::text[],
      relevance_score int DEFAULT 0,
      zambia_eligible boolean NOT NULL DEFAULT false,
      verification_level text NOT NULL DEFAULT 'strict',
      last_verified_at timestamptz,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      hash text
    );
  ELSE
    -- Add new columns to existing table so it aligns with the new schema without dropping legacy data
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_opportunities' AND column_name = 'funding_type'
    ) THEN
      ALTER TABLE public.funding_opportunities ADD COLUMN funding_type text NOT NULL DEFAULT 'other';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_opportunities' AND column_name = 'funder_name'
    ) THEN
      ALTER TABLE public.funding_opportunities ADD COLUMN funder_name text;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_opportunities' AND column_name = 'eligible_countries'
    ) THEN
      ALTER TABLE public.funding_opportunities ADD COLUMN eligible_countries text[] NOT NULL DEFAULT ARRAY[]::text[];
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_opportunities' AND column_name = 'target_sectors'
    ) THEN
      ALTER TABLE public.funding_opportunities ADD COLUMN target_sectors text[] NOT NULL DEFAULT ARRAY[]::text[];
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_opportunities' AND column_name = 'eligible_applicants'
    ) THEN
      ALTER TABLE public.funding_opportunities ADD COLUMN eligible_applicants text[] NOT NULL DEFAULT ARRAY[]::text[];
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_opportunities' AND column_name = 'funding_amount_min'
    ) THEN
      ALTER TABLE public.funding_opportunities ADD COLUMN funding_amount_min numeric;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_opportunities' AND column_name = 'funding_amount_max'
    ) THEN
      ALTER TABLE public.funding_opportunities ADD COLUMN funding_amount_max numeric;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_opportunities' AND column_name = 'currency'
    ) THEN
      ALTER TABLE public.funding_opportunities ADD COLUMN currency text;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_opportunities' AND column_name = 'deadline'
    ) THEN
      ALTER TABLE public.funding_opportunities ADD COLUMN deadline date;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_opportunities' AND column_name = 'status'
    ) THEN
      ALTER TABLE public.funding_opportunities ADD COLUMN status text NOT NULL DEFAULT 'open';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_opportunities' AND column_name = 'source_url'
    ) THEN
      ALTER TABLE public.funding_opportunities ADD COLUMN source_url text NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_opportunities' AND column_name = 'source_domain'
    ) THEN
      ALTER TABLE public.funding_opportunities ADD COLUMN source_domain text;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_opportunities' AND column_name = 'source_title'
    ) THEN
      ALTER TABLE public.funding_opportunities ADD COLUMN source_title text;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_opportunities' AND column_name = 'tags'
    ) THEN
      ALTER TABLE public.funding_opportunities ADD COLUMN tags text[] DEFAULT ARRAY[]::text[];
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_opportunities' AND column_name = 'relevance_score'
    ) THEN
      ALTER TABLE public.funding_opportunities ADD COLUMN relevance_score int DEFAULT 0;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_opportunities' AND column_name = 'zambia_eligible'
    ) THEN
      ALTER TABLE public.funding_opportunities ADD COLUMN zambia_eligible boolean NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_opportunities' AND column_name = 'verification_level'
    ) THEN
      ALTER TABLE public.funding_opportunities ADD COLUMN verification_level text NOT NULL DEFAULT 'strict';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_opportunities' AND column_name = 'last_verified_at'
    ) THEN
      ALTER TABLE public.funding_opportunities ADD COLUMN last_verified_at timestamptz;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_opportunities' AND column_name = 'hash'
    ) THEN
      ALTER TABLE public.funding_opportunities ADD COLUMN hash text;
    END IF;
  END IF;
END $$;

-- Backfill Zambia eligibility and deadline where possible
UPDATE public.funding_opportunities
SET
  eligible_countries = CASE
    WHEN eligible_countries IS NULL OR array_length(eligible_countries, 1) = 0 THEN ARRAY['Zambia']
    ELSE eligible_countries
  END,
  zambia_eligible = COALESCE(zambia_eligible, false) OR (EXISTS (
    SELECT 1 FROM unnest(COALESCE(eligible_countries, ARRAY[]::text[])) c WHERE lower(c) = 'zambia'
  ) OR EXISTS (
    SELECT 1 FROM unnest(COALESCE(country_focus, ARRAY[]::text[])) c WHERE lower(c) = 'zambia'
  )),
  deadline = COALESCE(deadline, (application_deadline)::date),
  source_url = COALESCE(NULLIF(source_url, ''), link_to_apply)
WHERE TRUE;

-- Ensure set_updated_at trigger exists
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

-- Hash-based dedupe key
CREATE UNIQUE INDEX IF NOT EXISTS funding_opportunities_hash_uidx
  ON public.funding_opportunities (hash)
  WHERE hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS funding_opportunities_status_deadline_idx
  ON public.funding_opportunities (status, deadline);

CREATE INDEX IF NOT EXISTS funding_opportunities_zambia_idx
  ON public.funding_opportunities (zambia_eligible);

-- Funding sources
CREATE TABLE IF NOT EXISTS public.funding_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  base_url text,
  type text,
  enabled boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Funding runs
CREATE TABLE IF NOT EXISTS public.funding_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  status text,
  discovered_count int,
  inserted_count int,
  updated_count int,
  skipped_count int,
  error text
);

-- Enable RLS
ALTER TABLE public.funding_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_runs ENABLE ROW LEVEL SECURITY;

-- Replace legacy policies with Zambia-focused rules
DROP POLICY IF EXISTS "Public can read active funding opportunities" ON public.funding_opportunities;
CREATE POLICY "Public can read Zambia-ready opportunities"
  ON public.funding_opportunities
  FOR SELECT
  USING (status IN ('open', 'upcoming') AND zambia_eligible = true AND verification_level = 'strict');

DROP POLICY IF EXISTS "Public can log funding events" ON public.funding_runs;
DROP POLICY IF EXISTS "Public can read funding events" ON public.funding_runs;
CREATE POLICY "Service role manages funding data"
  ON public.funding_opportunities
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role manages funding sources"
  ON public.funding_sources
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role manages funding runs"
  ON public.funding_runs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
