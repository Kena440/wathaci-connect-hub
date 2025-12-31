import { z } from 'zod';

// Base profile schema shared by all account types
export const baseProfileSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(50),
  last_name: z.string().min(1, 'Last name is required').max(50),
  phone: z.string().min(8, 'Phone number is required'),
  country: z.string().min(1, 'Country is required'),
  address: z.string().min(1, 'Address is required'),
  description: z.string().max(500).optional(),
  industry_sector: z.string().optional(),
  linkedin_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  website_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  profile_image_url: z.string().optional(),
});

// Sole Proprietor
export const soleProprietorSchema = baseProfileSchema.extend({
  business_name: z.string().min(1, 'Business name is required').max(100),
  registration_number: z.string().optional(),
  specialization: z.string().optional(),
  experience_years: z.coerce.number().min(0).max(100).optional(),
});

// Professional
export const professionalSchema = baseProfileSchema.extend({
  specialization: z.string().min(1, 'Specialization is required'),
  experience_years: z.coerce.number().min(0, 'Experience is required').max(100),
  qualifications: z.array(z.object({
    name: z.string(),
    institution: z.string(),
    year: z.coerce.number().optional(),
  })).optional(),
});

// SME
export const smeSchema = baseProfileSchema.extend({
  business_name: z.string().min(1, 'Business name is required').max(100),
  registration_number: z.string().min(1, 'Registration number is required'),
  employee_count: z.coerce.number().min(1, 'Employee count is required'),
  annual_revenue: z.coerce.number().min(0).optional(),
  funding_stage: z.string().optional(),
});

// Investor
export const investorSchema = baseProfileSchema.extend({
  business_name: z.string().optional(),
  specialization: z.string().min(1, 'Investment focus is required'),
  funding_stage: z.string().min(1, 'Preferred funding stage is required'),
  annual_revenue: z.coerce.number().min(0, 'Investment capacity is required'),
});

// Donor
export const donorSchema = baseProfileSchema.extend({
  business_name: z.string().min(1, 'Organization name is required').max(100),
  specialization: z.string().min(1, 'Focus area is required'),
  funding_stage: z.string().optional(),
});

// Government
export const governmentSchema = baseProfileSchema.extend({
  business_name: z.string().min(1, 'Institution name is required').max(100),
  registration_number: z.string().min(1, 'Registration/ID is required'),
  specialization: z.string().min(1, 'Department/Division is required'),
});

// Payment info schema
export const paymentSchema = z.object({
  use_same_phone: z.boolean().default(true),
  payment_method: z.enum(['phone', 'card']).default('phone'),
  payment_phone: z.string().optional(),
});

export type BaseProfile = z.infer<typeof baseProfileSchema>;
export type SoleProprietorProfile = z.infer<typeof soleProprietorSchema>;
export type ProfessionalProfile = z.infer<typeof professionalSchema>;
export type SMEProfile = z.infer<typeof smeSchema>;
export type InvestorProfile = z.infer<typeof investorSchema>;
export type DonorProfile = z.infer<typeof donorSchema>;
export type GovernmentProfile = z.infer<typeof governmentSchema>;
export type PaymentInfo = z.infer<typeof paymentSchema>;

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
