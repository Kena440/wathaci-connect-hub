/**
 * SME Auto-Diagnosis Service
 * 
 * Main service that orchestrates the diagnosis process,
 * generates SWOT analysis, bottlenecks, and recommendations.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  DiagnosticsInput,
  DiagnosticsOutput,
  DiagnosticsRun,
  SWOTAnalysis,
  SWOTItem,
  Bottleneck,
  Recommendation,
  RecommendedPartner,
  SuggestedOpportunity,
  SMEExtendedProfile,
  SMEFinancialData,
  SMEDocument,
  SMEPlatformBehavior,
  SectorBenchmark,
  DiagnosticsScores,
  ScoreExplanations,
  SEVERITY_LEVELS,
  DIFFICULTY_LEVELS,
  TIMELINE_CATEGORIES,
} from '@/@types/diagnostics';
import {
  calculateAllScores,
  calculateOverallHealthBand,
  detectBusinessStage,
  getScoreBand,
} from './scoringEngine';

// ================================
// Data Coverage Assessment
// ================================

function assessDataCoverage(input: DiagnosticsInput): {
  level: 'minimal' | 'partial' | 'comprehensive';
  sources: string[];
} {
  const sources: string[] = ['profile'];
  let coverage = 1;

  if (input.financial_data) {
    sources.push('financial_data');
    coverage += input.financial_data.revenue_year_1 ? 2 : 1;
  }

  if (input.documents && input.documents.length > 0) {
    sources.push('documents');
    coverage += Math.min(input.documents.length, 3);
  }

  if (input.platform_behavior) {
    sources.push('platform_behavior');
    coverage += 1;
  }

  if (input.sector_benchmark) {
    sources.push('sector_benchmark');
    coverage += 1;
  }

  // Check profile completeness
  const profileFields = [
    input.profile.business_name,
    input.profile.sector,
    input.profile.years_in_operation,
    input.profile.registration_status,
  ].filter(Boolean).length;

  coverage += profileFields;

  const level = coverage >= 8 ? 'comprehensive' : coverage >= 4 ? 'partial' : 'minimal';

  return { level, sources };
}

// ================================
// Input Hash Generation
// ================================

function generateInputHash(input: DiagnosticsInput): string {
  // Simple hash based on key input values
  const hashData = JSON.stringify({
    profile_id: input.profile.id,
    financial_updated: input.financial_data?.updated_at,
    doc_count: input.documents?.length ?? 0,
    behavior_updated: input.platform_behavior?.updated_at,
  });
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < hashData.length; i++) {
    const char = hashData.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// ================================
// SWOT Generation
// ================================

function generateSWOTAnalysis(
  profile: SMEExtendedProfile,
  scores: DiagnosticsScores,
  explanations: ScoreExplanations,
  financialData?: SMEFinancialData,
  sectorBenchmark?: SectorBenchmark
): SWOTAnalysis {
  const strengths: SWOTItem[] = [];
  const weaknesses: SWOTItem[] = [];
  const opportunities: SWOTItem[] = [];
  const threats: SWOTItem[] = [];

  // Extract strengths from score explanations
  Object.entries(explanations).forEach(([key, explanation]) => {
    explanation.factors_positive.forEach((factor, idx) => {
      strengths.push({
        id: `str-${key}-${idx}`,
        text: factor,
        category: key.replace('_', ' '),
        importance: explanation.score >= 70 ? 'high' : explanation.score >= 50 ? 'medium' : 'low',
      });
    });
  });

  // Extract weaknesses from score explanations
  Object.entries(explanations).forEach(([key, explanation]) => {
    explanation.factors_negative.forEach((factor, idx) => {
      weaknesses.push({
        id: `weak-${key}-${idx}`,
        text: factor,
        category: key.replace('_', ' '),
        importance: explanation.score <= 30 ? 'high' : explanation.score <= 50 ? 'medium' : 'low',
      });
    });
  });

  // Generate opportunities based on profile and market
  if (profile.female_ownership_pct && profile.female_ownership_pct >= 51) {
    opportunities.push({
      id: 'opp-1',
      text: 'Eligible for women-owned business programs and funding',
      category: 'Funding',
      importance: 'high',
    });
  }

  if (profile.youth_ownership_pct && profile.youth_ownership_pct >= 51) {
    opportunities.push({
      id: 'opp-2',
      text: 'Eligible for youth entrepreneurship programs',
      category: 'Funding',
      importance: 'high',
    });
  }

  if (scores.digital_maturity >= 60) {
    opportunities.push({
      id: 'opp-3',
      text: 'Ready to expand into e-commerce and digital sales channels',
      category: 'Growth',
      importance: 'medium',
    });
  }

  if (profile.business_model?.includes('B2G')) {
    opportunities.push({
      id: 'opp-4',
      text: 'Can participate in government procurement opportunities',
      category: 'Market',
      importance: 'medium',
    });
  }

  if (sectorBenchmark?.growth_potential === 'high') {
    opportunities.push({
      id: 'opp-5',
      text: `${profile.sector} sector has high growth potential`,
      category: 'Market',
      importance: 'high',
    });
  }

  if (scores.funding_readiness >= 60) {
    opportunities.push({
      id: 'opp-6',
      text: 'Ready to access formal bank financing',
      category: 'Funding',
      importance: 'high',
    });
  }

  // Generate threats based on profile and market
  if (financialData?.top_3_clients_revenue_pct && financialData.top_3_clients_revenue_pct > 60) {
    threats.push({
      id: 'threat-1',
      text: 'High customer concentration creates revenue risk',
      category: 'Market',
      importance: 'high',
    });
  }

  if (sectorBenchmark?.common_challenges) {
    sectorBenchmark.common_challenges.slice(0, 3).forEach((challenge, idx) => {
      const challengeMap: Record<string, string> = {
        'forex_access': 'Limited access to foreign exchange may impact imports',
        'load_shedding': 'Power supply issues (load shedding) affect operations',
        'import_dependence': 'High import dependence creates supply chain risks',
        'competition': 'Increasing market competition',
        'regulation': 'Regulatory changes may impact operations',
      };
      threats.push({
        id: `threat-sector-${idx}`,
        text: challengeMap[challenge] || `Sector challenge: ${challenge}`,
        category: 'External',
        importance: 'medium',
      });
    });
  }

  if (scores.compliance_maturity < 50) {
    threats.push({
      id: 'threat-compliance',
      text: 'Non-compliance may result in penalties or missed opportunities',
      category: 'Legal',
      importance: 'high',
    });
  }

  if (profile.years_in_operation && profile.years_in_operation < 2) {
    threats.push({
      id: 'threat-new',
      text: 'Limited track record may affect access to finance and contracts',
      category: 'Market',
      importance: 'medium',
    });
  }

  // Limit and sort
  const sortByImportance = (items: SWOTItem[]) => {
    const order = { high: 0, medium: 1, low: 2 };
    return items.sort((a, b) => (order[a.importance ?? 'low'] - order[b.importance ?? 'low']));
  };

  return {
    strengths: sortByImportance(strengths).slice(0, 6),
    weaknesses: sortByImportance(weaknesses).slice(0, 6),
    opportunities: sortByImportance(opportunities).slice(0, 5),
    threats: sortByImportance(threats).slice(0, 5),
  };
}

// ================================
// Bottleneck Generation
// ================================

function generateBottlenecks(
  scores: DiagnosticsScores,
  explanations: ScoreExplanations
): Bottleneck[] {
  const bottlenecks: Bottleneck[] = [];

  // Map score areas to bottleneck areas
  const areaMapping: Record<string, string> = {
    funding_readiness: 'Financial Management',
    compliance_maturity: 'Compliance',
    governance_maturity: 'Governance',
    digital_maturity: 'Digital Presence',
    market_readiness: 'Market Position',
    operational_efficiency: 'Operations',
  };

  Object.entries(explanations).forEach(([key, explanation]) => {
    const area = areaMapping[key] as Bottleneck['area'];
    
    if (explanation.score < 50) {
      // Generate bottleneck from negative factors
      explanation.factors_negative.forEach((factor, idx) => {
        const severity = explanation.score < 30 ? 'high' : 
                        explanation.score < 40 ? 'medium' : 'low';
        
        bottlenecks.push({
          id: `bn-${key}-${idx}`,
          area,
          severity: severity as keyof typeof SEVERITY_LEVELS,
          description: factor,
          impact: getBottleneckImpact(key, factor),
          data_source: key,
        });
      });
    }
  });

  // Sort by severity
  const severityOrder = { high: 0, medium: 1, low: 2, critical: -1 };
  return bottlenecks
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    .slice(0, 10);
}

function getBottleneckImpact(area: string, factor: string): string {
  const impactMap: Record<string, Record<string, string>> = {
    funding_readiness: {
      'default': 'Limits ability to access bank loans and grants',
    },
    compliance_maturity: {
      'default': 'May result in penalties and missed business opportunities',
    },
    governance_maturity: {
      'default': 'Reduces credibility with investors and partners',
    },
    digital_maturity: {
      'default': 'Limits market reach and operational efficiency',
    },
    market_readiness: {
      'default': 'Constrains growth potential and market access',
    },
    operational_efficiency: {
      'default': 'Reduces profitability and scalability',
    },
  };

  return impactMap[area]?.default || 'May impact business growth and opportunities';
}

// ================================
// Recommendation Generation
// ================================

function generateRecommendations(
  bottlenecks: Bottleneck[],
  explanations: ScoreExplanations,
  profile: SMEExtendedProfile
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  let priority = 1;

  // Priority 1: High severity bottlenecks (NOW - 0-3 months)
  bottlenecks
    .filter(b => b.severity === 'high' || b.severity === 'critical')
    .forEach(bottleneck => {
      const rec = createRecommendationForBottleneck(bottleneck, priority++, 'NOW');
      if (rec) recommendations.push(rec);
    });

  // Priority 2: Medium severity bottlenecks (NEXT - 3-12 months)
  bottlenecks
    .filter(b => b.severity === 'medium')
    .forEach(bottleneck => {
      const rec = createRecommendationForBottleneck(bottleneck, priority++, 'NEXT');
      if (rec) recommendations.push(rec);
    });

  // Priority 3: Score improvement recommendations (LATER - 12+ months)
  Object.entries(explanations).forEach(([key, explanation]) => {
    if (explanation.score >= 50 && explanation.score < 80) {
      explanation.recommendations.forEach(recText => {
        recommendations.push({
          id: `rec-${key}-${priority}`,
          priority: priority++,
          area: key.replace('_', ' '),
          action: recText,
          why: 'Will improve your overall business health score',
          how: getImplementationSteps(recText),
          estimated_time: '3-6 months',
          difficulty: 'medium' as keyof typeof DIFFICULTY_LEVELS,
          timeline_category: 'LATER' as keyof typeof TIMELINE_CATEGORIES,
        });
      });
    }
  });

  return recommendations.slice(0, 15);
}

function createRecommendationForBottleneck(
  bottleneck: Bottleneck,
  priority: number,
  timeline: keyof typeof TIMELINE_CATEGORIES
): Recommendation {
  const actionMap: Record<string, { action: string; how: string[]; time: string; difficulty: string }> = {
    'Not tax registered': {
      action: 'Register for tax with ZRA',
      how: ['Visit ZRA e-portal or nearest office', 'Complete TPIN registration', 'Obtain TIN certificate'],
      time: '1-2 weeks',
      difficulty: 'easy',
    },
    'No valid tax clearance certificate': {
      action: 'Obtain a current Tax Clearance Certificate',
      how: ['Register on ZRA portal', 'File outstanding returns', 'Request Tax Clearance'],
      time: '2-4 weeks',
      difficulty: 'medium',
    },
    'No business registration': {
      action: 'Register your business with PACRA',
      how: ['Choose business structure', 'Reserve company name', 'Submit registration documents', 'Pay registration fees'],
      time: '2-3 weeks',
      difficulty: 'medium',
    },
    'No formal registration status': {
      action: 'Formalize your business registration',
      how: ['Decide on business structure (company, sole trader, cooperative)', 'Gather required documents', 'Register with PACRA'],
      time: '2-4 weeks',
      difficulty: 'medium',
    },
    'No financial records available': {
      action: 'Set up proper financial record keeping',
      how: ['Choose accounting software (QuickBooks, Wave, Xero)', 'Set up chart of accounts', 'Record all transactions', 'Generate monthly reports'],
      time: '2-4 weeks',
      difficulty: 'medium',
    },
    'No business website': {
      action: 'Create a business website',
      how: ['Register a domain name', 'Choose a website builder or developer', 'Create essential pages (About, Services, Contact)', 'Optimize for search engines'],
      time: '2-4 weeks',
      difficulty: 'medium',
    },
    'No social media presence': {
      action: 'Establish social media presence',
      how: ['Create business profiles on key platforms (Facebook, LinkedIn, Instagram)', 'Complete profile information', 'Post regularly', 'Engage with followers'],
      time: '1-2 weeks',
      difficulty: 'easy',
    },
    'No board or advisory structure': {
      action: 'Establish advisory or governance structure',
      how: ['Identify potential advisors or board members', 'Define roles and expectations', 'Formalize through board resolution or advisory agreement'],
      time: '2-3 months',
      difficulty: 'medium',
    },
    'No written governance policies': {
      action: 'Develop basic governance policies',
      how: ['Start with HR and finance policies', 'Use templates or consult with professionals', 'Get policies approved and communicated'],
      time: '1-2 months',
      difficulty: 'medium',
    },
  };

  // Find matching action or create generic one
  const matchedAction = Object.entries(actionMap).find(([key]) => 
    bottleneck.description.toLowerCase().includes(key.toLowerCase())
  );

  if (!matchedAction) {
    // Create generic recommendation
    return {
      id: `rec-bn-${priority}`,
      priority,
      area: bottleneck.area,
      action: `Address: ${bottleneck.description}`,
      why: bottleneck.impact,
      how: ['Assess current situation', 'Develop improvement plan', 'Implement changes', 'Monitor progress'],
      estimated_time: timeline === 'NOW' ? '1-3 months' : '3-6 months',
      difficulty: 'medium' as keyof typeof DIFFICULTY_LEVELS,
      timeline_category: timeline,
      related_bottleneck_id: bottleneck.id,
    };
  }

  return {
    id: `rec-bn-${priority}`,
    priority,
    area: bottleneck.area,
    action: matchedAction[1].action,
    why: bottleneck.impact,
    how: matchedAction[1].how,
    estimated_time: matchedAction[1].time,
    difficulty: matchedAction[1].difficulty as keyof typeof DIFFICULTY_LEVELS,
    timeline_category: timeline,
    related_bottleneck_id: bottleneck.id,
  };
}

function getImplementationSteps(recommendation: string): string[] {
  // Generic implementation steps
  return [
    'Research best practices and requirements',
    'Create an implementation plan',
    'Allocate resources and timeline',
    'Execute and monitor progress',
  ];
}

// ================================
// Partner Matching
// ================================

function matchPartners(
  profile: SMEExtendedProfile,
  scores: DiagnosticsScores,
  financialData?: SMEFinancialData
): RecommendedPartner[] {
  const partners: RecommendedPartner[] = [];

  // Bank recommendation if funding ready
  if (scores.funding_readiness >= 50) {
    partners.push({
      partner_type: 'bank',
      partner_id: 'bank-generic',
      name: 'Commercial Banks (SME Units)',
      reason: `With a funding readiness score of ${scores.funding_readiness}, you may qualify for bank financing`,
      suggested_product: 'Working Capital Facility',
      fit_score: Math.min(95, scores.funding_readiness + 10),
    });
  }

  // Investor recommendation for growth stage
  if (profile.years_in_operation && profile.years_in_operation >= 2 && scores.market_readiness >= 50) {
    partners.push({
      partner_type: 'investor',
      partner_id: 'investor-generic',
      name: 'Angel Investors / VC Funds',
      reason: 'Your business profile suggests potential for equity investment',
      suggested_product: 'Equity Investment',
      fit_score: Math.min(90, scores.market_readiness + 5),
    });
  }

  // Consultant for compliance gaps
  if (scores.compliance_maturity < 50) {
    partners.push({
      partner_type: 'consultant',
      partner_id: 'consultant-compliance',
      name: 'Tax & Compliance Consultants',
      reason: 'Professional support can help address compliance gaps quickly',
      suggested_product: 'Compliance Review & Support',
      fit_score: 85,
    });
  }

  // Training provider for digital gaps
  if (scores.digital_maturity < 50) {
    partners.push({
      partner_type: 'training_provider',
      partner_id: 'training-digital',
      name: 'Digital Skills Training Providers',
      reason: 'Training can help improve your digital capabilities',
      suggested_product: 'Digital Business Training',
      fit_score: 80,
    });
  }

  // Women-owned business support
  if (profile.female_ownership_pct && profile.female_ownership_pct >= 51) {
    partners.push({
      partner_type: 'donor',
      partner_id: 'donor-women',
      name: 'Women Enterprise Development Programs',
      reason: 'As a majority women-owned business, you qualify for specialized support',
      suggested_product: 'Grant Funding & Technical Assistance',
      fit_score: 90,
    });
  }

  // Youth enterprise support
  if (profile.youth_ownership_pct && profile.youth_ownership_pct >= 51) {
    partners.push({
      partner_type: 'donor',
      partner_id: 'donor-youth',
      name: 'Youth Enterprise Funds',
      reason: 'As a youth-owned business, you qualify for youth enterprise programs',
      suggested_product: 'Youth Enterprise Grant',
      fit_score: 90,
    });
  }

  return partners.sort((a, b) => b.fit_score - a.fit_score).slice(0, 5);
}

// ================================
// Opportunity Matching
// ================================

function matchOpportunities(
  profile: SMEExtendedProfile,
  scores: DiagnosticsScores
): SuggestedOpportunity[] {
  const opportunities: SuggestedOpportunity[] = [];

  // Grant opportunities
  if (scores.compliance_maturity >= 50) {
    opportunities.push({
      id: 'opp-grant-1',
      type: 'grant',
      title: 'SME Development Grants',
      description: 'Various grant programs for compliant SMEs',
      provider: 'Development Partners',
      fit_score: scores.compliance_maturity,
      requirements: ['Tax clearance', 'Business registration', 'Bank account'],
    });
  }

  // Tender opportunities
  if (profile.business_model?.includes('B2G') && scores.compliance_maturity >= 60) {
    opportunities.push({
      id: 'opp-tender-1',
      type: 'tender',
      title: 'Government Procurement Opportunities',
      description: 'Public sector tenders matching your sector',
      provider: 'ZPPA / Government Ministries',
      fit_score: scores.compliance_maturity + 10,
      requirements: ['Tax clearance', 'PACRA registration', 'ZRA compliance'],
    });
  }

  // Loan opportunities
  if (scores.funding_readiness >= 60) {
    opportunities.push({
      id: 'opp-loan-1',
      type: 'loan',
      title: 'SME Working Capital Loans',
      description: 'Short-term financing for operational needs',
      provider: 'Commercial Banks',
      amount: { min: 5000, max: 100000, currency: 'ZMW' },
      fit_score: scores.funding_readiness,
      requirements: ['Financial statements', 'Business plan', 'Collateral'],
    });
  }

  // Training opportunities
  if (scores.digital_maturity < 60) {
    opportunities.push({
      id: 'opp-training-1',
      type: 'training',
      title: 'Digital Business Skills Training',
      description: 'Training programs to improve digital capabilities',
      provider: 'Wathaci Academy',
      fit_score: 85,
    });
  }

  // Mentorship opportunities
  if (profile.years_in_operation && profile.years_in_operation < 3) {
    opportunities.push({
      id: 'opp-mentor-1',
      type: 'mentorship',
      title: 'Business Mentorship Program',
      description: 'Connect with experienced business mentors',
      provider: 'Wathaci Connect',
      fit_score: 80,
    });
  }

  return opportunities.sort((a, b) => b.fit_score - a.fit_score).slice(0, 5);
}

// ================================
// Narrative Summary Generation
// ================================

function generateNarrativeSummary(
  profile: SMEExtendedProfile,
  scores: DiagnosticsScores,
  healthBand: string,
  businessStage: string,
  swot: SWOTAnalysis,
  bottlenecks: Bottleneck[]
): string {
  const businessName = profile.business_name || 'Your business';
  const sector = profile.sector || 'your sector';
  const years = profile.years_in_operation || 0;

  const stageName = businessStage === 'early' ? 'early-stage' : 
                   businessStage === 'growth' ? 'growth-stage' : 'scale-stage';

  const avgScore = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 6);
  
  const topStrength = swot.strengths[0]?.text || 'core business fundamentals';
  const topWeakness = bottlenecks[0]?.description || 'some areas requiring attention';
  
  const highScoreAreas = Object.entries(scores)
    .filter(([_, score]) => score >= 60)
    .map(([key]) => key.replace('_', ' '))
    .slice(0, 2);

  const lowScoreAreas = Object.entries(scores)
    .filter(([_, score]) => score < 50)
    .map(([key]) => key.replace('_', ' '))
    .slice(0, 2);

  let narrative = `${businessName} is a ${stageName} enterprise operating in the ${sector} sector`;
  if (years > 0) {
    narrative += ` with ${years} year${years > 1 ? 's' : ''} of operation`;
  }
  narrative += '. ';

  narrative += `Based on our comprehensive analysis, the business is currently in the "${healthBand}" health band with an overall readiness score of ${avgScore}%. `;

  if (highScoreAreas.length > 0) {
    narrative += `Key strengths include ${highScoreAreas.join(' and ')}, which position the business well for growth. `;
  }

  if (lowScoreAreas.length > 0) {
    narrative += `Priority areas requiring attention include ${lowScoreAreas.join(' and ')}. `;
  }

  // Recommendations summary
  const urgentCount = bottlenecks.filter(b => b.severity === 'high' || b.severity === 'critical').length;
  if (urgentCount > 0) {
    narrative += `\n\nThere are ${urgentCount} urgent items that should be addressed in the next 3 months to improve business health and access to opportunities. `;
  }

  // Funding readiness specific
  if (scores.funding_readiness >= 60) {
    narrative += `With a funding readiness score of ${scores.funding_readiness}%, the business is positioned to approach formal financial institutions for support. `;
  } else if (scores.funding_readiness >= 40) {
    narrative += `The funding readiness score of ${scores.funding_readiness}% indicates some foundational work is needed before approaching formal lenders. `;
  } else {
    narrative += `The current funding readiness score of ${scores.funding_readiness}% suggests focusing on building business fundamentals before seeking external financing. `;
  }

  narrative += `\n\nRecommended focus for the next 3 months: Address compliance gaps, strengthen documentation, and complete the recommended actions to improve overall business health.`;

  return narrative;
}

// ================================
// Main Diagnosis Function
// ================================

export async function runDiagnosis(input: DiagnosticsInput): Promise<DiagnosticsOutput> {
  const { profile, financial_data, documents, platform_behavior, sector_benchmark } = input;

  // Assess data coverage
  const { level: dataCoverageLevel, sources: dataSources } = assessDataCoverage(input);

  // Calculate all scores
  const { scores, explanations } = calculateAllScores(
    profile,
    financial_data,
    documents,
    platform_behavior
  );

  // Calculate overall health band
  const healthBand = calculateOverallHealthBand(scores);

  // Detect business stage
  const businessStage = detectBusinessStage(profile, financial_data, scores);

  // Generate SWOT analysis
  const swotAnalysis = generateSWOTAnalysis(profile, scores, explanations, financial_data, sector_benchmark);

  // Generate bottlenecks
  const bottlenecks = generateBottlenecks(scores, explanations);

  // Generate recommendations
  const recommendations = generateRecommendations(bottlenecks, explanations, profile);

  // Match partners
  const recommendedPartners = matchPartners(profile, scores, financial_data);

  // Match opportunities
  const suggestedOpportunities = matchOpportunities(profile, scores);

  // Generate narrative summary
  const narrativeSummary = generateNarrativeSummary(
    profile,
    scores,
    healthBand,
    businessStage,
    swotAnalysis,
    bottlenecks
  );

  // Create output
  const output: DiagnosticsOutput = {
    overall_summary: {
      health_band: healthBand,
      business_stage: businessStage,
      headline: `${healthBand.charAt(0).toUpperCase() + healthBand.slice(1)} business with ${businessStage === 'early' ? 'early-stage' : businessStage === 'growth' ? 'growth' : 'scale'} potential`,
      key_strengths: swotAnalysis.strengths.slice(0, 3).map(s => s.text),
      urgent_gaps: bottlenecks.filter(b => b.severity === 'high').slice(0, 3).map(b => b.description),
      recommended_themes: generateThemes(scores, explanations),
    },
    swot_analysis: swotAnalysis,
    scores,
    score_explanations: explanations,
    bottlenecks,
    recommendations,
    recommended_partners: recommendedPartners,
    suggested_opportunities: suggestedOpportunities,
    meta: {
      last_updated: new Date().toISOString(),
      data_coverage_level: dataCoverageLevel,
      data_sources_used: dataSources,
      model_version: 'v1.0',
      prompt_version: 'v1.0',
    },
  };

  return output;
}

function generateThemes(scores: DiagnosticsScores, explanations: ScoreExplanations): string[] {
  const themes: string[] = [];

  // Identify the lowest 2 scores
  const sortedScores = Object.entries(scores).sort((a, b) => a[1] - b[1]);
  
  sortedScores.slice(0, 2).forEach(([key, score]) => {
    if (score < 60) {
      switch (key) {
        case 'funding_readiness':
          themes.push('Improve financial documentation and track record');
          break;
        case 'compliance_maturity':
          themes.push('Focus on compliance and regulatory requirements');
          break;
        case 'governance_maturity':
          themes.push('Strengthen governance and policy frameworks');
          break;
        case 'digital_maturity':
          themes.push('Enhance digital presence and capabilities');
          break;
        case 'market_readiness':
          themes.push('Clarify market positioning and strategy');
          break;
        case 'operational_efficiency':
          themes.push('Optimize operations and processes');
          break;
      }
    }
  });

  // Add general growth theme if doing well
  const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / 6;
  if (avgScore >= 60) {
    themes.push('Leverage strengths for growth and expansion');
  }

  return themes.slice(0, 3);
}

// ================================
// Create Diagnostics Run Record
// ================================

export function createDiagnosticsRun(
  userId: string,
  input: DiagnosticsInput,
  output: DiagnosticsOutput
): Omit<DiagnosticsRun, 'created_at' | 'updated_at'> {
  return {
    id: uuidv4(),
    user_id: userId,
    model_version: output.meta.model_version,
    prompt_version: output.meta.prompt_version,
    input_hash: generateInputHash(input),
    data_coverage_level: output.meta.data_coverage_level as DiagnosticsRun['data_coverage_level'],
    data_sources_used: output.meta.data_sources_used,
    funding_readiness_score: output.scores.funding_readiness,
    compliance_maturity_score: output.scores.compliance_maturity,
    governance_maturity_score: output.scores.governance_maturity,
    digital_maturity_score: output.scores.digital_maturity,
    market_readiness_score: output.scores.market_readiness,
    operational_efficiency_score: output.scores.operational_efficiency,
    overall_health_band: output.overall_summary.health_band as DiagnosticsRun['overall_health_band'],
    business_stage: output.overall_summary.business_stage as DiagnosticsRun['business_stage'],
    swot_analysis: output.swot_analysis,
    bottlenecks: output.bottlenecks,
    recommendations: output.recommendations,
    recommended_partners: output.recommended_partners,
    suggested_opportunities: output.suggested_opportunities,
    narrative_summary: generateNarrativeSummary(
      input.profile,
      output.scores,
      output.overall_summary.health_band,
      output.overall_summary.business_stage,
      output.swot_analysis,
      output.bottlenecks
    ),
    score_explanations: output.score_explanations,
    status: 'completed',
  };
}
