export type SMEProfile = {
  name: string;
  sector: string;
  subsector?: string;
  businessModel: "B2B" | "B2C" | "B2G";
  location: string;
  revenue: number;
  profitability: "profitable" | "break_even" | "loss_making";
  cashflowStability: "strong" | "moderate" | "weak";
  fundabilityScore: number; // 0-100
  debtHistory: "clean" | "delinquent" | "limited_history";
  fundingRequestAmount: number;
  fundingPurpose: string;
  registrationYears: number;
  taxClearance: boolean;
  businessLicences: boolean;
  growthStage: "early" | "growth" | "mature" | "scaling" | "export_ready";
  impactTags: string[];
};

export type FunderProfile = {
  id: string;
  name: string;
  category:
    | "bank"
    | "microfinance"
    | "angel"
    | "vc"
    | "donor"
    | "grant"
    | "corporate"
    | "accelerator"
    | "government";
  region: string;
  website?: string;
  fundingTypes: string[];
  minAmount: number;
  maxAmount: number;
  sectors: string[];
  excludedSectors?: string[];
  eligibility: {
    registrationAge?: number;
    revenueMinimum?: number;
    geographicFocus?: string[];
    genderOrYouth?: string[];
    complianceRequirements?: string[];
    impact?: string[];
  };
  riskAppetite: "conservative" | "moderate" | "high_growth" | "early_stage_friendly";
  impactMandates?: string[];
  prioritySectors?: string[];
  contactEmail?: string;
};

export type Opportunity = {
  id: string;
  title: string;
  category: "tender" | "grant_call" | "procurement";
  deadline: string;
  requirements: string[];
  sectorFocus: string[];
  ticketMin?: number;
  ticketMax?: number;
  location?: string;
  sponsor: string;
  notes?: string;
};

export const sampleFunders: FunderProfile[] = [
  {
    id: "africap_bank",
    name: "Africap Commercial Bank",
    category: "bank",
    region: "Zambia",
    fundingTypes: ["term_loan", "working_capital", "invoice_discounting"],
    minAmount: 50000,
    maxAmount: 1500000,
    sectors: ["agriculture", "manufacturing", "logistics", "retail"],
    prioritySectors: ["agriculture", "manufacturing"],
    eligibility: {
      registrationAge: 2,
      revenueMinimum: 500000,
      geographicFocus: ["Zambia"],
      complianceRequirements: ["tax_clearance", "business_license"],
    },
    riskAppetite: "moderate",
    impactMandates: ["jobs", "supply_chain"],
    contactEmail: "capital@africapbank.zm",
  },
  {
    id: "zam_mfi_women",
    name: "Zambezi Women Microfinance",
    category: "microfinance",
    region: "Zambia",
    fundingTypes: ["micro_loan", "asset_finance"],
    minAmount: 10000,
    maxAmount: 250000,
    sectors: ["retail", "services", "agriculture", "creative"],
    prioritySectors: ["retail", "services"],
    eligibility: {
      registrationAge: 1,
      revenueMinimum: 50000,
      geographicFocus: ["Zambia"],
      genderOrYouth: ["women"],
      impact: ["gender"],
    },
    riskAppetite: "early_stage_friendly",
    impactMandates: ["gender", "financial_inclusion"],
    contactEmail: "apply@zambeziwomen.org",
  },
  {
    id: "luangwa_ventures",
    name: "Luangwa Ventures Angel Network",
    category: "angel",
    region: "Southern Africa",
    fundingTypes: ["equity", "convertible"],
    minAmount: 75000,
    maxAmount: 500000,
    sectors: ["technology", "agriculture", "logistics", "energy"],
    prioritySectors: ["technology", "energy"],
    eligibility: {
      registrationAge: 0,
      revenueMinimum: 0,
      geographicFocus: ["Zambia", "Malawi", "Botswana"],
    },
    riskAppetite: "high_growth",
    impactMandates: ["innovation", "jobs"],
    contactEmail: "deals@luangwaventures.com",
  },
  {
    id: "green_futures_fund",
    name: "Green Futures Donor Facility",
    category: "donor",
    region: "Pan-Africa",
    fundingTypes: ["grant"],
    minAmount: 20000,
    maxAmount: 300000,
    sectors: ["agriculture", "energy", "climate", "logistics"],
    prioritySectors: ["climate", "energy"],
    eligibility: {
      registrationAge: 1,
      geographicFocus: ["Zambia", "Kenya", "Ghana"],
      impact: ["climate", "esg"],
    },
    riskAppetite: "moderate",
    impactMandates: ["climate", "esg", "green_economy"],
    contactEmail: "grants@greenfutures.org",
  },
  {
    id: "copperbelt_vc",
    name: "Copperbelt Growth Capital",
    category: "vc",
    region: "Zambia",
    fundingTypes: ["equity"],
    minAmount: 250000,
    maxAmount: 2000000,
    sectors: ["manufacturing", "technology", "logistics", "energy"],
    prioritySectors: ["manufacturing", "logistics"],
    eligibility: {
      registrationAge: 2,
      revenueMinimum: 1000000,
      geographicFocus: ["Zambia"],
      complianceRequirements: ["tax_clearance"],
    },
    riskAppetite: "high_growth",
    impactMandates: ["jobs", "regional_expansion"],
    contactEmail: "pipeline@copperbeltvc.com",
  },
  {
    id: "kwacha_corporate",
    name: "Kwacha Foods Supplier Development",
    category: "corporate",
    region: "Zambia",
    fundingTypes: ["supplier_development", "purchase_order_finance"],
    minAmount: 5000,
    maxAmount: 150000,
    sectors: ["agriculture", "logistics", "manufacturing"],
    prioritySectors: ["agriculture"],
    eligibility: {
      registrationAge: 1,
      revenueMinimum: 100000,
      geographicFocus: ["Zambia"],
      complianceRequirements: ["tax_clearance", "business_license"],
    },
    riskAppetite: "moderate",
    impactMandates: ["supply_chain", "jobs"],
    contactEmail: "suppliers@kwachafoods.co.zm",
  },
  {
    id: "accelerate_africa",
    name: "Accelerate Africa Tech Lab",
    category: "accelerator",
    region: "Remote",
    fundingTypes: ["accelerator", "equity"],
    minAmount: 15000,
    maxAmount: 50000,
    sectors: ["technology", "creative", "education"],
    prioritySectors: ["technology"],
    eligibility: {
      registrationAge: 0,
      geographicFocus: ["Pan-Africa"],
    },
    riskAppetite: "early_stage_friendly",
    impactMandates: ["innovation", "youth"],
    contactEmail: "programs@accelerate.africa",
  },
  {
    id: "zda_scaleup",
    name: "ZDA Scale-Up Scheme",
    category: "government",
    region: "Zambia",
    fundingTypes: ["grant", "matching_grant"],
    minAmount: 50000,
    maxAmount: 300000,
    sectors: ["manufacturing", "agriculture", "energy", "logistics"],
    prioritySectors: ["manufacturing"],
    eligibility: {
      registrationAge: 1,
      geographicFocus: ["Zambia"],
      complianceRequirements: ["tax_clearance"],
    },
    riskAppetite: "moderate",
    impactMandates: ["jobs", "export_ready", "esg"],
    contactEmail: "scaleup@zda.gov.zm",
  },
];

export const sampleOpportunities: Opportunity[] = [
  {
    id: "agri_tender_2024",
    title: "Agri Inputs Supply Tender",
    category: "tender",
    deadline: "2024-12-15",
    requirements: ["Tax clearance", "3 years registration", "Agri track record"],
    sectorFocus: ["agriculture"],
    ticketMin: 100000,
    ticketMax: 500000,
    location: "Zambia",
    sponsor: "Ministry of Agriculture",
    notes: "Priority for rural suppliers with logistics capacity",
  },
  {
    id: "digital_innovation_call",
    title: "Digital Innovation Climate Grant",
    category: "grant_call",
    deadline: "2025-02-28",
    requirements: ["Climate or ESG focus", "MVP or pilot", "Impact reporting"],
    sectorFocus: ["technology", "climate", "energy"],
    ticketMin: 30000,
    ticketMax: 150000,
    location: "Pan-Africa",
    sponsor: "Global Green Labs",
    notes: "Strong preference for women or youth-led ventures",
  },
  {
    id: "foodco_supply_2024",
    title: "FoodCo Supplier Onboarding",
    category: "procurement",
    deadline: "2024-11-01",
    requirements: ["Food safety license", "2 years of operations", "Consistent delivery"],
    sectorFocus: ["agriculture", "manufacturing"],
    ticketMin: 20000,
    ticketMax: 120000,
    location: "Zambia",
    sponsor: "Kwacha Foods",
    notes: "Aligned to supplier development facility for financing",
  },
];
