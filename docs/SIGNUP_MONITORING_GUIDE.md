# Signup and Profile Creation Monitoring Guide

This guide provides SQL queries and monitoring procedures for the WATHACI CONNECT signup and profile creation pipeline.

## Table of Contents

1. [Quick Health Check](#quick-health-check)
2. [Detailed Inspection Queries](#detailed-inspection-queries)
3. [Monitoring Functions](#monitoring-functions)
4. [Alerting Queries](#alerting-queries)
5. [Troubleshooting Queries](#troubleshooting-queries)
6. [Historical Analysis](#historical-analysis)
7. [Recommended Monitoring Schedule](#recommended-monitoring-schedule)

---

## Quick Health Check

### Overall System Health (Single Query)

Run this query to get a comprehensive overview of signup health:

```sql
SELECT
  'Last 24 hours' as period,
  (SELECT COUNT(*) FROM auth.users WHERE created_at > NOW() - INTERVAL '24 hours') as new_auth_users,
  (SELECT COUNT(*) FROM public.profiles WHERE created_at > NOW() - INTERVAL '24 hours') as new_profiles,
  (SELECT COUNT(*) FROM public.v_users_without_profiles) as users_without_profiles,
  (SELECT COUNT(*) FROM public.user_events WHERE event_type = 'signup_completed' AND created_at > NOW() - INTERVAL '24 hours') as signup_completed,
  (SELECT COUNT(*) FROM public.user_events WHERE event_type = 'profile_creation_error' AND created_at > NOW() - INTERVAL '24 hours') as profile_errors,
  CASE
    WHEN (SELECT COUNT(*) FROM public.v_users_without_profiles) = 0
      AND (SELECT COUNT(*) FROM public.user_events WHERE event_type = 'profile_creation_error' AND created_at > NOW() - INTERVAL '24 hours') = 0
    THEN '✅ HEALTHY'
    WHEN (SELECT COUNT(*) FROM public.v_users_without_profiles) > 0
    THEN '❌ USERS WITHOUT PROFILES'
    ELSE '⚠️ PROFILE ERRORS DETECTED'
  END as health_status;
```

**Expected Result**: 
- `health_status` = '✅ HEALTHY'
- `users_without_profiles` = 0
- `profile_errors` = 0
- `new_auth_users` should equal `new_profiles` and `signup_completed`

---

## Detailed Inspection Queries

### 1️⃣ Deep-Inspect Recent Audit Payloads

Check the structure of recent signup-related audit entries:

```sql
SELECT 
  id,
  created_at,
  payload->>'action' as action,
  payload->'traits'->>'user_id' as traits_user_id,
  payload->'traits'->>'user_email' as traits_user_email,
  payload->'actor'->>'id' as actor_id,
  payload->'target'->>'id' as target_id,
  payload->>'ip_address' as ip_address,
  payload as full_payload
FROM auth.audit_log_entries
WHERE payload->>'action' IN ('user_signedup','user_repeated_signup','user_confirmation_requested')
ORDER BY created_at DESC
LIMIT 50;
```

**Analysis**: This query reveals that `traits_user_id` and `traits_user_email` are typically NULL, confirming we cannot rely on audit entries for user correlation.

### 2️⃣ Check Recent Profiles & Users Independently

Compare auth.users and profiles by timestamp:

```sql
SELECT
  u.id AS auth_user_id,
  u.email AS auth_email,
  u.created_at AS auth_created_at,
  u.confirmed_at AS auth_confirmed_at,
  p.id AS profile_id,
  p.email AS profile_email,
  p.created_at AS profile_created_at,
  p.account_type,
  CASE
    WHEN p.id IS NULL THEN '❌ NO PROFILE'
    WHEN p.id IS NOT NULL THEN '✅ PROFILE EXISTS'
  END as status,
  EXTRACT(EPOCH FROM (p.created_at - u.created_at)) as profile_delay_seconds
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY u.created_at DESC
LIMIT 200;
```

**Analysis**:
- `status` should be '✅ PROFILE EXISTS' for all rows
- `profile_delay_seconds` should be < 1 second (nearly instant)

### Summary of Mismatches

```sql
SELECT
  COUNT(*) FILTER (WHERE p.id IS NULL) as users_without_profiles,
  COUNT(*) FILTER (WHERE p.id IS NOT NULL) as users_with_profiles,
  COUNT(*) as total_users,
  ROUND(100.0 * COUNT(*) FILTER (WHERE p.id IS NULL) / COUNT(*), 2) as missing_profile_percentage
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id;
```

**Expected**: `missing_profile_percentage` = 0.00

### 3️⃣ Inspect Profile-Creation Logic

Check trigger functions:

```sql
-- List all functions related to user/profile creation
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname IN (
  'handle_new_user',
  'ensure_profile_exists',
  'log_user_event',
  'backfill_missing_profiles'
)
ORDER BY proname;
```

Check triggers attached to auth.users:

```sql
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  tgtype as type,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass
ORDER BY tgname;
```

**Expected**: Should see `on_auth_user_created` trigger attached to `auth.users`, calling `handle_new_user()`.

Check all triggers related to profiles:

```sql
SELECT 
  event_object_schema as schema,
  event_object_table as table_name,
  trigger_name,
  action_timing,
  event_manipulation as event,
  action_statement
FROM information_schema.triggers
WHERE trigger_name ILIKE '%user%' 
   OR trigger_name ILIKE '%profile%'
   OR event_object_table IN ('users', 'profiles')
ORDER BY event_object_table, trigger_name;
```

---

## Monitoring Functions

### Function: check_recent_signup_issues()

Check for signup issues in the last N minutes:

```sql
-- Check last 10 minutes (default)
SELECT * FROM public.check_recent_signup_issues(10);

-- Check last hour
SELECT * FROM public.check_recent_signup_issues(60);

-- Check last 24 hours
SELECT * FROM public.check_recent_signup_issues(1440);
```

**Returns**: Users with missing profiles or missing signup events.

**Expected**: 0 rows (no issues).

**Use**: Run every 5-10 minutes in a monitoring job. Alert if any rows are returned.

### Function: get_signup_statistics()

Get comprehensive signup statistics:

```sql
-- Last 24 hours
SELECT * FROM public.get_signup_statistics(24);

-- Last 7 days
SELECT * FROM public.get_signup_statistics(168);

-- Last 30 days
SELECT * FROM public.get_signup_statistics(720);
```

**Returns**:
- `total_auth_users` - Total auth users created
- `total_profiles` - Total profiles created
- `users_without_profiles` - Mismatch count
- `signup_completed_events` - Logged signup events
- `profile_creation_errors` - Failed profile creations
- `healthy_signups` - Complete successful signups

**Expected**:
- `users_without_profiles` = 0
- `total_auth_users` = `total_profiles` = `healthy_signups`
- `profile_creation_errors` = 0

---

## Alerting Queries

### Alert 1: Users Without Profiles (Critical)

```sql
-- Should return 0 rows
SELECT 
  user_id,
  email,
  user_created_at,
  minutes_since_signup,
  last_event_type
FROM public.v_users_without_profiles
ORDER BY user_created_at DESC;
```

**Alert Condition**: If this query returns any rows, send critical alert.

**Action**: 
1. Check `last_event_type` - if it's `profile_creation_error`, investigate the error
2. Run backfill: `SELECT * FROM public.backfill_missing_profiles();`

### Alert 2: Recent Profile Creation Errors (High)

```sql
-- Errors in last hour
SELECT 
  user_id,
  email,
  event_type,
  metadata->>'error' as error_message,
  metadata->>'sqlstate' as sqlstate,
  created_at
FROM public.user_events
WHERE event_type IN ('profile_creation_error', 'profile_backfill_error')
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

**Alert Condition**: If error count > 0 in last hour.

**Action**: Investigate error messages. Common issues:
- RLS policy blocking insert
- Missing columns in profiles table
- Foreign key constraint failures

### Alert 3: Signup Success Rate Drop (Medium)

```sql
-- Compare current hour to previous hour
WITH hourly_stats AS (
  SELECT
    date_trunc('hour', created_at) as hour,
    COUNT(*) FILTER (WHERE event_type = 'signup_completed') as successes,
    COUNT(*) FILTER (WHERE event_type = 'profile_creation_error') as errors,
    COUNT(*) as total
  FROM public.user_events
  WHERE created_at > NOW() - INTERVAL '2 hours'
    AND event_type IN ('signup_completed', 'profile_creation_error')
  GROUP BY date_trunc('hour', created_at)
)
SELECT
  hour,
  successes,
  errors,
  ROUND(100.0 * successes / NULLIF(total, 0), 2) as success_rate_percent
FROM hourly_stats
ORDER BY hour DESC;
```

**Alert Condition**: If `success_rate_percent` < 95% for current hour.

### Alert 4: Audit Log vs User Events Discrepancy (Low)

```sql
-- Compare audit log signup events to user_events signup_completed
WITH last_24h AS (
  SELECT
    (SELECT COUNT(*) FROM auth.audit_log_entries 
     WHERE payload->>'action' IN ('user_signedup', 'user_repeated_signup')
       AND created_at > NOW() - INTERVAL '24 hours') as audit_signups,
    (SELECT COUNT(*) FROM public.user_events
     WHERE event_type = 'signup_completed'
       AND created_at > NOW() - INTERVAL '24 hours') as logged_signups
)
SELECT
  audit_signups,
  logged_signups,
  CASE
    WHEN logged_signups >= audit_signups THEN '✅ OK'
    WHEN logged_signups < audit_signups THEN '⚠️ FEWER LOGGED SIGNUPS'
    ELSE '❓ UNKNOWN'
  END as status,
  audit_signups - logged_signups as discrepancy
FROM last_24h;
```

**Alert Condition**: If `discrepancy` > 5 (some variance is expected due to timing).

---

## Troubleshooting Queries

### Find Specific User's Signup History

```sql
-- Replace with actual user_id or email
WITH user_info AS (
  SELECT id, email FROM auth.users 
  WHERE email = 'user@example.com' 
    OR id = '00000000-0000-0000-0000-000000000000'::uuid
)
SELECT
  'auth.users' as source,
  u.id,
  u.email,
  u.created_at,
  NULL as event_type,
  NULL as metadata
FROM auth.users u
WHERE u.id = (SELECT id FROM user_info)

UNION ALL

SELECT
  'public.profiles' as source,
  p.id,
  p.email,
  p.created_at,
  p.account_type::text as event_type,
  NULL as metadata
FROM public.profiles p
WHERE p.id = (SELECT id FROM user_info)

UNION ALL

SELECT
  'public.user_events' as source,
  ue.user_id as id,
  ue.email,
  ue.created_at,
  ue.event_type,
  ue.metadata
FROM public.user_events ue
WHERE ue.user_id = (SELECT id FROM user_info)

ORDER BY created_at;
```

### Find All Failed Profile Creations

```sql
SELECT
  ue.user_id,
  ue.email,
  ue.metadata->>'error' as error_message,
  ue.metadata->>'sqlstate' as sqlstate,
  ue.metadata->>'source' as error_source,
  ue.created_at,
  -- Check if profile exists now
  CASE
    WHEN EXISTS(SELECT 1 FROM public.profiles p WHERE p.id = ue.user_id)
    THEN '✅ Profile exists now'
    ELSE '❌ Still missing'
  END as current_status
FROM public.user_events ue
WHERE ue.event_type = 'profile_creation_error'
ORDER BY ue.created_at DESC
LIMIT 50;
```

### Check Profile Errors Table

```sql
-- If profile_errors table exists
SELECT
  pe.user_id,
  u.email,
  pe.error_message,
  pe.error_detail,
  pe.error_context,
  pe.created_at,
  -- Check if profile exists now
  CASE
    WHEN EXISTS(SELECT 1 FROM public.profiles p WHERE p.id = pe.user_id)
    THEN '✅ Profile exists now'
    ELSE '❌ Still missing'
  END as current_status
FROM public.profile_errors pe
LEFT JOIN auth.users u ON u.id = pe.user_id
ORDER BY pe.created_at DESC
LIMIT 50;
```

---

## Historical Analysis

### Signup Trends Over Time

```sql
SELECT
  date_trunc('day', created_at) as day,
  COUNT(*) as signups,
  COUNT(*) FILTER (WHERE event_type = 'signup_completed') as successful,
  COUNT(*) FILTER (WHERE event_type = 'profile_creation_error') as failed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE event_type = 'signup_completed') / COUNT(*), 2) as success_rate
FROM public.user_events
WHERE event_type IN ('signup_completed', 'profile_creation_error')
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY date_trunc('day', created_at)
ORDER BY day DESC;
```

### Account Type Distribution

```sql
SELECT
  p.account_type,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM public.profiles p
WHERE p.created_at > NOW() - INTERVAL '30 days'
GROUP BY p.account_type
ORDER BY count DESC;
```

### Profile Creation Timing Analysis

```sql
SELECT
  CASE
    WHEN profile_delay_seconds < 1 THEN 'Instant (<1s)'
    WHEN profile_delay_seconds < 5 THEN 'Fast (1-5s)'
    WHEN profile_delay_seconds < 10 THEN 'Slow (5-10s)'
    ELSE 'Very Slow (>10s)'
  END as timing_category,
  COUNT(*) as count,
  ROUND(AVG(profile_delay_seconds), 2) as avg_seconds,
  ROUND(MIN(profile_delay_seconds), 2) as min_seconds,
  ROUND(MAX(profile_delay_seconds), 2) as max_seconds
FROM public.v_signup_correlation_status
WHERE correlation_status = 'healthy'
  AND profile_delay_seconds IS NOT NULL
  AND auth_created_at > NOW() - INTERVAL '7 days'
GROUP BY timing_category
ORDER BY avg_seconds;
```

**Expected**: Most profiles should be in 'Instant (<1s)' category.

---

## Recommended Monitoring Schedule

### Real-Time (Every 5 Minutes)

Run via cron job or scheduled task:

```sql
-- Alert if any issues detected
SELECT COUNT(*) as issue_count
FROM public.check_recent_signup_issues(10);
```

**Alert If**: `issue_count > 0`

**Notification**: Send to on-call engineer immediately.

### Hourly

```sql
-- Check last hour's statistics
SELECT * FROM public.get_signup_statistics(1);
```

**Alert If**:
- `users_without_profiles > 0`
- `profile_creation_errors > 0`
- `healthy_signups < total_auth_users`

**Notification**: Send to team Slack channel.

### Daily (Morning Report)

```sql
-- Generate daily signup report
SELECT
  '24 Hour Report' as report,
  *,
  CASE
    WHEN users_without_profiles = 0 
      AND profile_creation_errors = 0
      AND healthy_signups = total_auth_users
    THEN '✅ All systems operational'
    ELSE '⚠️ Issues detected - investigate'
  END as status
FROM public.get_signup_statistics(24);
```

**Action**: Review daily metrics, investigate any anomalies.

### Weekly (Sunday Night)

```sql
-- Generate weekly summary
SELECT * FROM public.get_signup_statistics(168);

-- Trend analysis
SELECT
  date_trunc('day', created_at) as day,
  COUNT(*) as signups
FROM public.user_events
WHERE event_type = 'signup_completed'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY date_trunc('day', created_at)
ORDER BY day;
```

**Action**: Review weekly trends, plan capacity if needed.

---

## Emergency Response Procedures

### Emergency 1: Multiple Users Without Profiles

**Detection**: Alert from `check_recent_signup_issues()` or `v_users_without_profiles`

**Immediate Action**:
1. Check if trigger is disabled:
   ```sql
   SELECT tgname, tgenabled 
   FROM pg_trigger 
   WHERE tgrelid = 'auth.users'::regclass;
   ```

2. Run backfill immediately:
   ```sql
   SELECT * FROM public.backfill_missing_profiles();
   ```

3. Check for recent errors:
   ```sql
   SELECT * FROM public.user_events
   WHERE event_type = 'profile_creation_error'
     AND created_at > NOW() - INTERVAL '1 hour'
   ORDER BY created_at DESC;
   ```

**Follow-Up**:
- Investigate root cause from error messages
- Test trigger manually by creating test user
- Review recent database changes

### Emergency 2: All Signups Failing

**Detection**: Surge in profile_creation_error events

**Immediate Action**:
1. Check database connectivity
2. Check RLS policies:
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'profiles';
   ```

3. Verify profiles table structure:
   ```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'profiles'
   ORDER BY ordinal_position;
   ```

4. Test profile creation manually:
   ```sql
   -- As service_role
   INSERT INTO public.profiles (id, email, account_type)
   VALUES (gen_random_uuid(), 'test@example.com', 'sole_proprietor');
   ```

**Follow-Up**:
- Rollback recent migrations if needed
- Restore from backup if database corruption detected

---

## Appendix: Useful Views

All views created by the migration:

- `public.v_signup_correlation_status` - Overall signup health with correlation status
- `public.v_users_without_profiles` - Missing profiles (should always be empty)
- `public.v_recent_signup_events` - Recent events from user_events
- `public.v_audit_signup_analysis` - Audit log analysis (shows limitations)

Use these views for dashboards and reporting.

---

**Last Updated**: 2024-11-24  
**Migration**: `20251124120000_audit_correlation_comprehensive_fix.sql`
