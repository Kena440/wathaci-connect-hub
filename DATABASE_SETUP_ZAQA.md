# Database Setup for ZAQA Sign-Up Flow

This guide provides step-by-step instructions for setting up the database to support the new ZAQA sign-up flow.

## Prerequisites

- Supabase project set up and accessible
- Access to Supabase SQL Editor OR Supabase CLI installed

## Setup Steps

### Step 1: Apply Database Migration

Choose one of the following methods:

#### Method A: Using Supabase SQL Editor (Recommended for first-time setup)

1. Log in to your Supabase dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `backend/supabase/add_signup_fields.sql`
5. Paste into the SQL Editor
6. Click **Run** or press `Ctrl+Enter`
7. Verify success messages appear in the Results panel

Expected output:
```
NOTICE: Added accepted_terms column to profiles table
NOTICE: Added newsletter_opt_in column to profiles table
NOTICE: Column created_at already exists
NOTICE: Column updated_at already exists
```

Or if columns already exist:
```
NOTICE: Column accepted_terms already exists
NOTICE: Column newsletter_opt_in already exists
...
```

#### Method B: Using Supabase CLI

```bash
# Navigate to project root
cd /path/to/WATHACI-CONNECT.-V1

# Ensure you're logged in to Supabase CLI
supabase login

# Link to your project (if not already linked)
supabase link --project-ref your-project-ref

# Run the migration
supabase db query < backend/supabase/add_signup_fields.sql
```

### Step 2: Verify Migration

Run this query to confirm the new columns exist:

```sql
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN ('accepted_terms', 'newsletter_opt_in', 'created_at', 'updated_at')
ORDER BY column_name;
```

Expected result:

| column_name       | data_type | is_nullable | column_default |
|-------------------|-----------|-------------|----------------|
| accepted_terms    | boolean   | NO          | false          |
| created_at        | timestamp | NO          | timezone(...)  |
| newsletter_opt_in | boolean   | NO          | false          |
| updated_at        | timestamp | NO          | timezone(...)  |

### Step 3: Verify RLS Policies

The existing RLS policies should automatically cover the new fields. Verify with:

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
ORDER BY policyname;
```

Expected policies:
- `Profiles are viewable by owners` (SELECT)
- `Profiles are insertable by owners` (INSERT)
- `Profiles are updatable by owners` (UPDATE)

### Step 4: Test Profile Creation

Test that new profiles can be created with the new fields:

```sql
-- This is a test query - don't actually run this in production
-- The sign-up flow will handle profile creation

-- Check if test works by viewing the structure
SELECT 
  id,
  email,
  account_type,
  accepted_terms,
  newsletter_opt_in,
  created_at
FROM profiles
LIMIT 1;
```

## Verification Checklist

After completing the setup:

- [ ] Migration script ran without errors
- [ ] `accepted_terms` column exists in profiles table
- [ ] `newsletter_opt_in` column exists in profiles table
- [ ] Both columns have default value of `false`
- [ ] `created_at` and `updated_at` columns exist
- [ ] RLS policies are enabled on profiles table
- [ ] Test profile query returns expected columns

## Troubleshooting

### Error: Column already exists

This is normal if running the migration multiple times. The script is idempotent and will skip existing columns.

### Error: Permission denied

Ensure you have admin/owner access to the Supabase project. The migration requires CREATE and ALTER permissions.

### Error: Relation "profiles" does not exist

The profiles table must be created first. Run the core schema setup:

```bash
# First run core schema
supabase db query < backend/supabase/core_schema.sql

# Then run the signup fields migration
supabase db query < backend/supabase/add_signup_fields.sql
```

## Optional: Backfill Existing Profiles

If you have existing user profiles and want to set default values:

```sql
-- Backfill accepted_terms for existing profiles
-- Only if you want to mark existing users as having accepted terms
UPDATE profiles
SET accepted_terms = true
WHERE created_at < NOW() - INTERVAL '1 day'
  AND accepted_terms = false;

-- Newsletter opt-in should stay false for existing users
-- They can opt-in manually from their profile settings
```

**Warning**: Only backfill `accepted_terms` if your existing users have implicitly accepted terms during their original signup.

## RLS Policy Details

The migration doesn't add new RLS policies because the existing policies already cover the new columns:

### SELECT Policy: "Profiles are viewable by owners"
```sql
CREATE POLICY "Profiles are viewable by owners"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);
```
✅ Allows users to read their own `accepted_terms` and `newsletter_opt_in`

### INSERT Policy: "Profiles are insertable by owners"
```sql
CREATE POLICY "Profiles are insertable by owners"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);
```
✅ Allows users to set these fields during profile creation

### UPDATE Policy: "Profiles are updatable by owners"
```sql
CREATE POLICY "Profiles are updatable by owners"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```
✅ Allows users to update their newsletter preferences

## Post-Setup

Once the database is ready:

1. Deploy the updated frontend with the new sign-up page
2. Test the complete sign-up flow
3. Monitor the `profiles` table for new sign-ups
4. Set up newsletter automation (optional)

## Rollback

If you need to remove the new columns:

```sql
BEGIN;

-- Remove the columns
ALTER TABLE public.profiles DROP COLUMN IF EXISTS accepted_terms;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS newsletter_opt_in;

COMMIT;
```

**Warning**: This will delete all data in these columns. Only do this if you're sure no production data depends on them.

## Next Steps

1. ✅ Database migration complete
2. → Test the sign-up flow at `/signup-zaqa`
3. → Monitor sign-ups and verify data is being stored correctly
4. → Set up newsletter integration (if using newsletter opt-in)
5. → Consider making ZAQA sign-up the default

## Support

If you encounter issues:

1. Check Supabase logs: Dashboard → Logs
2. Verify your Supabase project tier supports the required features
3. Ensure RLS is enabled on the profiles table
4. Check that the `handle_new_auth_user()` trigger exists and is active

## Related Documentation

- [ZAQA_SIGNUP_IMPLEMENTATION.md](./ZAQA_SIGNUP_IMPLEMENTATION.md) - Complete implementation guide
- [backend/supabase/core_schema.sql](./backend/supabase/core_schema.sql) - Core database schema
- [backend/supabase/profiles_policies.sql](./backend/supabase/profiles_policies.sql) - RLS policies
- [backend/supabase/add_signup_fields.sql](./backend/supabase/add_signup_fields.sql) - This migration
