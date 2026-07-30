GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;

CREATE OR REPLACE FUNCTION public.jsonb_to_text_array(p jsonb)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p IS NULL OR jsonb_typeof(p) <> 'array' THEN '{}'::text[]
    ELSE ARRAY(SELECT jsonb_array_elements_text(p))
  END;
$$;

CREATE OR REPLACE FUNCTION public.complete_profile(p_user_id uuid, p_base_data jsonb, p_role_data jsonb, p_account_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

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
      public.jsonb_to_text_array(p_role_data->'top_needs'),
      public.jsonb_to_text_array(p_role_data->'areas_served'),
      p_role_data->>'registration_status',
      p_role_data->>'team_size_range',
      COALESCE((p_role_data->>'funding_needed')::boolean, false),
      p_role_data->>'funding_range',
      public.jsonb_to_text_array(p_role_data->'preferred_support'),
      public.jsonb_to_text_array(p_role_data->'sectors_of_interest')
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
      public.jsonb_to_text_array(p_role_data->'primary_skills'),
      p_role_data->>'services_offered',
      p_role_data->>'experience_level',
      p_role_data->>'availability',
      p_role_data->>'work_mode',
      p_role_data->>'rate_type',
      p_role_data->>'rate_range',
      p_role_data->>'portfolio_url',
      public.jsonb_to_text_array(p_role_data->'certifications'),
      public.jsonb_to_text_array(p_role_data->'languages'),
      public.jsonb_to_text_array(p_role_data->'preferred_industries')
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
      public.jsonb_to_text_array(p_role_data->'investment_stage_focus'),
      public.jsonb_to_text_array(p_role_data->'sectors_of_interest'),
      public.jsonb_to_text_array(p_role_data->'investment_preferences'),
      public.jsonb_to_text_array(p_role_data->'geo_focus'),
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
      public.jsonb_to_text_array(p_role_data->'mandate_areas'),
      p_role_data->>'services_or_programmes',
      public.jsonb_to_text_array(p_role_data->'collaboration_interests'),
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