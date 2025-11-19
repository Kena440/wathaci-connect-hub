# Complete Database Error Investigation & Fix Guide

**"Database error saving new user"** - Comprehensive Diagnostic & Solution Guide

This guide provides step-by-step instructions for investigating and fixing all common causes of database errors during user signup in a Supabase/Postgres environment.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start - Most Common Issues](#quick-start---most-common-issues)
4. [Detailed Investigation Steps](#detailed-investigation-steps)
5. [Root Cause Analysis](#root-cause-analysis)
6. [Fixes and Solutions](#fixes-and-solutions)
7. [Testing Your Fixes](#testing-your-fixes)
8. [Prevention and Monitoring](#prevention-and-monitoring)

---

## Overview

### What This Guide Covers

This comprehensive guide addresses the generic "Database error saving new user" error by:

1. **Identifying root causes** through systematic diagnosis
2. **Providing SQL queries** to inspect database state
3. **Offering concrete fixes** with copy-paste SQL
4. **Enhancing error handling** in frontend and backend
5. **Adding logging** for easier debugging
6. **Creating monitoring tools** to catch issues early

### Architecture Assumptions

- **Auth Provider:** Supabase Auth (email/password signup)
- **Database:** PostgreSQL (Supabase managed)
- **Frontend:** React/Next.js with TypeScript
- **Backend:** API routes or serverless functions
- **Tables:**
  - `auth.users` (Supabase internal auth table)
  - `public.profiles` (custom profile table linked to auth.users)

---

## Prerequisites

### Required Access

- [ ] Supabase Dashboard access (https://supabase.com/dashboard)
- [ ] Supabase SQL Editor access
- [ ] Environment variables for your project
- [ ] Git access to your repository
- [ ] Ability to view Supabase logs

### Required Knowledge

- Basic SQL understanding
- Familiarity with Supabase Row Level Security (RLS)
- Understanding of your signup flow
- Access to error logs (Supabase Dashboard → Logs)

---

## Quick Start - Most Common Issues

### Issue 1: RLS Policy Blocking Inserts

**Symptom:** User creation succeeds but profile insert fails

**Quick Fix:**
```sql
-- Check current INSERT policies
SELECT policyname, with_check
FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'INSERT';

-- Fix: Ensure users can insert their own profile
DROP POLICY IF EXISTS profiles_insert_owner ON public.profiles;
CREATE POLICY profiles_insert_owner ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());
```

### Issue 2: NOT NULL Violation

**Symptom:** Error mentions "null value" or "not-null constraint"

**Quick Fix:**
```sql
-- Check which columns are NOT NULL
SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND is_nullable = 'NO';

-- Option 1: Add defaults
ALTER TABLE public.profiles
  ALTER COLUMN full_name SET DEFAULT '';

-- Option 2: Make nullable (if appropriate)
ALTER TABLE public.profiles
  ALTER COLUMN full_name DROP NOT NULL;
```

### Issue 3: Unique Constraint Violation (Duplicate Email)

**Symptom:** Error mentions "duplicate key" or "already exists"

**Quick Fix:**
```sql
-- Check for duplicate emails
SELECT email, COUNT(*) 
FROM public.profiles 
GROUP BY email 
HAVING COUNT(*) > 1;

-- Clean up duplicates (development only!)
-- Keep only the most recent profile per email
DELETE FROM public.profiles a
USING public.profiles b
WHERE a.email = b.email
  AND a.created_at < b.created_at;
```

### Issue 4: Trigger Function Failure

**Symptom:** Error occurs during auth.users insert

**Quick Fix:**
```sql
-- Check if trigger is enabled
SELECT trigger_name, tgenabled
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND event_object_schema = 'auth';

-- Temporarily disable trigger for testing
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

-- Test signup (should work if trigger is the issue)

-- Re-enable trigger
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
```

### Issue 5: Environment Misconfiguration

**Symptom:** Works locally but fails in production (or vice versa)

**Quick Fix:** See [ENVIRONMENT_VARIABLES_CHECKLIST.md](./ENVIRONMENT_VARIABLES_CHECKLIST.md)

---

## Detailed Investigation Steps

### Step 1: Gather Error Information

#### 1.1 Check Supabase Logs

Go to: **Supabase Dashboard → Logs → Postgres Logs**

Look for recent errors around the time of failed signup:
- Unique constraint violations
- NOT NULL violations
- RLS policy violations
- Trigger/function errors

#### 1.2 Check Frontend Console

Open browser DevTools → Console when attempting signup.

With the enhanced error handling, you should see:
```
🔒 [Auth Error] signup-email
  Error Category: database
  Error Code: DATABASE_ERROR
  User Message: We're having trouble creating your account...
  Original Message: <detailed error from Supabase>
```

#### 1.3 Check Profile Errors Table

If you've applied the enhanced migrations:
```sql
SELECT 
  user_id,
  error_message,
  error_context,
  error_time
FROM public.profile_errors
WHERE error_time > now() - interval '24 hours'
ORDER BY error_time DESC
LIMIT 10;
```

### Step 2: Run Diagnostic Queries

See [DATABASE_DIAGNOSTIC_GUIDE.md](./DATABASE_DIAGNOSTIC_GUIDE.md) for comprehensive SQL queries.

#### Quick Diagnostic Suite

```sql
-- 1. Check profiles table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'profiles'
);

-- 2. Check RLS is configured
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'profiles';

-- 3. Check for duplicate emails
SELECT LOWER(email), COUNT(*) FROM public.profiles
GROUP BY LOWER(email) HAVING COUNT(*) > 1;

-- 4. Check NOT NULL columns
SELECT column_name, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND is_nullable = 'NO';

-- 5. Check triggers are active
SELECT trigger_name, tgenabled
FROM information_schema.triggers
WHERE event_object_schema = 'auth' AND event_object_table = 'users';
```

### Step 3: Identify the Root Cause

Match the error pattern with the diagnostic results:

| Error Pattern | Likely Cause | Diagnostic Query Result |
|---------------|--------------|-------------------------|
| "duplicate key" or "unique constraint" | Unique constraint violation | Step 2, Query #3 shows duplicates |
| "null value" or "not-null constraint" | Missing required field | Step 2, Query #4 shows NOT NULL without defaults |
| "row-level security policy" | RLS blocking insert | Step 2, Query #2 shows RLS enabled |
| "function raised exception" | Trigger failure | Step 2, Query #5 shows trigger issue or profile_errors table has entries |
| "permission denied" | Missing grants | Check table_privileges in diagnostic guide |

---

## Root Cause Analysis

### Cause 1: Unique Constraint Violations

**What happens:**
- Email already exists in `profiles` table
- OR duplicate constraint on another field (username, phone, etc.)

**Why it causes "Database error":**
- Postgres rejects the INSERT with error code 23505
- Frontend receives generic error message
- User sees "Database error saving new user"

**How to confirm:**
```sql
-- Check constraints
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass
  AND contype = 'u';

-- Test if email exists
SELECT id, email, created_at 
FROM public.profiles 
WHERE email = 'test@example.com';
```

**Fix:** See [Fixes and Solutions](#fix-1-resolve-unique-constraint-violations)

---

### Cause 2: NOT NULL Violations

**What happens:**
- A required field doesn't have a default value
- Trigger or signup code doesn't provide value
- Database rejects INSERT

**Why it causes "Database error":**
- Postgres error code 23502 (not_null_violation)
- Stops the entire user creation transaction

**How to confirm:**
```sql
-- List NOT NULL columns without defaults
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' 
  AND is_nullable = 'NO'
  AND column_default IS NULL
ORDER BY ordinal_position;
```

**Fix:** See [Fixes and Solutions](#fix-2-resolve-not-null-violations)

---

### Cause 3: Trigger/Function Failures

**What happens:**
- `handle_new_user()` trigger runs after auth.users insert
- Trigger encounters an error (constraint, RLS, bug)
- Entire transaction rolls back

**Why it causes "Database error":**
- If trigger fails, auth.users insert is rolled back
- User sees error but account isn't created
- No error details logged (without enhanced trigger)

**How to confirm:**
```sql
-- View trigger function
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'handle_new_user';

-- Check profile_errors table (if using enhanced trigger)
SELECT * FROM public.profile_errors
ORDER BY error_time DESC LIMIT 5;
```

**Fix:** See [Fixes and Solutions](#fix-3-enhance-trigger-function)

---

### Cause 4: Row-Level Security (RLS) Blocking Inserts

**What happens:**
- RLS is enabled on `profiles` table
- No INSERT policy exists, or policy blocks the insert
- authenticated role can't insert own profile

**Why it causes "Database error":**
- Postgres error: "new row violates row-level security policy"
- User creation succeeds in auth.users but fails in profiles

**How to confirm:**
```sql
-- Check RLS status
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename = 'profiles';

-- Check INSERT policies
SELECT policyname, permissive, roles, with_check
FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'INSERT';
```

**Fix:** See [Fixes and Solutions](#fix-4-configure-rls-policies)

---

### Cause 5: Missing/Incorrect Environment Variables

**What happens:**
- Frontend and backend point to different Supabase projects
- Invalid API keys
- Wrong database connection

**Why it causes "Database error":**
- Frontend uses Project A, backend uses Project B
- Auth succeeds but profile insert targets wrong database
- Or connection fails entirely

**How to confirm:**
See [ENVIRONMENT_VARIABLES_CHECKLIST.md](./ENVIRONMENT_VARIABLES_CHECKLIST.md)

**Fix:** See [Fixes and Solutions](#fix-5-verify-environment-configuration)

---

## Fixes and Solutions

### Fix 1: Resolve Unique Constraint Violations

#### Solution A: Clean Up Duplicate Data

```sql
BEGIN;

-- Find duplicates
SELECT 
  LOWER(email) as email_lower,
  COUNT(*) as count,
  array_agg(id ORDER BY created_at DESC) as user_ids,
  array_agg(created_at ORDER BY created_at DESC) as created_dates
FROM public.profiles
GROUP BY LOWER(email)
HAVING COUNT(*) > 1;

-- Keep only the most recent profile per email
-- ⚠️ Only run this in development or with a backup!
DELETE FROM public.profiles
WHERE id IN (
  SELECT id FROM (
    SELECT id, email,
      ROW_NUMBER() OVER (PARTITION BY LOWER(email) ORDER BY created_at DESC) as rn
    FROM public.profiles
  ) t
  WHERE rn > 1
);

COMMIT;
```

#### Solution B: Ensure Case-Insensitive Email Uniqueness

```sql
BEGIN;

-- Drop existing case-sensitive constraint
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'profiles'
    AND con.contype = 'u'
    AND pg_get_constraintdef(con.oid) LIKE '%email%'
  LIMIT 1;
  
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || constraint_name;
  END IF;
END $$;

-- Create case-insensitive unique index
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_lower_unique_idx 
  ON public.profiles (LOWER(email));

COMMIT;
```

#### Solution C: Improve Frontend Validation

Update signup form to normalize email before sending:

```typescript
// In SignupForm.tsx (already implemented)
const normalizedEmail = values.email.trim().toLowerCase();
```

---

### Fix 2: Resolve NOT NULL Violations

#### Solution A: Add Safe Defaults

```sql
BEGIN;

-- Add defaults to commonly empty fields
ALTER TABLE public.profiles
  ALTER COLUMN full_name SET DEFAULT '',
  ALTER COLUMN company_name SET DEFAULT NULL,  -- or '' if NOT NULL
  ALTER COLUMN phone SET DEFAULT NULL;

-- Verify changes
SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

COMMIT;
```

#### Solution B: Make Columns Nullable (If Appropriate)

```sql
BEGIN;

-- Make optional fields nullable
ALTER TABLE public.profiles
  ALTER COLUMN full_name DROP NOT NULL,
  ALTER COLUMN company_name DROP NOT NULL;

-- Keep essential fields required
-- ALTER TABLE public.profiles
--   ALTER COLUMN email SET NOT NULL;  -- email should always be required

COMMIT;
```

#### Solution C: Update Trigger to Provide Defaults

Already implemented in: `supabase/migrations/20251119164600_enhance_handle_new_user_trigger.sql`

The enhanced trigger provides safe defaults:
```sql
v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
v_account_type := COALESCE((NEW.raw_user_meta_data->>'account_type')::public.account_type_enum, 'SME');
```

---

### Fix 3: Enhance Trigger Function

**Already Implemented:** Apply migrations:
- `supabase/migrations/20251119164500_add_profile_errors_table.sql`
- `supabase/migrations/20251119164600_enhance_handle_new_user_trigger.sql`

These migrations:
1. Create `profile_errors` table for logging
2. Enhance `handle_new_user()` with comprehensive error handling
3. Prevent trigger failures from blocking user creation

To apply:
```bash
# Using Supabase CLI
cd /path/to/your/project
supabase db push

# Or manually in SQL Editor
-- Copy and paste the SQL from the migration files
```

---

### Fix 4: Configure RLS Policies

```sql
BEGIN;

-- Enable RLS if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop conflicting policies
DROP POLICY IF EXISTS profiles_insert_none ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_owner ON public.profiles;
DROP POLICY IF EXISTS profiles_select_owner ON public.profiles;
DROP POLICY IF EXISTS profiles_update_owner ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;

-- Allow users to insert their own profile
CREATE POLICY profiles_insert_owner ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Allow users to view their own profile
CREATE POLICY profiles_select_owner ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Allow users to update their own profile
CREATE POLICY profiles_update_owner ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Allow admins to access all profiles
CREATE POLICY profiles_admin_all ON public.profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.account_type = 'ADMIN'
    )
  );

COMMIT;
```

---

### Fix 5: Verify Environment Configuration

See [ENVIRONMENT_VARIABLES_CHECKLIST.md](./ENVIRONMENT_VARIABLES_CHECKLIST.md) for complete guide.

**Quick checks:**

1. **Frontend (.env.local):**
   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

2. **Backend (.env):**
   ```bash
   SUPABASE_URL=https://your-project.supabase.co  # Same as frontend!
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
   ```

3. **Verify in Supabase Dashboard:**
   - Settings → API
   - Copy Project URL and keys
   - Compare with your .env files

---

## Testing Your Fixes

### Test 1: Basic Signup Flow

```bash
# 1. Start your development server
npm run dev

# 2. Open browser to signup page
# 3. Fill in the form with test data
# 4. Submit and observe:
#    - Check browser console for errors
#    - Check Supabase Dashboard → Auth → Users
#    - Check Supabase Dashboard → Table Editor → profiles
```

### Test 2: Check Profile Created

```sql
-- Find the user you just created
SELECT 
  u.id,
  u.email,
  u.created_at as auth_created,
  p.full_name,
  p.account_type,
  p.created_at as profile_created
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'your-test@example.com';
```

Expected: Both auth.users and profiles records exist with matching IDs.

### Test 3: Check Error Logging

```sql
-- Check if any errors were logged
SELECT 
  user_id,
  error_message,
  error_context,
  error_time
FROM public.profile_errors
WHERE error_time > now() - interval '1 hour'
ORDER BY error_time DESC;
```

Expected: No errors (or errors are marked as resolved).

### Test 4: Test Duplicate Email

Try signing up again with the same email.

Expected:
- Friendly error message: "An account with this email already exists"
- No database error
- User sees suggestion to sign in instead

### Test 5: Test Edge Cases

```bash
# Test with different email formats
test+1@example.com
Test@Example.COM  # Should be case-insensitive

# Test with long names
# Test with special characters in name
# Test with missing optional fields
```

---

## Prevention and Monitoring

### 1. Add Monitoring

Create a view for easy monitoring:

```sql
CREATE OR REPLACE VIEW public.signup_health AS
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE created_at > now() - interval '24 hours') as users_last_24h,
  COUNT(*) FILTER (WHERE created_at > now() - interval '1 hour') as users_last_hour
FROM auth.users;

CREATE OR REPLACE VIEW public.profile_health AS
SELECT
  (SELECT COUNT(*) FROM auth.users) as total_auth_users,
  (SELECT COUNT(*) FROM public.profiles) as total_profiles,
  (SELECT COUNT(*) FROM auth.users u WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
  )) as orphaned_auth_users,
  (SELECT COUNT(*) FROM public.profile_errors WHERE NOT resolved) as unresolved_errors
;
```

Query these regularly:
```sql
SELECT * FROM public.signup_health;
SELECT * FROM public.profile_health;
```

### 2. Set Up Alerts

In Supabase Dashboard:
- Settings → Webhooks
- Create webhook for auth events
- Monitor failed signups

### 3. Regular Cleanup

Schedule regular checks:

```sql
-- Find users without profiles (should be 0)
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
  AND u.created_at < now() - interval '5 minutes';

-- Clean up old test data (development only)
DELETE FROM auth.users
WHERE email LIKE '%test%@%'
  AND created_at < now() - interval '7 days';
```

### 4. Enhanced Frontend Error Handling

Already implemented in: `src/lib/authErrorHandler.ts`

This provides:
- Detailed error categorization
- User-friendly messages
- Development logging
- Error reporting flags

### 5. Documentation

Keep this guide updated:
- Document any new error patterns
- Add project-specific fixes
- Update after schema changes

---

## Related Documentation

- [DATABASE_DIAGNOSTIC_GUIDE.md](./DATABASE_DIAGNOSTIC_GUIDE.md) - Comprehensive SQL diagnostic queries
- [ENVIRONMENT_VARIABLES_CHECKLIST.md](./ENVIRONMENT_VARIABLES_CHECKLIST.md) - Environment configuration guide
- [DATABASE_ERROR_FIX.md](./DATABASE_ERROR_FIX.md) - Previous fix documentation (case-insensitive emails)
- [DATABASE_SETUP.md](./DATABASE_SETUP.md) - Initial database setup guide

## Migration Files

- `supabase/migrations/20251119164500_add_profile_errors_table.sql` - Error logging table
- `supabase/migrations/20251119164600_enhance_handle_new_user_trigger.sql` - Enhanced trigger with error handling
- `supabase/migrations/20250501093000_wathaci_profiles_schema.sql` - Original profiles schema
- `supabase/migrations/20250201090000_ensure_profile_exists.sql` - Profile creation function
- `supabase/migrations/20250309100000_profiles_insert_owner.sql` - RLS insert policy

## Code Files

- `src/components/auth/SignupForm.tsx` - Enhanced signup form with error handling
- `src/lib/authErrorHandler.ts` - Comprehensive error parsing and logging
- `src/lib/supabaseClient.ts` - Supabase client configuration

---

## Summary

This guide provides a comprehensive approach to diagnosing and fixing "Database error saving new user" issues:

1. ✅ Systematic diagnostic procedures
2. ✅ SQL queries for every check
3. ✅ Concrete fixes with copy-paste SQL
4. ✅ Enhanced error logging
5. ✅ Improved error handling
6. ✅ Testing procedures
7. ✅ Prevention strategies
8. ✅ Monitoring tools

**Next Steps:**

1. Apply the enhanced migrations
2. Run diagnostic queries
3. Apply relevant fixes
4. Test the signup flow
5. Monitor profile_errors table
6. Set up regular health checks

For questions or issues, refer to the specific documentation files or check the Supabase logs.
