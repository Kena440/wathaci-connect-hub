-- ============================================================
-- TASK 1: Create v_directory_profiles view WITHOUT completion filter
-- This ensures ALL users with a role appear in directories
-- ============================================================

-- Drop the view if it exists (we'll create a fresh one)
DROP VIEW IF EXISTS public.v_directory_profiles;

-- Create new directory-focused view that shows ALL profiles with account_type
-- NO filtering by is_profile_complete - directories show everyone with a role
CREATE VIEW public.v_directory_profiles
WITH (security_invoker = on)
AS
SELECT 
  p.id,
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
FROM profiles p
LEFT JOIN sme_profiles sp ON sp.profile_id = p.id
LEFT JOIN freelancer_profiles fp ON fp.profile_id = p.id
LEFT JOIN investor_profiles ip ON ip.profile_id = p.id
LEFT JOIN government_profiles gp ON gp.profile_id = p.id
WHERE p.account_type IS NOT NULL;

-- Add comment explaining the view's purpose
COMMENT ON VIEW public.v_directory_profiles IS 
  'Directory view showing ALL profiles with an account_type. Does NOT filter by profile completion. UI handles incomplete profile display.';

-- ============================================================
-- TASK 2: Update save_onboarding_progress to save account_type IMMEDIATELY
-- ============================================================

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

  -- Clamp step to valid range
  v_step := LEAST(GREATEST(COALESCE(p_onboarding_step, 1), 1), 4);

  -- UPSERT profile row - ALWAYS save account_type when provided
  -- This ensures user appears in directory immediately on step 1
  INSERT INTO public.profiles (
    id,
    account_type,
    role_type,
    role_metadata,
    onboarding_step,
    profile_completed,
    is_profile_complete,
    updated_at
  ) VALUES (
    v_user_id,
    p_account_type,
    COALESCE(p_role_type, p_account_type), -- role_type defaults to account_type
    COALESCE(p_role_metadata, '{}'::jsonb),
    v_step,
    false,
    false,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    -- CRITICAL: Always update account_type if provided (even if currently NULL)
    account_type = COALESCE(EXCLUDED.account_type, profiles.account_type),
    role_type = COALESCE(EXCLUDED.role_type, EXCLUDED.account_type, profiles.role_type, profiles.account_type),
    role_metadata = CASE
      WHEN p_role_metadata IS NOT NULL THEN p_role_metadata
      ELSE profiles.role_metadata
    END,
    -- Only advance step, never go backward
    onboarding_step = GREATEST(profiles.onboarding_step, v_step),
    updated_at = now();

  -- Fetch updated profile
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
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.save_onboarding_progress TO authenticated;

-- ============================================================
-- TASK 3: Add RLS policy for the new view (security_invoker handles this)
-- The view inherits RLS from base tables, but we need SELECT for public directory
-- ============================================================

-- Profiles table needs a policy allowing SELECT for directory browsing
-- Check if policy exists, create if not
DO $$
BEGIN
  -- Create policy for public directory browsing (only shows account_type set profiles)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Allow directory browsing'
  ) THEN
    CREATE POLICY "Allow directory browsing"
    ON public.profiles FOR SELECT
    USING (
      -- Users can see profiles that have chosen an account type
      account_type IS NOT NULL
    );
  END IF;
END $$;