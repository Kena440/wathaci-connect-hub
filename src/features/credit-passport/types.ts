export type RiskLevel = 'low' | 'medium' | 'high';

export interface BusinessIdentity {
  name: string;
  registrationNumber?: string;
  incorporationDate?: string;
  sector?: string;
  subsector?: string;
  location?: string;
  ownership?: {
    women?: number;
    youth?: number;
    local?: number;
    foreign?: number;
  };
}

export interface FinancialInputs {
  annualRevenue: number[];
  monthlyRevenue?: number[];
  profitMargin?: number;
  cashflowStability?: number;
  averageInvoiceValue?: number;
  cashConversionCycle?: number;
  negativeBalanceFrequency?: number;
  debtServiceCoverage?: number;
  ebitdaMargin?: number;
  customerConcentration?: number;
}

export interface BankingInputs {
  monthlyBankVolume?: number;
  mobileMoneyVolume?: number;
  cardPaymentsVolume?: number;
  salesChannels?: string[];
  loanHistory?: string;
  repaymentHistory?: number;
  rejectionHistory?: number;
  overdraftFrequency?: number;
  chequeBounceHistory?: number;
}

export interface ComplianceInputs {
  taxRegistration?: boolean;
  taxClearance?: boolean;
  annualReturns?: boolean;
  businessInsurance?: boolean;
  licenses?: string[];
  policyCoverage?: number;
}

export interface BehavioralInputs {
  profileCompletion?: number;
  engagement?: number;
  responsiveness?: number;
  dataFreshness?: number;
  marketplacePerformance?: number;
  paymentTimeliness?: number;
}

export interface OperationalInputs {
  digitalFootprint?: number;
  erpUsage?: number;
  deliveryReliability?: number;
  customerSatisfaction?: number;
  supplyChainRisk?: number;
  currencyExposure?: number;
  seasonality?: number;
  continuityPlans?: number;
}

export interface CreditPassportInputs {
  businessIdentity: BusinessIdentity;
  financials: FinancialInputs;
  banking: BankingInputs;
  compliance: ComplianceInputs;
  behavioral: BehavioralInputs;
  digitalOperational: OperationalInputs;
  operations?: OperationalInputs;
  creditBehavior?: BankingInputs;
}

export interface FundabilityBreakdown {
  financialStrength: number;
  complianceGovernance: number;
  creditBehavior: number;
  digitalOperational: number;
  behavioral: number;
}

export interface RiskProfile {
  financial_risk: RiskLevel;
  compliance_risk: RiskLevel;
  credit_risk: RiskLevel;
  market_risk: RiskLevel;
  operational_risk: RiskLevel;
  overall_risk_level: RiskLevel | 'medium' | 'low' | 'high';
  liquidity_concern: RiskLevel;
}

export interface RepaymentCapacity {
  label: 'Strong' | 'Moderate' | 'Weak';
  score: number;
  details: {
    dscr: number;
    ebitdaMargin: number;
  };
}

export interface NarrativeSummary {
  headline: string;
  strengths: string[];
  weaknesses: string[];
  bank_concerns: string[];
  recommendations: string[];
  suggested_partners: string[];
}

export interface CreditPassportResult {
  fundabilityScore: number;
  breakdown: FundabilityBreakdown;
  interpretation: string;
  riskProfile: RiskProfile;
  liquidityIndex: number;
  repaymentCapacity: RepaymentCapacity;
  resilienceScore: number;
  narrative: NarrativeSummary;
  timestamp: string;
}

export interface MonetizationState {
  generation: 'pending' | 'paid' | 'required';
  pdf: 'locked' | 'paid' | 'required';
  share: 'locked' | 'paid' | 'required';
}

export interface PaymentAction {
  label: string;
  amount: number;
  status: MonetizationState[keyof MonetizationState];
  description: string;
  actionKey: 'generation' | 'pdf' | 'share';
}
