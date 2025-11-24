-- Diagnostic script to analyze auth signup and profile consistency
-- This migration creates helper functions and views for monitoring
-- signup/profile mismatches and provides comprehensive diagnostics.

BEGIN;

-- 1. Create a view to extract signup events from audit logs
CREATE OR REPLACE VIEW public.signup_audit_summary AS
SELECT DISTINCT
  CASE 
    WHEN payload->'traits'->>'user_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN (payload->'traits'->>'user_id')::uuid
    ELSE NULL
  END AS user_id,
  payload->'traits'->>'user_email' AS email,
  payload->>'action' AS action,
  created_at
FROM auth.audit_log_entries
WHERE payload->>'action' IN (
  'user_signedup',
  'user_repeated_signup',
  'user_confirmation_requested'
)
AND payload->'traits'->>'user_id' IS NOT NULL
AND payload->'traits'->>'user_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 2. Create a view to identify users with missing profiles
CREATE OR REPLACE VIEW public.auth_profile_mismatch AS
SELECT
  a.user_id,
  a.email AS audit_email,
  a.action,
  a.created_at AS audit_created_at,
  u.id AS auth_user_id,
  u.email AS auth_email,
  u.created_at AS user_created_at,
  p.id AS profile_id,
  p.email AS profile_email,
  p.created_at AS profile_created_at,
  CASE
    WHEN u.id IS NOT NULL AND p.id IS NOT NULL THEN 'healthy'
    WHEN u.id IS NOT NULL AND p.id IS NULL THEN 'auth_only'
    WHEN u.id IS NULL AND a.user_id IS NOT NULL THEN 'audit_only'
    ELSE 'unknown'
  END AS status
FROM public.signup_audit_summary a
LEFT JOIN auth.users u ON a.user_id = u.id
LEFT JOIN public.profiles p ON a.user_id = p.id
ORDER BY a.created_at DESC;

-- 3. Create a summary function for quick diagnostics
CREATE OR REPLACE FUNCTION public.diagnose_auth_profile_consistency()
RETURNS TABLE (
  status text,
  count bigint,
  description text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'Total Signup Audit Entries'::text,
    COUNT(*)::bigint,
    'Total distinct user signups recorded in audit logs'::text
  FROM public.signup_audit_summary
  
  UNION ALL
  
  SELECT 
    'Healthy (Auth + Profile)'::text,
    COUNT(*)::bigint,
    'Users with both auth.users and public.profiles records'::text
  FROM public.auth_profile_mismatch
  WHERE status = 'healthy'
  
  UNION ALL
  
  SELECT 
    'Auth Only (Missing Profile)'::text,
    COUNT(*)::bigint,
    'Users in auth.users but missing from public.profiles'::text
  FROM public.auth_profile_mismatch
  WHERE status = 'auth_only'
  
  UNION ALL
  
  SELECT 
    'Audit Only (Deleted/Orphaned)'::text,
    COUNT(*)::bigint,
    'User IDs in audit logs but not in auth.users (likely deleted)'::text
  FROM public.auth_profile_mismatch
  WHERE status = 'audit_only'
  
  UNION ALL
  
  SELECT 
    'Total auth.users'::text,
    COUNT(*)::bigint,
    'Total users in auth.users table'::text
  FROM auth.users
  
  UNION ALL
  
  SELECT 
    'Total public.profiles'::text,
    COUNT(*)::bigint,
    'Total profiles in public.profiles table'::text
  FROM public.profiles
  
  UNION ALL
  
  SELECT 
    'Users without Profiles'::text,
    COUNT(*)::bigint,
    'auth.users entries missing corresponding profiles'::text
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
  WHERE p.id IS NULL;
END;
$$;

-- 4. Create a function to get detailed mismatch information
CREATE OR REPLACE FUNCTION public.get_auth_profile_mismatches(
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  user_id uuid,
  audit_email text,
  auth_email text,
  status text,
  audit_created_at timestamptz,
  user_created_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.user_id,
    m.audit_email,
    m.auth_email,
    m.status,
    m.audit_created_at,
    m.user_created_at
  FROM public.auth_profile_mismatch m
  WHERE m.status IN ('auth_only', 'audit_only')
  ORDER BY m.audit_created_at DESC
  LIMIT p_limit;
END;
$$;

-- 5. Create a function to check recent signup issues (last 10 minutes)
CREATE OR REPLACE FUNCTION public.check_recent_signup_issues()
RETURNS TABLE (
  user_id uuid,
  email text,
  action text,
  created_at timestamptz,
  has_auth_user boolean,
  has_profile boolean,
  minutes_since_signup numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.user_id,
    a.email,
    a.action,
    a.created_at,
    (u.id IS NOT NULL) AS has_auth_user,
    (p.id IS NOT NULL) AS has_profile,
    ROUND(EXTRACT(EPOCH FROM (NOW() - a.created_at)) / 60, 2) AS minutes_since_signup
  FROM public.signup_audit_summary a
  LEFT JOIN auth.users u ON a.user_id = u.id
  LEFT JOIN public.profiles p ON a.user_id = p.id
  WHERE a.created_at > NOW() - INTERVAL '10 minutes'
    AND (u.id IS NULL OR p.id IS NULL)
  ORDER BY a.created_at DESC;
END;
$$;

-- 6. Create a function to inspect user_events for specific users
CREATE OR REPLACE FUNCTION public.get_user_signup_events(p_user_id uuid)
RETURNS TABLE (
  event_id bigint,
  kind text,
  payload jsonb,
  created_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ue.id,
    ue.kind,
    ue.payload,
    ue.created_at
  FROM public.user_events ue
  WHERE ue.user_id = p_user_id
  ORDER BY ue.created_at;
END;
$$;

-- 7. Create a monitoring function for ongoing health checks
CREATE OR REPLACE FUNCTION public.monitor_signup_health()
RETURNS TABLE (
  check_time timestamptz,
  recent_signups_count bigint,
  signups_missing_profiles bigint,
  health_percentage numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recent_signups bigint;
  v_missing_profiles bigint;
BEGIN
  -- Count signups in last hour
  SELECT COUNT(*) INTO v_recent_signups
  FROM auth.users
  WHERE created_at > NOW() - INTERVAL '1 hour';
  
  -- Count users without profiles (created in last hour)
  SELECT COUNT(*) INTO v_missing_profiles
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
  WHERE u.created_at > NOW() - INTERVAL '1 hour'
    AND p.id IS NULL;
  
  RETURN QUERY
  SELECT 
    NOW() AS check_time,
    v_recent_signups AS recent_signups_count,
    v_missing_profiles AS signups_missing_profiles,
    CASE 
      WHEN v_recent_signups > 0 
      THEN ROUND(((v_recent_signups - v_missing_profiles)::numeric / v_recent_signups::numeric * 100), 2)
      ELSE 100.00
    END AS health_percentage;
END;
$$;

-- 8. Add comments for documentation
COMMENT ON VIEW public.signup_audit_summary IS 
  'View showing all signup events extracted from auth.audit_log_entries';

COMMENT ON VIEW public.auth_profile_mismatch IS 
  'View correlating audit logs, auth.users, and profiles to identify mismatches';

COMMENT ON FUNCTION public.diagnose_auth_profile_consistency() IS 
  'Returns summary statistics of auth/profile consistency across the system';

COMMENT ON FUNCTION public.get_auth_profile_mismatches(integer) IS 
  'Returns detailed list of users with auth/profile mismatches';

COMMENT ON FUNCTION public.check_recent_signup_issues() IS 
  'Checks for signup issues in the last 10 minutes (for monitoring/alerting)';

COMMENT ON FUNCTION public.get_user_signup_events(uuid) IS 
  'Returns all signup-related events from user_events table for a specific user';

COMMENT ON FUNCTION public.monitor_signup_health() IS 
  'Returns signup health metrics for the last hour (percentage of successful profile creations)';

-- 9. Create recommended indexes for performance (if tables exist and indexes don't)
-- Index for user_events table to optimize monitoring queries
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_events') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'user_events' AND indexname = 'idx_user_events_kind_created_at') THEN
      CREATE INDEX idx_user_events_kind_created_at ON public.user_events(kind, created_at DESC);
      RAISE NOTICE 'Created performance index: idx_user_events_kind_created_at';
    END IF;
  END IF;
END $$;

COMMIT;
