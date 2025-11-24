-- ============================================================================
-- Comprehensive Signup Audit Correlation and Profile Creation Fix
-- ============================================================================
-- This migration addresses the inability to correlate signup audit events
-- with auth.users and public.profiles due to missing user_id/email in
-- auth.audit_log_entries payload->'traits' fields.
--
-- Solution:
-- 1. Enhance user_events table to be the source of truth for user lifecycle
-- 2. Ensure profile creation is bulletproof via enhanced triggers
-- 3. Create monitoring views for mismatch detection
-- 4. Provide backfill utilities for historical data
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Enhance user_events table for comprehensive event tracking
-- ============================================================================

-- Ensure user_events table has optimal structure for tracking signup events
-- The table already exists from 20251124110000_signup_profile_reliability.sql
-- We'll enhance it with additional indexes and constraints

-- Add email column if not exists (for redundant tracking)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_events'
      AND column_name = 'email'
  ) THEN
    ALTER TABLE public.user_events ADD COLUMN email text;
  END IF;
END $$;

-- Add metadata column if not exists (already defined in previous migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_events'
      AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.user_events ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Rename 'kind' to 'event_type' for consistency (if it's still 'kind')
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_events'
      AND column_name = 'kind'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_events'
      AND column_name = 'event_type'
  ) THEN
    ALTER TABLE public.user_events RENAME COLUMN kind TO event_type;
  END IF;
END $$;

-- If neither kind nor event_type exists, add event_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_events'
      AND column_name IN ('kind', 'event_type')
  ) THEN
    ALTER TABLE public.user_events ADD COLUMN event_type text NOT NULL;
  END IF;
END $$;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS user_events_user_id_idx ON public.user_events(user_id);
CREATE INDEX IF NOT EXISTS user_events_event_type_idx ON public.user_events(event_type);
CREATE INDEX IF NOT EXISTS user_events_email_idx ON public.user_events(email);
CREATE INDEX IF NOT EXISTS user_events_created_at_idx ON public.user_events(created_at DESC);
CREATE INDEX IF NOT EXISTS user_events_user_event_idx ON public.user_events(user_id, event_type, created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE public.user_events IS 'Application-controlled event log for user lifecycle tracking. Use this instead of auth.audit_log_entries for reliable user_id/email correlation.';
COMMENT ON COLUMN public.user_events.user_id IS 'UUID of the auth.users record';
COMMENT ON COLUMN public.user_events.email IS 'User email at time of event (redundant for easier querying)';
COMMENT ON COLUMN public.user_events.event_type IS 'Event type: signup_initiated, signup_completed, profile_created, email_verified, etc.';
COMMENT ON COLUMN public.user_events.metadata IS 'Additional event data (signup source, IP, device, etc.)';

-- ============================================================================
-- STEP 2: Enhanced logging functions with explicit user_id and email
-- ============================================================================

-- Enhanced log_user_event function with email parameter
CREATE OR REPLACE FUNCTION public.log_user_event(
  p_user_id uuid,
  p_event_type text,
  p_email text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  -- Try to get email from various sources if not provided
  IF p_email IS NULL THEN
    SELECT u.email INTO v_email FROM auth.users u WHERE u.id = p_user_id;
  ELSE
    v_email := p_email;
  END IF;

  INSERT INTO public.user_events (user_id, event_type, email, metadata, created_at)
  VALUES (
    p_user_id, 
    p_event_type, 
    v_email,
    COALESCE(p_metadata, '{}'::jsonb),
    timezone('utc', now())
  );
EXCEPTION WHEN OTHERS THEN
  -- Swallow errors so logging never blocks the main flow
  NULL;
END;
$$;

COMMENT ON FUNCTION public.log_user_event(uuid, text, text, jsonb) IS 
  'Logs user lifecycle events with explicit user_id and email. Used by triggers and application code.';

-- ============================================================================
-- STEP 3: Enhanced handle_new_user trigger with comprehensive logging
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_full_name text;
  v_first_name text;
  v_last_name text;
  v_account_type text;
  v_msisdn text;
  v_company_name text;
  v_profile_exists boolean;
  v_error_message text;
BEGIN
  -- Extract email from NEW record (required)
  v_email := COALESCE(
    NULLIF(NEW.email, ''),
    NULLIF(NEW.raw_user_meta_data->>'email', ''),
    'missing-email-' || NEW.id::text || '@invalid.local'
  );

  -- Extract name fields
  v_first_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'first_name', ''), '');
  v_last_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'last_name', ''), '');
  v_full_name := TRIM(v_first_name || ' ' || v_last_name);
  IF v_full_name = '' THEN
    v_full_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), NULL);
  END IF;

  -- Extract other metadata
  v_account_type := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'account_type', ''),
    'sole_proprietor'
  );
  
  v_msisdn := COALESCE(
    NULLIF(NEW.phone, ''),
    NULLIF(NEW.raw_user_meta_data->>'msisdn', ''),
    NULLIF(NEW.raw_user_meta_data->>'phone', '')
  );
  
  v_company_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'company_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'business_name', '')
  );

  -- Log auth user creation event with email
  PERFORM public.log_user_event(
    NEW.id, 
    'auth_user_created',
    v_email,
    jsonb_build_object(
      'email', v_email,
      'has_phone', v_msisdn IS NOT NULL,
      'confirmation_sent_at', NEW.confirmation_sent_at,
      'account_type', v_account_type
    )
  );

  -- Check if profile already exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = NEW.id) INTO v_profile_exists;

  IF v_profile_exists THEN
    -- Profile already exists, log and skip
    PERFORM public.log_user_event(
      NEW.id,
      'profile_already_exists',
      v_email,
      jsonb_build_object('source', 'trigger')
    );
    RETURN NEW;
  END IF;

  -- Attempt to create profile
  BEGIN
    INSERT INTO public.profiles (
      id,
      email,
      first_name,
      last_name,
      full_name,
      account_type,
      phone,
      business_name,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      v_email,
      NULLIF(v_first_name, ''),
      NULLIF(v_last_name, ''),
      NULLIF(v_full_name, ''),
      v_account_type,
      NULLIF(v_msisdn, ''),
      NULLIF(v_company_name, ''),
      timezone('utc', now()),
      timezone('utc', now())
    );

    -- Log successful profile creation with email
    PERFORM public.log_user_event(
      NEW.id,
      'profile_created',
      v_email,
      jsonb_build_object(
        'source', 'trigger',
        'account_type', v_account_type,
        'has_name', v_full_name IS NOT NULL,
        'has_phone', v_msisdn IS NOT NULL,
        'has_company', v_company_name IS NOT NULL
      )
    );

    -- Log signup completion (auth + profile)
    PERFORM public.log_user_event(
      NEW.id,
      'signup_completed',
      v_email,
      jsonb_build_object(
        'source', 'trigger',
        'account_type', v_account_type
      )
    );

  EXCEPTION WHEN OTHERS THEN
    v_error_message := SQLERRM;
    
    -- Log profile creation error with details
    PERFORM public.log_user_event(
      NEW.id,
      'profile_creation_error',
      v_email,
      jsonb_build_object(
        'error', v_error_message,
        'sqlstate', SQLSTATE,
        'source', 'trigger'
      )
    );

    -- Also log to profile_errors if that table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profile_errors') THEN
      BEGIN
        INSERT INTO public.profile_errors (user_id, error_message, error_detail, error_context)
        VALUES (
          NEW.id,
          'Profile creation failed in handle_new_user trigger',
          v_error_message || ' (SQLSTATE: ' || SQLSTATE || ')',
          'handle_new_user trigger'
        );
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END;

  RETURN NEW;
END;
$$;

-- Ensure trigger is attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 
  'Trigger function that creates a profile for new auth.users and logs all events with explicit user_id and email.';

-- ============================================================================
-- STEP 4: Monitoring views for signup/profile correlation
-- ============================================================================

-- View: Recent signups with correlation status
CREATE OR REPLACE VIEW public.v_signup_correlation_status AS
SELECT
  u.id AS user_id,
  u.email AS auth_email,
  u.created_at AS auth_created_at,
  u.confirmation_sent_at,
  u.confirmed_at,
  p.id AS profile_id,
  p.email AS profile_email,
  p.created_at AS profile_created_at,
  p.account_type AS profile_account_type,
  -- Check for signup events in user_events
  (SELECT COUNT(*) FROM public.user_events ue 
   WHERE ue.user_id = u.id AND ue.event_type = 'signup_completed') AS signup_events_count,
  (SELECT COUNT(*) FROM public.user_events ue 
   WHERE ue.user_id = u.id AND ue.event_type = 'profile_created') AS profile_created_events_count,
  (SELECT COUNT(*) FROM public.user_events ue 
   WHERE ue.user_id = u.id AND ue.event_type = 'profile_creation_error') AS profile_error_events_count,
  -- Status classification
  CASE
    WHEN p.id IS NOT NULL AND EXISTS(
      SELECT 1 FROM public.user_events ue 
      WHERE ue.user_id = u.id AND ue.event_type = 'signup_completed'
    ) THEN 'healthy'
    WHEN p.id IS NOT NULL AND NOT EXISTS(
      SELECT 1 FROM public.user_events ue 
      WHERE ue.user_id = u.id AND ue.event_type = 'signup_completed'
    ) THEN 'missing_event'
    WHEN p.id IS NULL AND EXISTS(
      SELECT 1 FROM public.user_events ue 
      WHERE ue.user_id = u.id AND ue.event_type = 'profile_creation_error'
    ) THEN 'profile_failed'
    WHEN p.id IS NULL THEN 'missing_profile'
    ELSE 'unknown'
  END AS correlation_status,
  -- Time difference between auth and profile creation
  EXTRACT(EPOCH FROM (p.created_at - u.created_at)) AS profile_delay_seconds
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY u.created_at DESC;

COMMENT ON VIEW public.v_signup_correlation_status IS 
  'Shows correlation status between auth.users, public.profiles, and user_events for signup tracking.';

-- View: Users without profiles (mismatch detection)
CREATE OR REPLACE VIEW public.v_users_without_profiles AS
SELECT
  u.id AS user_id,
  u.email,
  u.created_at AS user_created_at,
  u.confirmed_at,
  EXTRACT(EPOCH FROM (NOW() - u.created_at)) / 60 AS minutes_since_signup,
  (SELECT ue.event_type 
   FROM public.user_events ue 
   WHERE ue.user_id = u.id 
   ORDER BY ue.created_at DESC 
   LIMIT 1) AS last_event_type,
  (SELECT ue.created_at 
   FROM public.user_events ue 
   WHERE ue.user_id = u.id 
   ORDER BY ue.created_at DESC 
   LIMIT 1) AS last_event_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

COMMENT ON VIEW public.v_users_without_profiles IS 
  'Lists auth.users that do not have corresponding profile rows - indicates broken signup flow.';

-- View: Recent signup events from user_events
CREATE OR REPLACE VIEW public.v_recent_signup_events AS
SELECT
  ue.id AS event_id,
  ue.user_id,
  ue.email AS event_email,
  ue.event_type,
  ue.metadata,
  ue.created_at AS event_created_at,
  u.email AS auth_email,
  u.created_at AS auth_created_at,
  p.id AS profile_id,
  p.email AS profile_email
FROM public.user_events ue
LEFT JOIN auth.users u ON u.id = ue.user_id
LEFT JOIN public.profiles p ON p.id = ue.user_id
WHERE ue.event_type IN (
  'auth_user_created',
  'profile_created',
  'profile_creation_error',
  'signup_completed',
  'profile_already_exists'
)
ORDER BY ue.created_at DESC;

COMMENT ON VIEW public.v_recent_signup_events IS 
  'Shows recent signup-related events from user_events with correlation to auth.users and profiles.';

-- View: Audit log analysis (for comparison with user_events)
CREATE OR REPLACE VIEW public.v_audit_signup_analysis AS
SELECT
  a.id AS audit_id,
  a.created_at AS audit_created_at,
  a.payload->>'action' AS action,
  a.payload->'traits'->>'user_id' AS traits_user_id,
  a.payload->'traits'->>'user_email' AS traits_user_email,
  a.payload->'actor'->>'id' AS actor_id,
  a.payload->'target'->>'id' AS target_id,
  a.payload->>'ip_address' AS ip_address,
  u.id AS matched_auth_user_id,
  u.email AS matched_auth_email,
  p.id AS matched_profile_id,
  CASE
    WHEN a.payload->'traits'->>'user_id' IS NULL 
         AND a.payload->'traits'->>'user_email' IS NULL THEN 'no_traits'
    WHEN u.id IS NOT NULL AND p.id IS NOT NULL THEN 'correlated'
    WHEN u.id IS NOT NULL AND p.id IS NULL THEN 'auth_only'
    ELSE 'unmatched'
  END AS correlation_status
FROM auth.audit_log_entries a
LEFT JOIN auth.users u ON (a.payload->'traits'->>'user_id')::uuid = u.id
LEFT JOIN public.profiles p ON (a.payload->'traits'->>'user_id')::uuid = p.id
WHERE a.payload->>'action' IN (
  'user_signedup',
  'user_repeated_signup',
  'user_confirmation_requested'
)
ORDER BY a.created_at DESC;

COMMENT ON VIEW public.v_audit_signup_analysis IS 
  'Analyzes auth.audit_log_entries for signup events and their correlation status. Shows why audit entries cannot be relied upon for user tracking.';

-- Grant SELECT on views to authenticated users
GRANT SELECT ON public.v_signup_correlation_status TO authenticated;
GRANT SELECT ON public.v_users_without_profiles TO authenticated;
GRANT SELECT ON public.v_recent_signup_events TO authenticated;
GRANT SELECT ON public.v_audit_signup_analysis TO authenticated;

-- ============================================================================
-- STEP 5: Backfill function for missing profiles
-- ============================================================================

CREATE OR REPLACE FUNCTION public.backfill_missing_profiles()
RETURNS TABLE (
  user_id uuid,
  email text,
  backfill_status text,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_email text;
  v_account_type text;
  v_full_name text;
  v_phone text;
  v_company text;
BEGIN
  FOR v_user IN 
    SELECT u.id, u.email, u.phone, u.raw_user_meta_data, u.created_at
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE p.id IS NULL
    ORDER BY u.created_at
  LOOP
    -- Extract metadata
    v_email := COALESCE(NULLIF(v_user.email, ''), 'backfill-' || v_user.id::text || '@invalid.local');
    v_account_type := COALESCE(v_user.raw_user_meta_data->>'account_type', 'sole_proprietor');
    v_full_name := COALESCE(
      v_user.raw_user_meta_data->>'full_name',
      TRIM(COALESCE(v_user.raw_user_meta_data->>'first_name', '') || ' ' || 
           COALESCE(v_user.raw_user_meta_data->>'last_name', ''))
    );
    IF v_full_name = '' THEN v_full_name := NULL; END IF;
    v_phone := COALESCE(v_user.phone, v_user.raw_user_meta_data->>'phone');
    v_company := COALESCE(
      v_user.raw_user_meta_data->>'company_name',
      v_user.raw_user_meta_data->>'business_name'
    );

    BEGIN
      -- Insert profile
      INSERT INTO public.profiles (
        id, email, full_name, account_type, phone, business_name, 
        created_at, updated_at
      ) VALUES (
        v_user.id, v_email, NULLIF(v_full_name, ''), v_account_type,
        NULLIF(v_phone, ''), NULLIF(v_company, ''),
        v_user.created_at, timezone('utc', now())
      );

      -- Log backfill event
      PERFORM public.log_user_event(
        v_user.id,
        'profile_backfilled',
        v_email,
        jsonb_build_object(
          'source', 'backfill_function',
          'original_created_at', v_user.created_at
        )
      );

      user_id := v_user.id;
      email := v_email;
      backfill_status := 'success';
      error_message := NULL;
      RETURN NEXT;

    EXCEPTION WHEN OTHERS THEN
      -- Log error
      PERFORM public.log_user_event(
        v_user.id,
        'profile_backfill_error',
        v_email,
        jsonb_build_object(
          'error', SQLERRM,
          'sqlstate', SQLSTATE,
          'source', 'backfill_function'
        )
      );

      user_id := v_user.id;
      email := v_email;
      backfill_status := 'error';
      error_message := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;

  RETURN;
END;
$$;

COMMENT ON FUNCTION public.backfill_missing_profiles() IS 
  'Backfills profiles for auth.users records that are missing them. Returns status for each user.';

-- ============================================================================
-- STEP 6: Monitoring query helpers (as SQL functions for easy execution)
-- ============================================================================

-- Function: Check for recent signup issues (last N minutes)
CREATE OR REPLACE FUNCTION public.check_recent_signup_issues(
  p_minutes integer DEFAULT 10
)
RETURNS TABLE (
  user_id uuid,
  email text,
  minutes_since_signup numeric,
  issue_type text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id AS user_id,
    u.email,
    EXTRACT(EPOCH FROM (NOW() - u.created_at)) / 60 AS minutes_since_signup,
    CASE
      WHEN p.id IS NULL THEN 'missing_profile'
      WHEN NOT EXISTS(
        SELECT 1 FROM public.user_events ue 
        WHERE ue.user_id = u.id AND ue.event_type = 'signup_completed'
      ) THEN 'missing_signup_event'
      ELSE 'unknown'
    END AS issue_type
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.created_at > NOW() - (p_minutes || ' minutes')::interval
    AND (
      p.id IS NULL 
      OR NOT EXISTS(
        SELECT 1 FROM public.user_events ue 
        WHERE ue.user_id = u.id AND ue.event_type = 'signup_completed'
      )
    )
  ORDER BY u.created_at DESC;
$$;

COMMENT ON FUNCTION public.check_recent_signup_issues(integer) IS 
  'Checks for signup issues in the last N minutes. Use for monitoring and alerting.';

-- Function: Get signup statistics
CREATE OR REPLACE FUNCTION public.get_signup_statistics(
  p_hours integer DEFAULT 24
)
RETURNS TABLE (
  period_hours integer,
  total_auth_users bigint,
  total_profiles bigint,
  users_without_profiles bigint,
  signup_completed_events bigint,
  profile_creation_errors bigint,
  healthy_signups bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_hours AS period_hours,
    COUNT(DISTINCT u.id) AS total_auth_users,
    COUNT(DISTINCT p.id) AS total_profiles,
    COUNT(DISTINCT u.id) FILTER (WHERE p.id IS NULL) AS users_without_profiles,
    (SELECT COUNT(*) FROM public.user_events ue 
     WHERE ue.event_type = 'signup_completed' 
       AND ue.created_at > NOW() - (p_hours || ' hours')::interval) AS signup_completed_events,
    (SELECT COUNT(*) FROM public.user_events ue 
     WHERE ue.event_type = 'profile_creation_error' 
       AND ue.created_at > NOW() - (p_hours || ' hours')::interval) AS profile_creation_errors,
    COUNT(DISTINCT u.id) FILTER (
      WHERE p.id IS NOT NULL 
        AND EXISTS(
          SELECT 1 FROM public.user_events ue 
          WHERE ue.user_id = u.id AND ue.event_type = 'signup_completed'
        )
    ) AS healthy_signups
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.created_at > NOW() - (p_hours || ' hours')::interval;
$$;

COMMENT ON FUNCTION public.get_signup_statistics(integer) IS 
  'Returns signup statistics for the last N hours. Use for dashboard monitoring.';

-- ============================================================================
-- STEP 7: Execute backfill for existing users
-- ============================================================================

-- Run backfill to fix any existing mismatches
-- This is safe to run multiple times (uses INSERT with conflict handling)
DO $$
DECLARE
  v_backfill_result RECORD;
  v_success_count integer := 0;
  v_error_count integer := 0;
BEGIN
  FOR v_backfill_result IN SELECT * FROM public.backfill_missing_profiles()
  LOOP
    IF v_backfill_result.backfill_status = 'success' THEN
      v_success_count := v_success_count + 1;
    ELSE
      v_error_count := v_error_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfill completed: % profiles created, % errors', v_success_count, v_error_count;
END $$;

-- ============================================================================
-- STEP 8: Grant permissions
-- ============================================================================

-- Grant execute permissions on utility functions
GRANT EXECUTE ON FUNCTION public.log_user_event(uuid, text, text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.backfill_missing_profiles() TO service_role;
GRANT EXECUTE ON FUNCTION public.check_recent_signup_issues(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_signup_statistics(integer) TO authenticated, service_role;

-- Grant select on views for service role
GRANT SELECT ON public.v_signup_correlation_status TO service_role;
GRANT SELECT ON public.v_users_without_profiles TO service_role;
GRANT SELECT ON public.v_recent_signup_events TO service_role;
GRANT SELECT ON public.v_audit_signup_analysis TO service_role;

COMMIT;

-- ============================================================================
-- End of migration
-- ============================================================================
