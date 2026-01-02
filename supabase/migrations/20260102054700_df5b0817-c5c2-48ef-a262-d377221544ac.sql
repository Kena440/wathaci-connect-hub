-- Fix profiles table RLS to protect sensitive personal data

-- Drop the overly permissive policy that exposes all profile data
DROP POLICY IF EXISTS "Authenticated users can view completed profiles" ON public.profiles;

-- Users can still view their own profile (keep this policy if it exists, recreate to be sure)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Admins can view all profiles for administration purposes
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create a secure view for public profile discovery (non-sensitive fields only)
-- This replaces direct access to profiles table for discovery/search purposes
CREATE OR REPLACE VIEW public.v_public_profiles_safe AS
SELECT 
  id,
  display_name,
  full_name,
  account_type,
  city,
  country,
  bio,
  avatar_url,
  business_name,
  industry_sector,
  specialization,
  skills,
  services_offered,
  rating,
  reviews_count,
  total_jobs_completed,
  website_url,
  linkedin_url,
  portfolio_url,
  availability_status,
  is_profile_complete,
  created_at
FROM public.profiles
WHERE is_profile_complete = true;

-- Grant access to the safe view for authenticated users
GRANT SELECT ON public.v_public_profiles_safe TO authenticated;

-- Add comment explaining the security design
COMMENT ON VIEW public.v_public_profiles_safe IS 'Safe public view of profiles excluding sensitive PII (email, phone, address, payment info, financial data). Use this for profile discovery and search.';