-- Fix security definer views by recreating them with security_invoker = true

-- Drop and recreate v_public_profiles with security invoker
DROP VIEW IF EXISTS public.v_public_profiles;
CREATE VIEW public.v_public_profiles 
WITH (security_invoker = true)
AS
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

-- Drop and recreate v_profile_match_features with security invoker
DROP VIEW IF EXISTS public.v_profile_match_features;
CREATE VIEW public.v_profile_match_features 
WITH (security_invoker = true)
AS
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