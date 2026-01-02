-- Fix SECURITY DEFINER view issue by using SECURITY INVOKER
DROP VIEW IF EXISTS public.v_public_profiles_safe;

CREATE VIEW public.v_public_profiles_safe 
WITH (security_invoker = true) AS
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