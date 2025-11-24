# Deployment Guide: Signup Audit Correlation Fix

## Overview

This guide provides step-by-step instructions for deploying the comprehensive signup audit correlation fix to your WATHACI CONNECT Supabase database.

## Prerequisites

- Access to Supabase Dashboard (SQL Editor) OR Supabase CLI configured
- Database backup created (recommended)
- Admin/service role access to the database

## Pre-Deployment Checklist

- [ ] Backup current database
- [ ] Review all documentation files
- [ ] Confirm you understand the changes being made
- [ ] Plan for a maintenance window (migration takes ~30 seconds)
- [ ] Notify team members of deployment

## Deployment Options

### Option A: Using Supabase Dashboard (Recommended)

#### Step 1: Access SQL Editor

1. Log in to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your WATHACI CONNECT project
3. Navigate to **SQL Editor** in the left sidebar

#### Step 2: Create Backup (Important!)

Run this query to create a snapshot of current data:

```sql
-- Backup current state
CREATE SCHEMA IF NOT EXISTS backup_20241124;

-- Backup user_events if exists
CREATE TABLE backup_20241124.user_events_backup AS 
SELECT * FROM public.user_events;

-- Backup profiles
CREATE TABLE backup_20241124.profiles_backup AS 
SELECT * FROM public.profiles;

-- Log the backup
SELECT 
  'backup_20241124' as backup_schema,
  (SELECT COUNT(*) FROM backup_20241124.user_events_backup) as user_events_count,
  (SELECT COUNT(*) FROM backup_20241124.profiles_backup) as profiles_count,
  now() as backup_timestamp;
```

#### Step 3: Run Migration

1. Open the migration file: `supabase/migrations/20251124120000_audit_correlation_comprehensive_fix.sql`
2. Copy the entire contents
3. Paste into SQL Editor
4. Click **Run** (or press Ctrl+Enter)
5. Wait for completion (~30 seconds)
6. Check for any errors in the output

#### Step 4: Verify Deployment

Run these verification queries:

```sql
-- 1. Check that views were created
SELECT viewname 
FROM pg_views 
WHERE schemaname = 'public' 
  AND viewname LIKE 'v_%signup%' OR viewname LIKE 'v_%profile%';
-- Expected: 4 views

-- 2. Check that functions were created
SELECT proname 
FROM pg_proc 
WHERE proname IN (
  'log_user_event',
  'handle_new_user',
  'backfill_missing_profiles',
  'check_recent_signup_issues',
  'get_signup_statistics'
);
-- Expected: 5 functions

-- 3. Check that trigger is attached
SELECT tgname 
FROM pg_trigger 
WHERE tgrelid = 'auth.users'::regclass 
  AND tgname = 'on_auth_user_created';
-- Expected: 1 trigger

-- 4. Check user_events table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_events'
ORDER BY ordinal_position;
-- Expected: id, user_id, email, event_type, metadata, created_at

-- 5. Quick health check
SELECT * FROM public.get_signup_statistics(24);
-- Should return stats for last 24 hours
```

### Option B: Using Supabase CLI

#### Step 1: Ensure CLI is Configured

```bash
# Check if CLI is installed
supabase --version

# If not installed, install it
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref
```

#### Step 2: Push Migration

```bash
# Navigate to project directory
cd /path/to/WATHACI-CONNECT.-V1

# Push migrations to remote database
supabase db push

# You should see:
# Applying migration 20251124120000_audit_correlation_comprehensive_fix.sql...
# Migration applied successfully
```

#### Step 3: Verify Deployment

```bash
# Run verification queries via CLI
supabase db query << 'EOF'
-- Check views
SELECT COUNT(*) as view_count
FROM pg_views 
WHERE schemaname = 'public' 
  AND (viewname LIKE 'v_%signup%' OR viewname LIKE 'v_%profile%');

-- Check functions
SELECT COUNT(*) as function_count
FROM pg_proc 
WHERE proname IN (
  'log_user_event',
  'handle_new_user',
  'backfill_missing_profiles',
  'check_recent_signup_issues',
  'get_signup_statistics'
);

-- Quick health check
SELECT * FROM public.get_signup_statistics(24);
EOF
```

## Post-Deployment Verification

### 1. Test Profile Creation

Create a test user and verify the full pipeline:

```sql
-- Create test user (replace with actual test email)
-- Do this via Supabase Auth UI or your signup page

-- Then check if profile was created and events logged
SELECT
  u.id,
  u.email,
  u.created_at as auth_created_at,
  p.id as profile_id,
  p.created_at as profile_created_at,
  (SELECT COUNT(*) FROM public.user_events ue WHERE ue.user_id = u.id) as event_count,
  (SELECT string_agg(event_type, ', ' ORDER BY created_at) 
   FROM public.user_events ue WHERE ue.user_id = u.id) as events
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'your-test-email@example.com';
```

**Expected Results**:
- `profile_id` should NOT be NULL
- `event_count` should be >= 3
- `events` should include: `auth_user_created`, `profile_created`, `signup_completed`

### 2. Run Monitoring Queries

```sql
-- Check for any users without profiles
SELECT * FROM public.v_users_without_profiles;
-- Expected: 0 rows

-- Check recent signup issues
SELECT * FROM public.check_recent_signup_issues(60);
-- Expected: 0 rows

-- Get 24-hour statistics
SELECT * FROM public.get_signup_statistics(24);
-- Review the statistics for any anomalies
```

### 3. Check Backfill Results

```sql
-- The migration automatically runs backfill
-- Check if any profiles were created during migration
SELECT
  event_type,
  COUNT(*) as count
FROM public.user_events
WHERE event_type IN ('profile_backfilled', 'profile_backfill_error')
GROUP BY event_type;
```

### 4. Review Correlation Status

```sql
-- Check overall correlation health
SELECT
  correlation_status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM public.v_signup_correlation_status
GROUP BY correlation_status
ORDER BY count DESC;
```

**Expected**: Most (>95%) should have `correlation_status = 'healthy'`

## Rollback Procedure

If you encounter issues and need to rollback:

### Using Supabase Dashboard

```sql
-- Drop new views
DROP VIEW IF EXISTS public.v_audit_signup_analysis CASCADE;
DROP VIEW IF EXISTS public.v_recent_signup_events CASCADE;
DROP VIEW IF EXISTS public.v_users_without_profiles CASCADE;
DROP VIEW IF EXISTS public.v_signup_correlation_status CASCADE;

-- Drop new functions
DROP FUNCTION IF EXISTS public.get_signup_statistics(integer) CASCADE;
DROP FUNCTION IF EXISTS public.check_recent_signup_issues(integer) CASCADE;
DROP FUNCTION IF EXISTS public.backfill_missing_profiles() CASCADE;

-- Restore old trigger function (from previous migration)
-- You'll need to check previous migration files for the old function definition

-- Restore data from backup if needed
-- (Only if data was corrupted, unlikely with this migration)
```

### Using Supabase CLI

```bash
# Reset to previous migration
supabase db reset

# Then re-run migrations up to (but not including) the problematic one
```

## Common Issues and Solutions

### Issue 1: Migration Times Out

**Symptoms**: Migration doesn't complete, hangs at certain point

**Solution**:
1. Check database connection
2. Break migration into smaller chunks
3. Run each section separately in SQL Editor

### Issue 2: Permission Denied Errors

**Symptoms**: Errors about insufficient privileges

**Solution**:
1. Ensure you're using service_role or admin credentials
2. Check that RLS is not blocking the migration
3. Temporarily disable RLS if needed:
   ```sql
   ALTER TABLE public.user_events DISABLE ROW LEVEL SECURITY;
   -- Run migration
   ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;
   ```

### Issue 3: Trigger Not Firing

**Symptoms**: New signups don't create profiles or log events

**Solution**:
```sql
-- Check trigger status
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgrelid = 'auth.users'::regclass;

-- If disabled, enable it
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

-- If missing, recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### Issue 4: Backfill Created Duplicate Profiles

**Symptoms**: Some users have multiple profile rows

**Solution**:
```sql
-- Find duplicates
SELECT id, COUNT(*) 
FROM public.profiles 
GROUP BY id 
HAVING COUNT(*) > 1;

-- This shouldn't happen due to PRIMARY KEY constraint
-- If it does, investigate manually
```

## Monitoring Setup

After deployment, set up regular monitoring:

### Option 1: Manual Monitoring (Daily)

Create a saved query in Supabase Dashboard:

```sql
-- Daily Health Check
SELECT
  'DAILY HEALTH CHECK' as report_type,
  (SELECT COUNT(*) FROM public.v_users_without_profiles) as users_without_profiles,
  (SELECT COUNT(*) FROM public.user_events 
   WHERE event_type = 'profile_creation_error' 
     AND created_at > NOW() - INTERVAL '24 hours') as recent_errors,
  *
FROM public.get_signup_statistics(24);
```

Run this query each morning and review the results.

### Option 2: Automated Monitoring (Recommended)

Set up a Supabase Edge Function to run monitoring queries periodically:

```typescript
// supabase/functions/signup-health-monitor/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Check for recent issues
  const { data: issues } = await supabaseAdmin
    .rpc('check_recent_signup_issues', { p_minutes: 60 })

  if (issues && issues.length > 0) {
    // Send alert (email, Slack, etc.)
    console.error('ALERT: Signup issues detected', issues)
  }

  // Get statistics
  const { data: stats } = await supabaseAdmin
    .rpc('get_signup_statistics', { p_hours: 24 })

  return new Response(JSON.stringify({
    issues: issues?.length ?? 0,
    stats: stats?.[0] ?? null,
    timestamp: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

Set up a cron job to call this function hourly using your preferred scheduler.

## Success Criteria

Deployment is successful when:

- [x] All verification queries return expected results
- [x] Test signup creates auth user, profile, and logs events
- [x] `v_users_without_profiles` returns 0 rows
- [x] `check_recent_signup_issues(60)` returns 0 rows
- [x] `get_signup_statistics(24)` shows healthy_signups = total_auth_users
- [x] No errors in Supabase logs
- [x] Monitoring queries work correctly

## Support and Troubleshooting

### Documentation References

- **Complete Summary**: `docs/AUDIT_CORRELATION_FIX_SUMMARY.md`
- **Monitoring Guide**: `docs/SIGNUP_MONITORING_GUIDE.md`
- **Audit Analysis**: `docs/AUDIT_LOG_ANALYSIS.md`

### Getting Help

If you encounter issues:

1. Check the troubleshooting section in `SIGNUP_MONITORING_GUIDE.md`
2. Review Supabase logs in Dashboard → Logs
3. Check user_events for error events:
   ```sql
   SELECT * FROM public.user_events
   WHERE event_type LIKE '%error%'
   ORDER BY created_at DESC
   LIMIT 20;
   ```
4. Consult the team or create a support ticket

## Conclusion

After successful deployment:

✅ **Signup and profile creation are now fully consistent and observable.**

You now have:
- Reliable user event tracking with explicit user_id and email
- Bulletproof profile creation pipeline
- Comprehensive monitoring tools
- Backfill utilities for historical data

The application no longer relies on `auth.audit_log_entries` for user-specific tracking and instead uses the robust `public.user_events` system.

---

**Migration File**: `supabase/migrations/20251124120000_audit_correlation_comprehensive_fix.sql`  
**Validation Script**: `scripts/validate-migration.sh`  
**Status**: ✅ Ready for Deployment
