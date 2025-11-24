const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const CATEGORY_WEIGHTS = {
  financialStrength: 0.4,
  complianceGovernance: 0.2,
  creditBehavior: 0.2,
  digitalOperational: 0.1,
  behavioral: 0.1,
};

const interpretScore = score => {
  if (score <= 30) return 'Very Low Fundability';
  if (score <= 50) return 'Low Fundability';
  if (score <= 70) return 'Medium Fundability (Bankable with support)';
  if (score <= 90) return 'High Fundability';
  return 'Very High Fundability';
};

const weightedAverage = (entries, defaultScore = 50) => {
  const valid = entries.filter(entry => typeof entry.score === 'number' && typeof entry.weight === 'number');
  if (!valid.length) return defaultScore;
  const totalWeight = valid.reduce((sum, item) => sum + item.weight, 0) || 1;
  const score = valid.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight;
  return clamp(score);
};

const calculateTrendScore = (values = []) => {
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

const calculateFinancialStrength = (financials = {}, banking = {}) => {
  const revenueValues = financials.annualRevenue || [];
  const revenueScore = calculateTrendScore(revenueValues);

  const profitMargin = typeof financials.profitMargin === 'number' ? financials.profitMargin : 0;
  const profitabilityScore = clamp(50 + profitMargin * 2);

  const cashflowStability = typeof financials.cashflowStability === 'number' ? financials.cashflowStability : 55;

  const channels = Array.isArray(banking.salesChannels) ? banking.salesChannels.length : 1;
  const customerDiversification = clamp(40 + channels * 10);

  const score = weightedAverage(
    [
      { score: revenueScore, weight: 0.35 },
      { score: profitabilityScore, weight: 0.25 },
      { score: cashflowStability, weight: 0.25 },
      { score: customerDiversification, weight: 0.15 },
    ],
    55,
  );

  return {
    score,
    components: {
      revenueScore,
      profitabilityScore,
      cashflowStability,
      customerDiversification,
    },
  };
};

const calculateComplianceGovernance = (compliance = {}) => {
  const complianceFlags = [
    compliance.taxRegistration,
    compliance.taxClearance,
    compliance.annualReturns,
    compliance.businessInsurance,
    Array.isArray(compliance.licenses) && compliance.licenses.length > 0,
  ];

  const completeness = complianceFlags.filter(Boolean).length / complianceFlags.length;
  const governancePolicies = typeof compliance.policyCoverage === 'number' ? compliance.policyCoverage : 50;

  const score = clamp(40 + completeness * 40 + governancePolicies * 0.2);

  return {
    score,
    components: {
      complianceCompleteness: clamp(completeness * 100),
      governancePolicies,
    },
  };
};

const calculateCreditBehavior = (credit = {}) => {
  const repaymentHistory = typeof credit.repaymentHistory === 'number' ? credit.repaymentHistory : 65;
  const rejectionHistory = typeof credit.rejectionHistory === 'number' ? credit.rejectionHistory : 0;
  const overdraftFrequency = typeof credit.overdraftFrequency === 'number' ? credit.overdraftFrequency : 0;
  const chequeBounce = typeof credit.chequeBounceHistory === 'number' ? credit.chequeBounceHistory : 0;

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

const calculateDigitalOperational = (maturity = {}) => {
  const digitalFootprint = typeof maturity.digitalFootprint === 'number' ? maturity.digitalFootprint : 60;
  const erpUsage = typeof maturity.erpUsage === 'number' ? maturity.erpUsage : 50;
  const deliveryReliability = typeof maturity.deliveryReliability === 'number' ? maturity.deliveryReliability : 55;
  const customerSatisfaction = typeof maturity.customerSatisfaction === 'number' ? maturity.customerSatisfaction : 60;

  const score = weightedAverage(
    [
      { score: digitalFootprint, weight: 0.25 },
      { score: erpUsage, weight: 0.25 },
      { score: deliveryReliability, weight: 0.25 },
      { score: customerSatisfaction, weight: 0.25 },
    ],
    55,
  );

  return {
    score,
    components: {
      digitalFootprint,
      erpUsage,
      deliveryReliability,
      customerSatisfaction,
    },
  };
};

const calculateBehavioralIndicators = (behavior = {}) => {
  const profileCompletion = typeof behavior.profileCompletion === 'number' ? behavior.profileCompletion : 60;
  const engagement = typeof behavior.engagement === 'number' ? behavior.engagement : 60;
  const responsiveness = typeof behavior.responsiveness === 'number' ? behavior.responsiveness : 60;
  const dataFreshness = typeof behavior.dataFreshness === 'number' ? behavior.dataFreshness : 60;

  const score = weightedAverage(
    [
      { score: profileCompletion, weight: 0.35 },
      { score: engagement, weight: 0.25 },
      { score: responsiveness, weight: 0.2 },
      { score: dataFreshness, weight: 0.2 },
    ],
    55,
  );

  return {
    score,
    components: {
      profileCompletion,
      engagement,
      responsiveness,
      dataFreshness,
    },
  };
};

const calculateLiquidityIndex = (financials = {}) => {
  const stability = typeof financials.cashflowStability === 'number' ? financials.cashflowStability : 55;
  const negativeBalances = typeof financials.negativeBalanceFrequency === 'number'
    ? 10 - financials.negativeBalanceFrequency
    : 6;
  const conversionCycle = typeof financials.cashConversionCycle === 'number' ? financials.cashConversionCycle : 50;

  const liquidityScore = weightedAverage(
    [
      { score: stability, weight: 0.5 },
      { score: negativeBalances * 10, weight: 0.2 },
      { score: 100 - conversionCycle, weight: 0.3 },
    ],
    60,
  );

  return Number((liquidityScore / 10).toFixed(1));
};

const calculateRepaymentCapacity = (financials = {}) => {
  const dscr = typeof financials.debtServiceCoverage === 'number' ? financials.debtServiceCoverage : 1.1;
  const ebitdaMargin = typeof financials.ebitdaMargin === 'number' ? financials.ebitdaMargin : 15;

  const repaymentStrength = clamp(40 + dscr * 20 + ebitdaMargin * 0.8);

  const label = repaymentStrength >= 75 ? 'Strong' : repaymentStrength >= 55 ? 'Moderate' : 'Weak';

  return {
    label,
    score: Number((repaymentStrength / 10).toFixed(1)),
    details: {
      dscr,
      ebitdaMargin,
    },
  };
};

const calculateResilienceScore = (financials = {}, operations = {}) => {
  const customerConcentration = typeof financials.customerConcentration === 'number'
    ? 100 - financials.customerConcentration
    : 60;
  const supplyChainRisk = typeof operations.supplyChainRisk === 'number' ? 100 - operations.supplyChainRisk : 65;
  const currencyExposure = typeof operations.currencyExposure === 'number' ? 100 - operations.currencyExposure : 55;
  const seasonality = typeof operations.seasonality === 'number' ? 100 - operations.seasonality : 60;
  const continuityPlans = typeof operations.continuityPlans === 'number' ? operations.continuityPlans : 50;

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

const calculateRiskProfile = (breakdown, liquidityIndex, resilienceScore) => {
  const riskLevel = score => {
    if (score >= 75) return 'low';
    if (score >= 55) return 'medium';
    return 'high';
  };

  const profile = {
    financial_risk: riskLevel(breakdown.financialStrength),
    compliance_risk: riskLevel(breakdown.complianceGovernance),
    credit_risk: riskLevel(breakdown.creditBehavior),
    market_risk: riskLevel(resilienceScore),
    operational_risk: riskLevel(breakdown.digitalOperational),
    overall_risk_level: 'medium',
    liquidity_concern: liquidityIndex < 5 ? 'high' : liquidityIndex < 7 ? 'medium' : 'low',
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

const buildNarrative = (inputs, summary) => {
  const { businessIdentity = {} } = inputs;
  const name = businessIdentity.name || 'This SME';

  const strengths = [];
  if (summary.breakdown.financialStrength >= 70) strengths.push('strong revenue traction and improving profitability');
  if (summary.liquidityIndex >= 7) strengths.push('solid liquidity buffers and predictable cashflows');
  if (summary.breakdown.complianceGovernance >= 70) strengths.push('good compliance hygiene and governance discipline');
  if (summary.breakdown.digitalOperational >= 65) strengths.push('operational maturity with digital tooling');

  const weaknesses = [];
  if (summary.breakdown.creditBehavior < 60) weaknesses.push('credit behaviour needs improvement or deeper history');
  if (summary.riskProfile?.compliance_risk === 'high') weaknesses.push('compliance documentation needs tightening');
  if (summary.liquidityIndex < 6) weaknesses.push('cashflow volatility may affect repayment timing');

  const concerns = [];
  if (summary.riskProfile?.market_risk === 'high') concerns.push('exposure to market swings and concentration risk');
  if ((inputs.operations?.seasonality || 0) > 40) concerns.push('seasonality may require structured repayment plans');

  const recommendations = [
    'align repayment schedules with cash conversion cycles',
    'keep tax clearance and statutory filings up to date',
    'maintain digital transaction trails via bank/POS/mobile money',
  ];

  return {
    headline: `${name} has a fundability score of ${summary.fundabilityScore} (${interpretScore(summary.fundabilityScore)}).`,
    strengths,
    weaknesses,
    bank_concerns: concerns,
    recommendations,
    suggested_partners: ['Commercial banks open to SME scoring', 'Impact lenders with working capital products', 'Guarantee providers'],
  };
};

const buildFundability = inputs => {
  const financial = calculateFinancialStrength(inputs.financials, inputs.banking);
  const compliance = calculateComplianceGovernance(inputs.compliance);
  const credit = calculateCreditBehavior(inputs.creditBehavior);
  const digital = calculateDigitalOperational(inputs.digitalOperational);
  const behavioral = calculateBehavioralIndicators(inputs.behavioral);

  const fundabilityScore = Math.round(
    financial.score * CATEGORY_WEIGHTS.financialStrength +
      compliance.score * CATEGORY_WEIGHTS.complianceGovernance +
      credit.score * CATEGORY_WEIGHTS.creditBehavior +
      digital.score * CATEGORY_WEIGHTS.digitalOperational +
      behavioral.score * CATEGORY_WEIGHTS.behavioral,
  );

  return {
    fundabilityScore,
    breakdown: {
      financialStrength: financial.score,
      complianceGovernance: compliance.score,
      creditBehavior: credit.score,
      digitalOperational: digital.score,
      behavioral: behavioral.score,
    },
    components: {
      financial,
      compliance,
      credit,
      digital,
      behavioral,
    },
    interpretation: interpretScore(fundabilityScore),
  };
};

const generatePassportOutputs = inputs => {
  const fundability = buildFundability(inputs);
  const liquidityIndex = calculateLiquidityIndex(inputs.financials);
  const repaymentCapacity = calculateRepaymentCapacity(inputs.financials);
  const resilienceScore = calculateResilienceScore(inputs.financials, inputs.operations);
  const riskProfile = calculateRiskProfile(fundability.breakdown, liquidityIndex, resilienceScore);
  const narrative = buildNarrative(inputs, {
    fundabilityScore: fundability.fundabilityScore,
    breakdown: fundability.breakdown,
    liquidityIndex,
    resilienceScore,
    riskProfile,
  });

  return {
    fundabilityScore: fundability.fundabilityScore,
    breakdown: fundability.breakdown,
    riskProfile,
    liquidityIndex,
    repaymentCapacity,
    resilienceScore,
    narrative,
    interpretation: fundability.interpretation,
    timestamp: new Date().toISOString(),
  };
};

module.exports = {
  CATEGORY_WEIGHTS,
  interpretScore,
  calculateFinancialStrength,
  calculateComplianceGovernance,
  calculateCreditBehavior,
  calculateDigitalOperational,
  calculateBehavioralIndicators,
  calculateLiquidityIndex,
  calculateRepaymentCapacity,
  calculateResilienceScore,
  calculateRiskProfile,
  generatePassportOutputs,
};
