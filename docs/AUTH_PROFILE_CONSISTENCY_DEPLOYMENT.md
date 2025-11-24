# Auth Profile Consistency Fix - Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the auth profile consistency fix to your WATHACI CONNECT Supabase instance.

## Pre-Deployment Checklist

Before deploying, ensure you have:

- [ ] Database admin credentials (service role or postgres user)
- [ ] Supabase connection string
- [ ] PostgreSQL client tools installed (`psql`)
- [ ] Database backup (recommended)
- [ ] Migrations pushed to repository
- [ ] Access to Supabase dashboard

## Deployment Steps

### Step 1: Backup Database (Recommended)

Before making any changes, create a backup:

**Via Supabase Dashboard:**
1. Go to Database → Backups
2. Click "Create Backup"
3. Wait for completion

**Via CLI:**
```bash
# Export current schema
supabase db dump --db-url "$SUPABASE_DB_URL" > backup-$(date +%Y%m%d-%H%M%S).sql
```

### Step 2: Set Up Environment

```bash
# Set your database connection string
export SUPABASE_DB_URL="postgres://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# Or use the pooler connection
export SUPABASE_DB_URL="postgres://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"

# Verify connection
psql "$SUPABASE_DB_URL" -c "SELECT version();"
```

### Step 3: Apply Migrations

#### Option A: Using Supabase CLI (Recommended)

```bash
# Link to your project (if not already linked)
supabase link --project-ref [YOUR_PROJECT_REF]

# Push migrations
supabase db push

# Verify migrations
supabase db remote changes
```

#### Option B: Manual Application via psql

```bash
# Apply diagnostic migration
psql "$SUPABASE_DB_URL" -f supabase/migrations/20251125000000_diagnose_auth_profile_consistency.sql

# Apply backfill migration
psql "$SUPABASE_DB_URL" -f supabase/migrations/20251125000100_backfill_missing_profiles.sql
```

**Expected Output:**
```
BEGIN
CREATE VIEW
CREATE VIEW
CREATE FUNCTION
CREATE FUNCTION
...
COMMIT
```

### Step 4: Verify Installation

Run the diagnostic script to verify everything is installed:

```bash
npm run supabase:diagnose
```

**Expected Output:**
Should show sections for:
- Overall Diagnostic Summary
- Profile Completeness Verification
- Recent Signup Health
- Trigger Function Status
- RLS Policies

### Step 5: Run Initial Diagnostics

Check the current state of your database:

```sql
-- Via Supabase SQL Editor or psql
SELECT * FROM public.diagnose_auth_profile_consistency();
```

**Interpret Results:**
- Take note of "Users without Profiles" count
- Check "Auth Only (Missing Profile)" count
- Review any recent errors

### Step 6: Backfill Missing Profiles (If Needed)

If diagnostics show missing profiles:

#### 6a. Dry Run First

```bash
# Preview what would be backfilled
npm run supabase:backfill
```

Or via SQL:
```sql
SELECT public.backfill_all_missing_profiles(100, true);
```

**Review the output:**
- Check `total_missing` count
- Verify this matches your expectation
- Review any error messages

#### 6b. Execute Backfill

If dry run looks good:

```bash
# Execute actual backfill
bash ./scripts/backfill-profiles.sh false
```

Or via SQL:
```sql
SELECT public.backfill_all_missing_profiles(100, false);
```

**Monitor Progress:**
```sql
-- Check user_events for progress
SELECT 
  kind,
  COUNT(*) as count
FROM public.user_events
WHERE kind IN ('profile_backfilled', 'profile_backfill_error')
AND created_at > NOW() - INTERVAL '5 minutes'
GROUP BY kind;
```

### Step 7: Verify Completeness

After backfill, verify everything is consistent:

```sql
SELECT * FROM public.verify_profile_completeness();
```

**Expected Result (Success):**
```
| check_name                  | status | count | details                          |
|-----------------------------|--------|-------|----------------------------------|
| Auth users without profiles | PASS   | 0     | 0 users missing profiles         |
| Profiles without auth users | PASS   | 0     | 0 orphaned profiles              |
| Email consistency           | PASS   | 0     | 0 mismatched emails              |
```

### Step 8: Set Up Monitoring (Optional but Recommended)

#### Option A: Supabase Edge Function (Hourly Check)

Create a new edge function for monitoring:

```typescript
// supabase/functions/check-auth-health/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Check recent signup health
  const { data: health } = await supabase
    .rpc('monitor_signup_health');

  const healthCheck = health[0];
  
  if (healthCheck.health_percentage < 100) {
    // Send alert (implement your alerting logic)
    console.error('Auth health issue detected:', healthCheck);
    
    // TODO: Send email/Slack notification
    // await sendAlert(healthCheck);
  }

  return new Response(
    JSON.stringify({ status: 'ok', health: healthCheck }),
    { headers: { "Content-Type": "application/json" } }
  );
});
```

Deploy the function:
```bash
supabase functions deploy check-auth-health
```

Schedule it via cron (use external service like Vercel Cron, GitHub Actions, etc.):
```yaml
# .github/workflows/auth-health-check.yml
name: Auth Health Check
on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - name: Check Auth Health
        run: |
          curl -X POST \
            https://[PROJECT_REF].supabase.co/functions/v1/check-auth-health \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
```

#### Option B: Manual Monitoring Query

Save this query for regular checks:

```sql
-- Run this query hourly or daily
SELECT 
  NOW() as check_time,
  (SELECT COUNT(*) FROM auth.users) as total_users,
  (SELECT COUNT(*) FROM public.profiles) as total_profiles,
  (SELECT COUNT(*) FROM auth.users u 
   LEFT JOIN public.profiles p ON u.id = p.id 
   WHERE p.id IS NULL) as missing_profiles,
  (SELECT health_percentage FROM public.monitor_signup_health()) as health_pct;
```

## Post-Deployment Verification

### Test New Signup Flow

1. Create a test user via Supabase Auth:
   ```bash
   # Via Supabase Dashboard: Authentication → Users → Add User
   # Or via API
   ```

2. Immediately check if profile was created:
   ```sql
   SELECT 
     u.id,
     u.email,
     u.created_at as user_created,
     p.id as profile_id,
     p.created_at as profile_created
   FROM auth.users u
   LEFT JOIN public.profiles p ON u.id = p.id
   WHERE u.email = 'test@example.com';
   ```

3. Check user_events for logs:
   ```sql
   SELECT * FROM public.user_events
   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test@example.com')
   ORDER BY created_at DESC;
   ```

**Expected Events:**
- `auth_user_created`
- `profile_bootstrap_ok`

### Run Comprehensive Health Check

```bash
npm run supabase:diagnose
```

Review the full report and ensure:
- ✅ No missing profiles
- ✅ Trigger function exists
- ✅ Trigger is attached to auth.users
- ✅ RLS policies are in place
- ✅ No recent errors

## Troubleshooting

### Issue: Migrations Fail to Apply

**Symptoms:**
```
ERROR: relation "public.user_events" does not exist
```

**Solution:**
Ensure prerequisite tables exist. Run base schema first:
```bash
npm run supabase:provision
```

### Issue: Backfill Returns Errors

**Symptoms:**
```json
{"success": false, "error": "permission denied"}
```

**Solution:**
Ensure you're using service role or postgres credentials:
```bash
# Use service role key, not anon key
export SUPABASE_DB_URL="postgres://postgres:[PASSWORD]@..."
```

### Issue: Trigger Not Firing

**Symptoms:**
New users created but no profiles

**Check:**
```sql
-- Verify trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Check function exists
SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';
```

**Fix:**
```sql
-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### Issue: RLS Blocking Profile Creation

**Symptoms:**
`profile_bootstrap_error` events with "permission denied"

**Check:**
```sql
-- Verify function is SECURITY DEFINER
SELECT 
  proname,
  prosecdef
FROM pg_proc
WHERE proname = 'handle_new_user';
```

**Fix:**
```sql
-- Update function to SECURITY DEFINER
ALTER FUNCTION public.handle_new_user() SECURITY DEFINER;
```

## Rollback Procedure

If you need to rollback the changes:

### Option 1: Remove Diagnostic Tools Only

```sql
-- Remove views
DROP VIEW IF EXISTS public.auth_profile_mismatch CASCADE;
DROP VIEW IF EXISTS public.signup_audit_summary CASCADE;

-- Remove functions
DROP FUNCTION IF EXISTS public.diagnose_auth_profile_consistency();
DROP FUNCTION IF EXISTS public.get_auth_profile_mismatches(integer);
DROP FUNCTION IF EXISTS public.check_recent_signup_issues();
DROP FUNCTION IF EXISTS public.monitor_signup_health();
DROP FUNCTION IF EXISTS public.get_user_signup_events(uuid);
DROP FUNCTION IF EXISTS public.backfill_user_profile(uuid, text, text);
DROP FUNCTION IF EXISTS public.backfill_all_missing_profiles(integer, boolean);
DROP FUNCTION IF EXISTS public.verify_profile_completeness();
```

**Note:** This preserves backfilled profiles and the trigger function.

### Option 2: Full Rollback (Not Recommended)

```bash
# Restore from backup
psql "$SUPABASE_DB_URL" < backup-YYYYMMDD-HHMMSS.sql
```

**Warning:** This will remove ALL changes including backfilled profiles.

## Success Criteria

Deployment is successful when:

- ✅ All migrations applied without errors
- ✅ Diagnostic queries return results
- ✅ `verify_profile_completeness()` shows all PASS
- ✅ Test signup creates both user and profile
- ✅ `user_events` logs show `profile_bootstrap_ok`
- ✅ No missing profiles in diagnostics
- ✅ Monitoring queries work correctly

## Next Steps After Deployment

1. **Monitor for 24 hours**: Watch for any issues with new signups
2. **Set up alerts**: Implement monitoring as described above
3. **Document**: Add monitoring procedures to runbook
4. **Train team**: Ensure team knows how to use diagnostic tools
5. **Schedule reviews**: Add weekly health checks to maintenance schedule

## Support

For issues during deployment:

1. Check this guide's troubleshooting section
2. Review `docs/AUTH_PROFILE_CONSISTENCY_GUIDE.md`
3. Run diagnostics: `npm run supabase:diagnose`
4. Check Supabase logs in dashboard
5. Review `user_events` table for error details

## Maintenance Schedule

**Daily:**
- Review dashboard for signup metrics
- Check for any error alerts

**Weekly:**
- Run `diagnose_auth_profile_consistency()`
- Review `user_events` for patterns

**Monthly:**
- Full diagnostic report
- Review and optimize queries if needed
- Audit RLS policies

---

**Deployment Date:** _[Fill in when deployed]_  
**Deployed By:** _[Your name]_  
**Environment:** _[Production/Staging]_  
**Verification Status:** _[Pass/Fail]_
