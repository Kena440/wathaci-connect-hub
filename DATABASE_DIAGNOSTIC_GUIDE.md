# Database Error Diagnosis - SQL Queries & Investigation Guide

This document provides comprehensive SQL queries and procedures for diagnosing "Database error saving new user" issues in a Supabase/Postgres environment.

## Table of Contents

1. [Quick Diagnostic Checklist](#quick-diagnostic-checklist)
2. [Log Analysis Patterns](#log-analysis-patterns)
3. [Constraint Violation Checks](#constraint-violation-checks)
4. [NOT NULL and Default Value Checks](#not-null-and-default-value-checks)
5. [Trigger and Function Inspection](#trigger-and-function-inspection)
6. [Row-Level Security (RLS) Checks](#row-level-security-rls-checks)
7. [Schema and Permissions Verification](#schema-and-permissions-verification)
8. [Environment Configuration Checks](#environment-configuration-checks)
9. [Common Fixes](#common-fixes)

---

## Quick Diagnostic Checklist

Run these queries in order to quickly identify common issues:

### 1. Check if profiles table exists and is accessible
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'profiles'
) as profiles_exists;
```

### 2. Check recent profile errors (if using enhanced trigger)
```sql
SELECT 
  id,
  user_id,
  error_message,
  error_context,
  error_time,
  resolved
FROM public.profile_errors
WHERE error_time > now() - interval '24 hours'
ORDER BY error_time DESC
LIMIT 20;
```

### 3. Check for duplicate emails in profiles
```sql
SELECT 
  email, 
  COUNT(*) as count
FROM public.profiles
GROUP BY email
HAVING COUNT(*) > 1;
```

### 4. Check RLS status on profiles
```sql
SELECT 
  schemaname, 
  tablename, 
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'profiles';
```

### 5. Check active RLS policies
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
WHERE schemaname = 'public'
  AND tablename = 'profiles'
ORDER BY policyname;
```

---

## Log Analysis Patterns

When reviewing Supabase logs (available in Dashboard → Logs → Postgres or API), look for these patterns:

### Unique Constraint Violation
```
ERROR: duplicate key value violates unique constraint "profiles_email_key"
DETAIL: Key (email)=(test@example.com) already exists.
```

**What it means:** An email address already exists in the profiles table.

**How to diagnose:**
```sql
-- Check if email exists
SELECT id, email, created_at 
FROM public.profiles 
WHERE email = 'test@example.com';

-- Check in auth.users too
SELECT id, email, created_at
FROM auth.users
WHERE email = 'test@example.com';
```

### NOT NULL Violation
```
ERROR: null value in column "account_type" violates not-null constraint
DETAIL: Failing row contains (uuid, email@example.com, null, ...).
```

**What it means:** A required field is missing or NULL.

**How to diagnose:**
```sql
-- Check which columns are NOT NULL
SELECT 
  column_name, 
  is_nullable, 
  column_default, 
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND is_nullable = 'NO'
ORDER BY ordinal_position;
```

### RLS Policy Violation
```
ERROR: new row violates row-level security policy for table "profiles"
```

**What it means:** The RLS policy is blocking the insert operation.

**How to diagnose:**
```sql
-- Check INSERT policies
SELECT 
  policyname,
  permissive,
  roles,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
  AND cmd = 'INSERT';
```

### Trigger/Function Failure
```
ERROR: function public.handle_new_user() raised an exception
DETAIL: <specific error message>
```

**What it means:** The trigger function encountered an error.

**How to diagnose:**
```sql
-- View the trigger function definition
SELECT 
  pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'handle_new_user'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Check if trigger is enabled
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  tgenabled
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users'
  AND trigger_name = 'on_auth_user_created';
```

---

## Constraint Violation Checks

### Check all constraints on profiles table
```sql
SELECT
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  CASE con.contype
    WHEN 'c' THEN 'CHECK'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'x' THEN 'EXCLUSION'
    ELSE con.contype::text
  END AS constraint_type_desc,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = connamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'profiles'
ORDER BY con.contype, con.conname;
```

### Check unique indexes on profiles
```sql
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'profiles'
ORDER BY indexname;
```

### Find duplicate data that might violate unique constraints
```sql
-- Check for duplicate emails (case-insensitive)
SELECT 
  LOWER(email) as normalized_email,
  COUNT(*) as count,
  array_agg(id) as user_ids
FROM public.profiles
GROUP BY LOWER(email)
HAVING COUNT(*) > 1;

-- Check for duplicate IDs (should never happen)
SELECT 
  id,
  COUNT(*) as count
FROM public.profiles
GROUP BY id
HAVING COUNT(*) > 1;
```

---

## NOT NULL and Default Value Checks

### List all NOT NULL columns and their defaults
```sql
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY 
  CASE is_nullable WHEN 'NO' THEN 1 ELSE 2 END,
  ordinal_position;
```

### Check for profiles with missing required data
```sql
-- Check for profiles with NULL values in important fields
SELECT 
  id,
  email,
  full_name,
  account_type,
  created_at
FROM public.profiles
WHERE email IS NULL 
   OR email = ''
   OR account_type IS NULL
LIMIT 20;
```

---

## Trigger and Function Inspection

### List all triggers on auth.users
```sql
SELECT 
  trigger_schema,
  trigger_name,
  event_manipulation,
  event_object_schema,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users'
ORDER BY trigger_name;
```

### Get complete trigger function definition
```sql
-- View handle_new_user function
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'handle_new_user'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```

### Temporarily disable trigger for debugging
```sql
-- CAUTION: Only do this in development!
-- This will prevent automatic profile creation
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

-- To re-enable:
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
```

---

## Row-Level Security (RLS) Checks

### Check if RLS is enabled on tables
```sql
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'registrations', 'donations')
ORDER BY tablename;
```

### View all RLS policies in detail
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
ORDER BY 
  CASE cmd 
    WHEN 'INSERT' THEN 1
    WHEN 'SELECT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
    ELSE 5
  END,
  policyname;
```

### Test if current user can insert into profiles
```sql
-- This must be run as an authenticated user, not as postgres superuser
-- You can test this from a Supabase Edge Function or client code

-- Check current user context
SELECT 
  auth.uid() as current_user_id,
  auth.role() as current_role;

-- Try to insert (will show RLS error if blocked)
INSERT INTO public.profiles (id, email, account_type)
VALUES (
  auth.uid(),
  'test@example.com',
  'SME'
)
ON CONFLICT (id) DO NOTHING;
```

---

## Schema and Permissions Verification

### Verify profiles table structure
```sql
-- Get complete table structure
\d+ public.profiles;

-- Or using standard SQL
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  column_default,
  is_nullable,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;
```

### Check table permissions
```sql
SELECT 
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY grantee, privilege_type;
```

### Check sequence permissions (if using serial columns)
```sql
-- List sequences
SELECT 
  sequence_schema,
  sequence_name
FROM information_schema.sequences
WHERE sequence_schema = 'public';

-- Check permissions
SELECT 
  grantee,
  privilege_type
FROM information_schema.usage_privileges
WHERE object_schema = 'public'
  AND object_type = 'SEQUENCE';
```

---

## Environment Configuration Checks

### Verify Supabase project configuration

These checks should be done in your application code or via Supabase Dashboard:

**Frontend (.env.local or .env):**
```bash
# Check these variables exist and are correct
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

**Backend (.env):**
```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

### SQL query to verify project metadata
```sql
-- Check current database name
SELECT current_database();

-- Check current schema
SELECT current_schema();

-- Check Postgres version
SELECT version();

-- Check installed extensions
SELECT 
  extname,
  extversion
FROM pg_extension
ORDER BY extname;
```

---

## Common Fixes

### Fix 1: Add safe defaults to NOT NULL columns

```sql
-- Add default for full_name if it's causing issues
ALTER TABLE public.profiles
  ALTER COLUMN full_name SET DEFAULT '';

-- Or make it nullable
ALTER TABLE public.profiles
  ALTER COLUMN full_name DROP NOT NULL;
```

### Fix 2: Recreate case-insensitive unique email constraint

```sql
-- Drop case-sensitive unique constraint (adapt the constraint name)
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = connamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'profiles'
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
```

### Fix 3: Fix RLS policies for insert operations

```sql
-- Remove overly restrictive policy
DROP POLICY IF EXISTS profiles_insert_none ON public.profiles;

-- Create proper insert policy
CREATE POLICY profiles_insert_owner ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());
```

### Fix 4: Recreate profiles table with correct schema (NUCLEAR OPTION)

```sql
-- ⚠️ WARNING: This drops all profile data!
-- Only use in development or with a backup

BEGIN;

-- Drop existing table
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Recreate with correct schema
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  account_type public.account_type_enum NOT NULL DEFAULT 'SME',
  company_name text,
  phone text,
  msisdn text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Create indexes
CREATE UNIQUE INDEX profiles_email_lower_unique_idx ON public.profiles (LOWER(email));
CREATE INDEX profiles_account_type_idx ON public.profiles (account_type);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies (see RLS section for complete policies)

COMMIT;
```

### Fix 5: Clean up test data

```sql
-- Delete test users (development only!)
BEGIN;

-- Find test users
SELECT id, email, created_at
FROM auth.users
WHERE email LIKE '%test%@%'
   OR email LIKE '%example.com%'
ORDER BY created_at DESC;

-- Delete test users (uncomment to execute)
-- DELETE FROM auth.users
-- WHERE email LIKE '%test%@%'
--    OR email LIKE '%example.com%';

COMMIT;
```

### Fix 6: Grant necessary permissions

```sql
-- Grant table permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- Grant execute permission on functions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_profile_exists(uuid, text, text, text, text) TO authenticated;
```

---

## Debugging Checklist

When investigating "Database error saving new user":

- [ ] Check Supabase Dashboard → Logs → Postgres for recent errors
- [ ] Run Quick Diagnostic Checklist queries above
- [ ] Check profile_errors table for logged errors (if using enhanced trigger)
- [ ] Verify environment variables match between frontend and backend
- [ ] Check RLS policies allow INSERT for authenticated users
- [ ] Verify all NOT NULL columns have defaults or are provided by signup form
- [ ] Check for duplicate emails in profiles table
- [ ] Ensure handle_new_user trigger is enabled and not failing
- [ ] Test signup with a fresh email address
- [ ] Check if the issue is specific to certain email formats or account types

---

## Related Files

- Migration: `supabase/migrations/20251119164500_add_profile_errors_table.sql`
- Migration: `supabase/migrations/20251119164600_enhance_handle_new_user_trigger.sql`
- Documentation: `DATABASE_DIAGNOSTIC_GUIDE.md` (this file)
- Frontend: `src/components/auth/SignupForm.tsx`
- Supabase Client: `src/lib/supabaseClient.ts`
