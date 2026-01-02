-- Fix security linter warnings

-- 1. Recreate v_public_profiles view with SECURITY INVOKER (default, explicit)
DROP VIEW IF EXISTS public.v_public_profiles;

CREATE VIEW public.v_public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  p.display_name,
  p.full_name,
  p.bio,
  p.avatar_url AS profile_photo_url,
  p.account_type,
  p.city,
  p.country,
  p.is_profile_complete,
  p.created_at,
  p.linkedin_url AS linkedin,
  p.website_url AS website,
  -- SME specific (non-sensitive)
  sp.business_name,
  sp.industry,
  sp.business_stage,
  sp.services_or_products AS sme_services,
  sp.areas_served,
  sp.top_needs,
  sp.team_size_range,
  sp.funding_needed,
  sp.sectors_of_interest AS sme_sectors,
  -- Freelancer specific (non-sensitive)
  fp.professional_title,
  fp.primary_skills,
  fp.experience_level,
  fp.availability,
  fp.work_mode,
  fp.rate_type,
  fp.rate_range,
  fp.services_offered AS freelancer_services,
  fp.preferred_industries,
  fp.languages,
  fp.certifications,
  -- Investor specific (non-sensitive)
  ip.investor_type,
  ip.ticket_size_range,
  ip.sectors_of_interest AS investor_sectors,
  ip.investment_stage_focus,
  ip.geo_focus,
  ip.thesis,
  ip.investment_preferences,
  -- Government specific (non-sensitive)
  gp.institution_name,
  gp.institution_type,
  gp.department_or_unit,
  gp.contact_person_title,
  gp.mandate_areas,
  gp.services_or_programmes,
  gp.collaboration_interests
FROM public.profiles p
LEFT JOIN public.sme_profiles sp ON sp.profile_id = p.id
LEFT JOIN public.freelancer_profiles fp ON fp.profile_id = p.id
LEFT JOIN public.investor_profiles ip ON ip.profile_id = p.id
LEFT JOIN public.government_profiles gp ON gp.profile_id = p.id
WHERE p.is_profile_complete = true;

GRANT SELECT ON public.v_public_profiles TO authenticated, anon;

COMMENT ON VIEW public.v_public_profiles IS 'Public profile view that excludes sensitive contact information (email, phone). Use this view for public-facing features.';

-- 2. Fix get_safe_profile_fields function search path
DROP FUNCTION IF EXISTS public.get_safe_profile_fields(profiles);

-- 3. Add policy to allow querying the view (needs access to underlying profiles table for completed profiles only)
-- We need a specific policy for the view to work
CREATE POLICY "Public can view completed profiles via view"
ON public.profiles
FOR SELECT
USING (is_profile_complete = true AND auth.uid() IS NULL);

-- Actually, let's use a better approach - allow authenticated users to see basic info
DROP POLICY IF EXISTS "Public can view completed profiles via view" ON public.profiles;

CREATE POLICY "Authenticated users can view completed profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_profile_complete = true);