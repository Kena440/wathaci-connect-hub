/**
 * SME Auto-Diagnosis Scoring Engine
 * 
 * This module contains the transparent scoring logic for calculating
 * various maturity and readiness scores for SMEs.
 * 
 * All scores are 0-100 with the following bands:
 * - 0-30: Not yet ready
 * - 31-60: Emerging / Semi-ready
 * - 61-80: Bankable with support
 * - 81-100: Strongly bankable
 */

import type {
  SMEExtendedProfile,
  SMEFinancialData,
  SMEDocument,
  SMEPlatformBehavior,
  DiagnosticsScores,
  ScoreExplanation,
  ScoreExplanations,
  SCORE_BANDS,
} from '@/@types/diagnostics';

// ================================
// Score Weights Configuration
// ================================

const FUNDING_READINESS_WEIGHTS = {
  formal_registration: 15,
  years_in_business: 10,
  has_revenue_data: 15,
  revenue_trend_positive: 10,
  profitability: 10,
  has_financial_records: 15,
  has_audited_statements: 10,
  debt_repayment_behavior: 10,
  compliance_complete: 5,
};

const COMPLIANCE_MATURITY_WEIGHTS = {
  tax_registration: 20,
  tax_clearance: 20,
  annual_return_filing: 15,
  industry_licenses: 15,
  hr_policies_contracts: 15,
  governance_structures: 15,
};

const DIGITAL_MATURITY_WEIGHTS = {
  website_presence: 20,
  social_media_presence: 15,
  online_sales_channels: 20,
  erp_system: 15,
  pos_system: 10,
  accounting_software: 15,
  responsiveness: 5,
};

const GOVERNANCE_MATURITY_WEIGHTS = {
  board_advisory_presence: 25,
  written_policies: 25,
  role_segregation: 20,
  risk_management: 15,
  audit_practices: 15,
};

const MARKET_READINESS_WEIGHTS = {
  clear_business_model: 20,
  defined_revenue_model: 15,
  customer_diversification: 15,
  sector_positioning: 15,
  years_track_record: 15,
  geographic_presence: 10,
  online_presence: 10,
};

const OPERATIONAL_EFFICIENCY_WEIGHTS = {
  employee_structure: 15,
  digital_tools_adoption: 20,
  financial_management: 20,
  customer_management: 15,
  platform_engagement: 15,
  process_automation: 15,
};

// ================================
// Helper Functions
// ================================

export function getScoreBand(score: number): { label: string; color: string } {
  if (score <= 30) return { label: 'Not yet ready', color: 'red' };
  if (score <= 60) return { label: 'Emerging / Semi-ready', color: 'yellow' };
  if (score <= 80) return { label: 'Bankable with support', color: 'blue' };
  return { label: 'Strongly bankable', color: 'green' };
}

export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateWeightedScore(
  factors: Record<string, number>,
  weights: Record<string, number>
): number {
  let totalScore = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(weights)) {
    if (factors[key] !== undefined) {
      totalScore += factors[key] * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) return 0;
  return clampScore((totalScore / totalWeight) * 100);
}

// ================================
// Funding Readiness Score
// ================================

export function calculateFundingReadinessScore(
  profile: SMEExtendedProfile,
  financialData?: SMEFinancialData,
  documents?: SMEDocument[]
): ScoreExplanation {
  const factors: Record<string, number> = {};
  const factors_positive: string[] = [];
  const factors_negative: string[] = [];
  const recommendations: string[] = [];

  // Formal registration (0-1)
  if (profile.registration_status && profile.registration_status !== 'sole_trader') {
    factors.formal_registration = 1;
    factors_positive.push('Formally registered business entity');
  } else if (profile.registration_status === 'sole_trader') {
    factors.formal_registration = 0.5;
    factors_positive.push('Registered as sole trader');
    recommendations.push('Consider registering as a company for better access to formal financing');
  } else {
    factors.formal_registration = 0;
    factors_negative.push('No formal registration status');
    recommendations.push('Register your business with PACRA or relevant authority');
  }

  // Years in business (0-1)
  const years = profile.years_in_operation ?? 0;
  if (years >= 3) {
    factors.years_in_business = 1;
    factors_positive.push(`${years} years in operation - established track record`);
  } else if (years >= 1) {
    factors.years_in_business = 0.6;
    factors_positive.push(`${years} year(s) in operation`);
  } else {
    factors.years_in_business = 0.2;
    factors_negative.push('Less than 1 year in operation');
  }

  // Revenue data availability (0-1)
  if (financialData?.revenue_year_1 && financialData.revenue_year_1 > 0) {
    factors.has_revenue_data = 1;
    factors_positive.push('Historical revenue data available');
  } else if (financialData?.revenue_range) {
    factors.has_revenue_data = 0.5;
    factors_positive.push('Revenue range information provided');
    recommendations.push('Provide exact revenue figures for more accurate assessment');
  } else {
    factors.has_revenue_data = 0;
    factors_negative.push('No revenue data available');
    recommendations.push('Add revenue information to improve funding readiness assessment');
  }

  // Revenue trend (0-1)
  if (financialData?.revenue_year_1 && financialData?.revenue_year_2) {
    const growth = (financialData.revenue_year_1 - financialData.revenue_year_2) / financialData.revenue_year_2;
    if (growth > 0.1) {
      factors.revenue_trend_positive = 1;
      factors_positive.push('Strong revenue growth trend');
    } else if (growth > 0) {
      factors.revenue_trend_positive = 0.7;
      factors_positive.push('Positive revenue trend');
    } else if (growth > -0.1) {
      factors.revenue_trend_positive = 0.4;
      factors_negative.push('Flat or slightly declining revenue');
    } else {
      factors.revenue_trend_positive = 0.1;
      factors_negative.push('Declining revenue trend');
      recommendations.push('Address revenue decline before seeking funding');
    }
  }

  // Profitability (0-1)
  if (financialData?.profit_year_1 !== undefined) {
    if (financialData.profit_year_1 > 0) {
      factors.profitability = 1;
      factors_positive.push('Business is profitable');
    } else {
      factors.profitability = 0.3;
      factors_negative.push('Business is not currently profitable');
      recommendations.push('Work on achieving profitability');
    }
  } else if (financialData?.cash_flow_positive) {
    factors.profitability = 0.6;
    factors_positive.push('Positive cash flow');
  }

  // Financial records (0-1)
  const hasFinancialStatements = documents?.some(d => d.document_type === 'financial_statements') ?? false;
  if (hasFinancialStatements) {
    factors.has_financial_records = 1;
    factors_positive.push('Financial statements available');
  } else if (profile.uses_accounting_software) {
    factors.has_financial_records = 0.6;
    factors_positive.push('Uses accounting software');
    recommendations.push('Generate and upload formal financial statements');
  } else {
    factors.has_financial_records = 0;
    factors_negative.push('No financial records available');
    recommendations.push('Maintain proper financial records using accounting software');
  }

  // Audited statements (0-1)
  if (profile.annual_audits_done) {
    factors.has_audited_statements = 1;
    factors_positive.push('Annual audits conducted');
  } else {
    factors.has_audited_statements = 0;
    factors_negative.push('No annual audits conducted');
    recommendations.push('Consider getting annual financial audits');
  }

  // Debt repayment (0-1)
  if (financialData) {
    if (financialData.has_defaults_or_arrears) {
      factors.debt_repayment_behavior = 0;
      factors_negative.push('Has defaults or arrears on existing loans');
      recommendations.push('Clear any existing defaults before seeking new funding');
    } else if (financialData.existing_loans_count && financialData.existing_loans_count > 0) {
      factors.debt_repayment_behavior = 1;
      factors_positive.push('Good debt repayment history');
    } else {
      factors.debt_repayment_behavior = 0.5; // No debt history
    }
  }

  // Tax compliance (0-1)
  const hasTaxClearance = documents?.some(d => d.document_type === 'tax_clearance') ?? false;
  if (hasTaxClearance && profile.tax_returns_filed_on_time === 'yes') {
    factors.compliance_complete = 1;
    factors_positive.push('Tax compliant with clearance certificate');
  } else if (profile.tax_status?.includes('registered')) {
    factors.compliance_complete = 0.5;
    factors_positive.push('Tax registered');
    recommendations.push('Obtain current tax clearance certificate');
  } else {
    factors.compliance_complete = 0;
    factors_negative.push('Tax compliance not established');
    recommendations.push('Register for tax and obtain tax clearance');
  }

  const score = calculateWeightedScore(factors, FUNDING_READINESS_WEIGHTS);
  const band = getScoreBand(score);

  // Determine data quality
  const factorCount = Object.keys(factors).length;
  const dataQuality: 'low' | 'medium' | 'high' = 
    factorCount < 3 ? 'low' : 
    factorCount < 6 ? 'medium' : 'high';

  return {
    score,
    band: band.label,
    factors_positive,
    factors_negative,
    data_quality: dataQuality,
    recommendations,
  };
}

// ================================
// Compliance Maturity Score
// ================================

export function calculateComplianceMaturityScore(
  profile: SMEExtendedProfile,
  documents?: SMEDocument[]
): ScoreExplanation {
  const factors: Record<string, number> = {};
  const factors_positive: string[] = [];
  const factors_negative: string[] = [];
  const recommendations: string[] = [];

  // Tax registration (0-1)
  if (profile.tax_status?.includes('registered')) {
    factors.tax_registration = 1;
    factors_positive.push('Tax registered');
    if (profile.tax_status.includes('vat')) {
      factors_positive.push('VAT registered');
    }
    if (profile.tax_status.includes('paye')) {
      factors_positive.push('PAYE registered');
    }
  } else {
    factors.tax_registration = 0;
    factors_negative.push('Not tax registered');
    recommendations.push('Register for tax with ZRA');
  }

  // Tax clearance (0-1)
  const hasTaxClearance = documents?.some(d => 
    d.document_type === 'tax_clearance' && 
    (!d.expiry_date || new Date(d.expiry_date) > new Date())
  ) ?? false;
  
  if (hasTaxClearance) {
    factors.tax_clearance = 1;
    factors_positive.push('Valid tax clearance certificate');
  } else {
    factors.tax_clearance = 0;
    factors_negative.push('No valid tax clearance certificate');
    recommendations.push('Obtain a current tax clearance certificate from ZRA');
  }

  // Annual returns (0-1)
  if (profile.tax_returns_filed_on_time === 'yes') {
    factors.annual_return_filing = 1;
    factors_positive.push('Tax returns filed on time');
  } else if (profile.tax_returns_filed_on_time === 'not_sure') {
    factors.annual_return_filing = 0.3;
    factors_negative.push('Uncertain about tax return filing status');
    recommendations.push('Verify tax return filing status with ZRA');
  } else {
    factors.annual_return_filing = 0;
    factors_negative.push('Tax returns not filed on time');
    recommendations.push('File all outstanding tax returns');
  }

  // Industry licenses (0-1)
  const hasRegistrationCert = documents?.some(d => d.document_type === 'registration_certificate') ?? false;
  if (hasRegistrationCert && profile.registration_authority) {
    factors.industry_licenses = 1;
    factors_positive.push('Business registration certificate available');
  } else if (profile.registration_status) {
    factors.industry_licenses = 0.5;
    factors_positive.push('Business is registered');
    recommendations.push('Upload registration certificate for verification');
  } else {
    factors.industry_licenses = 0;
    factors_negative.push('No business registration');
    recommendations.push('Register business with PACRA');
  }

  // HR policies (0-1)
  const employeeCount = (profile.employee_count_fulltime ?? 0) + 
                       (profile.employee_count_parttime ?? 0) + 
                       (profile.employee_count_casual ?? 0);
  
  if (profile.has_hr_policy) {
    factors.hr_policies_contracts = 1;
    factors_positive.push('HR policies in place');
  } else if (employeeCount === 0) {
    factors.hr_policies_contracts = 0.5; // Not applicable for solo operations
  } else {
    factors.hr_policies_contracts = 0;
    factors_negative.push('No HR policies in place');
    recommendations.push('Develop basic HR policies and employment contracts');
  }

  // Governance structures (0-1)
  if (profile.has_board_of_directors) {
    factors.governance_structures = 1;
    factors_positive.push('Board of Directors in place');
  } else if (profile.has_advisory_board) {
    factors.governance_structures = 0.7;
    factors_positive.push('Advisory board in place');
  } else {
    factors.governance_structures = 0;
    factors_negative.push('No formal governance structures');
    recommendations.push('Consider establishing a board or advisory committee');
  }

  const score = calculateWeightedScore(factors, COMPLIANCE_MATURITY_WEIGHTS);
  const band = getScoreBand(score);

  const factorCount = Object.keys(factors).length;
  const dataQuality: 'low' | 'medium' | 'high' = 
    factorCount < 2 ? 'low' : 
    factorCount < 4 ? 'medium' : 'high';

  return {
    score,
    band: band.label,
    factors_positive,
    factors_negative,
    data_quality: dataQuality,
    recommendations,
  };
}

// ================================
// Digital Maturity Score
// ================================

export function calculateDigitalMaturityScore(
  profile: SMEExtendedProfile,
  platformBehavior?: SMEPlatformBehavior
): ScoreExplanation {
  const factors: Record<string, number> = {};
  const factors_positive: string[] = [];
  const factors_negative: string[] = [];
  const recommendations: string[] = [];

  // Website presence (0-1)
  if (profile.website_url) {
    factors.website_presence = 1;
    factors_positive.push('Business website available');
  } else {
    factors.website_presence = 0;
    factors_negative.push('No business website');
    recommendations.push('Create a business website to improve digital presence');
  }

  // Social media (0-1)
  const socialMediaLinks = profile.social_media_links ?? {};
  const socialMediaCount = Object.keys(socialMediaLinks).filter(k => socialMediaLinks[k]).length;
  if (socialMediaCount >= 3) {
    factors.social_media_presence = 1;
    factors_positive.push('Strong social media presence (3+ platforms)');
  } else if (socialMediaCount >= 1) {
    factors.social_media_presence = 0.5;
    factors_positive.push(`Social media presence (${socialMediaCount} platform(s))`);
    recommendations.push('Expand social media presence to more platforms');
  } else {
    factors.social_media_presence = 0;
    factors_negative.push('No social media presence');
    recommendations.push('Establish social media presence on key platforms');
  }

  // Online sales (0-1)
  const onlineStorePresence = profile.online_store_presence ?? [];
  if (onlineStorePresence.length >= 2) {
    factors.online_sales_channels = 1;
    factors_positive.push('Multiple online sales channels');
  } else if (onlineStorePresence.length === 1) {
    factors.online_sales_channels = 0.5;
    factors_positive.push('Online sales channel available');
    recommendations.push('Explore additional online sales channels');
  } else {
    factors.online_sales_channels = 0;
    factors_negative.push('No online sales channels');
    recommendations.push('Set up online selling through e-commerce or social commerce');
  }

  // ERP (0-1)
  if (profile.uses_erp) {
    factors.erp_system = 1;
    factors_positive.push('Uses ERP system');
  } else {
    factors.erp_system = 0;
    recommendations.push('Consider implementing an ERP system for better operations management');
  }

  // POS (0-1)
  if (profile.uses_pos) {
    factors.pos_system = 1;
    factors_positive.push('Uses POS system');
  } else {
    factors.pos_system = 0;
  }

  // Accounting software (0-1)
  if (profile.uses_accounting_software) {
    factors.accounting_software = 1;
    factors_positive.push('Uses accounting software');
  } else {
    factors.accounting_software = 0;
    factors_negative.push('No accounting software');
    recommendations.push('Adopt accounting software for better financial management');
  }

  // Responsiveness (0-1)
  if (platformBehavior?.avg_response_time_hours !== undefined) {
    if (platformBehavior.avg_response_time_hours <= 4) {
      factors.responsiveness = 1;
      factors_positive.push('Excellent response time');
    } else if (platformBehavior.avg_response_time_hours <= 24) {
      factors.responsiveness = 0.7;
      factors_positive.push('Good response time');
    } else {
      factors.responsiveness = 0.3;
      recommendations.push('Improve response time to inquiries');
    }
  }

  const score = calculateWeightedScore(factors, DIGITAL_MATURITY_WEIGHTS);
  const band = getScoreBand(score);

  const factorCount = Object.keys(factors).length;
  const dataQuality: 'low' | 'medium' | 'high' = 
    factorCount < 2 ? 'low' : 
    factorCount < 5 ? 'medium' : 'high';

  return {
    score,
    band: band.label,
    factors_positive,
    factors_negative,
    data_quality: dataQuality,
    recommendations,
  };
}

// ================================
// Governance Maturity Score
// ================================

export function calculateGovernanceMaturityScore(
  profile: SMEExtendedProfile,
  documents?: SMEDocument[]
): ScoreExplanation {
  const factors: Record<string, number> = {};
  const factors_positive: string[] = [];
  const factors_negative: string[] = [];
  const recommendations: string[] = [];

  // Board/Advisory (0-1)
  if (profile.has_board_of_directors) {
    factors.board_advisory_presence = 1;
    factors_positive.push('Board of Directors established');
  } else if (profile.has_advisory_board) {
    factors.board_advisory_presence = 0.7;
    factors_positive.push('Advisory board in place');
  } else {
    factors.board_advisory_presence = 0;
    factors_negative.push('No board or advisory structure');
    recommendations.push('Establish a board of directors or advisory committee');
  }

  // Written policies (0-1)
  const policyCount = [
    profile.has_hr_policy,
    profile.has_finance_policy,
    profile.has_procurement_policy,
    profile.has_risk_policy,
  ].filter(Boolean).length;

  if (policyCount >= 4) {
    factors.written_policies = 1;
    factors_positive.push('Comprehensive written policies in place');
  } else if (policyCount >= 2) {
    factors.written_policies = 0.5;
    factors_positive.push(`${policyCount} written policies in place`);
    recommendations.push('Develop additional governance policies');
  } else if (policyCount === 1) {
    factors.written_policies = 0.25;
    recommendations.push('Develop comprehensive governance policies');
  } else {
    factors.written_policies = 0;
    factors_negative.push('No written governance policies');
    recommendations.push('Create basic HR, finance, and risk management policies');
  }

  // Role segregation (0-1)
  const employeeCount = (profile.employee_count_fulltime ?? 0) + (profile.employee_count_parttime ?? 0);
  if (employeeCount >= 5 && profile.has_finance_policy) {
    factors.role_segregation = 1;
    factors_positive.push('Role segregation with finance policies');
  } else if (employeeCount >= 3) {
    factors.role_segregation = 0.5;
    factors_positive.push('Team structure allows for role segregation');
  } else if (employeeCount > 0) {
    factors.role_segregation = 0.3;
    recommendations.push('As the team grows, implement clear role segregation');
  } else {
    factors.role_segregation = 0.2; // Solo operation
  }

  // Risk management (0-1)
  if (profile.has_risk_policy) {
    factors.risk_management = 1;
    factors_positive.push('Risk management policy in place');
  } else {
    factors.risk_management = 0;
    factors_negative.push('No formal risk management');
    recommendations.push('Develop a risk management framework');
  }

  // Audit practices (0-1)
  if (profile.annual_audits_done) {
    factors.audit_practices = 1;
    factors_positive.push('Regular audits conducted');
  } else {
    factors.audit_practices = 0;
    factors_negative.push('No regular audits');
    recommendations.push('Consider annual financial audits');
  }

  const score = calculateWeightedScore(factors, GOVERNANCE_MATURITY_WEIGHTS);
  const band = getScoreBand(score);

  const factorCount = Object.keys(factors).length;
  const dataQuality: 'low' | 'medium' | 'high' = 
    factorCount < 2 ? 'low' : 
    factorCount < 4 ? 'medium' : 'high';

  return {
    score,
    band: band.label,
    factors_positive,
    factors_negative,
    data_quality: dataQuality,
    recommendations,
  };
}

// ================================
// Market Readiness Score
// ================================

export function calculateMarketReadinessScore(
  profile: SMEExtendedProfile,
  financialData?: SMEFinancialData
): ScoreExplanation {
  const factors: Record<string, number> = {};
  const factors_positive: string[] = [];
  const factors_negative: string[] = [];
  const recommendations: string[] = [];

  // Business model clarity (0-1)
  const businessModels = profile.business_model ?? [];
  if (businessModels.length > 0) {
    factors.clear_business_model = 1;
    factors_positive.push(`Clear business model: ${businessModels.join(', ')}`);
  } else {
    factors.clear_business_model = 0;
    factors_negative.push('Business model not defined');
    recommendations.push('Clearly define your business model (B2B, B2C, B2G)');
  }

  // Revenue model (0-1)
  const revenueModels = profile.revenue_model ?? [];
  if (revenueModels.length > 0) {
    factors.defined_revenue_model = 1;
    factors_positive.push(`Defined revenue streams: ${revenueModels.join(', ')}`);
  } else {
    factors.defined_revenue_model = 0;
    factors_negative.push('Revenue model not defined');
    recommendations.push('Document your revenue streams clearly');
  }

  // Customer diversification (0-1)
  if (financialData?.top_3_clients_revenue_pct !== undefined) {
    if (financialData.top_3_clients_revenue_pct < 40) {
      factors.customer_diversification = 1;
      factors_positive.push('Well-diversified customer base');
    } else if (financialData.top_3_clients_revenue_pct < 60) {
      factors.customer_diversification = 0.6;
      factors_positive.push('Moderately diversified customer base');
      recommendations.push('Work on diversifying customer base');
    } else {
      factors.customer_diversification = 0.2;
      factors_negative.push('High customer concentration risk');
      recommendations.push('Reduce dependency on top customers');
    }
  }

  // Sector positioning (0-1)
  if (profile.sector && profile.sub_sector) {
    factors.sector_positioning = 1;
    factors_positive.push(`Clear sector focus: ${profile.sector} - ${profile.sub_sector}`);
  } else if (profile.sector) {
    factors.sector_positioning = 0.7;
    factors_positive.push(`Operating in ${profile.sector} sector`);
  } else {
    factors.sector_positioning = 0;
    factors_negative.push('Sector not defined');
    recommendations.push('Define your sector and niche clearly');
  }

  // Track record (0-1)
  const years = profile.years_in_operation ?? 0;
  if (years >= 5) {
    factors.years_track_record = 1;
    factors_positive.push(`Strong track record (${years} years)`);
  } else if (years >= 2) {
    factors.years_track_record = 0.6;
    factors_positive.push(`Building track record (${years} years)`);
  } else {
    factors.years_track_record = 0.2;
    factors_negative.push('Limited operating history');
  }

  // Geographic presence (0-1)
  const regions = profile.operating_regions ?? [];
  if (regions.length >= 3) {
    factors.geographic_presence = 1;
    factors_positive.push(`Operating in ${regions.length} regions`);
  } else if (regions.length >= 1) {
    factors.geographic_presence = 0.5;
    factors_positive.push('Regional presence established');
  } else if (profile.city) {
    factors.geographic_presence = 0.3;
    factors_positive.push(`Operating in ${profile.city}`);
  } else {
    factors.geographic_presence = 0;
  }

  // Online presence (0-1)
  if (profile.website_url && Object.keys(profile.social_media_links ?? {}).length > 0) {
    factors.online_presence = 1;
    factors_positive.push('Strong online presence');
  } else if (profile.website_url || Object.keys(profile.social_media_links ?? {}).length > 0) {
    factors.online_presence = 0.5;
    factors_positive.push('Online presence established');
  } else {
    factors.online_presence = 0;
    factors_negative.push('No online presence');
    recommendations.push('Develop online presence for better market reach');
  }

  const score = calculateWeightedScore(factors, MARKET_READINESS_WEIGHTS);
  const band = getScoreBand(score);

  const factorCount = Object.keys(factors).length;
  const dataQuality: 'low' | 'medium' | 'high' = 
    factorCount < 3 ? 'low' : 
    factorCount < 5 ? 'medium' : 'high';

  return {
    score,
    band: band.label,
    factors_positive,
    factors_negative,
    data_quality: dataQuality,
    recommendations,
  };
}

// ================================
// Operational Efficiency Score
// ================================

export function calculateOperationalEfficiencyScore(
  profile: SMEExtendedProfile,
  financialData?: SMEFinancialData,
  platformBehavior?: SMEPlatformBehavior
): ScoreExplanation {
  const factors: Record<string, number> = {};
  const factors_positive: string[] = [];
  const factors_negative: string[] = [];
  const recommendations: string[] = [];

  // Employee structure (0-1)
  const totalEmployees = (profile.employee_count_fulltime ?? 0) + 
                        (profile.employee_count_parttime ?? 0) + 
                        (profile.employee_count_casual ?? 0);
  const fullTimeRatio = totalEmployees > 0 
    ? (profile.employee_count_fulltime ?? 0) / totalEmployees 
    : 0;

  if (totalEmployees > 0) {
    if (fullTimeRatio >= 0.6) {
      factors.employee_structure = 1;
      factors_positive.push('Strong core team with full-time employees');
    } else if (fullTimeRatio >= 0.3) {
      factors.employee_structure = 0.6;
      factors_positive.push('Mixed employee structure');
    } else {
      factors.employee_structure = 0.3;
      factors_negative.push('Heavily reliant on casual/part-time staff');
      recommendations.push('Consider building a stronger core team');
    }
  } else {
    factors.employee_structure = 0.5; // Solo operation is neutral
  }

  // Digital tools (0-1)
  const digitalToolsCount = [
    profile.uses_erp,
    profile.uses_pos,
    profile.uses_accounting_software,
  ].filter(Boolean).length;

  if (digitalToolsCount >= 3) {
    factors.digital_tools_adoption = 1;
    factors_positive.push('Full digital tools adoption');
  } else if (digitalToolsCount >= 2) {
    factors.digital_tools_adoption = 0.7;
    factors_positive.push('Good digital tools adoption');
  } else if (digitalToolsCount === 1) {
    factors.digital_tools_adoption = 0.4;
    factors_positive.push('Some digital tools in use');
    recommendations.push('Expand use of digital tools');
  } else {
    factors.digital_tools_adoption = 0;
    factors_negative.push('No digital tools adopted');
    recommendations.push('Adopt digital tools for better efficiency');
  }

  // Financial management (0-1)
  if (financialData) {
    if (financialData.cash_flow_positive && !financialData.has_defaults_or_arrears) {
      factors.financial_management = 1;
      factors_positive.push('Good financial management');
    } else if (financialData.cash_flow_positive) {
      factors.financial_management = 0.6;
      factors_positive.push('Positive cash flow');
    } else {
      factors.financial_management = 0.3;
      recommendations.push('Improve cash flow management');
    }
  }

  // Customer management (0-1)
  if (financialData?.payment_terms_days !== undefined) {
    if (financialData.payment_terms_days <= 30) {
      factors.customer_management = 1;
      factors_positive.push('Efficient payment terms');
    } else if (financialData.payment_terms_days <= 60) {
      factors.customer_management = 0.6;
    } else {
      factors.customer_management = 0.3;
      factors_negative.push('Extended payment terms');
      recommendations.push('Review and optimize payment terms');
    }
  }

  // Platform engagement (0-1)
  if (platformBehavior) {
    if (platformBehavior.login_count_30d >= 10 && platformBehavior.profile_completion_pct >= 80) {
      factors.platform_engagement = 1;
      factors_positive.push('High platform engagement');
    } else if (platformBehavior.login_count_30d >= 5) {
      factors.platform_engagement = 0.6;
      factors_positive.push('Regular platform usage');
    } else {
      factors.platform_engagement = 0.3;
      recommendations.push('Increase platform engagement to access more opportunities');
    }
  }

  // Process automation (0-1)
  if (profile.uses_erp && profile.uses_accounting_software) {
    factors.process_automation = 1;
    factors_positive.push('Key processes automated');
  } else if (profile.uses_erp || profile.uses_accounting_software) {
    factors.process_automation = 0.5;
    factors_positive.push('Some process automation');
  } else {
    factors.process_automation = 0;
    recommendations.push('Automate key business processes');
  }

  const score = calculateWeightedScore(factors, OPERATIONAL_EFFICIENCY_WEIGHTS);
  const band = getScoreBand(score);

  const factorCount = Object.keys(factors).length;
  const dataQuality: 'low' | 'medium' | 'high' = 
    factorCount < 2 ? 'low' : 
    factorCount < 4 ? 'medium' : 'high';

  return {
    score,
    band: band.label,
    factors_positive,
    factors_negative,
    data_quality: dataQuality,
    recommendations,
  };
}

// ================================
// Main Scoring Function
// ================================

export function calculateAllScores(
  profile: SMEExtendedProfile,
  financialData?: SMEFinancialData,
  documents?: SMEDocument[],
  platformBehavior?: SMEPlatformBehavior
): { scores: DiagnosticsScores; explanations: ScoreExplanations } {
  const fundingExplanation = calculateFundingReadinessScore(profile, financialData, documents);
  const complianceExplanation = calculateComplianceMaturityScore(profile, documents);
  const digitalExplanation = calculateDigitalMaturityScore(profile, platformBehavior);
  const governanceExplanation = calculateGovernanceMaturityScore(profile, documents);
  const marketExplanation = calculateMarketReadinessScore(profile, financialData);
  const operationalExplanation = calculateOperationalEfficiencyScore(profile, financialData, platformBehavior);

  return {
    scores: {
      funding_readiness: fundingExplanation.score,
      compliance_maturity: complianceExplanation.score,
      digital_maturity: digitalExplanation.score,
      governance_maturity: governanceExplanation.score,
      market_readiness: marketExplanation.score,
      operational_efficiency: operationalExplanation.score,
    },
    explanations: {
      funding_readiness: fundingExplanation,
      compliance_maturity: complianceExplanation,
      digital_maturity: digitalExplanation,
      governance_maturity: governanceExplanation,
      market_readiness: marketExplanation,
      operational_efficiency: operationalExplanation,
    },
  };
}

// ================================
// Health Band Calculation
// ================================

export function calculateOverallHealthBand(scores: DiagnosticsScores): string {
  const scoreValues = Object.values(scores);
  const avgScore = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;
  
  if (avgScore <= 20) return 'critical';
  if (avgScore <= 40) return 'developing';
  if (avgScore <= 60) return 'emerging';
  if (avgScore <= 80) return 'established';
  return 'thriving';
}

// ================================
// Business Stage Detection
// ================================

export function detectBusinessStage(
  profile: SMEExtendedProfile,
  financialData?: SMEFinancialData,
  scores?: DiagnosticsScores
): string {
  const years = profile.years_in_operation ?? 0;
  const employees = (profile.employee_count_fulltime ?? 0) + 
                   (profile.employee_count_parttime ?? 0);
  const hasRevenue = financialData?.revenue_year_1 !== undefined;
  const avgScore = scores ? Object.values(scores).reduce((a, b) => a + b, 0) / 6 : 0;

  // Scale stage
  if (years >= 5 && employees >= 20 && avgScore >= 70) {
    return 'scale';
  }
  
  // Growth stage
  if (years >= 2 && (employees >= 5 || (hasRevenue && avgScore >= 50))) {
    return 'growth';
  }
  
  // Early stage
  return 'early';
}
