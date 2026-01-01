// Onboarding options for profile forms - Zambia context

export const industries = [
  'Agriculture & Agribusiness',
  'Mining & Extractives',
  'Manufacturing',
  'Construction & Real Estate',
  'Retail & Wholesale Trade',
  'Transportation & Logistics',
  'Information Technology',
  'Financial Services',
  'Healthcare & Pharmaceuticals',
  'Education & Training',
  'Tourism & Hospitality',
  'Energy & Utilities',
  'Telecommunications',
  'Professional Services',
  'Media & Entertainment',
  'Food & Beverage',
  'Textiles & Fashion',
  'Environmental Services',
  'Security Services',
  'Other'
] as const;

export const businessStages = [
  { value: 'idea', label: 'Idea Stage', description: 'Concept or planning phase' },
  { value: 'early', label: 'Early Stage', description: 'Started operations, < 2 years' },
  { value: 'growth', label: 'Growth Stage', description: 'Scaling operations, 2-5 years' },
  { value: 'established', label: 'Established', description: 'Mature business, 5+ years' }
] as const;

export const smeNeeds = [
  'Access to Finance',
  'Business Registration & Compliance',
  'Market Access',
  'Skilled Workforce',
  'Technology & Digital Tools',
  'Export Support',
  'Mentorship & Advisory',
  'Equipment & Machinery',
  'Workspace & Facilities',
  'Supply Chain Partners',
  'Legal & Regulatory Guidance',
  'Marketing & Branding',
  'Accounting & Bookkeeping',
  'Quality Certification',
  'Government Contracts',
  'Training & Capacity Building'
] as const;

export const zambiaProvinces = [
  'Central',
  'Copperbelt',
  'Eastern',
  'Luapula',
  'Lusaka',
  'Muchinga',
  'Northern',
  'North-Western',
  'Southern',
  'Western'
] as const;

export const teamSizeRanges = [
  'Solo (1)',
  'Micro (2-5)',
  'Small (6-20)',
  'Medium (21-50)',
  'Large (51-100)',
  'Enterprise (100+)'
] as const;

export const revenueRanges = [
  'Pre-revenue',
  'K1 - K50,000',
  'K50,001 - K200,000',
  'K200,001 - K500,000',
  'K500,001 - K1,000,000',
  'K1,000,001 - K5,000,000',
  'K5,000,000+'
] as const;

export const fundingRanges = [
  'Up to K50,000',
  'K50,001 - K200,000',
  'K200,001 - K500,000',
  'K500,001 - K1,000,000',
  'K1,000,001 - K5,000,000',
  'K5,000,000 - K20,000,000',
  'K20,000,000+'
] as const;

export const supportTypes = [
  'Grants',
  'Loans',
  'Equity Investment',
  'Technical Assistance',
  'Mentorship',
  'Incubation/Acceleration',
  'Market Linkages',
  'Training Programs'
] as const;

// Freelancer options
export const freelancerSkills = [
  'Accounting & Finance',
  'Legal Services',
  'IT & Software Development',
  'Web Design & Development',
  'Graphic Design',
  'Digital Marketing',
  'Content Writing',
  'Translation Services',
  'Video Production',
  'Photography',
  'Project Management',
  'Human Resources',
  'Business Consulting',
  'Tax Advisory',
  'Audit Services',
  'Architecture',
  'Engineering',
  'Research & Analysis',
  'Data Entry',
  'Virtual Assistance',
  'Social Media Management',
  'SEO/SEM',
  'Mobile App Development',
  'Cybersecurity',
  'Cloud Services'
] as const;

export const experienceLevels = [
  { value: 'junior', label: 'Junior', description: '0-2 years experience' },
  { value: 'mid', label: 'Mid-Level', description: '3-5 years experience' },
  { value: 'senior', label: 'Senior', description: '6-10 years experience' },
  { value: 'expert', label: 'Expert', description: '10+ years experience' }
] as const;

export const availabilityOptions = [
  { value: 'available', label: 'Available', description: 'Ready for new projects' },
  { value: 'limited', label: 'Limited', description: 'Partially available' },
  { value: 'unavailable', label: 'Unavailable', description: 'Not taking new work' }
] as const;

export const workModes = [
  { value: 'remote', label: 'Remote', description: 'Work from anywhere' },
  { value: 'hybrid', label: 'Hybrid', description: 'Mix of remote and on-site' },
  { value: 'on-site', label: 'On-site', description: 'At client location' }
] as const;

export const rateTypes = [
  { value: 'hourly', label: 'Hourly Rate' },
  { value: 'daily', label: 'Daily Rate' },
  { value: 'project', label: 'Project-based' }
] as const;

export const rateRanges = {
  hourly: [
    'K50 - K150/hr',
    'K150 - K300/hr',
    'K300 - K500/hr',
    'K500 - K1,000/hr',
    'K1,000+/hr'
  ],
  daily: [
    'K500 - K1,500/day',
    'K1,500 - K3,000/day',
    'K3,000 - K5,000/day',
    'K5,000 - K10,000/day',
    'K10,000+/day'
  ],
  project: [
    'K1,000 - K5,000',
    'K5,000 - K20,000',
    'K20,000 - K50,000',
    'K50,000 - K100,000',
    'K100,000+'
  ]
} as const;

export const languages = [
  'English',
  'Bemba',
  'Nyanja/Chewa',
  'Tonga',
  'Lozi',
  'Lunda',
  'Kaonde',
  'Luvale',
  'French',
  'Portuguese',
  'Swahili',
  'Chinese'
] as const;

// Investor options
export const investorTypes = [
  { value: 'angel', label: 'Angel Investor', description: 'Individual investor' },
  { value: 'vc', label: 'Venture Capital', description: 'VC fund' },
  { value: 'fund', label: 'Investment Fund', description: 'PE or other fund' },
  { value: 'corporate', label: 'Corporate Investor', description: 'Corporate venture' },
  { value: 'dfi', label: 'DFI', description: 'Development finance institution' },
  { value: 'other', label: 'Other', description: 'Other investor type' }
] as const;

export const ticketSizes = [
  'Up to $10,000',
  '$10,001 - $50,000',
  '$50,001 - $100,000',
  '$100,001 - $500,000',
  '$500,001 - $1,000,000',
  '$1,000,001 - $5,000,000',
  '$5,000,000+'
] as const;

export const investmentStages = [
  'Pre-seed',
  'Seed',
  'Series A',
  'Series B+',
  'Growth',
  'Late Stage',
  'Any Stage'
] as const;

export const investorSectors = [
  'Agriculture & Food',
  'Financial Services & Fintech',
  'Healthcare',
  'Education',
  'Clean Energy & Climate',
  'E-commerce & Retail',
  'Logistics & Supply Chain',
  'Manufacturing',
  'Real Estate',
  'Technology',
  'Media & Entertainment',
  'Tourism',
  'Mining & Resources',
  'Sector Agnostic'
] as const;

export const investmentPreferences = [
  'Equity Only',
  'Debt Only',
  'Convertible Notes',
  'Revenue-based Financing',
  'Blended Finance',
  'Grants + Equity'
] as const;

export const geoFocusOptions = [
  'Zambia Only',
  'Southern Africa',
  'East Africa',
  'Sub-Saharan Africa',
  'Pan-African',
  'Global'
] as const;

// Government options
export const institutionTypes = [
  { value: 'ministry', label: 'Ministry' },
  { value: 'agency', label: 'Government Agency' },
  { value: 'parastatal', label: 'Parastatal' },
  { value: 'local_authority', label: 'Local Authority' },
  { value: 'regulator', label: 'Regulatory Body' },
  { value: 'other', label: 'Other Institution' }
] as const;

export const mandateAreas = [
  'SME Development',
  'Trade & Export Promotion',
  'Investment Promotion',
  'Youth Empowerment',
  'Women Empowerment',
  'Agriculture Development',
  'Technology & Innovation',
  'Skills Development',
  'Financial Inclusion',
  'Environmental Protection',
  'Health Services',
  'Education',
  'Infrastructure Development',
  'Mining & Resources',
  'Tourism Development',
  'Local Economic Development'
] as const;

export const collaborationInterests = [
  'Public-Private Partnerships',
  'Grant Programs',
  'Capacity Building',
  'Policy Consultation',
  'Market Linkages',
  'Research Collaboration',
  'Technology Transfer',
  'Joint Ventures',
  'Mentorship Programs',
  'Export Facilitation',
  'Procurement Opportunities',
  'Regulatory Sandboxes'
] as const;

export const contactTitles = [
  'Director',
  'Deputy Director',
  'Manager',
  'Coordinator',
  'Officer',
  'Specialist',
  'Analyst',
  'Administrator'
] as const;

// Account type options for selection
export const accountTypes = [
  {
    value: 'sme',
    label: 'SME / Business',
    description: 'Small or medium enterprise seeking growth opportunities',
    icon: 'Building2'
  },
  {
    value: 'freelancer',
    label: 'Professional / Freelancer',
    description: 'Individual offering professional services',
    icon: 'User'
  },
  {
    value: 'investor',
    label: 'Investor',
    description: 'Individual or organization looking to invest',
    icon: 'TrendingUp'
  },
  {
    value: 'government',
    label: 'Government Institution',
    description: 'Government body or agency',
    icon: 'Landmark'
  }
] as const;

export type AccountType = typeof accountTypes[number]['value'];
export type Industry = typeof industries[number];
export type BusinessStage = typeof businessStages[number]['value'];
