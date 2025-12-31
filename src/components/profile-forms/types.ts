import { z } from 'zod';

// Base profile schema shared by all account types
export const baseProfileSchema = z.object({
  // Personal information
  first_name: z.string().min(1, 'First name is required').max(50),
  last_name: z.string().min(1, 'Last name is required').max(50),
  phone: z.string().min(8, 'Phone number is required'),
  country: z.string().min(1, 'Country is required'),
  province: z.string().optional(),
  city: z.string().optional(),
  address: z.string().min(1, 'Address is required'),
  
  // Professional/Bio information
  title: z.string().max(100).optional(),
  bio: z.string().max(1000).optional(),
  description: z.string().max(500).optional(),
  industry_sector: z.string().optional(),
  
  // Social/Web links
  linkedin_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  website_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  twitter_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  facebook_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  portfolio_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  
  // Images
  profile_image_url: z.string().optional(),
  avatar_url: z.string().optional(),
  
  // Skills and services
  skills: z.array(z.string()).optional(),
  services_offered: z.array(z.string()).optional(),
  
  // Sectors and target markets
  sectors: z.array(z.string()).optional(),
  target_market: z.array(z.string()).optional(),
});

// Sole Proprietor
export const soleProprietorSchema = baseProfileSchema.extend({
  business_name: z.string().min(1, 'Business name is required').max(100),
  registration_number: z.string().optional(),
  specialization: z.string().optional(),
  experience_years: z.coerce.number().min(0).max(100).optional(),
  years_in_business: z.coerce.number().min(0).max(100).optional(),
  hourly_rate: z.coerce.number().min(0).optional(),
  currency: z.string().default('ZMW'),
  availability_status: z.enum(['available', 'busy', 'unavailable']).default('available'),
});

// Professional
export const professionalSchema = baseProfileSchema.extend({
  specialization: z.string().min(1, 'Specialization is required'),
  experience_years: z.coerce.number().min(0, 'Experience is required').max(100),
  license_number: z.string().optional(),
  hourly_rate: z.coerce.number().min(0).optional(),
  currency: z.string().default('ZMW'),
  availability_status: z.enum(['available', 'busy', 'unavailable']).default('available'),
  qualifications: z.array(z.object({
    name: z.string(),
    institution: z.string(),
    year: z.coerce.number().optional(),
  })).optional(),
  certifications: z.array(z.object({
    name: z.string(),
    issuer: z.string(),
    date: z.string().optional(),
    expiry: z.string().optional(),
  })).optional(),
});

// SME
export const smeSchema = baseProfileSchema.extend({
  business_name: z.string().min(1, 'Business name is required').max(100),
  registration_number: z.string().min(1, 'Registration number is required'),
  ownership_structure: z.enum(['sole_proprietorship', 'partnership', 'limited_company', 'corporation']).optional(),
  employee_count: z.coerce.number().min(1, 'Employee count is required'),
  annual_revenue: z.coerce.number().min(0).optional(),
  funding_stage: z.string().optional(),
  funding_needed: z.coerce.number().min(0).optional(),
  years_in_business: z.coerce.number().min(0).max(100).optional(),
  business_model: z.string().max(500).optional(),
  compliance_verified: z.boolean().default(false),
});

// Investor
export const investorSchema = baseProfileSchema.extend({
  business_name: z.string().optional(),
  specialization: z.string().min(1, 'Investment focus is required'),
  funding_stage: z.string().min(1, 'Preferred funding stage is required'),
  annual_revenue: z.coerce.number().min(0, 'Investment capacity is required'),
  total_invested: z.coerce.number().min(0).default(0),
  preferred_sectors: z.array(z.string()).optional(),
  investment_portfolio: z.array(z.object({
    company_name: z.string(),
    amount: z.number(),
    date: z.string(),
    status: z.string(),
  })).optional(),
});

// Donor
export const donorSchema = baseProfileSchema.extend({
  business_name: z.string().min(1, 'Organization name is required').max(100),
  specialization: z.string().min(1, 'Focus area is required'),
  funding_stage: z.string().optional(),
  total_donated: z.coerce.number().min(0).default(0),
  preferred_sectors: z.array(z.string()).optional(),
});

// Government
export const governmentSchema = baseProfileSchema.extend({
  business_name: z.string().min(1, 'Institution name is required').max(100),
  registration_number: z.string().min(1, 'Registration/ID is required'),
  specialization: z.string().min(1, 'Department/Division is required'),
  employee_count: z.coerce.number().min(0).optional(),
});

// Payment info schema
export const paymentSchema = z.object({
  use_same_phone: z.boolean().default(true),
  payment_method: z.enum(['phone', 'card']).default('phone'),
  payment_phone: z.string().optional(),
});

// Communication preferences schema
export const communicationSchema = z.object({
  preferred_contact_method: z.enum(['email', 'phone', 'whatsapp']).default('email'),
  notification_preferences: z.object({
    email: z.boolean().default(true),
    sms: z.boolean().default(false),
    push: z.boolean().default(true),
  }).optional(),
});

// Type exports
export type BaseProfile = z.infer<typeof baseProfileSchema>;
export type SoleProprietorProfile = z.infer<typeof soleProprietorSchema>;
export type ProfessionalProfile = z.infer<typeof professionalSchema>;
export type SMEProfile = z.infer<typeof smeSchema>;
export type InvestorProfile = z.infer<typeof investorSchema>;
export type DonorProfile = z.infer<typeof donorSchema>;
export type GovernmentProfile = z.infer<typeof governmentSchema>;
export type PaymentInfo = z.infer<typeof paymentSchema>;
export type CommunicationPreferences = z.infer<typeof communicationSchema>;

// Constants for dropdown options
export const fundingStages = [
  'Pre-seed',
  'Seed',
  'Series A',
  'Series B',
  'Series C+',
  'Growth',
  'Established',
] as const;

export const investmentFocus = [
  'Technology & Innovation',
  'Agriculture & Agritech',
  'Healthcare',
  'Financial Services',
  'Manufacturing',
  'Real Estate',
  'Energy & Clean Tech',
  'Education',
  'Consumer Goods',
  'Impact Investing',
] as const;

export const donorFocusAreas = [
  'Education & Skills Development',
  'Healthcare & Wellness',
  'Economic Empowerment',
  'Gender Equality',
  'Youth Development',
  'Environmental Sustainability',
  'Food Security',
  'Infrastructure Development',
  'Governance & Civil Society',
  'Emergency & Humanitarian',
] as const;

export const ownershipStructures = [
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'limited_company', label: 'Limited Company' },
  { value: 'corporation', label: 'Corporation' },
] as const;

export const availabilityStatuses = [
  { value: 'available', label: 'Available' },
  { value: 'busy', label: 'Busy' },
  { value: 'unavailable', label: 'Unavailable' },
] as const;

export const currencies = [
  { value: 'ZMW', label: 'Zambian Kwacha (ZMW)' },
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'ZAR', label: 'South African Rand (ZAR)' },
] as const;

export const industrySectors = [
  'Agriculture & Agribusiness',
  'Technology & IT',
  'Healthcare & Medical',
  'Education & Training',
  'Financial Services',
  'Manufacturing',
  'Construction & Real Estate',
  'Retail & E-commerce',
  'Hospitality & Tourism',
  'Energy & Utilities',
  'Transportation & Logistics',
  'Media & Entertainment',
  'Professional Services',
  'Mining & Minerals',
  'Telecommunications',
  'Non-Profit & NGO',
  'Government & Public Sector',
  'Other',
] as const;

export const skillCategories = [
  // Technology
  'Web Development',
  'Mobile Development',
  'Software Engineering',
  'Data Science',
  'Cloud Computing',
  'Cybersecurity',
  'AI & Machine Learning',
  
  // Business
  'Business Strategy',
  'Project Management',
  'Financial Analysis',
  'Marketing',
  'Sales',
  'Human Resources',
  'Operations',
  
  // Creative
  'Graphic Design',
  'UI/UX Design',
  'Content Writing',
  'Video Production',
  'Photography',
  'Animation',
  
  // Professional Services
  'Legal Services',
  'Accounting',
  'Tax Advisory',
  'Consulting',
  'Audit',
  
  // Trades
  'Construction',
  'Electrical',
  'Plumbing',
  'Carpentry',
  'Welding',
  
  // Agriculture
  'Crop Production',
  'Livestock',
  'Agri-processing',
  'Farm Management',
] as const;
