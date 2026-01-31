-- Add onboarding state fields (idempotent)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_step integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS role_type text,
  ADD COLUMN IF NOT EXISTS role_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Ensure profile_completed is non-null and has a default (column already exists in this schema)
ALTER TABLE public.profiles
  ALTER COLUMN profile_completed SET DEFAULT false;

UPDATE public.profiles
SET profile_completed = COALESCE(profile_completed, false)
WHERE profile_completed IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN profile_completed SET NOT NULL;

-- RPC: update onboarding progress and return explicit response
CREATE OR REPLACE FUNCTION public.save_onboarding_progress(
  p_onboarding_step integer,
  p_account_type text DEFAULT NULL,
  p_role_type text DEFAULT NULL,
  p_role_metadata jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_step integer;
  v_profile public.profiles;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  v_step := LEAST(GREATEST(COALESCE(p_onboarding_step, 1), 1), 4);

  -- Upsert profile row (idempotent) and store onboarding state
  INSERT INTO public.profiles (
    id,
    account_type,
    role_type,
    role_metadata,
    onboarding_step,
    profile_completed,
    updated_at
  ) VALUES (
    v_user_id,
    p_account_type,
    p_role_type,
    COALESCE(p_role_metadata, '{}'::jsonb),
    v_step,
    false,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    account_type = COALESCE(EXCLUDED.account_type, profiles.account_type),
    role_type = COALESCE(EXCLUDED.role_type, profiles.role_type),
    role_metadata = CASE
      WHEN p_role_metadata IS NULL THEN profiles.role_metadata
      ELSE COALESCE(p_role_metadata, '{}'::jsonb)
    END,
    onboarding_step = GREATEST(profiles.onboarding_step, v_step),
    updated_at = now();

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'nextStep', LEAST(v_profile.onboarding_step + 1, 4),
    'profileCompleted', (v_profile.is_profile_complete = true) OR (v_profile.profile_completed = true),
    'onboarding_step', v_profile.onboarding_step
  );
END;
$$;

-- Extend complete_profile to also set onboarding flags + capture role metadata (idempotent)
CREATE OR REPLACE FUNCTION public.complete_profile(p_user_id uuid, p_base_data jsonb, p_role_data jsonb, p_account_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  -- Verify the user is completing their own profile
  IF auth.uid() != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Step 1: Update base profile WITHOUT setting complete
  UPDATE public.profiles
  SET
    account_type = p_account_type,
    role_type = COALESCE(role_type, p_account_type),
    role_metadata = COALESCE(p_role_data, role_metadata, '{}'::jsonb),
    full_name = COALESCE(p_base_data->>'full_name', full_name),
    display_name = COALESCE(p_base_data->>'display_name', display_name),
    phone = COALESCE(p_base_data->>'phone', phone),
    country = COALESCE(p_base_data->>'country', country),
    city = COALESCE(p_base_data->>'city', city),
    bio = COALESCE(p_base_data->>'bio', bio),
    website_url = COALESCE(p_base_data->>'website_url', website_url),
    linkedin_url = COALESCE(p_base_data->>'linkedin_url', linkedin_url),
    avatar_url = COALESCE(p_base_data->>'avatar_url', avatar_url),
    updated_at = now()
  WHERE id = p_user_id;

  -- Step 2: Upsert role-specific data
  IF p_account_type = 'sme' THEN
    INSERT INTO public.sme_profiles (
      profile_id, business_name, industry, business_stage, services_or_products,
      top_needs, areas_served, registration_status, team_size_range,
      funding_needed, funding_range, preferred_support, sectors_of_interest
    )
    VALUES (
      p_user_id,
      p_role_data->>'business_name',
      p_role_data->>'industry',
      p_role_data->>'business_stage',
      p_role_data->>'services_or_products',
      COALESCE((p_role_data->'top_needs')::text[], '{}'),
      COALESCE((p_role_data->'areas_served')::text[], '{}'),
      p_role_data->>'registration_status',
      p_role_data->>'team_size_range',
      COALESCE((p_role_data->>'funding_needed')::boolean, false),
      p_role_data->>'funding_range',
      COALESCE((p_role_data->'preferred_support')::text[], '{}'),
      COALESCE((p_role_data->'sectors_of_interest')::text[], '{}')
    )
    ON CONFLICT (profile_id) DO UPDATE SET
      business_name = EXCLUDED.business_name,
      industry = EXCLUDED.industry,
      business_stage = EXCLUDED.business_stage,
      services_or_products = EXCLUDED.services_or_products,
      top_needs = EXCLUDED.top_needs,
      areas_served = EXCLUDED.areas_served,
      registration_status = EXCLUDED.registration_status,
      team_size_range = EXCLUDED.team_size_range,
      funding_needed = EXCLUDED.funding_needed,
      funding_range = EXCLUDED.funding_range,
      preferred_support = EXCLUDED.preferred_support,
      sectors_of_interest = EXCLUDED.sectors_of_interest,
      updated_at = now();

  ELSIF p_account_type = 'freelancer' THEN
    INSERT INTO public.freelancer_profiles (
      profile_id, professional_title, primary_skills, services_offered,
      experience_level, availability, work_mode, rate_type, rate_range,
      portfolio_url, certifications, languages, preferred_industries
    )
    VALUES (
      p_user_id,
      p_role_data->>'professional_title',
      COALESCE((p_role_data->'primary_skills')::text[], '{}'),
      p_role_data->>'services_offered',
      p_role_data->>'experience_level',
      p_role_data->>'availability',
      p_role_data->>'work_mode',
      p_role_data->>'rate_type',
      p_role_data->>'rate_range',
      p_role_data->>'portfolio_url',
      COALESCE((p_role_data->'certifications')::text[], '{}'),
      COALESCE((p_role_data->'languages')::text[], '{}'),
      COALESCE((p_role_data->'preferred_industries')::text[], '{}')
    )
    ON CONFLICT (profile_id) DO UPDATE SET
      professional_title = EXCLUDED.professional_title,
      primary_skills = EXCLUDED.primary_skills,
      services_offered = EXCLUDED.services_offered,
      experience_level = EXCLUDED.experience_level,
      availability = EXCLUDED.availability,
      work_mode = EXCLUDED.work_mode,
      rate_type = EXCLUDED.rate_type,
      rate_range = EXCLUDED.rate_range,
      portfolio_url = EXCLUDED.portfolio_url,
      certifications = EXCLUDED.certifications,
      languages = EXCLUDED.languages,
      preferred_industries = EXCLUDED.preferred_industries,
      updated_at = now();

  ELSIF p_account_type = 'investor' THEN
    INSERT INTO public.investor_profiles (
      profile_id, investor_type, ticket_size_range, investment_stage_focus,
      sectors_of_interest, investment_preferences, geo_focus, thesis, decision_timeline
    )
    VALUES (
      p_user_id,
      p_role_data->>'investor_type',
      p_role_data->>'ticket_size_range',
      COALESCE((p_role_data->'investment_stage_focus')::text[], '{}'),
      COALESCE((p_role_data->'sectors_of_interest')::text[], '{}'),
      COALESCE((p_role_data->'investment_preferences')::text[], '{}'),
      COALESCE((p_role_data->'geo_focus')::text[], '{}'),
      p_role_data->>'thesis',
      p_role_data->>'decision_timeline'
    )
    ON CONFLICT (profile_id) DO UPDATE SET
      investor_type = EXCLUDED.investor_type,
      ticket_size_range = EXCLUDED.ticket_size_range,
      investment_stage_focus = EXCLUDED.investment_stage_focus,
      sectors_of_interest = EXCLUDED.sectors_of_interest,
      investment_preferences = EXCLUDED.investment_preferences,
      geo_focus = EXCLUDED.geo_focus,
      thesis = EXCLUDED.thesis,
      decision_timeline = EXCLUDED.decision_timeline,
      updated_at = now();

  ELSIF p_account_type = 'government' THEN
    INSERT INTO public.government_profiles (
      profile_id, institution_name, department_or_unit, institution_type,
      mandate_areas, services_or_programmes, collaboration_interests,
      contact_person_title, current_initiatives, eligibility_criteria
    )
    VALUES (
      p_user_id,
      p_role_data->>'institution_name',
      p_role_data->>'department_or_unit',
      p_role_data->>'institution_type',
      COALESCE((p_role_data->'mandate_areas')::text[], '{}'),
      p_role_data->>'services_or_programmes',
      COALESCE((p_role_data->'collaboration_interests')::text[], '{}'),
      p_role_data->>'contact_person_title',
      p_role_data->>'current_initiatives',
      p_role_data->>'eligibility_criteria'
    )
    ON CONFLICT (profile_id) DO UPDATE SET
      institution_name = EXCLUDED.institution_name,
      department_or_unit = EXCLUDED.department_or_unit,
      institution_type = EXCLUDED.institution_type,
      mandate_areas = EXCLUDED.mandate_areas,
      services_or_programmes = EXCLUDED.services_or_programmes,
      collaboration_interests = EXCLUDED.collaboration_interests,
      contact_person_title = EXCLUDED.contact_person_title,
      current_initiatives = EXCLUDED.current_initiatives,
      eligibility_criteria = EXCLUDED.eligibility_criteria,
      updated_at = now();
  END IF;

  -- Step 3: Only NOW set profile as complete + mark onboarding complete
  UPDATE public.profiles
  SET 
    is_profile_complete = true,
    profile_completed = true,
    onboarding_step = 4,
    role_type = COALESCE(role_type, p_account_type),
    role_metadata = COALESCE(p_role_data, role_metadata, '{}'::jsonb),
    updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'Profile completed successfully');

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;
