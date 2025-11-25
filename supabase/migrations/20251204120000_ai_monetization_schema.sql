BEGIN;

-- Core company entity to anchor SME-related features
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text,
  city text,
  sector text,
  registration_number text,
  website text,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.companies IS 'Canonical SME/company entity for Wathaci Connect';

-- Optional link from profiles to companies without breaking existing data
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_company_id_idx ON public.profiles(company_id);

-- Ensure updated_at maintenance is available
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

-- Companies bookkeeping trigger
DROP TRIGGER IF EXISTS set_companies_updated_at ON public.companies;
CREATE TRIGGER set_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Paid AI document requests (business plan, pitch deck, capability statement, etc.)
CREATE TABLE IF NOT EXISTS public.paid_document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  document_type text NOT NULL,
  input_data jsonb NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending',
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'ZMW',
  payment_gateway text,
  payment_reference text,
  generation_status text NOT NULL DEFAULT 'not_started',
  output_files jsonb,
  error_message text,
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS paid_document_requests_user_id_idx ON public.paid_document_requests(user_id);
CREATE INDEX IF NOT EXISTS paid_document_requests_company_id_idx ON public.paid_document_requests(company_id);
CREATE INDEX IF NOT EXISTS paid_document_requests_type_idx ON public.paid_document_requests(document_type);
CREATE INDEX IF NOT EXISTS paid_document_requests_payment_status_idx ON public.paid_document_requests(payment_status);

DROP TRIGGER IF EXISTS set_paid_document_requests_updated_at ON public.paid_document_requests;
CREATE TRIGGER set_paid_document_requests_updated_at
BEFORE UPDATE ON public.paid_document_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Diagnostics / health check runs
CREATE TABLE IF NOT EXISTS public.diagnostics_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  input_data jsonb NOT NULL,
  output_data jsonb,
  overall_score numeric,
  funding_readiness numeric,
  compliance_maturity numeric,
  digital_maturity numeric,
  market_readiness numeric,
  operational_efficiency numeric,
  model_version text,
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS diagnostics_runs_company_id_idx ON public.diagnostics_runs(company_id);
CREATE INDEX IF NOT EXISTS diagnostics_runs_user_id_idx ON public.diagnostics_runs(user_id);

DROP TRIGGER IF EXISTS set_diagnostics_runs_updated_at ON public.diagnostics_runs;
CREATE TRIGGER set_diagnostics_runs_updated_at
BEFORE UPDATE ON public.diagnostics_runs
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Credit passport / fundability score runs
CREATE TABLE IF NOT EXISTS public.credit_passport_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  input_data jsonb NOT NULL,
  output_data jsonb,
  fundability_score numeric,
  financial_strength numeric,
  compliance_maturity numeric,
  credit_behaviour numeric,
  digital_maturity numeric,
  behavioural_score numeric,
  risk_profile jsonb,
  liquidity_index numeric,
  resilience_score numeric,
  repayment_capacity jsonb,
  payment_status text NOT NULL DEFAULT 'pending',
  amount numeric NOT NULL DEFAULT 100,
  currency text NOT NULL DEFAULT 'ZMW',
  pdf_url text,
  share_count int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS credit_passport_runs_company_id_idx ON public.credit_passport_runs(company_id);
CREATE INDEX IF NOT EXISTS credit_passport_runs_fundability_score_idx ON public.credit_passport_runs(fundability_score);

DROP TRIGGER IF EXISTS set_credit_passport_runs_updated_at ON public.credit_passport_runs;
CREATE TRIGGER set_credit_passport_runs_updated_at
BEFORE UPDATE ON public.credit_passport_runs
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Funder profiles / opportunities
CREATE TABLE IF NOT EXISTS public.funder_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  funder_type text NOT NULL,
  country text,
  region text,
  website text,
  contact_email text,
  contact_phone text,
  min_ticket numeric,
  max_ticket numeric,
  currency text DEFAULT 'ZMW',
  sectors text[],
  eligibility_criteria jsonb,
  risk_appetite text,
  impact_mandates jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS funder_profiles_type_idx ON public.funder_profiles(funder_type);
CREATE INDEX IF NOT EXISTS funder_profiles_active_idx ON public.funder_profiles(is_active);

DROP TRIGGER IF EXISTS set_funder_profiles_updated_at ON public.funder_profiles;
CREATE TRIGGER set_funder_profiles_updated_at
BEFORE UPDATE ON public.funder_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Matching runs for investors/banks/donors
CREATE TABLE IF NOT EXISTS public.funder_match_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  input_data jsonb,
  output_data jsonb,
  category text NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending',
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'ZMW',
  pdf_url text,
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS funder_match_runs_user_id_idx ON public.funder_match_runs(user_id);
CREATE INDEX IF NOT EXISTS funder_match_runs_company_id_idx ON public.funder_match_runs(company_id);
CREATE INDEX IF NOT EXISTS funder_match_runs_category_idx ON public.funder_match_runs(category);

DROP TRIGGER IF EXISTS set_funder_match_runs_updated_at ON public.funder_match_runs;
CREATE TRIGGER set_funder_match_runs_updated_at
BEFORE UPDATE ON public.funder_match_runs
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Shared match deliveries
CREATE TABLE IF NOT EXISTS public.shared_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_run_id uuid NOT NULL REFERENCES public.funder_match_runs (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  funder_id uuid REFERENCES public.funder_profiles (id),
  share_channel text NOT NULL,
  share_payment_status text NOT NULL DEFAULT 'pending',
  share_price numeric NOT NULL DEFAULT 50,
  currency text NOT NULL DEFAULT 'ZMW',
  share_link text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS shared_matches_match_run_id_idx ON public.shared_matches(match_run_id);
CREATE INDEX IF NOT EXISTS shared_matches_user_id_idx ON public.shared_matches(user_id);
CREATE INDEX IF NOT EXISTS shared_matches_company_id_idx ON public.shared_matches(company_id);

DROP TRIGGER IF EXISTS set_shared_matches_updated_at ON public.shared_matches;
CREATE TRIGGER set_shared_matches_updated_at
BEFORE UPDATE ON public.shared_matches
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- RLS configuration
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paid_document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostics_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_passport_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funder_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funder_match_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_matches ENABLE ROW LEVEL SECURITY;

-- Companies policies
CREATE POLICY companies_select_owner
  ON public.companies
  FOR SELECT
  TO authenticated
  USING (
    auth.role() = 'service_role'
    OR created_by = auth.uid()
    OR id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY companies_insert_owner
  ON public.companies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.role() = 'service_role' OR created_by = auth.uid()
  );

CREATE POLICY companies_update_owner
  ON public.companies
  FOR UPDATE
  TO authenticated
  USING (
    auth.role() = 'service_role' OR created_by = auth.uid()
  )
  WITH CHECK (
    auth.role() = 'service_role' OR created_by = auth.uid()
  );

CREATE POLICY companies_service_all
  ON public.companies
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Paid document request policies
CREATE POLICY paid_document_requests_select_own
  ON public.paid_document_requests
  FOR SELECT
  TO authenticated
  USING (auth.role() = 'service_role' OR auth.uid() = user_id);

CREATE POLICY paid_document_requests_insert_own
  ON public.paid_document_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);

CREATE POLICY paid_document_requests_update_own
  ON public.paid_document_requests
  FOR UPDATE
  TO authenticated
  USING (auth.role() = 'service_role' OR auth.uid() = user_id)
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);

CREATE POLICY paid_document_requests_service_all
  ON public.paid_document_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Diagnostics policies
CREATE POLICY diagnostics_runs_select_own
  ON public.diagnostics_runs
  FOR SELECT
  TO authenticated
  USING (auth.role() = 'service_role' OR auth.uid() = user_id);

CREATE POLICY diagnostics_runs_insert_own
  ON public.diagnostics_runs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);

CREATE POLICY diagnostics_runs_update_own
  ON public.diagnostics_runs
  FOR UPDATE
  TO authenticated
  USING (auth.role() = 'service_role' OR auth.uid() = user_id)
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);

CREATE POLICY diagnostics_runs_service_all
  ON public.diagnostics_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Credit passport policies
CREATE POLICY credit_passport_runs_select_own
  ON public.credit_passport_runs
  FOR SELECT
  TO authenticated
  USING (auth.role() = 'service_role' OR auth.uid() = user_id);

CREATE POLICY credit_passport_runs_insert_own
  ON public.credit_passport_runs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);

CREATE POLICY credit_passport_runs_update_own
  ON public.credit_passport_runs
  FOR UPDATE
  TO authenticated
  USING (auth.role() = 'service_role' OR auth.uid() = user_id)
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);

CREATE POLICY credit_passport_runs_service_all
  ON public.credit_passport_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Funder profile policies (admin/service role manages, authenticated can read active)
CREATE POLICY funder_profiles_select_active
  ON public.funder_profiles
  FOR SELECT
  TO authenticated
  USING (is_active = true OR auth.role() = 'service_role');

CREATE POLICY funder_profiles_manage_service
  ON public.funder_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Funder match run policies
CREATE POLICY funder_match_runs_select_own
  ON public.funder_match_runs
  FOR SELECT
  TO authenticated
  USING (auth.role() = 'service_role' OR auth.uid() = user_id);

CREATE POLICY funder_match_runs_insert_own
  ON public.funder_match_runs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);

CREATE POLICY funder_match_runs_update_own
  ON public.funder_match_runs
  FOR UPDATE
  TO authenticated
  USING (auth.role() = 'service_role' OR auth.uid() = user_id)
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);

CREATE POLICY funder_match_runs_service_all
  ON public.funder_match_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Shared match policies
CREATE POLICY shared_matches_select_own
  ON public.shared_matches
  FOR SELECT
  TO authenticated
  USING (auth.role() = 'service_role' OR auth.uid() = user_id);

CREATE POLICY shared_matches_insert_own
  ON public.shared_matches
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);

CREATE POLICY shared_matches_update_own
  ON public.shared_matches
  FOR UPDATE
  TO authenticated
  USING (auth.role() = 'service_role' OR auth.uid() = user_id)
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);

CREATE POLICY shared_matches_service_all
  ON public.shared_matches
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
