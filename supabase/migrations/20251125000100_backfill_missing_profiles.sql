-- Backfill missing profiles for existing users
-- This migration ensures all auth.users have corresponding profiles
-- and provides a safe backfill procedure.

BEGIN;

-- 1. Create a function to safely backfill a single user's profile
CREATE OR REPLACE FUNCTION public.backfill_user_profile(
  p_user_id uuid,
  p_email text DEFAULT NULL,
  p_account_type text DEFAULT 'SME'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email text;
  v_account_type text;
  v_result jsonb;
BEGIN
  -- Get user details from auth.users if not provided
  IF p_email IS NULL THEN
    SELECT u.email INTO v_email
    FROM auth.users u
    WHERE u.id = p_user_id;
    
    IF v_email IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'user_id', p_user_id,
        'error', 'User not found in auth.users'
      );
    END IF;
  ELSE
    v_email := p_email;
  END IF;
  
  -- Use provided account_type or default
  v_account_type := COALESCE(p_account_type, 'SME');
  
  -- Insert or update the profile
  INSERT INTO public.profiles (
    id,
    email,
    account_type,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    v_email,
    v_account_type,
    timezone('utc', now()),
    timezone('utc', now())
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(NULLIF(public.profiles.email, ''), EXCLUDED.email),
    account_type = COALESCE(public.profiles.account_type, EXCLUDED.account_type),
    updated_at = timezone('utc', now());
  
  -- Log the event (if function exists)
  BEGIN
    PERFORM public.log_user_event(
      p_user_id,
      'profile_backfilled',
      jsonb_build_object(
        'email', v_email,
        'account_type', v_account_type,
        'backfill_time', now()
      )
    );
  EXCEPTION
    WHEN undefined_function THEN
      -- log_user_event not available, continue without logging
      NULL;
  END;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'email', v_email,
    'account_type', v_account_type,
    'action', 'backfilled'
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Log the error (if function exists)
  BEGIN
    PERFORM public.log_user_event(
      p_user_id,
      'profile_backfill_error',
      jsonb_build_object(
        'error', SQLERRM,
        'sqlstate', SQLSTATE
      )
    );
  EXCEPTION WHEN undefined_function THEN
    NULL;
  END;
  
  RETURN jsonb_build_object(
    'success', false,
    'user_id', p_user_id,
    'error', SQLERRM,
    'sqlstate', SQLSTATE
  );
END;
$$;

-- 2. Create a function to backfill all missing profiles in batch
CREATE OR REPLACE FUNCTION public.backfill_all_missing_profiles(
  p_batch_size integer DEFAULT 100,
  p_dry_run boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user record;
  v_total_missing integer;
  v_processed integer := 0;
  v_successful integer := 0;
  v_failed integer := 0;
  v_results jsonb := '[]'::jsonb;
  v_result jsonb;
BEGIN
  -- Count total missing profiles
  SELECT COUNT(*) INTO v_total_missing
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
  WHERE p.id IS NULL;
  
  IF p_dry_run THEN
    RETURN jsonb_build_object(
      'dry_run', true,
      'total_missing', v_total_missing,
      'message', format('Would backfill %s profiles', v_total_missing)
    );
  END IF;
  
  -- Process each missing profile
  FOR v_user IN
    SELECT u.id, u.email, u.raw_user_meta_data->>'account_type' as account_type
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    WHERE p.id IS NULL
    LIMIT p_batch_size
  LOOP
    v_result := public.backfill_user_profile(
      v_user.id,
      v_user.email,
      COALESCE(v_user.account_type, 'SME')
    );
    
    v_processed := v_processed + 1;
    
    IF (v_result->>'success')::boolean THEN
      v_successful := v_successful + 1;
    ELSE
      v_failed := v_failed + 1;
    END IF;
    
    v_results := v_results || v_result;
  END LOOP;
  
  RETURN jsonb_build_object(
    'dry_run', false,
    'total_missing', v_total_missing,
    'processed', v_processed,
    'successful', v_successful,
    'failed', v_failed,
    'results', v_results
  );
END;
$$;

-- 3. Create a verification function to confirm backfill success
CREATE OR REPLACE FUNCTION public.verify_profile_completeness()
RETURNS TABLE (
  check_name text,
  status text,
  count bigint,
  details text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'Auth users without profiles'::text,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::text,
    COUNT(*)::bigint,
    format('%s users in auth.users are missing profiles', COUNT(*))::text
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
  WHERE p.id IS NULL
  
  UNION ALL
  
  SELECT 
    'Profiles without auth users'::text,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARNING' END::text,
    COUNT(*)::bigint,
    format('%s profiles exist without corresponding auth.users (orphaned)', COUNT(*))::text
  FROM public.profiles p
  LEFT JOIN auth.users u ON p.id = u.id
  WHERE u.id IS NULL
  
  UNION ALL
  
  SELECT 
    'Email consistency'::text,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARNING' END::text,
    COUNT(*)::bigint,
    format('%s users have mismatched emails between auth and profile', COUNT(*))::text
  FROM auth.users u
  INNER JOIN public.profiles p ON u.id = p.id
  WHERE u.email != p.email
    AND p.email IS NOT NULL
    AND u.email IS NOT NULL;
END;
$$;

-- 4. Add comments
COMMENT ON FUNCTION public.backfill_user_profile(uuid, text, text) IS 
  'Safely backfills a single user profile with error handling and logging';

COMMENT ON FUNCTION public.backfill_all_missing_profiles(integer, boolean) IS 
  'Backfills all missing profiles in batches. Use dry_run=true to preview without changes.';

COMMENT ON FUNCTION public.verify_profile_completeness() IS 
  'Verifies that all auth.users have corresponding profiles and checks for inconsistencies';

-- 5. Execute a dry run to see what would be backfilled (for logging purposes)
DO $$
DECLARE
  v_preview jsonb;
BEGIN
  SELECT public.backfill_all_missing_profiles(100, true) INTO v_preview;
  RAISE NOTICE 'Backfill Preview: %', v_preview;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not preview backfill: %', SQLERRM;
END;
$$;

COMMIT;
