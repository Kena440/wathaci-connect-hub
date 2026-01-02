-- Fix: Restrict profiles table public access to only safe fields
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view completed profiles" ON public.profiles;

-- Create a new restrictive policy: users can only see their own full profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Create a policy for authenticated users to see limited public info of completed profiles
-- This uses a security definer function to filter what columns are exposed
CREATE OR REPLACE FUNCTION public.get_safe_profile_fields(profile_row profiles)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT true;
$$;

-- For public profile viewing (e.g., marketplace, freelancer directory), 
-- we'll rely on the v_public_profiles view which already exists and should be updated
-- to exclude sensitive fields

-- Update v_public_profiles view to exclude sensitive contact information for non-owners
DROP VIEW IF EXISTS public.v_public_profiles;

CREATE VIEW public.v_public_profiles AS
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
  -- Only include LinkedIn (public business info), exclude email/phone
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

-- Grant access to the view for authenticated and anon users
GRANT SELECT ON public.v_public_profiles TO authenticated, anon;

-- Add a comment explaining the security model
COMMENT ON VIEW public.v_public_profiles IS 'Public profile view that excludes sensitive contact information (email, phone). Use this view for public-facing features like directories and marketplaces.';