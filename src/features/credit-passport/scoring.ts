import {
  CreditPassportInputs,
  CreditPassportResult,
  FundabilityBreakdown,
  NarrativeSummary,
  RepaymentCapacity,
  RiskLevel,
  RiskProfile,
} from './types';

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const CATEGORY_WEIGHTS = {
  financialStrength: 0.4,
  complianceGovernance: 0.2,
  creditBehavior: 0.2,
  digitalOperational: 0.1,
  behavioral: 0.1,
};

const interpretScore = (score: number) => {
  if (score <= 30) return 'Very Low Fundability';
  if (score <= 50) return 'Low Fundability';
  if (score <= 70) return 'Medium Fundability (Bankable with support)';
  if (score <= 90) return 'High Fundability';
  return 'Very High Fundability';
};

const weightedAverage = (entries: { score: number; weight: number }[], defaultScore = 50) => {
  const valid = entries.filter(entry => Number.isFinite(entry.score) && Number.isFinite(entry.weight));
  if (!valid.length) return defaultScore;
  const totalWeight = valid.reduce((sum, item) => sum + item.weight, 0) || 1;
  const score = valid.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight;
  return clamp(score);
};

const calculateTrendScore = (values: number[] = []) => {
  if (!Array.isArray(values) || values.length < 2) return 55;
  const cleaned = values.filter(value => typeof value === 'number' && !Number.isNaN(value));
  if (cleaned.length < 2) return 55;

  let positiveTrends = 0;
  for (let i = 1; i < cleaned.length; i += 1) {
    if (cleaned[i] >= cleaned[i - 1]) {
      positiveTrends += 1;
    }
  }

  const momentum = (positiveTrends / (cleaned.length - 1)) * 100;
  return clamp(momentum);
};

const calculateFinancialStrength = (inputs: CreditPassportInputs) => {
  const { financials, banking } = inputs;
  const revenueScore = calculateTrendScore(financials.annualRevenue);
  const profitabilityScore = clamp(50 + (financials.profitMargin ?? 0) * 2);
  const cashflowStability = financials.cashflowStability ?? 55;
  const channelCount = Array.isArray(banking.salesChannels) ? banking.salesChannels.length : 1;
  const customerDiversification = clamp(40 + channelCount * 10);

  return {
    score: weightedAverage(
      [
        { score: revenueScore, weight: 0.35 },
        { score: profitabilityScore, weight: 0.25 },
        { score: cashflowStability, weight: 0.25 },
        { score: customerDiversification, weight: 0.15 },
      ],
      55,
    ),
    components: {
      revenueScore,
      profitabilityScore,
      cashflowStability,
      customerDiversification,
    },
  };
};

const calculateComplianceGovernance = (inputs: CreditPassportInputs) => {
  const { compliance } = inputs;
  const completenessFlags = [
    compliance.taxRegistration,
    compliance.taxClearance,
    compliance.annualReturns,
    compliance.businessInsurance,
    Array.isArray(compliance.licenses) && compliance.licenses.length > 0,
  ];

  const completeness = completenessFlags.filter(Boolean).length / completenessFlags.length;
  const governancePolicies = compliance.policyCoverage ?? 50;

  return {
    score: clamp(40 + completeness * 40 + governancePolicies * 0.2),
    components: {
      complianceCompleteness: clamp(completeness * 100),
      governancePolicies,
    },
  };
};

const calculateCreditBehavior = (inputs: CreditPassportInputs) => {
  const credit = inputs.creditBehavior || inputs.banking;
  const repaymentHistory = credit.repaymentHistory ?? 65;
  const rejectionHistory = credit.rejectionHistory ?? 0;
  const overdraftFrequency = credit.overdraftFrequency ?? 0;
  const chequeBounce = credit.chequeBounceHistory ?? 0;

  const penalty = clamp((rejectionHistory + overdraftFrequency + chequeBounce) * 5, 0, 40);
  const score = clamp(repaymentHistory - penalty + 30);

  return {
    score,
    components: {
      repaymentHistory,
      penalty,
    },
  };
};

const calculateDigitalOperational = (inputs: CreditPassportInputs) => {
  const maturity = inputs.digitalOperational || {};
  const digitalFootprint = maturity.digitalFootprint ?? 60;
  const erpUsage = maturity.erpUsage ?? 50;
  const deliveryReliability = maturity.deliveryReliability ?? 55;
  const customerSatisfaction = maturity.customerSatisfaction ?? 60;

  return {
    score: weightedAverage(
      [
        { score: digitalFootprint, weight: 0.25 },
        { score: erpUsage, weight: 0.25 },
        { score: deliveryReliability, weight: 0.25 },
        { score: customerSatisfaction, weight: 0.25 },
      ],
      55,
    ),
    components: {
      digitalFootprint,
      erpUsage,
      deliveryReliability,
      customerSatisfaction,
    },
  };
};

const calculateBehavioralIndicators = (inputs: CreditPassportInputs) => {
  const behavior = inputs.behavioral || {};
  const profileCompletion = behavior.profileCompletion ?? 60;
  const engagement = behavior.engagement ?? 60;
  const responsiveness = behavior.responsiveness ?? 60;
  const dataFreshness = behavior.dataFreshness ?? 60;

  return {
    score: weightedAverage(
      [
        { score: profileCompletion, weight: 0.35 },
        { score: engagement, weight: 0.25 },
        { score: responsiveness, weight: 0.2 },
        { score: dataFreshness, weight: 0.2 },
      ],
      55,
    ),
    components: {
      profileCompletion,
      engagement,
      responsiveness,
      dataFreshness,
    },
  };
};

const calculateLiquidityIndex = (inputs: CreditPassportInputs) => {
  const stability = inputs.financials.cashflowStability ?? 55;
  const negativeBalances = inputs.financials.negativeBalanceFrequency ?? 4;
  const conversionCycle = inputs.financials.cashConversionCycle ?? 50;

  const liquidityScore = weightedAverage(
    [
      { score: stability, weight: 0.5 },
      { score: (10 - negativeBalances) * 10, weight: 0.2 },
      { score: 100 - conversionCycle, weight: 0.3 },
    ],
    60,
  );

  return Number((liquidityScore / 10).toFixed(1));
};

const calculateRepaymentCapacity = (inputs: CreditPassportInputs): RepaymentCapacity => {
  const dscr = inputs.financials.debtServiceCoverage ?? 1.1;
  const ebitdaMargin = inputs.financials.ebitdaMargin ?? 15;
  const repaymentStrength = clamp(40 + dscr * 20 + ebitdaMargin * 0.8);
  const label: RepaymentCapacity['label'] = repaymentStrength >= 75 ? 'Strong' : repaymentStrength >= 55 ? 'Moderate' : 'Weak';

  return {
    label,
    score: Number((repaymentStrength / 10).toFixed(1)),
    details: { dscr, ebitdaMargin },
  };
};

const calculateResilienceScore = (inputs: CreditPassportInputs) => {
  const financials = inputs.financials;
  const operations = inputs.operations || inputs.digitalOperational || {};

  const customerConcentration = 100 - (financials.customerConcentration ?? 40);
  const supplyChainRisk = 100 - (operations.supplyChainRisk ?? 35);
  const currencyExposure = 100 - (operations.currencyExposure ?? 45);
  const seasonality = 100 - (operations.seasonality ?? 35);
  const continuityPlans = operations.continuityPlans ?? 50;

  return clamp(
    weightedAverage(
      [
        { score: customerConcentration, weight: 0.25 },
        { score: supplyChainRisk, weight: 0.2 },
        { score: currencyExposure, weight: 0.2 },
        { score: seasonality, weight: 0.2 },
        { score: continuityPlans, weight: 0.15 },
      ],
      60,
    ),
  );
};

const calculateRiskProfile = (breakdown: FundabilityBreakdown, liquidityIndex: number, resilienceScore: number): RiskProfile => {
  const riskLevel = (score: number): RiskLevel => {
    if (score >= 75) return 'low';
    if (score >= 55) return 'medium';
    return 'high';
  };

  const profile: RiskProfile = {
    financial_risk: riskLevel(breakdown.financialStrength),
    compliance_risk: riskLevel(breakdown.complianceGovernance),
    credit_risk: riskLevel(breakdown.creditBehavior),
    market_risk: riskLevel(resilienceScore),
    operational_risk: riskLevel(breakdown.digitalOperational),
    liquidity_concern: liquidityIndex < 5 ? 'high' : liquidityIndex < 7 ? 'medium' : 'low',
    overall_risk_level: 'medium',
  };

  const lowRiskAreas = Object.values(profile).filter(value => value === 'low').length;
  const highRiskAreas = Object.values(profile).filter(value => value === 'high').length;

  if (highRiskAreas >= 2) {
    profile.overall_risk_level = 'high';
  } else if (lowRiskAreas >= 3) {
    profile.overall_risk_level = 'low';
  }

  return profile;
};

const buildNarrative = (inputs: CreditPassportInputs, summary: CreditPassportResult['narrative'] & {
  fundabilityScore: number;
  breakdown: FundabilityBreakdown;
  liquidityIndex: number;
  resilienceScore: number;
  riskProfile: RiskProfile;
}): NarrativeSummary => {
  const name = inputs.businessIdentity.name || 'This SME';
  const strengths: string[] = [];
  if (summary.breakdown.financialStrength >= 70) strengths.push('strong revenue traction and improving profitability');
  if (summary.liquidityIndex >= 7) strengths.push('solid liquidity buffers and predictable cashflows');
  if (summary.breakdown.complianceGovernance >= 70) strengths.push('good compliance hygiene and governance discipline');
  if (summary.breakdown.digitalOperational >= 65) strengths.push('operational maturity with digital tooling');

  const weaknesses: string[] = [];
  if (summary.breakdown.creditBehavior < 60) weaknesses.push('credit behaviour needs improvement or deeper history');
  if (summary.riskProfile?.compliance_risk === 'high') weaknesses.push('compliance documentation needs tightening');
  if (summary.liquidityIndex < 6) weaknesses.push('cashflow volatility may affect repayment timing');

  const concerns: string[] = [];
  if (summary.riskProfile?.market_risk === 'high') concerns.push('exposure to market swings and concentration risk');
  if ((inputs.operations?.seasonality || 0) > 40) concerns.push('seasonality may require structured repayment plans');

  return {
    headline: `${name} has a fundability score of ${summary.fundabilityScore} (${interpretScore(summary.fundabilityScore)}).`,
    strengths,
    weaknesses,
    bank_concerns: concerns,
    recommendations: [
      'align repayment schedules with cash conversion cycles',
      'keep tax clearance and statutory filings up to date',
      'maintain digital transaction trails via bank/POS/mobile money',
    ],
    suggested_partners: [
      'Commercial banks open to SME scoring',
      'Impact lenders with working capital products',
      'Guarantee providers',
    ],
  };
};

export const generateCreditPassport = (inputs: CreditPassportInputs): CreditPassportResult => {
  const financial = calculateFinancialStrength(inputs);
  const compliance = calculateComplianceGovernance(inputs);
  const credit = calculateCreditBehavior(inputs);
  const digital = calculateDigitalOperational(inputs);
  const behavioral = calculateBehavioralIndicators(inputs);

  const fundabilityScore = Math.round(
    financial.score * CATEGORY_WEIGHTS.financialStrength +
      compliance.score * CATEGORY_WEIGHTS.complianceGovernance +
      credit.score * CATEGORY_WEIGHTS.creditBehavior +
      digital.score * CATEGORY_WEIGHTS.digitalOperational +
      behavioral.score * CATEGORY_WEIGHTS.behavioral,
  );

  const breakdown: FundabilityBreakdown = {
    financialStrength: financial.score,
    complianceGovernance: compliance.score,
    creditBehavior: credit.score,
    digitalOperational: digital.score,
    behavioral: behavioral.score,
  };

  const liquidityIndex = calculateLiquidityIndex(inputs);
  const repaymentCapacity = calculateRepaymentCapacity(inputs);
  const resilienceScore = calculateResilienceScore(inputs);
  const riskProfile = calculateRiskProfile(breakdown, liquidityIndex, resilienceScore);

  const narrative = buildNarrative(inputs, {
    fundabilityScore,
    breakdown,
    liquidityIndex,
    resilienceScore,
    riskProfile,
    headline: '',
    strengths: [],
    weaknesses: [],
    bank_concerns: [],
    recommendations: [],
    suggested_partners: [],
  });

  return {
    fundabilityScore,
    breakdown,
    interpretation: interpretScore(fundabilityScore),
    riskProfile,
    liquidityIndex,
    repaymentCapacity,
    resilienceScore,
    narrative,
    timestamp: new Date().toISOString(),
  };
};

export const PRICE_POINTS = {
  generate: 100,
  share: 50,
  pdf: 50,
  currency: 'ZMW',
};
