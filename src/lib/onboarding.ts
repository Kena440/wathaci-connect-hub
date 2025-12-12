/**
 * Onboarding Helper Module
 * 
 * Provides functions to handle profile creation and needs assessment
 * saves for all account types during the onboarding flow.
 */

import { supabaseClient as supabase } from "./supabaseClient";
import { normalizeMsisdn, normalizePhoneNumber } from "@/utils/phone";
import { logger } from "@/lib/logger";
import type { AccountTypeValue } from "@/data/accountTypes";

export type AccountType = AccountTypeValue | "government" | "sole_proprietor";

export interface ProfileParams {
  account_type: AccountType;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  msisdn: string;
  business_name?: string;
  phone?: string;
  email?: string;
  [key: string]: any;
}

export interface SMENeedsAssessmentPayload {
  user_id?: string;
  sector?: string;
  stage?: string;
  monthly_revenue?: number;
  monthly_revenue_range?: string;
  monthly_expenses?: number;
  employees_count?: number;
  employee_count?: number;
  country?: string;
  city?: string;
  main_challenges?: string[];
  key_operational_challenges?: string[];
  funding_amount_range?: string;
  funding_amount?: number;
  funding_type?: string;
  funding_purpose?: string;
  funding_timeline?: string;
  support_needs?: string[];
  immediate_support_areas?: string[];
  cash_flow_positive?: boolean;
  debt_obligations?: number;
  financial_records_organized?: boolean;
  technology_gaps?: string[];
  automation_level?: string;
  target_market_clarity?: number;
  customer_acquisition_challenges?: string[];
  competitive_position?: string;
  regulatory_compliance_status?: string;
  legal_structure_optimized?: boolean;
  intellectual_property_protected?: boolean;
  growth_strategy_defined?: boolean;
  key_performance_metrics_tracked?: boolean;
  budget_for_professional_services?: number;
  funding_requirements?: any;
  overall_score?: number;
  identified_gaps?: string[];
  priority_areas?: string[];
  completed_at?: string;
  metadata?: any;
  [key: string]: any;
}

export interface ProfessionalNeedsAssessmentPayload {
  user_id?: string;
  primary_profession?: string;
  expertise_areas?: string[];
  specialization_areas?: string[];
  years_of_experience?: number;
  current_employment_status?: string;
  services_offered?: string[];
  service_delivery_modes?: string[];
  hourly_rate_min?: number;
  hourly_rate_max?: number;
  target_client_types?: string[];
  client_size_preference?: string[];
  industry_focus?: string[];
  availability_hours_per_week?: number;
  availability?: string;
  project_duration_preference?: string;
  travel_willingness?: string;
  remote_work_capability?: boolean;
  key_skills?: string[];
  certification_status?: string[];
  continuous_learning_interest?: boolean;
  mentorship_interest?: string;
  client_acquisition_challenges?: string[];
  marketing_channels?: string[];
  business_development_support_needed?: string[];
  networking_preferences?: string[];
  collaboration_interest?: boolean;
  partnership_types?: string[];
  referral_system_interest?: boolean;
  professional_profile?: any;
  professional_strategy?: string[];
  engagement_type?: string;
  preferred_sme_segments?: any;
  completed_at?: string;
  metadata?: any;
  [key: string]: any;
}

export interface DonorNeedsAssessmentPayload {
  user_id?: string;
  focus_areas?: string[];
  ticket_size_min?: number;
  ticket_size_max?: number;
  geography_preferences?: string[];
  reporting_requirements?: string;
  preferred_payment_method?: string;
  donor_type?: string;
  funding_focus?: string[];
  annual_funding_budget?: number;
  grant_size_range?: string;
  application_requirements?: string[];
  decision_timeline?: string;
  preferred_sectors?: string[];
  impact_measurement?: string[];
  partnership_preferences?: string[];
  donor_profile?: any;
  donor_strategy?: string[];
  completed_at?: string;
  metadata?: any;
  [key: string]: any;
}

export interface InvestorNeedsAssessmentPayload {
  user_id?: string;
  investment_type?: string;
  investment_types?: string[];
  ticket_size_min?: number;
  ticket_size_max?: number;
  sector_preferences?: string[];
  stage_preferences?: string[];
  geography?: string;
  geography_focus?: string[];
  time_horizon?: string;
  involvement_level?: string;
  expected_return?: number;
  risk_tolerance?: string;
  investment_criteria?: any;
  due_diligence_requirements?: string[];
  value_add_services?: string[];
  exit_preferences?: string[];
  co_investment_interest?: boolean;
  investor_profile?: any;
  investor_strategy?: string[];
  completed_at?: string;
  metadata?: any;
  [key: string]: any;
}

/**
 * Create or update a user profile
 */
export async function upsertProfile(params: ProfileParams) {
  logger.info("Starting onboarding profile upsert", {
    component: "onboarding",
    event: "onboarding:profile:upsert:start",
    accountType: params.account_type,
  });

  const normalizeAccountTypeForDb = (accountType: AccountType): AccountTypeValue => {
    if (accountType === "government") {
      return "government_institution";
    }

    if (accountType === "sole_proprietor") {
      return "sme";
    }

    return accountType as AccountTypeValue;
  };

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    logger.error("Profile upsert aborted: user not authenticated", userError, {
      component: "onboarding",
      event: "onboarding:profile:upsert:no-user",
    });
    throw new Error("User not authenticated; cannot create profile.");
  }

  // Sanitize string values
  const sanitize = (value: any): any => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed || null;
    }
    return value;
  };

  // Build the payload
  const payload: any = {
    id: user.id,
    account_type: normalizeAccountTypeForDb(params.account_type),
  };

  const normalizedMsisdn = normalizeMsisdn(params.msisdn);
  if (!normalizedMsisdn) {
    throw new Error("MSISDN (mobile money number) is required for all profiles and must include 9-15 digits.");
  }

  payload.msisdn = normalizedMsisdn;

  // Add optional fields
  if (params.full_name) {
    payload.full_name = sanitize(params.full_name);
  }
  
  if (params.first_name) {
    payload.first_name = sanitize(params.first_name);
  }
  
  if (params.last_name) {
    payload.last_name = sanitize(params.last_name);
  }

  if (params.business_name) {
    payload.business_name = sanitize(params.business_name);
  }

  // Also store msisdn in phone field for compatibility
  if (!params.phone) {
    payload.phone = normalizedMsisdn;
  } else {
    const normalizedPhone = normalizePhoneNumber(params.phone);
    payload.phone = normalizedPhone ?? sanitize(params.phone);
  }

  if (params.email) {
    payload.email = sanitize(params.email);
  } else {
    payload.email = user.email;
  }

  // Add any other fields from params
  for (const [key, value] of Object.entries(params)) {
    if (!["account_type", "full_name", "first_name", "last_name", "msisdn", "business_name", "phone", "email"].includes(key)) {
      payload[key] = sanitize(value);
    }
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    console.error("[onboarding] profiles upsert failed", {
      table: "profiles",
      error,
      payloadKeys: Object.keys(payload),
    });
    logger.error("Profile upsert failed", error, {
      component: "onboarding",
      event: "onboarding:profile:upsert:error",
      userId: user.id,
    });
    throw new Error(`Failed to save profile: ${error.message}`);
  }

  logger.info("Profile upsert completed", {
    component: "onboarding",
    event: "onboarding:profile:upsert:success",
    userId: user.id,
  });

  return data;
}

/**
 * Save SME needs assessment
 */
export async function saveSmeNeedsAssessment(payload: SMENeedsAssessmentPayload) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User not authenticated; cannot save assessment.");
  }

  const assessmentPayload = {
    user_id: user.id,
    monthly_revenue: payload.monthly_revenue || 0,
    monthly_expenses: payload.monthly_expenses || 0,
    cash_flow_positive: payload.cash_flow_positive || false,
    debt_obligations: payload.debt_obligations || 0,
    financial_records_organized: payload.financial_records_organized || false,
    key_operational_challenges: payload.key_operational_challenges || payload.main_challenges || [],
    technology_gaps: payload.technology_gaps || [],
    automation_level: payload.automation_level || "manual",
    target_market_clarity: payload.target_market_clarity || 3,
    customer_acquisition_challenges: payload.customer_acquisition_challenges || [],
    competitive_position: payload.competitive_position || "average",
    regulatory_compliance_status: payload.regulatory_compliance_status || "partially_compliant",
    legal_structure_optimized: payload.legal_structure_optimized || false,
    intellectual_property_protected: payload.intellectual_property_protected || false,
    growth_strategy_defined: payload.growth_strategy_defined || false,
    funding_requirements: payload.funding_requirements || {
      amount: payload.funding_amount || 0,
      purpose: payload.funding_purpose || "",
      timeline: payload.funding_timeline || "",
      type: payload.funding_type || ""
    },
    key_performance_metrics_tracked: payload.key_performance_metrics_tracked || false,
    immediate_support_areas: payload.immediate_support_areas || payload.support_needs || [],
    budget_for_professional_services: payload.budget_for_professional_services || 0,
    overall_score: payload.overall_score || 0,
    identified_gaps: payload.identified_gaps || [],
    priority_areas: payload.priority_areas || [],
    completed_at: payload.completed_at || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("sme_needs_assessments")
    .insert(assessmentPayload)
    .select()
    .single();

  if (error) {
    console.error("SME assessment save error:", error);
    throw new Error(`Failed to save SME assessment: ${error.message}`);
  }

  return data;
}

/**
 * Save Professional needs assessment
 */
export async function saveProfessionalNeedsAssessment(payload: ProfessionalNeedsAssessmentPayload) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User not authenticated; cannot save assessment.");
  }

  const assessmentPayload = {
    user_id: user.id,
    primary_profession: payload.primary_profession || "",
    years_of_experience: payload.years_of_experience || 0,
    specialization_areas: payload.specialization_areas || payload.expertise_areas || [],
    current_employment_status: payload.current_employment_status || "employed",
    services_offered: payload.services_offered || [],
    service_delivery_modes: payload.service_delivery_modes || [],
    hourly_rate_min: payload.hourly_rate_min || 0,
    hourly_rate_max: payload.hourly_rate_max || 0,
    target_client_types: payload.target_client_types || [],
    client_size_preference: payload.client_size_preference || [],
    industry_focus: payload.industry_focus || [],
    availability_hours_per_week: payload.availability_hours_per_week || 0,
    project_duration_preference: payload.project_duration_preference || "flexible",
    travel_willingness: payload.travel_willingness || "no",
    remote_work_capability: payload.remote_work_capability || false,
    key_skills: payload.key_skills || [],
    certification_status: payload.certification_status || [],
    continuous_learning_interest: payload.continuous_learning_interest || false,
    mentorship_interest: payload.mentorship_interest || "no",
    client_acquisition_challenges: payload.client_acquisition_challenges || [],
    marketing_channels: payload.marketing_channels || [],
    business_development_support_needed: payload.business_development_support_needed || [],
    networking_preferences: payload.networking_preferences || [],
    collaboration_interest: payload.collaboration_interest || false,
    partnership_types: payload.partnership_types || [],
    referral_system_interest: payload.referral_system_interest || false,
    professional_profile: payload.professional_profile || {},
    professional_strategy: payload.professional_strategy || [],
    completed_at: payload.completed_at || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("professional_needs_assessments")
    .insert(assessmentPayload)
    .select()
    .single();

  if (error) {
    console.error("Professional assessment save error:", error);
    throw new Error(`Failed to save professional assessment: ${error.message}`);
  }

  return data;
}

/**
 * Save Donor needs assessment
 */
export async function saveDonorNeedsAssessment(payload: DonorNeedsAssessmentPayload) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User not authenticated; cannot save assessment.");
  }

  const assessmentPayload = {
    user_id: user.id,
    donor_type: payload.donor_type || "",
    funding_focus: payload.funding_focus || payload.focus_areas || [],
    annual_funding_budget: payload.annual_funding_budget || 0,
    grant_size_range: payload.grant_size_range || "",
    application_requirements: payload.application_requirements || [],
    decision_timeline: payload.decision_timeline || "",
    preferred_sectors: payload.preferred_sectors || [],
    geography_preferences: payload.geography_preferences || [],
    impact_measurement: payload.impact_measurement || [],
    partnership_preferences: payload.partnership_preferences || [],
    donor_profile: payload.donor_profile || {},
    donor_strategy: payload.donor_strategy || [],
    completed_at: payload.completed_at || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("donor_needs_assessments")
    .insert(assessmentPayload)
    .select()
    .single();

  if (error) {
    console.error("Donor assessment save error:", error);
    throw new Error(`Failed to save donor assessment: ${error.message}`);
  }

  return data;
}

/**
 * Save Investor needs assessment
 */
export async function saveInvestorNeedsAssessment(payload: InvestorNeedsAssessmentPayload) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User not authenticated; cannot save assessment.");
  }

  const assessmentPayload = {
    user_id: user.id,
    investment_types: payload.investment_types || (payload.investment_type ? [payload.investment_type] : []),
    ticket_size_min: payload.ticket_size_min || 0,
    ticket_size_max: payload.ticket_size_max || 0,
    sector_preferences: payload.sector_preferences || [],
    stage_preferences: payload.stage_preferences || [],
    geography_focus: payload.geography_focus || (payload.geography ? [payload.geography] : []),
    expected_return: payload.expected_return || 0,
    time_horizon: payload.time_horizon || "",
    risk_tolerance: payload.risk_tolerance || "moderate",
    involvement_level: payload.involvement_level || "hands_off",
    investment_criteria: payload.investment_criteria || {},
    due_diligence_requirements: payload.due_diligence_requirements || [],
    value_add_services: payload.value_add_services || [],
    exit_preferences: payload.exit_preferences || [],
    co_investment_interest: payload.co_investment_interest || false,
    investor_profile: payload.investor_profile || {},
    investor_strategy: payload.investor_strategy || [],
    completed_at: payload.completed_at || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("investor_needs_assessments")
    .insert(assessmentPayload)
    .select()
    .single();

  if (error) {
    console.error("Investor assessment save error:", error);
    throw new Error(`Failed to save investor assessment: ${error.message}`);
  }

  return data;
}

/**
 * Get the current user's profile
 */
export async function getCurrentProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { data: null, error: userError || new Error("Not authenticated") };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { data, error };
}
