-- Add comprehensive columns to profiles table to support all platform features
-- This includes freelancer marketplace, SME directory, professional services, and compliance tracking

-- Professional/Freelancer fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS license_number TEXT,
ADD COLUMN IF NOT EXISTS skills TEXT[],
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL,
ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'available',
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'ZMW';

-- Location fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS province TEXT,
ADD COLUMN IF NOT EXISTS city TEXT;

-- SME/Business fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS ownership_structure TEXT,
ADD COLUMN IF NOT EXISTS funding_needed DECIMAL,
ADD COLUMN IF NOT EXISTS sectors TEXT[];

-- Marketplace/Rating fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS rating DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_jobs_completed INTEGER DEFAULT 0;

-- Compliance/Verification fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS compliance_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS documents_submitted BOOLEAN DEFAULT false;

-- Professional certifications and services
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS services_offered TEXT[],
ADD COLUMN IF NOT EXISTS portfolio_url TEXT;

-- Social and communication preferences
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS twitter_url TEXT,
ADD COLUMN IF NOT EXISTS facebook_url TEXT,
ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true}'::jsonb;

-- Additional business metrics
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS years_in_business INTEGER,
ADD COLUMN IF NOT EXISTS target_market TEXT[],
ADD COLUMN IF NOT EXISTS business_model TEXT;

-- Donor/Investor specific fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS total_invested DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_donated DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS investment_portfolio JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS preferred_sectors TEXT[];

-- Create indexes for commonly searched fields
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON public.profiles(account_type);
CREATE INDEX IF NOT EXISTS idx_profiles_country ON public.profiles(country);
CREATE INDEX IF NOT EXISTS idx_profiles_industry_sector ON public.profiles(industry_sector);
CREATE INDEX IF NOT EXISTS idx_profiles_specialization ON public.profiles(specialization);
CREATE INDEX IF NOT EXISTS idx_profiles_availability_status ON public.profiles(availability_status);
CREATE INDEX IF NOT EXISTS idx_profiles_compliance_verified ON public.profiles(compliance_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_rating ON public.profiles(rating);
CREATE INDEX IF NOT EXISTS idx_profiles_skills ON public.profiles USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_profiles_sectors ON public.profiles USING GIN(sectors);