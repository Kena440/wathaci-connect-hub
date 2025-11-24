-- =====================================================
-- SME Auto-Diagnosis & Growth Recommendation Engine
-- Database Schema Migration
-- =====================================================

BEGIN;

-- =====================================================
-- SME EXTENDED PROFILE TABLE
-- Additional fields for comprehensive SME diagnosis
-- =====================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS sector TEXT,
  ADD COLUMN IF NOT EXISTS sub_sector TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS operating_regions TEXT[],
  ADD COLUMN IF NOT EXISTS years_in_operation INTEGER,
  ADD COLUMN IF NOT EXISTS employee_count_fulltime INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS employee_count_parttime INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS employee_count_casual INTEGER DEFAULT 0,
  -- Formalisation
  ADD COLUMN IF NOT EXISTS registration_status TEXT, -- 'sole_trader', 'company', 'cooperative', etc.
  ADD COLUMN IF NOT EXISTS registration_authority TEXT, -- 'PACRA', etc.
  ADD COLUMN IF NOT EXISTS tax_status TEXT[], -- ['registered', 'vat', 'paye']
  -- Ownership
  ADD COLUMN IF NOT EXISTS female_ownership_pct INTEGER CHECK (female_ownership_pct >= 0 AND female_ownership_pct <= 100),
  ADD COLUMN IF NOT EXISTS youth_ownership_pct INTEGER CHECK (youth_ownership_pct >= 0 AND youth_ownership_pct <= 100),
  ADD COLUMN IF NOT EXISTS local_ownership_pct INTEGER CHECK (local_ownership_pct >= 0 AND local_ownership_pct <= 100),
  -- Business model
  ADD COLUMN IF NOT EXISTS business_model TEXT[], -- ['B2B', 'B2C', 'B2G']
  ADD COLUMN IF NOT EXISTS revenue_model TEXT[], -- ['product_sales', 'services', 'subscriptions']
  -- Digital footprint
  ADD COLUMN IF NOT EXISTS social_media_links JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS online_store_presence TEXT[],
  -- Compliance & Governance
  ADD COLUMN IF NOT EXISTS has_board_of_directors BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_advisory_board BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_hr_policy BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_finance_policy BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_procurement_policy BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_risk_policy BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS annual_audits_done BOOLEAN,
  ADD COLUMN IF NOT EXISTS tax_returns_filed_on_time TEXT, -- 'yes', 'no', 'not_sure'
  -- Digital tools usage
  ADD COLUMN IF NOT EXISTS uses_erp BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS uses_pos BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS uses_accounting_software BOOLEAN DEFAULT FALSE;

-- =====================================================
-- SECTOR BENCHMARKS TABLE
-- Reference data for sector-specific analysis
-- =====================================================

CREATE TABLE IF NOT EXISTS public.sector_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector TEXT NOT NULL,
  sub_sector TEXT,
  country TEXT NOT NULL DEFAULT 'ZM',
  
  -- Benchmark metrics
  avg_revenue_growth_pct NUMERIC(5,2),
  median_employee_count INTEGER,
  avg_profit_margin_pct NUMERIC(5,2),
  avg_digital_maturity_score INTEGER,
  avg_compliance_rate_pct NUMERIC(5,2),
  
  -- Sector-specific challenges
  common_challenges TEXT[],
  -- e.g., ['forex_access', 'load_shedding', 'import_dependence']
  
  -- Opportunity indicators
  growth_potential TEXT, -- 'high', 'medium', 'low'
  market_saturation TEXT, -- 'high', 'medium', 'low'
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(sector, sub_sector, country)
);

-- =====================================================
-- SME FINANCIAL DATA TABLE
-- Optional but powerful financial metrics
-- =====================================================

CREATE TABLE IF NOT EXISTS public.sme_financial_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Revenue data (can be exact or ranges)
  revenue_year_1 NUMERIC(15,2), -- Most recent year
  revenue_year_2 NUMERIC(15,2), -- Previous year
  revenue_year_3 NUMERIC(15,2), -- 2 years ago
  revenue_range TEXT, -- e.g., '100k-500k_usd' for when only range is known
  
  -- Profit/Loss
  profit_year_1 NUMERIC(15,2),
  profit_year_2 NUMERIC(15,2),
  profit_year_3 NUMERIC(15,2),
  
  -- Cash flow
  cash_flow_positive BOOLEAN,
  
  -- Customer metrics
  avg_invoice_size NUMERIC(15,2),
  payment_terms_days INTEGER,
  top_3_clients_revenue_pct INTEGER, -- Customer concentration
  
  -- Debt
  existing_loans_count INTEGER DEFAULT 0,
  total_debt_amount NUMERIC(15,2),
  has_defaults_or_arrears BOOLEAN DEFAULT FALSE,
  
  currency TEXT DEFAULT 'ZMW',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- =====================================================
-- SME DOCUMENTS TABLE
-- Track uploaded documents for analysis
-- =====================================================

CREATE TABLE IF NOT EXISTS public.sme_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  document_type TEXT NOT NULL,
  -- Types: 'registration_certificate', 'tax_clearance', 'tin', 
  -- 'financial_statements', 'insurance_policy', 'contract_mou',
  -- 'business_plan', 'pitch_deck', 'strategy_document', 'project_proposal'
  
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes INTEGER,
  mime_type TEXT,
  
  -- Extracted/analyzed content
  extracted_text TEXT,
  ai_analysis JSONB, -- Results from AI document analysis
  
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  
  expiry_date DATE, -- For documents that expire (e.g., tax clearance)
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sme_documents_user_id ON public.sme_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_sme_documents_type ON public.sme_documents(document_type);

-- =====================================================
-- DIAGNOSTICS RUNS TABLE
-- Main table for storing diagnostic results
-- =====================================================

CREATE TABLE IF NOT EXISTS public.diagnostics_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Scoring model version for comparability
  model_version TEXT NOT NULL DEFAULT 'v1.0',
  prompt_version TEXT DEFAULT 'v1.0',
  
  -- Input hash for idempotency
  input_hash TEXT NOT NULL,
  
  -- Data coverage assessment
  data_coverage_level TEXT NOT NULL, -- 'minimal', 'partial', 'comprehensive'
  data_sources_used TEXT[],
  
  -- Core scores (0-100)
  funding_readiness_score INTEGER CHECK (funding_readiness_score >= 0 AND funding_readiness_score <= 100),
  compliance_maturity_score INTEGER CHECK (compliance_maturity_score >= 0 AND compliance_maturity_score <= 100),
  governance_maturity_score INTEGER CHECK (governance_maturity_score >= 0 AND governance_maturity_score <= 100),
  digital_maturity_score INTEGER CHECK (digital_maturity_score >= 0 AND digital_maturity_score <= 100),
  market_readiness_score INTEGER CHECK (market_readiness_score >= 0 AND market_readiness_score <= 100),
  operational_efficiency_score INTEGER CHECK (operational_efficiency_score >= 0 AND operational_efficiency_score <= 100),
  
  -- Overall health band
  overall_health_band TEXT, -- 'critical', 'developing', 'emerging', 'established', 'thriving'
  business_stage TEXT, -- 'early', 'growth', 'scale'
  
  -- Structured analysis (JSONB for flexibility)
  swot_analysis JSONB NOT NULL DEFAULT '{
    "strengths": [],
    "weaknesses": [],
    "opportunities": [],
    "threats": []
  }'::jsonb,
  
  bottlenecks JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_partners JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggested_opportunities JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Narrative summary
  narrative_summary TEXT,
  
  -- Score explanations
  score_explanations JSONB DEFAULT '{}'::jsonb,
  
  -- AI-generated content markers
  ai_generated_at TIMESTAMPTZ,
  ai_model_used TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'completed', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diagnostics_runs_user_id ON public.diagnostics_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnostics_runs_created_at ON public.diagnostics_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_diagnostics_runs_status ON public.diagnostics_runs(status);

-- =====================================================
-- WATHACI PARTNERS TABLE
-- Partners that can help SMEs
-- =====================================================

CREATE TABLE IF NOT EXISTS public.wathaci_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  partner_type TEXT NOT NULL, -- 'bank', 'investor', 'donor', 'consultant', 'corporate', 'training_provider'
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  
  -- Matching criteria
  target_sectors TEXT[],
  target_revenue_ranges TEXT[],
  target_business_stages TEXT[],
  regions_served TEXT[],
  
  -- Products/Services offered
  products JSONB DEFAULT '[]'::jsonb,
  -- e.g., [{"name": "Working Capital Facility", "description": "...", "min_amount": 5000, "max_amount": 100000}]
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wathaci_partners_type ON public.wathaci_partners(partner_type);
CREATE INDEX IF NOT EXISTS idx_wathaci_partners_active ON public.wathaci_partners(is_active);

-- =====================================================
-- PLATFORM BEHAVIOR TRACKING
-- Track user behavior for enhanced diagnostics
-- =====================================================

CREATE TABLE IF NOT EXISTS public.sme_platform_behavior (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Opportunity applications
  grant_applications_count INTEGER DEFAULT 0,
  tender_applications_count INTEGER DEFAULT 0,
  finance_applications_count INTEGER DEFAULT 0,
  
  -- Engagement metrics
  login_count_30d INTEGER DEFAULT 0,
  profile_completion_pct INTEGER DEFAULT 0,
  training_courses_completed INTEGER DEFAULT 0,
  
  -- Response rates
  message_response_rate_pct INTEGER,
  rfq_response_rate_pct INTEGER,
  avg_response_time_hours INTEGER,
  
  -- Ratings (if marketplace exists)
  avg_rating NUMERIC(3,2),
  review_count INTEGER DEFAULT 0,
  
  last_login_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.sme_financial_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sme_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostics_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sme_platform_behavior ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sector_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wathaci_partners ENABLE ROW LEVEL SECURITY;

-- Users can only access their own financial data
CREATE POLICY sme_financial_data_select_own ON public.sme_financial_data
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY sme_financial_data_insert_own ON public.sme_financial_data
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY sme_financial_data_update_own ON public.sme_financial_data
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only access their own documents
CREATE POLICY sme_documents_select_own ON public.sme_documents
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY sme_documents_insert_own ON public.sme_documents
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY sme_documents_update_own ON public.sme_documents
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY sme_documents_delete_own ON public.sme_documents
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Users can only access their own diagnostics runs
CREATE POLICY diagnostics_runs_select_own ON public.diagnostics_runs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY diagnostics_runs_insert_own ON public.diagnostics_runs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can access their own platform behavior
CREATE POLICY sme_platform_behavior_select_own ON public.sme_platform_behavior
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY sme_platform_behavior_insert_own ON public.sme_platform_behavior
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY sme_platform_behavior_update_own ON public.sme_platform_behavior
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Everyone can read sector benchmarks
CREATE POLICY sector_benchmarks_select_all ON public.sector_benchmarks
  FOR SELECT TO authenticated
  USING (true);

-- Everyone can read active partners
CREATE POLICY wathaci_partners_select_active ON public.wathaci_partners
  FOR SELECT TO authenticated
  USING (is_active = true);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE TRIGGER update_sme_financial_data_updated_at
  BEFORE UPDATE ON public.sme_financial_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sme_documents_updated_at
  BEFORE UPDATE ON public.sme_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diagnostics_runs_updated_at
  BEFORE UPDATE ON public.diagnostics_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sme_platform_behavior_updated_at
  BEFORE UPDATE ON public.sme_platform_behavior
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sector_benchmarks_updated_at
  BEFORE UPDATE ON public.sector_benchmarks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wathaci_partners_updated_at
  BEFORE UPDATE ON public.wathaci_partners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.diagnostics_runs IS 'Stores SME auto-diagnosis results and recommendations';
COMMENT ON TABLE public.sme_financial_data IS 'Optional financial data for enhanced SME diagnostics';
COMMENT ON TABLE public.sme_documents IS 'Documents uploaded by SMEs for verification and analysis';
COMMENT ON TABLE public.sector_benchmarks IS 'Reference data for sector-specific analysis and comparison';
COMMENT ON TABLE public.wathaci_partners IS 'Partners on the platform that can provide support to SMEs';
COMMENT ON TABLE public.sme_platform_behavior IS 'Tracks SME engagement and behavior on the platform';

COMMIT;
