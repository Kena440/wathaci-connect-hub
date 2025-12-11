/**
 * Database type definitions for WATHACI-CONNECT application
 * 
 * This file contains all the TypeScript interfaces and types for database entities
 * used throughout the application, ensuring type safety and consistency.
 */

// ================================
// User and Authentication Types
// ================================

export interface User {
  id: string;
  email: string;
  profile_completed?: boolean;
  account_type?: AccountType;
  created_at?: string;
  updated_at?: string;
  user_metadata?: Record<string, any>;
}

export type AccountType =
  | 'sole_proprietor'
  | 'sme'
  | 'professional'
  | 'investor'
  | 'donor'
  | 'government'
  | 'government_institution'
  | 'admin';

// ================================
// Profile Types
// ================================

export interface BaseProfile {
  id: string;
  email: string;
  full_name?: string | null;
  account_type: AccountType;
  profile_completed: boolean;
  accepted_terms: boolean;
  newsletter_opt_in: boolean;
  grace_period_access?: boolean;
  grace_period_started_at?: string | null;
  grace_period_expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersonalInfo {
  first_name?: string;
  last_name?: string;
  phone: string;
  country: string;
  city?: string;
  profile_photo_url?: string | null;
  short_bio?: string | null;
  msisdn?: string;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  profile_image_url?: string;
  linkedin_url?: string;
}

export interface BusinessInfo {
  business_name?: string;
  registration_number?: string;
  industry_sector?: string;
  description?: string;
  website_url?: string;
  employee_count?: number;
  annual_revenue?: number;
  funding_stage?: string;
  investment_focus?: string;
  investment_ticket_min?: number;
  investment_ticket_max?: number;
  investment_stage?: string;
  investment_regions?: string;
  impact_focus?: string;
  support_services?: string;
  support_preferences?: string;
  partnership_preferences?: string;
  donor_type?: string;
  funding_focus?: string;
  annual_funding_budget?: number;
  institution_type?: string;
  department?: string;
  government_focus?: string;
  programs?: string;
  partnership_needs?: string;
}

export interface PaymentInfo {
  payment_method: 'phone' | 'card';
  payment_phone?: string;
  msisdn?: string;
  card_details?: {
    last4: string;
    expiry_month: number;
    expiry_year: number;
    cardholder_name?: string | null;
  };
  use_same_phone?: boolean;
}

export interface ProfessionalInfo {
  qualifications?: Array<{
    institution?: string | null;
    degree?: string | null;
    name?: string | null;
    field?: string | null;
    year?: string | null;
  }>;
  experience_years?: number;
  specialization?: string;
  gaps_identified?: string[];
}

// Complete profile interface combining all sections
export interface Profile extends BaseProfile, PersonalInfo, BusinessInfo, PaymentInfo, ProfessionalInfo {}

// ================================
// Subscription Types
// ================================

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
  lencoAmount: number;
  userTypes: AccountType[];
  category: 'basic' | 'professional' | 'enterprise';
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  start_date: string;
  end_date: string;
  payment_status: 'paid' | 'pending' | 'failed';
  payment_reference?: string | null;
  created_at: string;
  updated_at: string;
}

// ================================
// Transaction Types
// ================================

export interface Transaction {
  id: string;
  user_id: string;
  subscription_id?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method: 'phone' | 'card';
  reference_number: string;
  created_at: string;
  updated_at: string;
}

// ================================
// Document Types (for due diligence)
// ================================

export interface Document {
  id: string;
  user_id: string;
  type: 'id' | 'business_license' | 'tax_certificate' | 'bank_statement' | 'other';
  file_url: string;
  file_name: string;
  file_size: number;
  verification_status: 'pending' | 'approved' | 'rejected';
  uploaded_at: string;
  verified_at?: string;
}

// ================================
// Marketplace Types
// ================================

export interface Product {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  status: 'draft' | 'published' | 'sold' | 'archived';
  images: string[];
  tags: string[];
  location?: string;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  pricing_type: 'fixed' | 'hourly' | 'project';
  price: number;
  currency: string;
  duration?: string;
  status: 'active' | 'inactive' | 'archived';
  skills: string[];
  portfolio_items: string[];
  created_at: string;
  updated_at: string;
}

// ================================
// SME Needs Assessment Types
// ================================

export interface SMENeedsAssessment {
  id: string;
  user_id: string;
  
  // Financial Health
  monthly_revenue: number;
  monthly_expenses: number;
  cash_flow_positive: boolean;
  debt_obligations: number;
  financial_records_organized: boolean;
  
  // Operations & Technology
  key_operational_challenges: string[];
  technology_gaps: string[];
  automation_level: 'manual' | 'partially_automated' | 'fully_automated';
  
  // Market & Customers
  target_market_clarity: 1 | 2 | 3 | 4 | 5; // 1-5 scale
  customer_acquisition_challenges: string[];
  competitive_position: 'weak' | 'average' | 'strong';
  
  // Compliance & Legal  
  regulatory_compliance_status: 'non_compliant' | 'partially_compliant' | 'fully_compliant';
  legal_structure_optimized: boolean;
  intellectual_property_protected: boolean;
  
  // Strategic Planning
  growth_strategy_defined: boolean;
  funding_requirements: {
    amount: number;
    purpose: string;
    timeline: string;
  };
  key_performance_metrics_tracked: boolean;
  
  // Professional Support Needs
  immediate_support_areas: string[];
  budget_for_professional_services: number;
  
  // Assessment Results
  overall_score: number;
  identified_gaps: string[];
  priority_areas: string[];
  
  completed_at: string;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalNeedsAssessment {
  id: string;
  user_id: string;
  primary_profession: string;
  years_of_experience: number;
  specialization_areas: string[];
  current_employment_status: 'employed' | 'self_employed' | 'consultant' | 'unemployed' | 'retired';
  services_offered: string[];
  service_delivery_modes: string[];
  hourly_rate_min: number;
  hourly_rate_max: number;
  target_client_types: string[];
  client_size_preference: string[];
  industry_focus: string[];
  availability_hours_per_week: number;
  project_duration_preference: 'short_term' | 'medium_term' | 'long_term' | 'flexible';
  travel_willingness: 'local_only' | 'regional' | 'national' | 'international';
  remote_work_capability: boolean;
  key_skills: string[];
  certification_status: string[];
  continuous_learning_interest: boolean;
  mentorship_interest: 'provide' | 'receive' | 'both' | 'none';
  client_acquisition_challenges: string[];
  marketing_channels: string[];
  business_development_support_needed: string[];
  networking_preferences: string[];
  collaboration_interest: boolean;
  partnership_types: string[];
  referral_system_interest: boolean;
  professional_profile: Record<string, any>;
  professional_strategy: string[];
  completed_at: string;
  created_at: string;
  updated_at: string;
}

export interface InvestorNeedsAssessment {
  id: string;
  user_id: string;
  investment_amount_min: number;
  investment_amount_max: number;
  investment_horizon: 'short_term' | 'medium_term' | 'long_term';
  risk_tolerance: 'low' | 'moderate' | 'high';
  support_types: string[];
  technical_assistance_areas: string[];
  mentorship_availability: boolean;
  preferred_industries: string[];
  business_stages: string[];
  geographic_focus: string[];
  equity_percentage_min: number;
  equity_percentage_max: number;
  board_participation: boolean;
  follow_on_investment: boolean;
  due_diligence_requirements: string[];
  decision_timeline: string;
  investment_committee: boolean;
  impact_focus: boolean;
  esg_criteria: string[];
  social_impact_importance: number;
  co_investment_interest: boolean;
  lead_investor_preference: 'lead' | 'follow' | 'either';
  syndicate_participation: boolean;
  investor_profile: Record<string, any>;
  investment_strategy: string[];
  completed_at: string;
  created_at: string;
  updated_at: string;
}

export interface DonorNeedsAssessment {
  id: string;
  user_id: string;
  annual_donation_budget: number;
  donation_frequency: 'one_time' | 'monthly' | 'quarterly' | 'annually';
  donation_amount_per_recipient: number;
  focus_areas: string[];
  target_beneficiaries: string[];
  geographic_focus: string[];
  support_types: string[];
  capacity_building_interest: boolean;
  mentorship_availability: boolean;
  impact_measurement_importance: number;
  reporting_requirements: string[];
  follow_up_engagement: boolean;
  organization_size_preference: string[];
  organization_stage_preference: string[];
  religious_affiliation_preference: 'any' | 'christian' | 'muslim' | 'other' | 'secular_only';
  selection_criteria: string[];
  application_process: string;
  decision_timeline: string;
  collaborative_funding: boolean;
  partner_organizations: string[];
  volunteer_opportunities: boolean;
  donor_profile: Record<string, any>;
  donor_strategy: string[];
  completed_at: string;
  created_at: string;
  updated_at: string;
}

export interface GovernmentNeedsAssessment {
  id: string;
  user_id: string;
  institution_name: string;
  institution_type: 'ministry' | 'agency' | 'council' | 'commission' | 'parastate' | 'other';
  department_division: string;
  geographic_jurisdiction: string[];
  current_programs: string[];
  target_beneficiaries: string[];
  annual_budget_allocation: number;
  program_reach: 'local' | 'provincial' | 'national' | 'regional';
  partnership_interests: string[];
  collaboration_types: string[];
  preferred_partners: string[];
  capacity_building_areas: string[];
  staff_development_priorities: string[];
  technical_assistance_needs: string[];
  policy_development_focus: string[];
  regulatory_challenges: string[];
  stakeholder_engagement_priorities: string[];
  digitalization_priorities: string[];
  innovation_focus_areas: string[];
  technology_adoption_challenges: string[];
  monitoring_systems: boolean;
  evaluation_frequency: 'monthly' | 'quarterly' | 'annually' | 'project_based';
  impact_measurement_priorities: string[];
  reporting_requirements: string[];
  government_profile: Record<string, any>;
  government_strategy: string[];
  completed_at: string;
  created_at: string;
  updated_at: string;
}

export interface AssessmentRecommendation {
  id: string;
  assessment_id: string;
  professional_id: string;
  match_score: number;
  recommended_for: string[];
  ai_reasoning: string;
  created_at: string;
}

// ================================
// Connection and Messaging Types
// ================================

export interface Connection {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  message?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'file' | 'image';
  file_url?: string;
  read: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  last_message?: string;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
}

// ================================
// Resource Purchase Types
// ================================

export interface ResourcePurchase {
  id: string;
  user_id: string;
  resource_id: number;
  created_at: string;
}

// ================================
// Database Response Types
// ================================

export interface DatabaseResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

// ================================
// Query Parameters and Filters
// ================================

export interface ProfileFilters {
  account_type?: AccountType;
  country?: string;
  industry_sector?: string;
  search?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProductFilters extends PaginationParams {
  category?: string;
  priceMin?: number;
  priceMax?: number;
  location?: string;
  search?: string;
}

export interface ServiceFilters extends PaginationParams {
  category?: string;
  pricing_type?: 'fixed' | 'hourly' | 'project';
  skills?: string[];
  search?: string;
}
// ================================
// SME Readiness Score Types
// ================================

export interface SMEReadinessScore {
  id: string;
  user_id: string;
  score: number;
  answers: Record<string, string>;
  created_at: string;
  updated_at: string;
}

// ================================
// Onboarding profile tables
// ================================

export interface ProfessionalProfileRow {
  id?: string;
  user_id: string;
  profile_id?: string | null;
  account_type?: string | null;
  email?: string | null;
  msisdn?: string | null;
  full_name?: string | null;
  profile_slug?: string | null;
  is_active: boolean;
  is_profile_complete: boolean;
  approval_status: string;
  entity_type?: string | null;
  organisation_name?: string | null;
  bio?: string | null;
  primary_expertise?: string[] | null;
  secondary_skills?: string[] | null;
  years_of_experience?: number | null;
  current_organisation?: string | null;
  qualifications?: string | null;
  top_sectors?: string[] | null;
  notable_projects?: string | null;
  services_offered?: string[] | null;
  expected_rates?: string | null;
  location_city?: string | null;
  location_country?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  website_url?: string | null;
  portfolio_url?: string | null;
  availability?: string | null;
  notes?: string | null;
  profile_photo_url?: string | null;
  logo_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  // Legacy fields kept for backward compatibility
  display_name?: string | null;
  is_company?: boolean | null;
  professional_bio?: string | null;
  top_sectors_served?: string[] | null;
  rate_type?: string | null;
  rate_currency?: string | null;
  rate_min?: number | null;
  rate_max?: number | null;
  languages?: string[] | null;
  willing_to_travel?: boolean | null;
  remote_only?: boolean | null;
  serves_regions?: string[] | null;
  accepting_new_clients?: boolean | null;
  tags?: string[] | null;
}

export interface SmeProfileRow {
  user_id: string;
  id?: string | null;
  profile_id?: string | null;
  account_type?: string | null;
  email?: string | null;
  msisdn?: string | null;
  full_name?: string | null;
  profile_slug?: string | null;
  is_active: boolean;
  is_profile_complete: boolean;
  approval_status: string;
  business_name: string;
  registration_number?: string | null;
  registration_type?: string | null;
  sector?: string | null;
  subsector?: string | null;
  years_in_operation?: number | null;
  employee_count?: number | null;
  turnover_bracket?: string | null;
  products_overview?: string | null;
  target_market?: string | null;
  location_city?: string | null;
  location_country?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  business_email?: string | null;
  website_url?: string | null;
  social_links?: string[] | null;
  main_challenges?: string[] | null;
  support_needs?: string[] | null;
  logo_url?: string | null;
  photos?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface InvestorProfileRow {
  id?: string;
  user_id: string;
  profile_id?: string | null;
  account_type?: string | null;
  email?: string | null;
  msisdn?: string | null;
  full_name?: string | null;
  profile_slug?: string | null;
  is_active: boolean;
  is_profile_complete: boolean;
  approval_status: string;
  organisation_name: string;
  investor_type?: string | null;
  ticket_size_min?: number | null;
  ticket_size_max?: number | null;
  preferred_sectors?: string[] | null;
  country_focus?: string[] | null;
  stage_preference?: string[] | null;
  instruments?: string[] | null;
  impact_focus?: string[] | Record<string, unknown> | null;
  contact_person?: string | null;
  contact_role?: string | null;
  website_url?: string | null;
  linkedin_url?: string | null;
  logo_url?: string | null;
  // Legacy fields
  contact_person_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website?: string | null;
  hq_country?: string | null;
  hq_city?: string | null;
  regions_focus?: string[] | null;
  ticket_currency?: string | null;
  investment_stage?: string[] | null;
  sectors_focus?: string[] | null;
  exclusion_list?: string[] | null;
  average_horizon_years?: number | null;
  portfolio_size?: number | null;
  portfolio_highlights?: string | null;
  ticket_frequency?: string | null;
  is_accepting_deals?: boolean | null;
  deal_filters?: Record<string, unknown> | null;
  tags?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DonorProfileRow {
  id: string;
  profile_id: string;
  organisation_name: string;
  donor_type?: string | null;
  contact_person_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website?: string | null;
  hq_country?: string | null;
  hq_city?: string | null;
  countries_focus?: string[] | null;
  thematic_focus?: string[] | null;
  funding_modalities?: string[] | null;
  typical_grant_min?: number | null;
  typical_grant_max?: number | null;
  grant_currency?: string | null;
  eligible_beneficiaries?: string[] | null;
  current_programmes?: string | null;
  open_calls_url?: string | null;
  application_cycles?: string | null;
  reporting_requirements_summary?: string | null;
  impact_themes?: Record<string, unknown> | null;
  accepting_applications: boolean;
  tags?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface GovernmentInstitutionProfileRow {
  id: string;
  profile_id: string;
  institution_name: string;
  institution_type?: string | null;
  mandate_summary?: string | null;
  ministry_or_parent?: string | null;
  contact_person_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website?: string | null;
  hq_address?: string | null;
  hq_city?: string | null;
  hq_country?: string | null;
  sme_relevant_services?: string[] | null;
  service_portal_url?: string | null;
  key_programmes?: string | null;
  regulatory_scope?: string[] | null;
  target_segments?: string[] | null;
  response_time_sla?: string | null;
  office_hours?: string | null;
  tags?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SMEReadinessAnswers {
  q1?: 'yes' | 'no'; // Registered with PACRA
  q2?: 'yes' | 'no'; // Issue receipts/invoices
  q3?: 'yes' | 'no'; // Track expenses
  q4?: 'yes' | 'no'; // Store customer details
  q5?: 'yes' | 'no'; // Business bank/mobile money account
}

// ================================
// Supabase Database Type
// ================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile>;
        Update: Partial<Profile>;
      };
      professional_profiles: {
        Row: ProfessionalProfileRow;
        Insert: Partial<ProfessionalProfileRow>;
        Update: Partial<ProfessionalProfileRow>;
      };
      sme_profiles: {
        Row: SmeProfileRow;
        Insert: Partial<SmeProfileRow>;
        Update: Partial<SmeProfileRow>;
      };
      investor_profiles: {
        Row: InvestorProfileRow;
        Insert: Partial<InvestorProfileRow>;
        Update: Partial<InvestorProfileRow>;
      };
      donor_profiles: {
        Row: DonorProfileRow;
        Insert: Partial<DonorProfileRow>;
        Update: Partial<DonorProfileRow>;
      };
      government_institution_profiles: {
        Row: GovernmentInstitutionProfileRow;
        Insert: Partial<GovernmentInstitutionProfileRow>;
        Update: Partial<GovernmentInstitutionProfileRow>;
      };
      sme_readiness_scores: {
        Row: SMEReadinessScore;
        Insert: Omit<SMEReadinessScore, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<SMEReadinessScore, 'id' | 'user_id'>>;
      };
    };
  };
}
