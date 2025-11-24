const { v4: uuidv4 } = require('uuid');
const { buildLLMPrompt } = require('../lib/diagnostics-prompts');

const MODEL_VERSION = 'v1.0.0';

const normalizeScore = (value, max = 100) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(max, value));
};

const scoreFromFactors = factors => {
  const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
  if (totalWeight === 0) return 0;

  const achieved = factors.reduce((sum, factor) => {
    if (factor.met === true) return sum + factor.weight;
    if (factor.met === 'partial') return sum + factor.weight * 0.5;
    return sum;
  }, 0);

  return normalizeScore((achieved / totalWeight) * 100);
};

const evaluateFundingReadiness = input => {
  const factors = [
    { weight: 15, met: input?.registration?.is_registered },
    { weight: 10, met: (input?.years_in_operation ?? 0) >= 3 },
    { weight: 15, met: input?.financials?.revenue_history?.length >= 2 },
    { weight: 10, met: input?.financials?.profit_trend === 'positive' },
    { weight: 15, met: Boolean(input?.financials?.statements_available) },
    { weight: 10, met: input?.financials?.debt_status === 'on_time' },
    { weight: 10, met: input?.compliance?.tax_clearance === true },
    { weight: 5, met: Boolean(input?.compliance?.licenses?.length) },
    { weight: 10, met: input?.financials?.cashflow_visibility === true },
  ];

  return scoreFromFactors(factors);
};

const evaluateComplianceMaturity = input => {
  const factors = [
    { weight: 15, met: input?.compliance?.tax_registered },
    { weight: 15, met: input?.compliance?.tax_clearance },
    { weight: 10, met: input?.compliance?.returns_on_time },
    { weight: 10, met: Boolean(input?.compliance?.licenses?.length) },
    { weight: 10, met: input?.governance?.policies?.length >= 2 },
    { weight: 10, met: input?.governance?.board_present },
    { weight: 10, met: input?.compliance?.insurance_cover === true },
    { weight: 10, met: Boolean(input?.documents?.registration_certificate) },
    { weight: 10, met: Boolean(input?.documents?.tax_certificate) },
  ];

  return scoreFromFactors(factors);
};

const evaluateDigitalMaturity = input => {
  const factors = [
    { weight: 20, met: Boolean(input?.digital?.website) },
    { weight: 15, met: Boolean(input?.digital?.social_links?.length) },
    { weight: 15, met: Boolean(input?.digital?.online_store) },
    { weight: 15, met: Boolean(input?.digital?.business_tools?.includes('accounting')) },
    { weight: 15, met: Boolean(input?.digital?.business_tools?.includes('pos')) },
    { weight: 10, met: input?.behaviour?.response_time === 'fast' },
    { weight: 10, met: input?.behaviour?.profile_completion === 'high' },
  ];

  return scoreFromFactors(factors);
};

const evaluateGovernanceMaturity = input => {
  const factors = [
    { weight: 20, met: input?.governance?.board_present },
    { weight: 15, met: input?.governance?.advisory_board },
    { weight: 20, met: input?.governance?.policies?.includes('finance') },
    { weight: 15, met: input?.governance?.policies?.includes('hr') },
    { weight: 10, met: input?.governance?.segregation_of_roles },
    { weight: 10, met: input?.governance?.risk_management === true },
    { weight: 10, met: Boolean(input?.documents?.audited_financials) },
  ];

  return scoreFromFactors(factors);
};

const evaluateMarketReadiness = input => {
  const factors = [
    { weight: 20, met: Boolean(input?.profile?.sector) },
    { weight: 15, met: Boolean(input?.profile?.sub_sector) },
    { weight: 20, met: Boolean(input?.market?.top_clients?.length) },
    { weight: 15, met: input?.market?.revenue_concentration === 'balanced' },
    { weight: 10, met: Boolean(input?.market?.contracts_active) },
    { weight: 10, met: input?.behaviour?.opportunities_engaged === 'high' },
    { weight: 10, met: input?.behaviour?.course_completion === 'medium' || input?.behaviour?.course_completion === 'high' },
  ];

  return scoreFromFactors(factors);
};

const evaluateOperationalEfficiency = input => {
  const factors = [
    { weight: 20, met: Boolean(input?.operations?.documented_processes) },
    { weight: 15, met: Boolean(input?.operations?.inventory_system) },
    { weight: 15, met: Boolean(input?.operations?.erp_or_pos) },
    { weight: 15, met: input?.operations?.delivery_on_time === true },
    { weight: 15, met: input?.operations?.quality_control === true },
    { weight: 10, met: input?.operations?.supplier_diversity === 'balanced' },
    { weight: 10, met: input?.operations?.staff_training === true },
  ];

  return scoreFromFactors(factors);
};

const deriveCoverageLevel = input => {
  const sections = ['profile', 'financials', 'compliance', 'governance', 'digital', 'market', 'operations', 'documents', 'behaviour'];
  const provided = sections.filter(section => {
    const value = input?.[section];
    if (!value) return false;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return Boolean(value);
  }).length;

  const ratio = provided / sections.length;
  if (ratio >= 0.8) return 'rich';
  if (ratio >= 0.5) return 'moderate';
  if (ratio >= 0.3) return 'basic';
  return 'minimal';
};

const buildSwot = (input, scores) => {
  const strengths = [];
  const weaknesses = [];
  const opportunities = [];
  const threats = [];

  if (scores.funding_readiness >= 70) strengths.push('Shows bankable traits with evidence of compliance and financial discipline.');
  else weaknesses.push('Funding readiness is below bankable thresholds; improve financial documentation and compliance.');

  if (scores.compliance_maturity >= 70) strengths.push('Compliance discipline reduces friction with lenders and corporate buyers.');
  else weaknesses.push('Compliance documentation is light; tax clearance and statutory filings need attention.');

  if (scores.digital_maturity >= 70) strengths.push('Strong digital presence can accelerate market reach and lead capture.');
  else opportunities.push('Digitising sales channels and customer engagement can drive efficiency and visibility.');

  if (input?.market?.revenue_concentration === 'balanced') strengths.push('Revenue is diversified across clients, lowering concentration risk.');
  else threats.push('High customer concentration exposes the business to revenue shocks.');

  if (input?.operations?.supplier_diversity !== 'balanced') threats.push('Operational dependencies on few suppliers can disrupt delivery.');

  if (input?.profile?.country === 'Zambia') opportunities.push('Eligible for Zambian SME financing and tax incentives; optimise compliance to qualify.');

  if (input?.profile?.sector) opportunities.push(`Sector: ${input.profile.sector}—tap into tailored funds and accelerators.`);

  return { strengths, weaknesses, opportunities, threats };
};

const buildBottlenecks = scores => {
  const items = [];

  if (scores.compliance_maturity < 60) {
    items.push({
      area: 'Compliance',
      severity: scores.compliance_maturity < 40 ? 'high' : 'medium',
      description: 'Compliance evidence (tax clearance, licenses, returns) is incomplete or outdated.',
      impact: 'Blocks access to formal financing and large procurement opportunities.',
    });
  }

  if (scores.funding_readiness < 60) {
    items.push({
      area: 'Funding Readiness',
      severity: scores.funding_readiness < 40 ? 'high' : 'medium',
      description: 'Financial records and visibility are insufficient for lenders.',
      impact: 'Delays or prevents approval for loans and grants.',
    });
  }

  if (scores.digital_maturity < 60) {
    items.push({
      area: 'Digital',
      severity: 'medium',
      description: 'Limited digital presence and tooling reduce conversion and insight.',
      impact: 'Leads, collections, and market data are not captured effectively.',
    });
  }

  if (scores.operational_efficiency < 60) {
    items.push({
      area: 'Operations',
      severity: 'medium',
      description: 'Processes, quality control, or delivery tracking are not consistently documented.',
      impact: 'Operational inconsistency can erode margins and customer trust.',
    });
  }

  return items;
};

const buildRecommendations = scores => {
  const recs = [];

  if (scores.compliance_maturity < 80) {
    recs.push({
      priority: 1,
      area: 'Compliance',
      action: 'Obtain or renew tax clearance and submit pending statutory returns.',
      why: 'Banks and corporate buyers require valid compliance evidence before onboarding suppliers or granting credit.',
      how: [
        'Confirm tax registrations (VAT, PAYE, turnover tax) on the revenue authority portal.',
        'Submit outstanding monthly/annual returns and settle arrears.',
        'Request a Tax Clearance Certificate and store it in the Wathaci vault.',
      ],
      estimated_time: '2–4 weeks',
      difficulty: 'medium',
    });
  }

  if (scores.funding_readiness < 80) {
    recs.push({
      priority: recs.length + 1,
      area: 'Finance',
      action: 'Produce last 12 months management accounts and a cashflow forecast.',
      why: 'Lenders and donors need visibility on revenue trends, margins, and repayment capacity.',
      how: [
        'Export transactions from bank/POS into accounting software (e.g., Zoho, Xero, or Wave).',
        'Prepare income statement, balance sheet, and cashflow for the last financial year.',
        'Highlight recurring revenue, top customers, and any arrears resolutions.',
      ],
      estimated_time: '2–3 weeks',
      difficulty: 'medium',
    });
  }

  if (scores.digital_maturity < 80) {
    recs.push({
      priority: recs.length + 1,
      area: 'Digital',
      action: 'Strengthen digital presence and lead capture.',
      why: 'SMEs with active online channels convert more opportunities and build trust.',
      how: [
        'Launch or update a lightweight website with products/services and contact flows.',
        'Integrate WhatsApp or web chat with response-time SLAs.',
        'Enable digital invoicing and receipt tracking to improve collections.',
      ],
      estimated_time: '1–2 weeks',
      difficulty: 'low',
    });
  }

  if (scores.operational_efficiency < 80) {
    recs.push({
      priority: recs.length + 1,
      area: 'Operations',
      action: 'Document core processes and assign owners.',
      why: 'Clear SOPs and metrics reduce errors and increase consistency for corporate buyers.',
      how: [
        'Document procurement-to-delivery workflows with quality checks.',
        'Track on-time delivery and defect rates weekly.',
        'Introduce supplier backups to de-risk supply chain interruptions.',
      ],
      estimated_time: '2–4 weeks',
      difficulty: 'medium',
    });
  }

  return recs.map((rec, index) => ({ ...rec, priority: index + 1 }));
};

const buildRecommendedPartners = (scores, profile) => {
  const partners = [];

  if (scores.funding_readiness >= 60) {
    partners.push({
      partner_type: 'Bank',
      partner_id: 'bank_working_capital',
      name: 'ZamBank SME Unit',
      reason: 'Active SME working capital facility aligned to your revenue band.',
      suggested_product: 'Working Capital Facility',
      fit_score: scores.funding_readiness,
    });
  }

  if (scores.compliance_maturity < 80) {
    partners.push({
      partner_type: 'Consultant',
      partner_id: 'compliance_partner',
      name: 'Compliance & Tax Desk (Wathaci)',
      reason: 'Can regularise filings and secure a tax clearance quickly.',
      suggested_product: 'Fast-track Tax Clearance',
      fit_score: 85,
    });
  }

  partners.push({
    partner_type: 'Training',
    partner_id: 'digital_sales_bootcamp',
    name: 'Digital Sales Bootcamp',
    reason: 'Improve digital lead generation and conversion.',
    suggested_product: '2-week cohort',
    fit_score: 75,
  });

  if (profile?.sector) {
    partners.push({
      partner_type: 'Corporate Procurement',
      partner_id: `${profile.sector.toLowerCase().replace(/\s+/g, '-')}-anchor`,
      name: `${profile.sector} Anchor Buyer`,
      reason: 'Active procurement programmes seeking vetted SMEs in your sector.',
      suggested_product: 'Onboarding & RFP notifications',
      fit_score: 70,
    });
  }

  return partners;
};

const buildSuggestedOpportunities = profile => {
  const opportunities = [
    {
      opportunity_id: 'grant_early_growth',
      title: 'Early Growth Grant Window',
      type: 'Grant',
      reason: 'Supports SMEs formalising compliance and building systems.',
    },
    {
      opportunity_id: 'market_linkage',
      title: 'Corporate Supplier Readiness Challenge',
      type: 'Market',
      reason: 'Preparation track for anchor buyer onboarding.',
    },
  ];

  if (profile?.country === 'Zambia') {
    opportunities.push({
      opportunity_id: 'zed_zambia_sme_finance',
      title: 'Zambia SME Blended Finance',
      type: 'Debt',
      reason: 'Local currency facility with technical assistance for Zambian SMEs.',
    });
  }

  return opportunities;
};

const buildNarrative = (scores, swot) => {
  const paragraphs = [];

  const stage = scores.funding_readiness >= 80
    ? 'scale-ready SME with strong compliance discipline'
    : scores.funding_readiness >= 60
      ? 'growth-stage SME showing bankable traits'
      : 'emerging SME that needs compliance and financial visibility to unlock growth';

  paragraphs.push(`Your business is positioned as a ${stage}. Funding readiness is ${Math.round(scores.funding_readiness)} / 100 and compliance maturity is ${Math.round(scores.compliance_maturity)} / 100.`);
  paragraphs.push(`Key strengths: ${(swot.strengths[0] || 'Strong customer understanding')} and ${(swot.strengths[1] || 'evidence of market traction')}.`);
  paragraphs.push('Top gaps to close in the next quarter: focus on compliance evidence, reliable management accounts, and a sharper digital presence to engage buyers and lenders.');

  return paragraphs.join(' ');
};

const runDiagnosis = ({ companyId, input }) => {
  const scores = {
    funding_readiness: evaluateFundingReadiness(input),
    compliance_maturity: evaluateComplianceMaturity(input),
    governance_maturity: evaluateGovernanceMaturity(input),
    digital_maturity: evaluateDigitalMaturity(input),
    market_readiness: evaluateMarketReadiness(input),
    operational_efficiency: evaluateOperationalEfficiency(input),
  };

  const swot = buildSwot(input, scores);
  const bottlenecks = buildBottlenecks(scores);
  const recommendations = buildRecommendations(scores);
  const recommended_partners = buildRecommendedPartners(scores, input?.profile);
  const suggested_opportunities = buildSuggestedOpportunities(input?.profile);
  const data_coverage_level = deriveCoverageLevel(input);
  const llmPrompt = buildLLMPrompt({ input, scores, swot, recommendations, bottlenecks });
  const narrative = buildNarrative(scores, swot);

  const diagnosis = {
    id: uuidv4(),
    company_id: companyId || null,
    overall_summary: {
      summary_text: narrative,
      stage: scores.funding_readiness >= 80 ? 'scale' : scores.funding_readiness >= 60 ? 'growth' : 'early',
      key_strengths: swot.strengths.slice(0, 3),
      top_gaps: bottlenecks.slice(0, 3).map(item => item.description),
    },
    swot_analysis: swot,
    scores,
    bottlenecks,
    recommendations,
    recommended_partners,
    suggested_opportunities,
    meta: {
      last_updated: new Date().toISOString(),
      data_coverage_level,
      model_version: MODEL_VERSION,
      llm_prompt: llmPrompt,
    },
  };

  return diagnosis;
};

module.exports = {
  runDiagnosis,
  MODEL_VERSION,
};
