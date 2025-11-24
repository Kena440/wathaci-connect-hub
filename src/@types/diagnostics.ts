/**
 * SME Auto-Diagnosis & Growth Recommendation Engine Types
 * 
 * This file contains all TypeScript interfaces and types for the
 * AI-powered SME Auto-Diagnosis Engine on the Wathaci Connect Platform.
 */

// ================================
// Enums and Constants
// ================================

export const SCORE_BANDS = {
  NOT_READY: { min: 0, max: 30, label: 'Not yet ready', color: 'red' },
  EMERGING: { min: 31, max: 60, label: 'Emerging / Semi-ready', color: 'yellow' },
  BANKABLE_WITH_SUPPORT: { min: 61, max: 80, label: 'Bankable with support', color: 'blue' },
  STRONGLY_BANKABLE: { min: 81, max: 100, label: 'Strongly bankable', color: 'green' },
} as const;

export const HEALTH_BANDS = {
  CRITICAL: 'critical',
  DEVELOPING: 'developing',
  EMERGING: 'emerging',
  ESTABLISHED: 'established',
  THRIVING: 'thriving',
} as const;

export const BUSINESS_STAGES = {
  EARLY: 'early',
  GROWTH: 'growth',
  SCALE: 'scale',
} as const;

export const DATA_COVERAGE_LEVELS = {
  MINIMAL: 'minimal',
  PARTIAL: 'partial',
  COMPREHENSIVE: 'comprehensive',
} as const;

export const SEVERITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export const PRIORITY_LEVELS = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 4,
} as const;

export const DIFFICULTY_LEVELS = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
} as const;

export const TIMELINE_CATEGORIES = {
  NOW: '0-3 months',
  NEXT: '3-12 months',
  LATER: '12+ months',
} as const;

// ================================
// SME Extended Profile Types
// ================================

export type RegistrationStatus = 
  | 'sole_trader'
  | 'company'
  | 'cooperative'
  | 'partnership'
  | 'trust'
  | 'ngo'
  | 'other';

export type BusinessModelType = 'B2B' | 'B2C' | 'B2G' | 'mixed';

export type RevenueModelType = 
  | 'product_sales'
  | 'services'
  | 'subscriptions'
  | 'licensing'
  | 'commission'
  | 'mixed';

export type TaxStatus = 'registered' | 'vat' | 'paye' | 'not_registered';

export interface SMEExtendedProfile {
  // Basic info (from profiles table)
  id: string;
  email: string;
  business_name?: string;
  sector?: string;
  sub_sector?: string;
  country: string;
  city?: string;
  operating_regions?: string[];
  years_in_operation?: number;
  
  // Employee counts
  employee_count_fulltime?: number;
  employee_count_parttime?: number;
  employee_count_casual?: number;
  
  // Formalisation
  registration_status?: RegistrationStatus;
  registration_authority?: string;
  registration_number?: string;
  tax_status?: TaxStatus[];
  
  // Ownership
  female_ownership_pct?: number;
  youth_ownership_pct?: number;
  local_ownership_pct?: number;
  
  // Business model
  business_model?: BusinessModelType[];
  revenue_model?: RevenueModelType[];
  
  // Digital footprint
  website_url?: string;
  social_media_links?: Record<string, string>;
  online_store_presence?: string[];
  
  // Compliance & Governance
  has_board_of_directors?: boolean;
  has_advisory_board?: boolean;
  has_hr_policy?: boolean;
  has_finance_policy?: boolean;
  has_procurement_policy?: boolean;
  has_risk_policy?: boolean;
  annual_audits_done?: boolean;
  tax_returns_filed_on_time?: 'yes' | 'no' | 'not_sure';
  
  // Digital tools
  uses_erp?: boolean;
  uses_pos?: boolean;
  uses_accounting_software?: boolean;
}

// ================================
// Financial Data Types
// ================================

export type RevenueRange = 
  | 'under_10k'
  | '10k-50k'
  | '50k-100k'
  | '100k-500k'
  | '500k-1m'
  | '1m-5m'
  | 'over_5m';

export interface SMEFinancialData {
  id: string;
  user_id: string;
  
  // Revenue (exact or ranges)
  revenue_year_1?: number;
  revenue_year_2?: number;
  revenue_year_3?: number;
  revenue_range?: RevenueRange;
  
  // Profit/Loss
  profit_year_1?: number;
  profit_year_2?: number;
  profit_year_3?: number;
  
  // Cash flow
  cash_flow_positive?: boolean;
  
  // Customer metrics
  avg_invoice_size?: number;
  payment_terms_days?: number;
  top_3_clients_revenue_pct?: number;
  
  // Debt
  existing_loans_count?: number;
  total_debt_amount?: number;
  has_defaults_or_arrears?: boolean;
  
  currency: string;
  
  created_at: string;
  updated_at: string;
}

// ================================
// Document Types
// ================================

export type DocumentType = 
  | 'registration_certificate'
  | 'tax_clearance'
  | 'tin'
  | 'financial_statements'
  | 'insurance_policy'
  | 'contract_mou'
  | 'business_plan'
  | 'pitch_deck'
  | 'strategy_document'
  | 'project_proposal';

export interface SMEDocument {
  id: string;
  user_id: string;
  document_type: DocumentType;
  file_name: string;
  file_url: string;
  file_size_bytes?: number;
  mime_type?: string;
  extracted_text?: string;
  ai_analysis?: DocumentAIAnalysis;
  verified: boolean;
  verified_at?: string;
  expiry_date?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentAIAnalysis {
  summary?: string;
  key_findings?: string[];
  concerns?: string[];
  recommendations?: string[];
  confidence_score?: number;
}

// ================================
// Platform Behavior Types
// ================================

export interface SMEPlatformBehavior {
  id: string;
  user_id: string;
  
  grant_applications_count: number;
  tender_applications_count: number;
  finance_applications_count: number;
  
  login_count_30d: number;
  profile_completion_pct: number;
  training_courses_completed: number;
  
  message_response_rate_pct?: number;
  rfq_response_rate_pct?: number;
  avg_response_time_hours?: number;
  
  avg_rating?: number;
  review_count: number;
  
  last_login_at?: string;
  last_activity_at?: string;
  
  created_at: string;
  updated_at: string;
}

// ================================
// Sector Benchmark Types
// ================================

export type GrowthPotential = 'high' | 'medium' | 'low';
export type MarketSaturation = 'high' | 'medium' | 'low';

export interface SectorBenchmark {
  id: string;
  sector: string;
  sub_sector?: string;
  country: string;
  
  avg_revenue_growth_pct?: number;
  median_employee_count?: number;
  avg_profit_margin_pct?: number;
  avg_digital_maturity_score?: number;
  avg_compliance_rate_pct?: number;
  
  common_challenges?: string[];
  growth_potential?: GrowthPotential;
  market_saturation?: MarketSaturation;
  
  created_at: string;
  updated_at: string;
}

// ================================
// Partner Types
// ================================

export type PartnerType = 
  | 'bank'
  | 'investor'
  | 'donor'
  | 'consultant'
  | 'corporate'
  | 'training_provider'
  | 'accelerator'
  | 'government';

export interface PartnerProduct {
  name: string;
  description: string;
  min_amount?: number;
  max_amount?: number;
  requirements?: string[];
}

export interface WathaciPartner {
  id: string;
  partner_type: PartnerType;
  name: string;
  description?: string;
  logo_url?: string;
  website_url?: string;
  
  target_sectors?: string[];
  target_revenue_ranges?: RevenueRange[];
  target_business_stages?: string[];
  regions_served?: string[];
  
  products?: PartnerProduct[];
  is_active: boolean;
  
  created_at: string;
  updated_at: string;
}

// ================================
// SWOT Analysis Types
// ================================

export interface SWOTItem {
  id: string;
  text: string;
  category?: string;
  importance?: 'low' | 'medium' | 'high';
}

export interface SWOTAnalysis {
  strengths: SWOTItem[];
  weaknesses: SWOTItem[];
  opportunities: SWOTItem[];
  threats: SWOTItem[];
}

// ================================
// Bottleneck Types
// ================================

export type BottleneckArea = 
  | 'Financial Management'
  | 'Compliance'
  | 'Governance'
  | 'Digital Presence'
  | 'Operations'
  | 'Market Position'
  | 'Human Resources'
  | 'Technology'
  | 'Documentation'
  | 'Legal';

export interface Bottleneck {
  id: string;
  area: BottleneckArea;
  severity: keyof typeof SEVERITY_LEVELS;
  description: string;
  impact: string;
  data_source?: string;
}

// ================================
// Recommendation Types
// ================================

export interface Recommendation {
  id: string;
  priority: number;
  area: string;
  action: string;
  why: string;
  how: string[];
  estimated_time: string;
  difficulty: keyof typeof DIFFICULTY_LEVELS;
  timeline_category: keyof typeof TIMELINE_CATEGORIES;
  related_bottleneck_id?: string;
  resources?: string[];
}

// ================================
// Partner Recommendation Types
// ================================

export interface RecommendedPartner {
  partner_type: PartnerType;
  partner_id: string;
  name: string;
  reason: string;
  suggested_product?: string;
  fit_score: number;
  logo_url?: string;
  contact_info?: {
    email?: string;
    phone?: string;
    website?: string;
  };
}

// ================================
// Opportunity Types
// ================================

export type OpportunityType = 
  | 'grant'
  | 'tender'
  | 'loan'
  | 'investment'
  | 'training'
  | 'mentorship'
  | 'procurement';

export interface SuggestedOpportunity {
  id: string;
  type: OpportunityType;
  title: string;
  description: string;
  provider: string;
  deadline?: string;
  amount?: {
    min?: number;
    max?: number;
    currency: string;
  };
  fit_score: number;
  requirements?: string[];
  application_url?: string;
}

// ================================
// Score Types
// ================================

export interface DiagnosticsScores {
  funding_readiness: number;
  compliance_maturity: number;
  governance_maturity: number;
  digital_maturity: number;
  market_readiness: number;
  operational_efficiency: number;
}

export interface ScoreExplanation {
  score: number;
  band: string;
  factors_positive: string[];
  factors_negative: string[];
  data_quality: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface ScoreExplanations {
  funding_readiness: ScoreExplanation;
  compliance_maturity: ScoreExplanation;
  governance_maturity: ScoreExplanation;
  digital_maturity: ScoreExplanation;
  market_readiness: ScoreExplanation;
  operational_efficiency: ScoreExplanation;
}

// ================================
// Diagnostics Run Types
// ================================

export interface DiagnosticsRunMeta {
  last_updated: string;
  data_coverage_level: keyof typeof DATA_COVERAGE_LEVELS;
  data_sources_used: string[];
  model_version: string;
  prompt_version: string;
}

export interface DiagnosticsRun {
  id: string;
  user_id: string;
  
  model_version: string;
  prompt_version: string;
  input_hash: string;
  
  data_coverage_level: keyof typeof DATA_COVERAGE_LEVELS;
  data_sources_used: string[];
  
  // Scores
  funding_readiness_score: number;
  compliance_maturity_score: number;
  governance_maturity_score: number;
  digital_maturity_score: number;
  market_readiness_score: number;
  operational_efficiency_score: number;
  
  overall_health_band: keyof typeof HEALTH_BANDS;
  business_stage: keyof typeof BUSINESS_STAGES;
  
  swot_analysis: SWOTAnalysis;
  bottlenecks: Bottleneck[];
  recommendations: Recommendation[];
  recommended_partners: RecommendedPartner[];
  suggested_opportunities: SuggestedOpportunity[];
  
  narrative_summary: string;
  score_explanations: ScoreExplanations;
  
  ai_generated_at?: string;
  ai_model_used?: string;
  
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  
  created_at: string;
  updated_at: string;
}

// ================================
// Diagnostics Output Types (JSON format)
// ================================

export interface DiagnosticsOutput {
  overall_summary: {
    health_band: string;
    business_stage: string;
    headline: string;
    key_strengths: string[];
    urgent_gaps: string[];
    recommended_themes: string[];
  };
  
  swot_analysis: SWOTAnalysis;
  
  scores: DiagnosticsScores;
  score_explanations: ScoreExplanations;
  
  bottlenecks: Bottleneck[];
  recommendations: Recommendation[];
  recommended_partners: RecommendedPartner[];
  suggested_opportunities: SuggestedOpportunity[];
  
  meta: DiagnosticsRunMeta;
}

// ================================
// Diagnostics Input Types
// ================================

export interface DiagnosticsInput {
  profile: SMEExtendedProfile;
  financial_data?: SMEFinancialData;
  documents?: SMEDocument[];
  platform_behavior?: SMEPlatformBehavior;
  sector_benchmark?: SectorBenchmark;
}

// ================================
// API Types
// ================================

export interface RunDiagnosticsRequest {
  user_id: string;
  force_refresh?: boolean;
}

export interface RunDiagnosticsResponse {
  success: boolean;
  data?: DiagnosticsRun;
  error?: string;
}

export interface GetDiagnosticsHistoryRequest {
  user_id: string;
  limit?: number;
  offset?: number;
}

export interface GetDiagnosticsHistoryResponse {
  success: boolean;
  data?: DiagnosticsRun[];
  total?: number;
  error?: string;
}

export interface GetLatestDiagnosticsRequest {
  user_id: string;
}

export interface GetLatestDiagnosticsResponse {
  success: boolean;
  data?: DiagnosticsRun | null;
  error?: string;
}

// ================================
// PDF Export Types
// ================================

export interface PDFReportData {
  sme_name: string;
  logo_url?: string;
  generated_at: string;
  diagnostics: DiagnosticsOutput;
}

export interface PDFReportOptions {
  include_partner_details: boolean;
  include_opportunities: boolean;
  include_score_explanations: boolean;
  branding: {
    primary_color: string;
    logo_url: string;
  };
}
