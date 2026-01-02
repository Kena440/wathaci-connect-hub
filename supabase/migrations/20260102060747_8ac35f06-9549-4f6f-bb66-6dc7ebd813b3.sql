-- Tighten profiles table access: remove broad authenticated SELECT policy that exposed PII
DROP POLICY IF EXISTS "Authenticated users can view complete public profiles" ON public.profiles;

-- Recreate public profile views WITHOUT security_invoker so they can be queried safely
-- even when base table SELECT is restricted by RLS. Views expose only non-PII fields.

CREATE OR REPLACE VIEW public.v_public_profiles_safe
AS
SELECT 
  id,
  display_name,
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

CREATE OR REPLACE VIEW public.v_public_profiles
AS
SELECT 
  p.id,
  p.display_name,
  p.bio,
  p.avatar_url AS profile_photo_url,
  p.account_type,
  p.city,
  p.country,
  p.is_profile_complete,
  p.created_at,
  p.linkedin_url AS linkedin,
  p.website_url AS website,
  -- SME fields
  sp.business_name,
  sp.industry,
  sp.business_stage,
  sp.services_or_products AS sme_services,
  sp.areas_served,
  sp.top_needs,
  sp.team_size_range,
  sp.funding_needed,
  sp.sectors_of_interest AS sme_sectors,
  -- Freelancer fields
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
  -- Investor fields
  ip.investor_type,
  ip.ticket_size_range,
  ip.sectors_of_interest AS investor_sectors,
  ip.investment_stage_focus,
  ip.geo_focus,
  ip.thesis,
  ip.investment_preferences,
  -- Government fields
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

CREATE OR REPLACE VIEW public.v_profile_match_features
AS
SELECT 
  p.id,
  p.account_type,
  p.city,
  p.country,
  CASE
    WHEN p.account_type = 'sme' THEN COALESCE(s.top_needs, '{}'::text[])
    WHEN p.account_type = 'freelancer' THEN COALESCE(f.primary_skills, '{}'::text[])
    WHEN p.account_type = 'investor' THEN COALESCE(i.sectors_of_interest, '{}'::text[])
    WHEN p.account_type = 'government' THEN COALESCE(g.mandate_areas, '{}'::text[])
    ELSE '{}'::text[]
  END AS primary_tags,
  CASE
    WHEN p.account_type = 'sme' THEN COALESCE(s.sectors_of_interest, '{}'::text[])
    WHEN p.account_type = 'freelancer' THEN COALESCE(f.preferred_industries, '{}'::text[])
    WHEN p.account_type = 'investor' THEN COALESCE(i.investment_stage_focus, '{}'::text[])
    WHEN p.account_type = 'government' THEN COALESCE(g.collaboration_interests, '{}'::text[])
    ELSE '{}'::text[]
  END AS secondary_tags,
  concat_ws(' ', p.display_name, p.bio, p.city, p.country,
    CASE
      WHEN p.account_type = 'sme' THEN concat_ws(' ', s.business_name, s.industry, s.services_or_products, array_to_string(s.top_needs, ' '))
      WHEN p.account_type = 'freelancer' THEN concat_ws(' ', f.professional_title, f.services_offered, array_to_string(f.primary_skills, ' '))
      WHEN p.account_type = 'investor' THEN concat_ws(' ', i.investor_type, i.thesis, array_to_string(i.sectors_of_interest, ' '))
      WHEN p.account_type = 'government' THEN concat_ws(' ', g.institution_name, g.services_or_programmes, array_to_string(g.mandate_areas, ' '))
      ELSE ''
    END
  ) AS match_text
FROM public.profiles p
LEFT JOIN public.sme_profiles s ON s.profile_id = p.id
LEFT JOIN public.freelancer_profiles f ON f.profile_id = p.id
LEFT JOIN public.investor_profiles i ON i.profile_id = p.id
LEFT JOIN public.government_profiles g ON g.profile_id = p.id
WHERE p.is_profile_complete = true;

-- Lock down view access: authenticated only
REVOKE ALL ON public.v_public_profiles_safe FROM anon;
REVOKE ALL ON public.v_public_profiles FROM anon;
REVOKE ALL ON public.v_profile_match_features FROM anon;

GRANT SELECT ON public.v_public_profiles_safe TO authenticated;
GRANT SELECT ON public.v_public_profiles TO authenticated;
GRANT SELECT ON public.v_profile_match_features TO authenticated;