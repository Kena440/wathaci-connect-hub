-- 1. Backfill account_type from role_type where missing
UPDATE public.profiles
SET account_type = role_type, updated_at = now()
WHERE account_type IS NULL AND role_type IS NOT NULL;

-- 2. Keep both fields in sync going forward
CREATE OR REPLACE FUNCTION public.save_onboarding_progress(p_onboarding_step integer, p_account_type text DEFAULT NULL::text, p_role_type text DEFAULT NULL::text, p_role_metadata jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_step integer;
  v_profile public.profiles;
  v_type text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  v_step := LEAST(GREATEST(COALESCE(p_onboarding_step, 1), 1), 4);
  v_type := COALESCE(p_account_type, p_role_type);

  INSERT INTO public.profiles (
    id, account_type, role_type, role_metadata, onboarding_step,
    profile_completed, is_profile_complete, updated_at
  ) VALUES (
    v_user_id, v_type, v_type,
    COALESCE(p_role_metadata, '{}'::jsonb),
    v_step, false, false, now()
  )
  ON CONFLICT (id) DO UPDATE SET
    account_type = COALESCE(EXCLUDED.account_type, profiles.account_type, profiles.role_type),
    role_type = COALESCE(EXCLUDED.role_type, profiles.role_type, profiles.account_type),
    role_metadata = CASE
      WHEN p_role_metadata IS NOT NULL THEN p_role_metadata
      ELSE profiles.role_metadata
    END,
    onboarding_step = GREATEST(profiles.onboarding_step, v_step),
    updated_at = now();

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'nextStep', LEAST(v_profile.onboarding_step + 1, 4),
    'profileCompleted', v_profile.is_profile_complete OR v_profile.profile_completed,
    'onboarding_step', v_profile.onboarding_step,
    'account_type', v_profile.account_type
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- 3. Both views: resolve account_type via fallback so directory and profile page agree
DROP VIEW IF EXISTS public.v_directory_profiles;
DROP VIEW IF EXISTS public.v_public_profiles;

CREATE VIEW public.v_directory_profiles WITH (security_invoker = on) AS
SELECT p.id, p.display_name, p.full_name, p.bio,
  p.avatar_url AS profile_photo_url,
  COALESCE(p.account_type, p.role_type) AS account_type,
  COALESCE(p.role_type, p.account_type) AS role_type,
  p.city, p.country, p.is_profile_complete, p.profile_completed, p.onboarding_step, p.created_at,
  p.linkedin_url AS linkedin, p.website_url AS website,
  sp.business_name, sp.industry, sp.business_stage,
  sp.services_or_products AS sme_services, sp.areas_served, sp.top_needs,
  sp.team_size_range, sp.funding_needed, sp.sectors_of_interest AS sme_sectors,
  fp.professional_title, fp.primary_skills, fp.experience_level, fp.availability,
  fp.work_mode, fp.rate_type, fp.rate_range,
  fp.services_offered AS freelancer_services, fp.preferred_industries, fp.languages, fp.certifications,
  ip.investor_type, ip.ticket_size_range, ip.sectors_of_interest AS investor_sectors,
  ip.investment_stage_focus, ip.geo_focus, ip.thesis, ip.investment_preferences,
  gp.institution_name, gp.institution_type, gp.department_or_unit, gp.contact_person_title,
  gp.mandate_areas, gp.services_or_programmes, gp.collaboration_interests
FROM public.profiles p
  LEFT JOIN public.sme_profiles sp ON sp.profile_id = p.id
  LEFT JOIN public.freelancer_profiles fp ON fp.profile_id = p.id
  LEFT JOIN public.investor_profiles ip ON ip.profile_id = p.id
  LEFT JOIN public.government_profiles gp ON gp.profile_id = p.id
WHERE COALESCE(p.account_type, p.role_type) IS NOT NULL;

CREATE VIEW public.v_public_profiles WITH (security_invoker = on) AS
SELECT * FROM public.v_directory_profiles;

GRANT SELECT ON public.v_directory_profiles TO anon, authenticated;
GRANT SELECT ON public.v_public_profiles TO anon, authenticated;