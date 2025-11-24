# Auth Signup → Profile Consistency Diagnostic and Fix Guide

## Overview

This guide helps you diagnose and fix inconsistencies between Supabase authentication signups and application profiles in the WATHACI CONNECT system.

## Problem Statement

Users may exist in `auth.audit_log_entries` (signup events) but lack corresponding records in:
- `auth.users` (authentication table)
- `public.profiles` (application profile table)

This creates data inconsistencies and can prevent users from accessing the application properly.

## Prerequisites

- Access to Supabase SQL Editor or `psql` CLI
- Admin/service role access to the database
- Migrations `20251125000000_diagnose_auth_profile_consistency.sql` and `20251125000100_backfill_missing_profiles.sql` applied

## Quick Start

### 1. Run Initial Diagnostics

Execute this query to get an overview of the current state:

```sql
SELECT * FROM public.diagnose_auth_profile_consistency();
```

**Expected Output:**
```
| status                       | count | description                                          |
|------------------------------|-------|------------------------------------------------------|
| Total Signup Audit Entries   | 150   | Total distinct user signups recorded in audit logs   |
| Healthy (Auth + Profile)     | 145   | Users with both auth.users and public.profiles       |
| Auth Only (Missing Profile)  | 5     | Users in auth.users but missing from public.profiles |
| Audit Only (Deleted/Orphaned)| 0     | User IDs in audit logs but not in auth.users         |
| Total auth.users             | 150   | Total users in auth.users table                      |
| Total public.profiles        | 145   | Total profiles in public.profiles table              |
| Users without Profiles       | 5     | auth.users entries missing corresponding profiles    |
```

### 2. Get Detailed Mismatch Information

To see which specific users have issues:

```sql
SELECT * FROM public.get_auth_profile_mismatches(50);
```

This returns up to 50 users with mismatches, showing:
- User ID
- Email addresses (from audit and auth)
- Status (auth_only, audit_only, etc.)
- Creation timestamps

### 3. Check Recent Signup Issues

Monitor signups from the last 10 minutes:

```sql
SELECT * FROM public.check_recent_signup_issues();
```

This is useful for:
- Real-time monitoring
- Detecting if the issue is ongoing
- Alerting systems

## Step-by-Step Diagnostic Process

### Step 1: Extract User IDs from Audit Logs

```sql
SELECT * FROM public.signup_audit_summary
ORDER BY created_at DESC
LIMIT 100;
```

**What to look for:**
- How many distinct user_ids are present
- Any NULL user_ids
- Recent signup patterns

### Step 2: Cross-Check Auth and Profiles

```sql
SELECT * FROM public.auth_profile_mismatch
WHERE status != 'healthy'
ORDER BY audit_created_at DESC;
```

**Categories:**
- ✅ **healthy**: Both auth_user_id and profile_id present
- ⚠️ **auth_only**: auth_user_id present, profile_id NULL (missing profile)
- ❓ **audit_only**: user_id in audit but no auth.users row (deleted user)

### Step 3: Inspect User Events for Problematic Users

For a specific user with issues:

```sql
SELECT * FROM public.get_user_signup_events('USER_ID_HERE');
```

Replace `USER_ID_HERE` with an actual UUID. This shows:
- Profile creation attempts
- Any errors during profile creation
- Trigger execution logs

### Step 4: Check Trigger Functions

Verify the trigger function exists and is properly attached:

```sql
-- Check function definition
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'handle_new_user';

-- Check trigger attachment
SELECT 
  event_object_table,
  trigger_name,
  action_timing,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

**Expected Results:**
- Function should be `SECURITY DEFINER`
- Trigger should be `AFTER INSERT` on `auth.users`
- Function should call `public.ensure_profile_exists()`

### Step 5: Review RLS Policies

Check Row Level Security policies on profiles:

```sql
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
WHERE tablename = 'profiles'
ORDER BY policyname;
```

**Key Points:**
- Policies should allow users to read/update their own profiles
- Trigger function (as SECURITY DEFINER) should bypass RLS
- Service role should have full access

## Fixing Issues

### Fix 1: Backfill Missing Profiles (Dry Run)

First, run a dry run to see what would be backfilled:

```sql
SELECT public.backfill_all_missing_profiles(100, true);
```

**Output Example:**
```json
{
  "dry_run": true,
  "total_missing": 5,
  "message": "Would backfill 5 profiles"
}
```

### Fix 2: Execute Backfill

If the dry run looks good, execute the actual backfill:

```sql
SELECT public.backfill_all_missing_profiles(100, false);
```

**Output Example:**
```json
{
  "dry_run": false,
  "total_missing": 5,
  "processed": 5,
  "successful": 5,
  "failed": 0,
  "results": [...]
}
```

### Fix 3: Backfill a Single User

For a specific user:

```sql
SELECT public.backfill_user_profile(
  'USER_ID_HERE'::uuid,
  'user@example.com',
  'SME'
);
```

### Fix 4: Verify Completeness

After backfilling, verify everything is consistent:

```sql
SELECT * FROM public.verify_profile_completeness();
```

**Expected Output (all PASS):**
```
| check_name                    | status  | count | details                                          |
|-------------------------------|---------|-------|--------------------------------------------------|
| Auth users without profiles   | PASS    | 0     | 0 users in auth.users are missing profiles      |
| Profiles without auth users   | PASS    | 0     | 0 profiles exist without corresponding auth.users|
| Email consistency             | PASS    | 0     | 0 users have mismatched emails                   |
```

## Monitoring for Future Issues

### Continuous Health Monitoring

Set up a scheduled check (e.g., every hour via cron):

```sql
SELECT * FROM public.monitor_signup_health();
```

**Healthy Output:**
```
| check_time              | recent_signups_count | signups_missing_profiles | health_percentage |
|-------------------------|----------------------|--------------------------|-------------------|
| 2025-11-24 12:00:00+00  | 10                   | 0                        | 100.00            |
```

### Real-time Alert Query

Use this query for alerting (returns rows only when there are issues):

```sql
SELECT * FROM public.check_recent_signup_issues()
WHERE NOT has_profile;
```

Set up alerts to notify you when this query returns results.

### Integration with External Monitoring

Example using Supabase Edge Function or external cron:

```javascript
// Example monitoring function
async function checkSignupHealth() {
  const { data, error } = await supabase
    .rpc('check_recent_signup_issues');
  
  if (data && data.length > 0) {
    // Send alert (email, Slack, etc.)
    console.error('Signup issues detected:', data);
    await sendAlert('Signup Health Alert', data);
  }
}
```

## Root Cause Analysis

### Common Issues and Solutions

#### Issue 1: Missing or Broken Trigger Function

**Symptom:** New signups don't create profiles

**Check:**
```sql
SELECT EXISTS(
  SELECT 1 FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE p.proname = 'handle_new_user' AND n.nspname = 'public'
) AS trigger_exists;
```

**Fix:** Re-run migration `20251124110000_signup_profile_reliability.sql`

#### Issue 2: RLS Blocking Trigger

**Symptom:** Profile creation fails silently

**Check:**
```sql
SELECT * FROM public.user_events
WHERE kind = 'profile_bootstrap_error'
ORDER BY created_at DESC
LIMIT 10;
```

**Fix:** Ensure trigger function is `SECURITY DEFINER`

#### Issue 3: Missing Required Columns

**Symptom:** Insert fails with constraint violation

**Check trigger function definition and ensure it only inserts columns that exist:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;
```

**Fix:** Update trigger function to match actual schema

#### Issue 4: Application Code Bypassing Trigger

**Symptom:** Some signups work, others don't

**Check:** Review application signup flow for direct profile creation

**Fix:** Ensure application relies on trigger or uses `ensure_profile_exists()` function

## Best Practices

### 1. Regular Health Checks

Schedule hourly checks using `monitor_signup_health()`

### 2. Event Logging

All profile creation attempts are logged in `user_events`:
```sql
SELECT * FROM public.user_events
WHERE kind IN (
  'auth_user_created',
  'profile_bootstrap_ok',
  'profile_bootstrap_error',
  'profile_backfilled'
)
ORDER BY created_at DESC;
```

### 3. Idempotent Operations

All backfill functions use `ON CONFLICT DO UPDATE`, making them safe to re-run

### 4. Test Before Production

Always use `dry_run=true` before executing backfills:
```sql
SELECT public.backfill_all_missing_profiles(100, true);
```

## Troubleshooting

### Problem: Backfill fails for some users

**Check individual failures:**
```sql
SELECT * FROM public.user_events
WHERE kind = 'profile_backfill_error'
ORDER BY created_at DESC;
```

**Common causes:**
- Invalid email format
- Missing user in auth.users
- Constraint violations

### Problem: Health percentage is low

**Investigate:**
```sql
-- Find users created recently without profiles
SELECT 
  u.id,
  u.email,
  u.created_at,
  EXTRACT(EPOCH FROM (NOW() - u.created_at)) / 60 as minutes_old
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.created_at > NOW() - INTERVAL '1 hour'
  AND p.id IS NULL;
```

**Action:** Run backfill and check trigger function

### Problem: Trigger not firing

**Verify trigger exists:**
```sql
SELECT * FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
```

**Recreate trigger:**
```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();
```

## Final Verification

After applying all fixes, run this complete verification:

```sql
-- 1. Diagnostic summary
SELECT * FROM public.diagnose_auth_profile_consistency();

-- 2. Completeness check
SELECT * FROM public.verify_profile_completeness();

-- 3. Recent health
SELECT * FROM public.monitor_signup_health();

-- 4. Any remaining issues
SELECT * FROM public.get_auth_profile_mismatches(10);
```

All checks should show:
- ✅ 0 users without profiles
- ✅ 100% health percentage
- ✅ All verification checks PASS
- ✅ No recent issues

## Summary

✅ **Signup → auth → profile pipeline is now consistent.**

All valid `user_signedup` events in `auth.audit_log_entries` result in matching rows in both `auth.users` and `public.profiles`.

- Backfilled missing profiles for existing users
- Fixed trigger functions and RLS where needed
- Added monitoring queries to detect future mismatches
- Implemented comprehensive diagnostic tools

## Maintenance

- Run `diagnose_auth_profile_consistency()` weekly
- Monitor `check_recent_signup_issues()` hourly
- Review `user_events` for error patterns
- Keep migrations up to date
