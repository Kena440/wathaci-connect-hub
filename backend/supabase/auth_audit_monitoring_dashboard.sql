-- ============================================================================
-- SUPABASE AUTH MONITORING DASHBOARD
-- ============================================================================
-- Production-ready monitoring queries for auth, profiles, and signup health
-- Use these queries in your monitoring dashboard, alerting system, or cron jobs
--
-- Author: Senior Supabase/Postgres/Auth + Backend Engineer
-- Date: 2025-11-24
-- ============================================================================

-- ============================================================================
-- SECTION 1: REAL-TIME HEALTH METRICS
-- ============================================================================

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- METRIC 1: Comprehensive Signup Health (Last 24 Hours)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Use for: Main dashboard overview
-- Refresh: Every 5 minutes

SELECT * FROM public.get_signup_statistics(24);

-- Returns:
-- • period_hours: Time period analyzed
-- • total_auth_users: Users created in auth.users
-- • total_profiles: Profiles created
-- • users_without_profiles: ⚠️  Should be 0
-- • signup_completed_events: Logged events
-- • profile_creation_errors: ⚠️  Should be 0
-- • healthy_signups: Users with both auth + profile + event

-- Expected values for healthy system:
-- ✅ users_without_profiles = 0
-- ✅ profile_creation_errors = 0
-- ✅ healthy_signups = total_auth_users


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- METRIC 2: Current System Health Score
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Use for: Traffic light indicator (Green/Yellow/Red)
-- Refresh: Every 1 minute

WITH stats AS (
  SELECT
    (SELECT COUNT(*) FROM auth.users) AS total_users,
    (SELECT COUNT(*) FROM public.profiles) AS total_profiles,
    (SELECT COUNT(*) FROM auth.users u 
     LEFT JOIN public.profiles p ON p.id = u.id 
     WHERE p.id IS NULL) AS users_without_profiles,
    (SELECT COUNT(*) FROM public.user_events 
     WHERE event_type IN ('profile_creation_error', 'profile_creation_failed')
       AND created_at > NOW() - INTERVAL '1 hour') AS recent_errors,
    (SELECT COUNT(*) FROM auth.users
     WHERE created_at > NOW() - INTERVAL '1 hour') AS signups_last_hour
)
SELECT
  total_users,
  total_profiles,
  users_without_profiles,
  recent_errors,
  signups_last_hour,
  ROUND(100.0 * total_profiles / NULLIF(total_users, 0), 2) AS profile_coverage_pct,
  CASE
    WHEN users_without_profiles = 0 AND recent_errors = 0 THEN '🟢 HEALTHY'
    WHEN users_without_profiles <= 2 AND recent_errors = 0 THEN '🟡 DEGRADED'
    WHEN users_without_profiles > 2 OR recent_errors > 0 THEN '🔴 CRITICAL'
    ELSE '⚪ UNKNOWN'
  END AS health_status,
  CASE
    WHEN users_without_profiles = 0 AND recent_errors = 0 THEN 100
    WHEN users_without_profiles <= 2 AND recent_errors = 0 THEN 75
    WHEN users_without_profiles > 2 OR recent_errors > 0 THEN 25
    ELSE 0
  END AS health_score
FROM stats;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- METRIC 3: Signup Funnel Metrics (Last 24 Hours)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Use for: Conversion tracking
-- Refresh: Every 15 minutes

WITH time_period AS (
  SELECT NOW() - INTERVAL '24 hours' AS since
),
metrics AS (
  SELECT
    (SELECT COUNT(*) FROM public.user_events ue, time_period
     WHERE ue.event_type = 'signup_initiated'
       AND ue.created_at > time_period.since) AS initiated,
       
    (SELECT COUNT(*) FROM auth.users u, time_period
     WHERE u.created_at > time_period.since) AS auth_created,
     
    (SELECT COUNT(*) FROM public.profiles p, time_period
     WHERE p.created_at > time_period.since) AS profiles_created,
     
    (SELECT COUNT(*) FROM public.user_events ue, time_period
     WHERE ue.event_type = 'signup_completed'
       AND ue.created_at > time_period.since) AS completed,
       
    (SELECT COUNT(*) FROM auth.users u, time_period
     WHERE u.confirmed_at IS NOT NULL
       AND u.confirmed_at > time_period.since) AS email_confirmed,
       
    (SELECT COUNT(*) FROM auth.audit_log_entries a, time_period
     WHERE a.payload->>'actor_username' LIKE '%[blocked]%'
       AND a.created_at > time_period.since) AS blocked
)
SELECT
  initiated,
  auth_created,
  profiles_created,
  completed,
  email_confirmed,
  blocked,
  ROUND(100.0 * auth_created / NULLIF(initiated, 0), 2) AS auth_conversion_pct,
  ROUND(100.0 * profiles_created / NULLIF(auth_created, 0), 2) AS profile_conversion_pct,
  ROUND(100.0 * email_confirmed / NULLIF(auth_created, 0), 2) AS confirmation_rate_pct
FROM metrics;


-- ============================================================================
-- SECTION 2: CRITICAL ALERTS (Run Every 5 Minutes)
-- ============================================================================

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ALERT 1: Users Without Profiles (CRITICAL)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Alert if: Returns any rows
-- Severity: CRITICAL - Broken signup flow

SELECT
  'CRITICAL: Users without profiles detected' AS alert_type,
  u.id AS user_id,
  u.email,
  u.created_at,
  EXTRACT(EPOCH FROM (NOW() - u.created_at)) / 60 AS minutes_ago,
  (SELECT ue.event_type 
   FROM public.user_events ue 
   WHERE ue.user_id = u.id 
   ORDER BY ue.created_at DESC 
   LIMIT 1) AS last_event_type
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
  AND u.created_at > NOW() - INTERVAL '10 minutes'
  AND u.created_at < NOW() - INTERVAL '2 minutes'  -- Grace period
ORDER BY u.created_at DESC;

-- Action: Investigate immediately, run backfill_missing_profiles()


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ALERT 2: Profile Creation Errors (CRITICAL)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Alert if: count > 0
-- Severity: CRITICAL - Trigger may be broken

SELECT
  'CRITICAL: Profile creation errors detected' AS alert_type,
  COUNT(*) AS error_count,
  array_agg(DISTINCT ue.metadata->>'error') AS error_messages,
  MIN(ue.created_at) AS first_error,
  MAX(ue.created_at) AS last_error
FROM public.user_events ue
WHERE ue.event_type IN ('profile_creation_error', 'profile_creation_failed')
  AND ue.created_at > NOW() - INTERVAL '5 minutes';

-- Action: Check handle_new_user trigger, RLS policies, constraints


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ALERT 3: Missing Signup Events (WARNING)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Alert if: missing_count > 5
-- Severity: WARNING - Event logging may be broken

SELECT
  'WARNING: Missing signup_completed events' AS alert_type,
  COUNT(*) AS missing_count,
  array_agg(u.email) FILTER (WHERE u.email IS NOT NULL) AS affected_emails
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.user_events e 
  ON e.user_id = u.id 
  AND e.event_type = 'signup_completed'
WHERE e.id IS NULL
  AND u.created_at > NOW() - INTERVAL '15 minutes'
  AND u.created_at < NOW() - INTERVAL '2 minutes';

-- Action: Check log_user_event function, trigger permissions


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ALERT 4: Excessive Blocked Attempts (WARNING)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Alert if: Returns rows with attempts > 10
-- Severity: WARNING - Possible abuse/attack

SELECT
  'WARNING: Excessive blocked signup attempts' AS alert_type,
  regexp_replace(payload->>'actor_username', ' \\[blocked\\]$', '') AS email,
  COUNT(*) AS blocked_attempts,
  MIN(created_at) AS first_attempt,
  MAX(created_at) AS last_attempt,
  array_agg(DISTINCT payload->>'action') AS actions,
  array_agg(DISTINCT payload->>'ip_address') FILTER (WHERE payload->>'ip_address' IS NOT NULL) AS ip_addresses
FROM auth.audit_log_entries
WHERE payload->>'actor_username' LIKE '%[blocked]%'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY email
HAVING COUNT(*) > 10
ORDER BY blocked_attempts DESC;

-- Action: Review for abuse patterns, consider IP blocking


-- ============================================================================
-- SECTION 3: HISTORICAL ANALYSIS
-- ============================================================================

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CHART 1: Signups Over Time (Last 7 Days)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  date_trunc('hour', u.created_at) AS hour,
  COUNT(*) AS signups,
  COUNT(p.id) AS profiles_created,
  COUNT(*) - COUNT(p.id) AS missing_profiles,
  ROUND(100.0 * COUNT(p.id) / COUNT(*), 2) AS success_rate_pct
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.created_at > NOW() - INTERVAL '7 days'
GROUP BY hour
ORDER BY hour;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CHART 2: Event Types Distribution (Last 7 Days)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  event_type,
  COUNT(*) AS event_count,
  COUNT(DISTINCT user_id) AS unique_users,
  MIN(created_at) AS first_occurrence,
  MAX(created_at) AS last_occurrence
FROM public.user_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY event_type
ORDER BY event_count DESC;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CHART 3: Blocked Attempts Over Time (Last 7 Days)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  date_trunc('hour', created_at) AS hour,
  COUNT(*) AS blocked_count,
  COUNT(DISTINCT regexp_replace(payload->>'actor_username', ' \\[blocked\\]$', '')) AS unique_emails
FROM auth.audit_log_entries
WHERE payload->>'actor_username' LIKE '%[blocked]%'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY hour
ORDER BY hour;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE 1: Recent Users with Status (Last 100)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  u.id,
  u.email,
  u.created_at AS user_created,
  u.confirmed_at AS email_confirmed,
  p.id IS NOT NULL AS has_profile,
  p.account_type,
  (SELECT ue.event_type 
   FROM public.user_events ue 
   WHERE ue.user_id = u.id 
     AND ue.event_type = 'signup_completed'
   LIMIT 1) IS NOT NULL AS has_signup_event,
  CASE
    WHEN p.id IS NOT NULL AND EXISTS(
      SELECT 1 FROM public.user_events ue 
      WHERE ue.user_id = u.id 
        AND ue.event_type = 'signup_completed'
    ) THEN '✅ Healthy'
    WHEN p.id IS NULL THEN '⚠️  No profile'
    WHEN NOT EXISTS(
      SELECT 1 FROM public.user_events ue 
      WHERE ue.user_id = u.id 
        AND ue.event_type = 'signup_completed'
    ) THEN '⚠️  Missing event'
    ELSE '❓ Unknown'
  END AS status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY u.created_at DESC
LIMIT 100;


-- ============================================================================
-- SECTION 4: DETAILED INVESTIGATIONS
-- ============================================================================

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- INVESTIGATION 1: Profile Creation Timeline for Specific User
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Replace 'USER_ID_HERE' with actual UUID

WITH user_id AS (
  SELECT 'USER_ID_HERE'::uuid AS id
)
SELECT
  'auth.users' AS source,
  u.created_at AS timestamp,
  'User created' AS event,
  jsonb_build_object(
    'email', u.email,
    'confirmed_at', u.confirmed_at,
    'metadata', u.raw_user_meta_data
  ) AS details
FROM auth.users u, user_id
WHERE u.id = user_id.id

UNION ALL

SELECT
  'public.profiles' AS source,
  p.created_at AS timestamp,
  'Profile created' AS event,
  jsonb_build_object(
    'email', p.email,
    'account_type', p.account_type
  ) AS details
FROM public.profiles p, user_id
WHERE p.id = user_id.id

UNION ALL

SELECT
  'public.user_events' AS source,
  ue.created_at AS timestamp,
  ue.event_type AS event,
  ue.metadata AS details
FROM public.user_events ue, user_id
WHERE ue.user_id = user_id.id

ORDER BY timestamp;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- INVESTIGATION 2: Audit Trail for Email Address
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Replace 'EMAIL_HERE' with actual email

WITH email_search AS (
  SELECT 'EMAIL_HERE' AS search_email
)
SELECT
  a.id AS audit_id,
  a.created_at,
  a.payload->>'action' AS action,
  a.payload->>'actor_username' AS actor_username,
  a.payload->>'log_type' AS log_type,
  a.payload->>'ip_address' AS ip_address,
  CASE
    WHEN a.payload->>'actor_username' LIKE '%[blocked]%' THEN '🚫 Blocked'
    ELSE '✅ Allowed'
  END AS status
FROM auth.audit_log_entries a, email_search
WHERE a.payload->>'actor_username' ILIKE '%' || email_search.search_email || '%'
ORDER BY a.created_at DESC
LIMIT 50;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- INVESTIGATION 3: Failed Profile Creations (Last 7 Days)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  ue.user_id,
  ue.email,
  ue.created_at,
  ue.metadata->>'error' AS error_message,
  ue.metadata->>'sqlstate' AS sql_state,
  u.id IS NOT NULL AS user_exists,
  p.id IS NOT NULL AS profile_exists_now
FROM public.user_events ue
LEFT JOIN auth.users u ON u.id = ue.user_id
LEFT JOIN public.profiles p ON p.id = ue.user_id
WHERE ue.event_type IN ('profile_creation_error', 'profile_creation_failed')
  AND ue.created_at > NOW() - INTERVAL '7 days'
ORDER BY ue.created_at DESC;


-- ============================================================================
-- SECTION 5: CORRELATION ANALYSIS
-- ============================================================================

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ANALYSIS 1: Audit Log → Auth Users → Profiles Correlation
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WITH audit AS (
  SELECT
    id AS audit_id,
    payload->>'action' AS action,
    payload->>'actor_id' AS actor_id,
    regexp_replace(
      payload->>'actor_username',
      ' \\[blocked\\]$',
      ''
    ) AS email,
    payload->>'actor_username' LIKE '%[blocked]%' AS is_blocked,
    created_at
  FROM auth.audit_log_entries
  WHERE payload->>'action' IN (
    'user_signedup',
    'user_repeated_signup',
    'user_confirmation_requested'
  )
    AND created_at > NOW() - INTERVAL '24 hours'
)
SELECT
  a.action,
  a.is_blocked,
  COUNT(*) AS total_events,
  COUNT(u.id) AS matched_users,
  COUNT(p.id) AS matched_profiles,
  ROUND(100.0 * COUNT(u.id) / COUNT(*), 2) AS user_match_pct,
  ROUND(100.0 * COUNT(p.id) / NULLIF(COUNT(u.id), 0), 2) AS profile_match_pct
FROM audit a
LEFT JOIN auth.users u 
  ON u.id::text = a.actor_id 
  OR u.email = a.email
LEFT JOIN public.profiles p 
  ON p.id = u.id
GROUP BY a.action, a.is_blocked
ORDER BY a.action, a.is_blocked;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ANALYSIS 2: Event Logging Coverage
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WITH user_stats AS (
  SELECT
    u.id,
    u.created_at,
    p.id IS NOT NULL AS has_profile,
    EXISTS(
      SELECT 1 FROM public.user_events ue 
      WHERE ue.user_id = u.id 
        AND ue.event_type = 'auth_user_created'
    ) AS has_auth_event,
    EXISTS(
      SELECT 1 FROM public.user_events ue 
      WHERE ue.user_id = u.id 
        AND ue.event_type = 'profile_created'
    ) AS has_profile_event,
    EXISTS(
      SELECT 1 FROM public.user_events ue 
      WHERE ue.user_id = u.id 
        AND ue.event_type = 'signup_completed'
    ) AS has_signup_event
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.created_at > NOW() - INTERVAL '24 hours'
)
SELECT
  COUNT(*) AS total_users,
  COUNT(*) FILTER (WHERE has_profile) AS users_with_profile,
  COUNT(*) FILTER (WHERE has_auth_event) AS users_with_auth_event,
  COUNT(*) FILTER (WHERE has_profile_event) AS users_with_profile_event,
  COUNT(*) FILTER (WHERE has_signup_event) AS users_with_signup_event,
  COUNT(*) FILTER (WHERE has_profile AND has_auth_event AND has_profile_event AND has_signup_event) AS fully_tracked,
  ROUND(100.0 * COUNT(*) FILTER (WHERE has_profile AND has_auth_event AND has_profile_event AND has_signup_event) / COUNT(*), 2) AS tracking_coverage_pct
FROM user_stats;


-- ============================================================================
-- SECTION 6: MAINTENANCE QUERIES
-- ============================================================================

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MAINTENANCE 1: Verify Trigger is Active
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing,
  action_orientation
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users'
  AND trigger_name = 'on_auth_user_created';

-- Expected: 1 row with AFTER INSERT trigger


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MAINTENANCE 2: Verify RLS Policies
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'user_events')
ORDER BY tablename, policyname;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MAINTENANCE 3: Check Table Sizes
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname IN ('auth', 'public')
  AND tablename IN ('users', 'audit_log_entries', 'profiles', 'user_events')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MAINTENANCE 4: Cleanup Old Audit Logs (Optional - Run Manually)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- WARNING: Only run if audit_log_entries is getting too large
-- Consider keeping at least 90 days of data

-- First check how much data would be deleted
SELECT
  date_trunc('month', created_at) AS month,
  COUNT(*) AS entry_count,
  pg_size_pretty(SUM(octet_length(payload::text))) AS estimated_size
FROM auth.audit_log_entries
WHERE created_at < NOW() - INTERVAL '90 days'
GROUP BY month
ORDER BY month;

-- To actually delete (UNCOMMENT to run):
-- DELETE FROM auth.audit_log_entries
-- WHERE created_at < NOW() - INTERVAL '90 days';


-- ============================================================================
-- SECTION 7: CUSTOM ALERT TEMPLATES
-- ============================================================================

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Create a function to get alert summary (can be called from application)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION public.get_alert_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_users_without_profiles integer;
  v_profile_errors integer;
  v_missing_events integer;
  v_blocked_abuse integer;
BEGIN
  -- Count users without profiles
  SELECT COUNT(*) INTO v_users_without_profiles
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE p.id IS NULL
    AND u.created_at > NOW() - INTERVAL '10 minutes'
    AND u.created_at < NOW() - INTERVAL '2 minutes';

  -- Count profile creation errors
  SELECT COUNT(*) INTO v_profile_errors
  FROM public.user_events
  WHERE event_type IN ('profile_creation_error', 'profile_creation_failed')
    AND created_at > NOW() - INTERVAL '5 minutes';

  -- Count missing events
  SELECT COUNT(*) INTO v_missing_events
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.user_events e 
    ON e.user_id = u.id 
    AND e.event_type = 'signup_completed'
  WHERE e.id IS NULL
    AND u.created_at > NOW() - INTERVAL '15 minutes'
    AND u.created_at < NOW() - INTERVAL '2 minutes';

  -- Count abusive blocked attempts
  SELECT COUNT(*) INTO v_blocked_abuse
  FROM (
    SELECT regexp_replace(payload->>'actor_username', ' \\[blocked\\]$', '') AS email
    FROM auth.audit_log_entries
    WHERE payload->>'actor_username' LIKE '%[blocked]%'
      AND created_at > NOW() - INTERVAL '1 hour'
    GROUP BY email
    HAVING COUNT(*) > 10
  ) AS abusive;

  v_result := jsonb_build_object(
    'timestamp', NOW(),
    'alerts', jsonb_build_object(
      'users_without_profiles', jsonb_build_object(
        'count', v_users_without_profiles,
        'severity', CASE WHEN v_users_without_profiles > 0 THEN 'critical' ELSE 'ok' END
      ),
      'profile_creation_errors', jsonb_build_object(
        'count', v_profile_errors,
        'severity', CASE WHEN v_profile_errors > 0 THEN 'critical' ELSE 'ok' END
      ),
      'missing_signup_events', jsonb_build_object(
        'count', v_missing_events,
        'severity', CASE WHEN v_missing_events > 5 THEN 'warning' ELSE 'ok' END
      ),
      'blocked_abuse_patterns', jsonb_build_object(
        'count', v_blocked_abuse,
        'severity', CASE WHEN v_blocked_abuse > 0 THEN 'warning' ELSE 'ok' END
      )
    ),
    'overall_status', CASE
      WHEN v_users_without_profiles > 0 OR v_profile_errors > 0 THEN 'critical'
      WHEN v_missing_events > 5 OR v_blocked_abuse > 0 THEN 'warning'
      ELSE 'healthy'
    END
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_alert_summary() IS 
  'Returns a JSON summary of all active alerts for monitoring dashboard';

-- Usage:
-- SELECT public.get_alert_summary();


-- ============================================================================
-- END OF MONITORING DASHBOARD
-- ============================================================================

/*
RECOMMENDED MONITORING SCHEDULE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Every 1 minute:
  - METRIC 2: Current System Health Score

Every 5 minutes:
  - ALERT 1: Users Without Profiles
  - ALERT 2: Profile Creation Errors
  - ALERT 3: Missing Signup Events
  - ALERT 4: Excessive Blocked Attempts

Every 15 minutes:
  - METRIC 1: Comprehensive Signup Health
  - METRIC 3: Signup Funnel Metrics

Every hour:
  - CHART 1: Signups Over Time
  - CHART 2: Event Types Distribution
  - CHART 3: Blocked Attempts Over Time

Daily:
  - ANALYSIS 1: Audit Log Correlation
  - ANALYSIS 2: Event Logging Coverage
  - Review TABLE 1: Recent Users with Status

Weekly:
  - MAINTENANCE 1-3: Verify system configuration
  - Review INVESTIGATION 3: Failed Profile Creations
*/
