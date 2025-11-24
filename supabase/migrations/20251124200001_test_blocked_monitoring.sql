-- ============================================================================
-- Blocked Signup Monitoring - Test and Verification Queries
-- ============================================================================
-- This file contains SQL queries to test and verify the blocked signup
-- monitoring infrastructure is working correctly.
--
-- Run these queries after applying migration 20251124200000
-- ============================================================================

-- Test 1: Verify all views exist
SELECT 'Test 1: Checking views exist' AS test;
SELECT 
  table_name,
  CASE 
    WHEN table_name IN (
      'v_blocked_signups',
      'v_blocked_signups_by_email',
      'v_recent_blocked_signups',
      'v_potentially_legitimate_blocked_signups'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS status
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name LIKE 'v_%blocked%'
ORDER BY table_name;

-- Test 2: Verify all functions exist
SELECT 'Test 2: Checking functions exist' AS test;
SELECT 
  routine_name,
  '✅ EXISTS' AS status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'is_email_rate_limited',
    'get_blocked_attempts_for_email',
    'get_signup_health_metrics',
    'investigate_blocked_actor',
    'detect_blocking_anomalies'
  )
ORDER BY routine_name;

-- Test 3: Check for any blocked signups in audit log
SELECT 'Test 3: Sample blocked signups from audit log' AS test;
SELECT 
  COUNT(*) AS total_blocked_entries,
  COUNT(DISTINCT regexp_replace(payload->>'actor_username', ' \\[blocked\\]$', '')) AS unique_blocked_emails,
  MIN(created_at) AS oldest_blocked,
  MAX(created_at) AS newest_blocked
FROM auth.audit_log_entries
WHERE payload->>'actor_username' LIKE '%[blocked]%';

-- Test 4: Test v_blocked_signups view
SELECT 'Test 4: Testing v_blocked_signups view' AS test;
SELECT 
  email,
  action,
  blocked_at,
  ip_address
FROM public.v_blocked_signups
ORDER BY blocked_at DESC
LIMIT 5;

-- Test 5: Test v_blocked_signups_by_email view
SELECT 'Test 5: Testing v_blocked_signups_by_email view' AS test;
SELECT 
  email,
  total_blocked_attempts,
  has_auth_user,
  has_profile,
  unique_ip_count
FROM public.v_blocked_signups_by_email
ORDER BY total_blocked_attempts DESC
LIMIT 5;

-- Test 6: Test is_email_rate_limited function with a known blocked email
SELECT 'Test 6: Testing is_email_rate_limited function' AS test;
-- Replace 'test@example.com' with an actual blocked email if available
SELECT 
  public.is_email_rate_limited('amukenam1@gmail.com', 24) AS is_rate_limited,
  public.is_email_rate_limited('nonexistent@example.com', 24) AS should_be_false;

-- Test 7: Test get_blocked_attempts_for_email function
SELECT 'Test 7: Testing get_blocked_attempts_for_email function' AS test;
SELECT * FROM public.get_blocked_attempts_for_email('amukenam1@gmail.com', 10);

-- Test 8: Test get_signup_health_metrics function
SELECT 'Test 8: Testing get_signup_health_metrics function' AS test;
SELECT * FROM public.get_signup_health_metrics(24);

-- Test 9: Test investigate_blocked_actor function
SELECT 'Test 9: Testing investigate_blocked_actor function' AS test;
-- Using the actor_id from the problem statement
SELECT * FROM public.investigate_blocked_actor('b8d68fe1-1a7d-4a50-ab80-d98937e20b4f');

-- Test 10: Test detect_blocking_anomalies function
SELECT 'Test 10: Testing detect_blocking_anomalies function' AS test;
SELECT 
  anomaly_type,
  severity,
  recommendation
FROM public.detect_blocking_anomalies(24);

-- Test 11: Check v_recent_blocked_signups
SELECT 'Test 11: Testing v_recent_blocked_signups view' AS test;
SELECT 
  email,
  attempt_count,
  estimated_rate_limit_status,
  minutes_since_last_attempt
FROM public.v_recent_blocked_signups
ORDER BY last_attempt DESC
LIMIT 5;

-- Test 12: Check v_potentially_legitimate_blocked_signups
SELECT 'Test 12: Testing v_potentially_legitimate_blocked_signups view' AS test;
SELECT 
  email,
  total_blocked_attempts,
  hours_since_last_block,
  has_auth_user
FROM public.v_potentially_legitimate_blocked_signups
LIMIT 5;

-- Test 13: Verify indexes exist
SELECT 'Test 13: Checking indexes exist' AS test;
SELECT 
  indexname,
  tablename,
  '✅ EXISTS' AS status
FROM pg_indexes
WHERE schemaname = 'auth'
  AND indexname LIKE '%blocked%'
ORDER BY indexname;

-- Test 14: Check permissions on views
SELECT 'Test 14: Checking view permissions' AS test;
SELECT 
  table_name,
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name LIKE 'v_%blocked%'
  AND grantee IN ('authenticated', 'service_role')
ORDER BY table_name, grantee;

-- Test 15: Check permissions on functions
SELECT 'Test 15: Checking function permissions' AS test;
SELECT 
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN (
    'is_email_rate_limited',
    'get_blocked_attempts_for_email',
    'get_signup_health_metrics',
    'investigate_blocked_actor',
    'detect_blocking_anomalies'
  )
  AND grantee IN ('authenticated', 'service_role')
ORDER BY routine_name, grantee;

-- ============================================================================
-- Investigation Queries for Specific Blocked Users
-- ============================================================================

-- Investigate: amukenam1@gmail.com
SELECT 'Investigation: amukenam1@gmail.com' AS investigation;

SELECT '1. Blocked attempts:' AS section;
SELECT * FROM public.get_blocked_attempts_for_email('amukenam1@gmail.com', 20);

SELECT '2. Is currently rate limited?' AS section;
SELECT public.is_email_rate_limited('amukenam1@gmail.com', 2) AS is_rate_limited;

SELECT '3. Actor investigation:' AS section;
SELECT * FROM public.investigate_blocked_actor('b8d68fe1-1a7d-4a50-ab80-d98937e20b4f');

SELECT '4. Check if user exists in auth.users:' AS section;
SELECT id, email, created_at, confirmed_at
FROM auth.users
WHERE id = 'b8d68fe1-1a7d-4a50-ab80-d98937e20b4f'::uuid
   OR email = 'amukenam1@gmail.com';

SELECT '5. Check if profile exists:' AS section;
SELECT id, email, account_type, created_at
FROM public.profiles
WHERE id = 'b8d68fe1-1a7d-4a50-ab80-d98937e20b4f'::uuid
   OR email = 'amukenam1@gmail.com';

-- Investigate: kasamwakachomba@gmail.com
SELECT 'Investigation: kasamwakachomba@gmail.com' AS investigation;

SELECT '1. Blocked attempts:' AS section;
SELECT * FROM public.get_blocked_attempts_for_email('kasamwakachomba@gmail.com', 20);

SELECT '2. Is currently rate limited?' AS section;
SELECT public.is_email_rate_limited('kasamwakachomba@gmail.com', 2) AS is_rate_limited;

SELECT '3. Actor investigation:' AS section;
SELECT * FROM public.investigate_blocked_actor('7c262cea-2966-4247-a660-c217ef64f8e8');

SELECT '4. Check if user exists in auth.users:' AS section;
SELECT id, email, created_at, confirmed_at
FROM auth.users
WHERE id = '7c262cea-2966-4247-a660-c217ef64f8e8'::uuid
   OR email = 'kasamwakachomba@gmail.com';

SELECT '5. Check if profile exists:' AS section;
SELECT id, email, account_type, created_at
FROM public.profiles
WHERE id = '7c262cea-2966-4247-a660-c217ef64f8e8'::uuid
   OR email = 'kasamwakachomba@gmail.com';

-- ============================================================================
-- Expected Results Summary
-- ============================================================================
/*
Expected results for the test queries:

Test 1: Should show 4 views (all with ✅ EXISTS status)
Test 2: Should show 5 functions (all with ✅ EXISTS status)
Test 3: Should show count of blocked entries (>0 if any exist)
Test 4-5: Sample data from blocked signups (empty if none exist)
Test 6: is_email_rate_limited should return true for known blocked emails
Test 7: Should return blocked attempt history for the email
Test 8: Should return signup statistics for last 24 hours
Test 9: Should show investigation results for the actor
Test 10: Should detect any current anomalies or return 'no_anomalies'
Test 11-12: Recent blocked signups if any exist
Test 13: Should show partial indexes created for performance
Test 14-15: Should show granted permissions

For specific blocked users (amukenam1@gmail.com, kasamwakachomba@gmail.com):
- Should show blocked attempt history
- is_rate_limited should be false if >1 hour since last attempt
- investigate_blocked_actor should show conclusion: 'blocked_only'
- auth.users query should return 0 rows (no user exists)
- profiles query should return 0 rows (no profile exists)

This confirms these were blocked-only attempts with no user creation.
*/

-- ============================================================================
-- Cleanup/Reset Commands (Use with caution)
-- ============================================================================

-- To reset all blocked signup attempt tracking (DO NOT RUN IN PRODUCTION):
-- TRUNCATE auth.audit_log_entries; -- WARNING: Deletes ALL audit logs

-- To clear specific test data:
-- DELETE FROM auth.audit_log_entries 
-- WHERE payload->>'actor_username' LIKE '%test@example.com%';
