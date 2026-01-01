-- =====================================================
-- WATHACI ONBOARDING SCHEMA MIGRATION
-- Complete role-based profile system with matching support
-- =====================================================

-- 1) Create account type enum (if not exists, add new values)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type_enum') THEN
    CREATE TYPE public.account_type_enum AS ENUM ('sme', 'freelancer', 'investor', 'government');
  END IF;
END$$;

-- 2) Add missing columns to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_profile_complete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_name text;

-- 3) Create SME profiles table
CREATE TABLE IF NOT EXISTS public.sme_profiles (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Required fields
  business_name text NOT NULL,
  industry text NOT NULL,
  business_stage text NOT NULL CHECK (business_stage IN ('idea', 'early', 'growth', 'established')),
  services_or_products text NOT NULL,
  top_needs text[] NOT NULL DEFAULT '{}',
  areas_served text[] NOT NULL DEFAULT '{}',
  -- Optional fields
  registration_status text,
  registration_number text,
  year_established integer,
  team_size_range text,
  monthly_revenue_range text,
  funding_needed boolean DEFAULT false,
  funding_range text,
  preferred_support text[] DEFAULT '{}',
  sectors_of_interest text[] DEFAULT '{}',
  documents_urls text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4) Create Freelancer profiles table
CREATE TABLE IF NOT EXISTS public.freelancer_profiles (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Required fields
  professional_title text NOT NULL,
  primary_skills text[] NOT NULL DEFAULT '{}',
  services_offered text NOT NULL,
  experience_level text NOT NULL CHECK (experience_level IN ('junior', 'mid', 'senior', 'expert')),
  availability text NOT NULL CHECK (availability IN ('available', 'limited', 'unavailable')),
  work_mode text NOT NULL CHECK (work_mode IN ('remote', 'hybrid', 'on-site')),
  rate_type text NOT NULL CHECK (rate_type IN ('hourly', 'daily', 'project')),
  rate_range text NOT NULL,
  -- Optional fields
  portfolio_url text,
  certifications text[] DEFAULT '{}',
  languages text[] DEFAULT '{}',
  past_clients text,
  preferred_industries text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5) Create Investor profiles table
CREATE TABLE IF NOT EXISTS public.investor_profiles (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Required fields
  investor_type text NOT NULL CHECK (investor_type IN ('angel', 'vc', 'fund', 'corporate', 'dfi', 'other')),
  ticket_size_range text NOT NULL,
  investment_stage_focus text[] NOT NULL DEFAULT '{}',
  sectors_of_interest text[] NOT NULL DEFAULT '{}',
  investment_preferences text[] NOT NULL DEFAULT '{}',
  geo_focus text[] NOT NULL DEFAULT '{}',
  -- Optional fields
  thesis text,
  portfolio_companies text[] DEFAULT '{}',
  decision_timeline text,
  required_documents text,
  website_override text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6) Create Government profiles table
CREATE TABLE IF NOT EXISTS public.government_profiles (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Required fields
  institution_name text NOT NULL,
  department_or_unit text NOT NULL,
  institution_type text NOT NULL CHECK (institution_type IN ('ministry', 'agency', 'parastatal', 'local_authority', 'regulator', 'other')),
  mandate_areas text[] NOT NULL DEFAULT '{}',
  services_or_programmes text NOT NULL,
  collaboration_interests text[] NOT NULL DEFAULT '{}',
  contact_person_title text NOT NULL,
  -- Optional fields
  procurement_portal_url text,
  current_initiatives text,
  eligibility_criteria text,
  documents_urls text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 7) Enable RLS on all role tables
ALTER TABLE public.sme_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.government_profiles ENABLE ROW LEVEL SECURITY;

-- 8) RLS Policies for SME profiles
CREATE POLICY "Users can view all sme profiles" ON public.sme_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own sme profile" ON public.sme_profiles
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own sme profile" ON public.sme_profiles
  FOR UPDATE USING (auth.uid() = profile_id);

-- 9) RLS Policies for Freelancer profiles
CREATE POLICY "Users can view all freelancer profiles" ON public.freelancer_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own freelancer profile" ON public.freelancer_profiles
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own freelancer profile" ON public.freelancer_profiles
  FOR UPDATE USING (auth.uid() = profile_id);

-- 10) RLS Policies for Investor profiles
CREATE POLICY "Users can view all investor profiles" ON public.investor_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own investor profile" ON public.investor_profiles
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own investor profile" ON public.investor_profiles
  FOR UPDATE USING (auth.uid() = profile_id);

-- 11) RLS Policies for Government profiles
CREATE POLICY "Users can view all government profiles" ON public.government_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own government profile" ON public.government_profiles
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own government profile" ON public.government_profiles
  FOR UPDATE USING (auth.uid() = profile_id);

-- 12) Update profiles RLS to allow public viewing of basic info
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Anyone can view completed profiles" ON public.profiles
  FOR SELECT USING (is_profile_complete = true OR auth.uid() = id);

-- 13) Create updated_at triggers for role tables
CREATE OR REPLACE FUNCTION public.update_role_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_sme_profiles_updated_at
  BEFORE UPDATE ON public.sme_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_role_updated_at();

CREATE TRIGGER update_freelancer_profiles_updated_at
  BEFORE UPDATE ON public.freelancer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_role_updated_at();

CREATE TRIGGER update_investor_profiles_updated_at
  BEFORE UPDATE ON public.investor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_role_updated_at();

CREATE TRIGGER update_government_profiles_updated_at
  BEFORE UPDATE ON public.government_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_role_updated_at();

-- 14) Create GIN indexes for array fields
CREATE INDEX IF NOT EXISTS idx_sme_top_needs ON public.sme_profiles USING GIN (top_needs);
CREATE INDEX IF NOT EXISTS idx_sme_sectors ON public.sme_profiles USING GIN (sectors_of_interest);
CREATE INDEX IF NOT EXISTS idx_freelancer_skills ON public.freelancer_profiles USING GIN (primary_skills);
CREATE INDEX IF NOT EXISTS idx_freelancer_industries ON public.freelancer_profiles USING GIN (preferred_industries);
CREATE INDEX IF NOT EXISTS idx_investor_sectors ON public.investor_profiles USING GIN (sectors_of_interest);
CREATE INDEX IF NOT EXISTS idx_investor_stage ON public.investor_profiles USING GIN (investment_stage_focus);
CREATE INDEX IF NOT EXISTS idx_government_mandate ON public.government_profiles USING GIN (mandate_areas);
CREATE INDEX IF NOT EXISTS idx_government_collab ON public.government_profiles USING GIN (collaboration_interests);

-- 15) Create indexes on profiles for common queries
CREATE INDEX IF NOT EXISTS idx_profiles_city ON public.profiles (city);
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON public.profiles (account_type);
CREATE INDEX IF NOT EXISTS idx_profiles_complete ON public.profiles (is_profile_complete);

-- 16) Create public profiles view (hides sensitive data)
CREATE OR REPLACE VIEW public.v_public_profiles AS
SELECT 
  p.id,
  p.account_type,
  p.full_name,
  p.display_name,
  p.country,
  p.city,
  p.bio,
  p.avatar_url as profile_photo_url,
  p.website_url as website,
  p.linkedin_url as linkedin,
  p.is_profile_complete,
  p.created_at,
  -- SME fields
  s.business_name,
  s.industry,
  s.business_stage,
  s.services_or_products as sme_services,
  s.top_needs,
  s.areas_served,
  s.team_size_range,
  s.funding_needed,
  s.sectors_of_interest as sme_sectors,
  -- Freelancer fields
  f.professional_title,
  f.primary_skills,
  f.services_offered as freelancer_services,
  f.experience_level,
  f.availability,
  f.work_mode,
  f.rate_type,
  f.rate_range,
  f.certifications,
  f.languages,
  f.preferred_industries,
  -- Investor fields
  i.investor_type,
  i.ticket_size_range,
  i.investment_stage_focus,
  i.sectors_of_interest as investor_sectors,
  i.investment_preferences,
  i.geo_focus,
  i.thesis,
  -- Government fields
  g.institution_name,
  g.department_or_unit,
  g.institution_type,
  g.mandate_areas,
  g.services_or_programmes,
  g.collaboration_interests,
  g.contact_person_title
FROM public.profiles p
LEFT JOIN public.sme_profiles s ON s.profile_id = p.id
LEFT JOIN public.freelancer_profiles f ON f.profile_id = p.id
LEFT JOIN public.investor_profiles i ON i.profile_id = p.id
LEFT JOIN public.government_profiles g ON g.profile_id = p.id
WHERE p.is_profile_complete = true;

-- 17) Create matching features view for AI/embeddings
CREATE OR REPLACE VIEW public.v_profile_match_features AS
SELECT 
  p.id,
  p.account_type,
  p.city,
  p.country,
  -- Combined tags based on account type
  CASE 
    WHEN p.account_type = 'sme' THEN COALESCE(s.top_needs, '{}')
    WHEN p.account_type = 'freelancer' THEN COALESCE(f.primary_skills, '{}')
    WHEN p.account_type = 'investor' THEN COALESCE(i.sectors_of_interest, '{}')
    WHEN p.account_type = 'government' THEN COALESCE(g.mandate_areas, '{}')
    ELSE '{}'
  END AS primary_tags,
  -- Secondary tags
  CASE 
    WHEN p.account_type = 'sme' THEN COALESCE(s.sectors_of_interest, '{}')
    WHEN p.account_type = 'freelancer' THEN COALESCE(f.preferred_industries, '{}')
    WHEN p.account_type = 'investor' THEN COALESCE(i.investment_stage_focus, '{}')
    WHEN p.account_type = 'government' THEN COALESCE(g.collaboration_interests, '{}')
    ELSE '{}'
  END AS secondary_tags,
  -- Match text for embeddings
  CONCAT_WS(' ',
    p.full_name,
    p.bio,
    p.city,
    p.country,
    CASE 
      WHEN p.account_type = 'sme' THEN CONCAT_WS(' ', s.business_name, s.industry, s.services_or_products, array_to_string(s.top_needs, ' '))
      WHEN p.account_type = 'freelancer' THEN CONCAT_WS(' ', f.professional_title, f.services_offered, array_to_string(f.primary_skills, ' '))
      WHEN p.account_type = 'investor' THEN CONCAT_WS(' ', i.investor_type, i.thesis, array_to_string(i.sectors_of_interest, ' '))
      WHEN p.account_type = 'government' THEN CONCAT_WS(' ', g.institution_name, g.services_or_programmes, array_to_string(g.mandate_areas, ' '))
      ELSE ''
    END
  ) AS match_text
FROM public.profiles p
LEFT JOIN public.sme_profiles s ON s.profile_id = p.id
LEFT JOIN public.freelancer_profiles f ON f.profile_id = p.id
LEFT JOIN public.investor_profiles i ON i.profile_id = p.id
LEFT JOIN public.government_profiles g ON g.profile_id = p.id
WHERE p.is_profile_complete = true;