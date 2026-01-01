import { z } from 'zod';

// Base profile schema
export const baseProfileSchema = z.object({
  full_name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name must be less than 80 characters'),
  display_name: z.string().max(50, 'Display name must be less than 50 characters').optional().nullable(),
  phone: z.string()
    .regex(/^(\+260|0)?[0-9]{9}$/, 'Invalid Zambian phone number')
    .optional()
    .nullable()
    .or(z.literal('')),
  country: z.string().min(1, 'Country is required').default('Zambia'),
  city: z.string()
    .min(2, 'City must be at least 2 characters')
    .max(60, 'City must be less than 60 characters'),
  bio: z.string()
    .min(20, 'Bio must be at least 20 characters')
    .max(280, 'Bio must be less than 280 characters'),
  website_url: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
  linkedin_url: z.string().url('Invalid URL').optional().nullable().or(z.literal(''))
});

// SME profile schema
export const smeProfileSchema = z.object({
  business_name: z.string()
    .min(2, 'Business name must be at least 2 characters')
    .max(100, 'Business name must be less than 100 characters'),
  industry: z.string().min(1, 'Industry is required'),
  business_stage: z.enum(['idea', 'early', 'growth', 'established'], {
    required_error: 'Business stage is required'
  }),
  services_or_products: z.string()
    .min(10, 'Please describe your products/services (at least 10 characters)')
    .max(500, 'Description must be less than 500 characters'),
  top_needs: z.array(z.string()).min(1, 'Select at least one business need'),
  areas_served: z.array(z.string()).min(1, 'Select at least one area served'),
  registration_status: z.string().optional().nullable(),
  registration_number: z.string().optional().nullable(),
  year_established: z.number().min(1900).max(new Date().getFullYear()).optional().nullable(),
  team_size_range: z.string().optional().nullable(),
  monthly_revenue_range: z.string().optional().nullable(),
  funding_needed: z.boolean().optional().default(false),
  funding_range: z.string().optional().nullable(),
  preferred_support: z.array(z.string()).optional().default([]),
  sectors_of_interest: z.array(z.string()).optional().default([])
});

// Freelancer profile schema
export const freelancerProfileSchema = z.object({
  professional_title: z.string()
    .min(2, 'Professional title is required')
    .max(100, 'Title must be less than 100 characters'),
  primary_skills: z.array(z.string()).min(1, 'Select at least one skill'),
  services_offered: z.string()
    .min(10, 'Please describe your services (at least 10 characters)')
    .max(500, 'Description must be less than 500 characters'),
  experience_level: z.enum(['junior', 'mid', 'senior', 'expert'], {
    required_error: 'Experience level is required'
  }),
  availability: z.enum(['available', 'limited', 'unavailable'], {
    required_error: 'Availability is required'
  }),
  work_mode: z.enum(['remote', 'hybrid', 'on-site'], {
    required_error: 'Work mode is required'
  }),
  rate_type: z.enum(['hourly', 'daily', 'project'], {
    required_error: 'Rate type is required'
  }),
  rate_range: z.string().min(1, 'Rate range is required'),
  portfolio_url: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
  certifications: z.array(z.string()).optional().default([]),
  languages: z.array(z.string()).optional().default([]),
  past_clients: z.string().max(500).optional().nullable(),
  preferred_industries: z.array(z.string()).optional().default([])
});

// Investor profile schema
export const investorProfileSchema = z.object({
  investor_type: z.enum(['angel', 'vc', 'fund', 'corporate', 'dfi', 'other'], {
    required_error: 'Investor type is required'
  }),
  ticket_size_range: z.string().min(1, 'Ticket size is required'),
  investment_stage_focus: z.array(z.string()).min(1, 'Select at least one investment stage'),
  sectors_of_interest: z.array(z.string()).min(1, 'Select at least one sector'),
  investment_preferences: z.array(z.string()).min(1, 'Select at least one investment preference'),
  geo_focus: z.array(z.string()).min(1, 'Select at least one geographic focus'),
  thesis: z.string().max(1000).optional().nullable(),
  portfolio_companies: z.array(z.string()).optional().default([]),
  decision_timeline: z.string().optional().nullable(),
  required_documents: z.string().optional().nullable(),
  website_override: z.string().url('Invalid URL').optional().nullable().or(z.literal(''))
});

// Government profile schema
export const governmentProfileSchema = z.object({
  institution_name: z.string()
    .min(2, 'Institution name is required')
    .max(150, 'Name must be less than 150 characters'),
  department_or_unit: z.string()
    .min(2, 'Department is required')
    .max(100, 'Department must be less than 100 characters'),
  institution_type: z.enum(['ministry', 'agency', 'parastatal', 'local_authority', 'regulator', 'other'], {
    required_error: 'Institution type is required'
  }),
  mandate_areas: z.array(z.string()).min(1, 'Select at least one mandate area'),
  services_or_programmes: z.string()
    .min(10, 'Please describe services/programmes (at least 10 characters)')
    .max(500, 'Description must be less than 500 characters'),
  collaboration_interests: z.array(z.string()).min(1, 'Select at least one collaboration interest'),
  contact_person_title: z.string().min(1, 'Contact person title is required'),
  procurement_portal_url: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
  current_initiatives: z.string().max(500).optional().nullable(),
  eligibility_criteria: z.string().max(500).optional().nullable()
});

// Type exports
export type BaseProfileData = z.infer<typeof baseProfileSchema>;
export type SMEProfileData = z.infer<typeof smeProfileSchema>;
export type FreelancerProfileData = z.infer<typeof freelancerProfileSchema>;
export type InvestorProfileData = z.infer<typeof investorProfileSchema>;
export type GovernmentProfileData = z.infer<typeof governmentProfileSchema>;
