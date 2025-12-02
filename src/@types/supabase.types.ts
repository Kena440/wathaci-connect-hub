/**
 * Production-Ready TypeScript Type Definitions
 * 
 * These types match the Supabase database schema exactly.
 * Auto-generated types can be created using: supabase gen types typescript
 * 
 * This file provides manual types for immediate use and documentation.
 */

// ============================================================================
// CORE ENUMS AND TYPES
// ============================================================================

export type AccountType =
  | 'sole_proprietor'
  | 'SME'
  | 'investor'
  | 'donor'
  | 'professional'
  | 'government'
  | 'NGO';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type TransactionStatus = 'pending' | 'success' | 'failed' | 'cancelled';
export type SubscriptionStatus = 'pending' | 'active' | 'cancelled' | 'expired';
export type Currency = 'NGN' | 'USD' | 'EUR' | 'GBP';
export type AuditActionType = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'password_change';
export type UserRole = 'user' | 'admin' | 'super_admin' | 'moderator';

// ============================================================================
// CORE ENTITY INTERFACES
// ============================================================================

export interface Profile {
  // Primary key (matches auth.users.id)
  id: string;

  // Core identity
  email: string;
  account_type: AccountType;
  profile_completed: boolean;

  // Personal information
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  phone: string | null;
  msisdn: string | null;
  country: string | null;
  address: string | null;
  coordinates: Coordinates | null;

  // Profile assets
  profile_image_url: string | null;
  linkedin_url: string | null;

  // Business information
  business_name: string | null;
  registration_number: string | null;
  industry_sector: string | null;
  description: string | null;
  website_url: string | null;
  employee_count: number | null;
  annual_revenue: number | null;
  funding_stage: string | null;

  // Payment information
  payment_method: string | null;
  payment_phone: string | null;
  use_same_phone: boolean;
  card_details: CardDetails | null;

  // Investor-specific
  investment_focus: string | null;
  investment_ticket_min: number | null;
  investment_ticket_max: number | null;
  investment_stage: string | null;
  investment_regions: string | null;
  impact_focus: string | null;

  // Support/Partnership
  support_services: string | null;
  support_preferences: string | null;
  partnership_preferences: string | null;

  // Donor-specific
  donor_type: string | null;
  funding_focus: string | null;
  annual_funding_budget: number | null;

  // Government-specific
  institution_type: string | null;
  department: string | null;
  government_focus: string | null;
  programs: string | null;
  partnership_needs: string | null;

  // Professional
  qualifications: Qualification[] | null;
  experience_years: number | null;
  specialization: string | null;
  gaps_identified: string[] | null;

  // Terms and preferences
  accepted_terms: boolean;
  newsletter_opt_in: boolean;

  // Grace period tracking
  grace_period_access: boolean;
  grace_period_started_at: string | null;
  grace_period_expires_at: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert extends Omit<
  Profile,
  'id' | 'created_at' | 'updated_at' | 'grace_period_access' | 'grace_period_started_at' | 'grace_period_expires_at'
> {
  id: string;
  grace_period_access?: boolean;
  grace_period_started_at?: string | null;
  grace_period_expires_at?: string | null;
}

export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface CardDetails {
  last4: string;
  brand: string;
  exp_month: number;
  exp_year: number;
}

export interface Qualification {
  institution: string;
  degree: string;
  field: string;
  year: number;
}

// ============================================================================
// AUDIT LOG
// ============================================================================

export interface AuditLog {
  id: string;
  user_id: string | null;
  action_type: AuditActionType;
  table_name: string;
  record_id: string | null;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogInsert
  extends Omit<AuditLog, 'id' | 'created_at'> {
  id?: string;
}

// ============================================================================
// USER ROLES
// ============================================================================

export interface UserRoleRecord {
  id: string;
  user_id: string;
  role_name: UserRole;
  granted_at: string;
  granted_by: string | null;
}

export interface UserRoleInsert
  extends Omit<UserRoleRecord, 'id' | 'granted_at'> {
  id?: string;
}

// ============================================================================
// SUBSCRIPTION PLANS
// ============================================================================

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string | null;
  features: string[];
  popular: boolean;
  lenco_amount: number;
  user_types: string[];
  category: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlanInsert
  extends Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
}

export type SubscriptionPlanUpdate = Partial<
  Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>
>;

// ============================================================================
// USER SUBSCRIPTIONS
// ============================================================================

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  start_date: string;
  end_date: string | null;
  payment_status: PaymentStatus;
  payment_reference: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface UserSubscriptionInsert
  extends Omit<UserSubscription, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
}

export type UserSubscriptionUpdate = Partial<
  Omit<UserSubscription, 'id' | 'created_at' | 'updated_at'>
>;

// ============================================================================
// TRANSACTIONS
// ============================================================================

export interface Transaction {
  id: string;
  user_id: string;
  subscription_id: string | null;
  amount: number;
  currency: Currency;
  status: TransactionStatus;
  payment_method: string;
  reference_number: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionInsert
  extends Omit<Transaction, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
}

export type TransactionUpdate = Partial<
  Omit<Transaction, 'id' | 'created_at' | 'updated_at'>
>;

// ============================================================================
// PAYMENTS
// ============================================================================

export interface Payment {
  id: string;
  user_id: string;
  subscription_id: string | null;
  transaction_id: string | null;
  reference: string | null;
  amount: number;
  currency: Currency;
  status: TransactionStatus;
  payment_method: string;
  provider: string | null;
  provider_reference: string | null;
  payment_url: string | null;
  email: string | null;
  name: string | null;
  phone: string | null;
  description: string | null;
  lenco_transaction_id: string | null;
  lenco_access_code: string | null;
  lenco_authorization_url: string | null;
  gateway_response: string | null;
  paid_at: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentInsert
  extends Omit<Payment, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
}

export type PaymentUpdate = Partial<
  Omit<Payment, 'id' | 'created_at' | 'updated_at'>
>;

// ============================================================================
// WEBHOOK LOGS
// ============================================================================

export interface WebhookLog {
  id: string;
  event_type: string;
  reference: string;
  status: string;
  error_message: string | null;
  payload: Record<string, any> | null;
  processed_at: string;
  created_at: string;
}

export interface WebhookLogInsert
  extends Omit<WebhookLog, 'id' | 'processed_at' | 'created_at'> {
  id?: string;
}

// ============================================================================
// ASSESSMENT TYPES (Generic)
// ============================================================================

export interface SMEAssessment {
  id: string;
  user_id: string;
  monthly_revenue: number;
  monthly_expenses: number;
  cash_flow_positive: boolean;
  debt_obligations: number;
  financial_records_organized: boolean;
  key_operational_challenges: string[];
  technology_gaps: string[];
  automation_level: string;
  target_market_clarity: number;
  customer_acquisition_challenges: string[];
  competitive_position: string;
  regulatory_compliance_status: string;
  legal_structure_optimized: boolean;
  intellectual_property_protected: boolean;
  growth_strategy_defined: boolean;
  funding_requirements: Record<string, any>;
  key_performance_metrics_tracked: boolean;
  immediate_support_areas: string[];
  budget_for_professional_services: number;
  overall_score: number;
  identified_gaps: string[];
  priority_areas: string[];
  completed_at: string;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalAssessment {
  id: string;
  user_id: string;
  primary_profession: string;
  years_of_experience: number;
  specialization_areas: string[];
  current_employment_status: string;
  services_offered: string[];
  service_delivery_modes: string[];
  hourly_rate_min: number;
  hourly_rate_max: number;
  target_client_types: string[];
  client_size_preference: string[];
  industry_focus: string[];
  availability_hours_per_week: number;
  project_duration_preference: string;
  travel_willingness: string;
  remote_work_capability: boolean;
  key_skills: string[];
  certification_status: string[];
  continuous_learning_interest: boolean;
  mentorship_interest: string;
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

export interface InvestorAssessment {
  id: string;
  user_id: string;
  investment_amount_min: number;
  investment_amount_max: number;
  investment_horizon: string;
  risk_tolerance: string;
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
  lead_investor_preference: string;
  syndicate_participation: boolean;
  investor_profile: Record<string, any>;
  investment_strategy: string[];
  completed_at: string;
  created_at: string;
  updated_at: string;
}

export interface DonorAssessment {
  id: string;
  user_id: string;
  annual_donation_budget: number;
  donation_frequency: string;
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
  religious_affiliation_preference: string;
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

export interface GovernmentAssessment {
  id: string;
  user_id: string;
  institution_name: string;
  institution_type: string;
  department_division: string;
  geographic_jurisdiction: string[];
  current_programs: string[];
  target_beneficiaries: string[];
  annual_budget_allocation: number;
  program_reach: string;
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
  evaluation_frequency: string;
  impact_measurement_priorities: string[];
  reporting_requirements: string[];
  government_profile: Record<string, any>;
  government_strategy: string[];
  completed_at: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// ONBOARDING PROFILE TABLES
// ============================================================================

export interface ProfessionalProfileRecord {
  id: string;
  user_id: string;
  entity_type: 'individual' | 'firm' | 'company';
  full_name: string;
  organisation_name: string | null;
  bio: string | null;
  primary_expertise: string[];
  secondary_skills: string[];
  years_of_experience: number | null;
  current_organisation: string | null;
  qualifications: string | null;
  top_sectors: string[];
  notable_projects: string | null;
  services_offered: string[];
  expected_rates: string | null;
  location_city: string | null;
  location_country: string | null;
  phone: string | null;
  email: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  portfolio_url: string | null;
  availability: 'part_time' | 'full_time' | 'occasional' | null;
  notes: string | null;
  profile_photo_url: string | null;
  logo_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type ProfessionalProfileInsert = Omit<
  ProfessionalProfileRecord,
  'id' | 'created_at' | 'updated_at'
>;
export type ProfessionalProfileUpdate = Partial<
  Omit<ProfessionalProfileRecord, 'id' | 'created_at' | 'updated_at'>
>;

export interface SmeProfileRecord {
  id: string;
  user_id: string;
  business_name: string;
  registration_number: string | null;
  registration_type: string | null;
  sector: string | null;
  subsector: string | null;
  years_in_operation: number | null;
  employee_count: number | null;
  turnover_bracket: string | null;
  products_overview: string | null;
  target_market: string | null;
  location_city: string | null;
  location_country: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  business_email: string | null;
  website_url: string | null;
  social_links: string[];
  main_challenges: string[];
  support_needs: string[];
  logo_url: string | null;
  photos: string[];
  created_at: string | null;
  updated_at: string | null;
}

export type SmeProfileInsert = Omit<SmeProfileRecord, 'id' | 'created_at' | 'updated_at'>;
export type SmeProfileUpdate = Partial<Omit<SmeProfileRecord, 'id' | 'created_at' | 'updated_at'>>;

export interface InvestorProfileRecord {
  id: string;
  user_id: string;
  organisation_name: string;
  investor_type: string | null;
  ticket_size_min: number | null;
  ticket_size_max: number | null;
  preferred_sectors: string[];
  country_focus: string[];
  stage_preference: string[];
  instruments: string[];
  impact_focus: string[];
  contact_person: string | null;
  contact_role: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  logo_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type InvestorProfileInsert = Omit<
  InvestorProfileRecord,
  'id' | 'created_at' | 'updated_at'
>;
export type InvestorProfileUpdate = Partial<
  Omit<InvestorProfileRecord, 'id' | 'created_at' | 'updated_at'>
>;

// ============================================================================
// AUTH TYPES
// ============================================================================

export interface AuthUser {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  phone: string | null;
  confirmed_at: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  updated_at: string;
  app_metadata: Record<string, any>;
  user_metadata: Record<string, any>;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: AuthUser;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiSuccess<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: any;
  };
}

export type ApiResponse<T = any> = ApiSuccess<T> | ApiError;

// ============================================================================
// FORM TYPES
// ============================================================================

export interface SignUpForm {
  email: string;
  password: string;
  full_name?: string;
  account_type?: AccountType;
}

export interface SignInForm {
  email: string;
  password: string;
}

export type ProfileUpdateForm = ProfileUpdate;

// ============================================================================
// DATABASE TYPE (For Supabase Client)
// ============================================================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: AuditLogInsert;
        Update: never;
      };
      user_roles: {
        Row: UserRoleRecord;
        Insert: UserRoleInsert;
        Update: never;
      };
      subscription_plans: {
        Row: SubscriptionPlan;
        Insert: SubscriptionPlanInsert;
        Update: SubscriptionPlanUpdate;
      };
      user_subscriptions: {
        Row: UserSubscription;
        Insert: UserSubscriptionInsert;
        Update: UserSubscriptionUpdate;
      };
      transactions: {
        Row: Transaction;
        Insert: TransactionInsert;
        Update: TransactionUpdate;
      };
      payments: {
        Row: Payment;
        Insert: PaymentInsert;
        Update: PaymentUpdate;
      };
      professional_profiles: {
        Row: ProfessionalProfileRecord;
        Insert: ProfessionalProfileInsert;
        Update: ProfessionalProfileUpdate;
      };
      sme_profiles: {
        Row: SmeProfileRecord;
        Insert: SmeProfileInsert;
        Update: SmeProfileUpdate;
      };
      investor_profiles: {
        Row: InvestorProfileRecord;
        Insert: InvestorProfileInsert;
        Update: InvestorProfileUpdate;
      };
      webhook_logs: {
        Row: WebhookLog;
        Insert: WebhookLogInsert;
        Update: never;
      };
      sme_needs_assessments: {
        Row: SMEAssessment;
        Insert: Omit<SMEAssessment, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<SMEAssessment, 'id' | 'created_at' | 'updated_at'>>;
      };
      professional_needs_assessments: {
        Row: ProfessionalAssessment;
        Insert: Omit<ProfessionalAssessment, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ProfessionalAssessment, 'id' | 'created_at' | 'updated_at'>>;
      };
      investor_needs_assessments: {
        Row: InvestorAssessment;
        Insert: Omit<InvestorAssessment, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<InvestorAssessment, 'id' | 'created_at' | 'updated_at'>>;
      };
      donor_needs_assessments: {
        Row: DonorAssessment;
        Insert: Omit<DonorAssessment, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DonorAssessment, 'id' | 'created_at' | 'updated_at'>>;
      };
      government_needs_assessments: {
        Row: GovernmentAssessment;
        Insert: Omit<GovernmentAssessment, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<GovernmentAssessment, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
      Views: Record<string, never>;
      Functions: Record<string, never>;
    Enums: {
      account_type_enum: AccountType;
    };
  };
}
