-- 1. Relax NOT NULL on fields the onboarding form treats as optional
ALTER TABLE public.freelancer_profiles
  ALTER COLUMN experience_level DROP NOT NULL,
  ALTER COLUMN availability DROP NOT NULL,
  ALTER COLUMN work_mode DROP NOT NULL,
  ALTER COLUMN rate_type DROP NOT NULL,
  ALTER COLUMN rate_range DROP NOT NULL;

ALTER TABLE public.sme_profiles
  ALTER COLUMN business_stage DROP NOT NULL;

ALTER TABLE public.investor_profiles
  ALTER COLUMN investor_type DROP NOT NULL,
  ALTER COLUMN ticket_size_range DROP NOT NULL;

ALTER TABLE public.government_profiles
  ALTER COLUMN institution_type DROP NOT NULL,
  ALTER COLUMN contact_person_title DROP NOT NULL;

-- 2. Align v_public_profiles with v_directory_profiles so every directory-visible profile resolves
DROP VIEW IF EXISTS public.v_public_profiles;

CREATE VIEW public.v_public_profiles
WITH (security_invoker = true) AS
SELECT p.id,
    p.display_name,
    p.full_name,
    p.bio,
    p.avatar_url AS profile_photo_url,
    p.account_type,
    p.role_type,
    p.city,
    p.country,
    p.is_profile_complete,
    p.profile_completed,
    p.onboarding_step,
    p.created_at,
    p.linkedin_url AS linkedin,
    p.website_url AS website,
    sp.business_name,
    sp.industry,
    sp.business_stage,
    sp.services_or_products AS sme_services,
    sp.areas_served,
    sp.top_needs,
    sp.team_size_range,
    sp.funding_needed,
    sp.sectors_of_interest AS sme_sectors,
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
    ip.investor_type,
    ip.ticket_size_range,
    ip.sectors_of_interest AS investor_sectors,
    ip.investment_stage_focus,
    ip.geo_focus,
    ip.thesis,
    ip.investment_preferences,
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
WHERE p.account_type IS NOT NULL;

GRANT SELECT ON public.v_public_profiles TO anon;
GRANT SELECT ON public.v_public_profiles TO authenticated;
GRANT SELECT ON public.v_public_profiles TO service_role;