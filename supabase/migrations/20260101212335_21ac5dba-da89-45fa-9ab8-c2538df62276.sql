-- Part 1: Audit logs table for admin actions
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  before jsonb,
  after jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- System can insert audit logs (via service role)
CREATE POLICY "System can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- Part 2: Ensure user_roles has proper constraints
-- Add unique constraint if not exists and ensure proper structure
DO $$
BEGIN
  -- Add created_by column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.user_roles ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;
  
  -- Add notes column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.user_roles ADD COLUMN notes text;
  END IF;
  
  -- Add updated_at column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.user_roles ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Part 3: Create admin check function that's more flexible
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = check_user_id
      AND role IN ('admin', 'moderator')
  )
$$;

-- Part 4: Admin-only RLS policies for user_roles
-- Drop existing policies if any and recreate
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Users can view own role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Part 5: Create function to safely complete profile (transaction-safe)
CREATE OR REPLACE FUNCTION public.complete_profile(
  p_user_id uuid,
  p_base_data jsonb,
  p_role_data jsonb,
  p_account_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Step 3: Only NOW set profile as complete
  UPDATE public.profiles
  SET 
    is_profile_complete = true,
    updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'Profile completed successfully');
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Part 6: Create function to assign admin role (only super_admin or bootstrap)
CREATE OR REPLACE FUNCTION public.assign_admin_role(
  p_target_user_id uuid,
  p_role app_role,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_is_admin boolean;
BEGIN
  v_actor_id := auth.uid();
  
  -- Check if actor is admin
  SELECT public.has_role(v_actor_id, 'admin') INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;
  
  -- Insert or update role
  INSERT INTO public.user_roles (user_id, role, created_by, notes, created_at, updated_at)
  VALUES (p_target_user_id, p_role, v_actor_id, p_notes, now(), now())
  ON CONFLICT (user_id, role) DO UPDATE SET
    notes = COALESCE(EXCLUDED.notes, user_roles.notes),
    updated_at = now();
  
  -- Log the action
  INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, after, metadata)
  VALUES (
    v_actor_id,
    'assign_role',
    'user_roles',
    p_target_user_id::text,
    jsonb_build_object('role', p_role::text, 'notes', p_notes),
    jsonb_build_object('target_user_id', p_target_user_id)
  );
  
  RETURN jsonb_build_object('success', true, 'message', 'Role assigned successfully');
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Part 7: Create function to revoke admin role
CREATE OR REPLACE FUNCTION public.revoke_admin_role(
  p_target_user_id uuid,
  p_role app_role
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_is_admin boolean;
  v_old_role record;
BEGIN
  v_actor_id := auth.uid();
  
  -- Check if actor is admin
  SELECT public.has_role(v_actor_id, 'admin') INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;
  
  -- Prevent self-demotion from admin
  IF v_actor_id = p_target_user_id AND p_role = 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot revoke your own admin role');
  END IF;
  
  -- Get old role for audit
  SELECT * INTO v_old_role FROM public.user_roles 
  WHERE user_id = p_target_user_id AND role = p_role;
  
  -- Delete the role
  DELETE FROM public.user_roles 
  WHERE user_id = p_target_user_id AND role = p_role;
  
  -- Log the action
  INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, before, metadata)
  VALUES (
    v_actor_id,
    'revoke_role',
    'user_roles',
    p_target_user_id::text,
    jsonb_build_object('role', p_role::text),
    jsonb_build_object('target_user_id', p_target_user_id)
  );
  
  RETURN jsonb_build_object('success', true, 'message', 'Role revoked successfully');
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;