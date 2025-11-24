# Profile Creation Troubleshooting Guide

## Overview

This guide helps diagnose and fix issues with user profile creation in WATHACI CONNECT. Profile creation should happen automatically when users sign up, triggered by the `on_auth_user_created` database trigger.

## How Profile Creation Works

### Automatic Profile Creation (Primary Method)

When a user signs up via Supabase Auth:

1. User record is created in `auth.users` table
2. Database trigger `on_auth_user_created` fires
3. Trigger function `handle_new_user()` automatically creates a profile in `public.profiles`
4. Profile is populated with email, account_type from user metadata, and default values

**Source**:
- Canonical trigger/function: `supabase/migrations/20251119164600_enhance_handle_new_user_trigger.sql`
- Provisioning helper: `backend/supabase/profiles_policies.sql` (installs `handle_new_user()` if missing)

### Fallback Profile Creation (Application-Level)

If the automatic trigger fails or profile doesn't exist:

1. Application checks for user profile after sign-up
2. If no profile found (PGRST116 error), application creates profile manually
3. Profile is created using `profileService.createProfile()`
4. Profile data is inferred from user metadata

**Source**: `src/contexts/AppContext.tsx` (lines 284-324, 442-474)

## Common Issues and Solutions

### Issue 1: Trigger Not Installed

**Symptom**: Profiles are never created automatically after sign-up

**Diagnosis**:
```sql
-- Check if trigger exists
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
```

**Solution**:
```bash
# Re-run the provisioning script to install the trigger
npm run supabase:provision
```

Or manually run:
```sql
-- From supabase/migrations/20251119164600_enhance_handle_new_user_trigger.sql (canonical)
-- Recreate the trigger if it is missing
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

If the function itself is missing (e.g., local dev before migrations run), the
provisioning helper installs a minimal fallback:

```sql
-- From backend/supabase/profiles_policies.sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'handle_new_user' AND n.nspname = 'public'
  ) THEN
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, auth
    AS $$
    DECLARE
      v_email text;
      v_account_type text;
    BEGIN
      v_email := COALESCE(NEW.email, NEW.raw_user_meta_data ->> 'email');
      v_account_type := COALESCE((NEW.raw_user_meta_data ->> 'account_type')::text, 'SME');

      INSERT INTO public.profiles (id, email, account_type, created_at, updated_at)
      VALUES (
        NEW.id,
        v_email,
        v_account_type,
        timezone('utc', now()),
        timezone('utc', now())
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        account_type = COALESCE(public.profiles.account_type, EXCLUDED.account_type),
        updated_at = timezone('utc', now());

      RETURN NEW;
    EXCEPTION
      WHEN unique_violation THEN
        RETURN NEW;
    END;
    $$;
  END IF;
END;
$$;
```

**Note**: The cleanup migration `supabase/migrations/20251120133000_cleanup_profile_triggers.sql`
drops older duplicate triggers (`auth_create_profile`, `auth_user_created_trigger`) and ensures
`on_auth_user_created` points to `handle_new_user()`.

### Issue 2: RLS Policies Blocking Profile Creation

**Symptom**: Trigger fires but profile creation fails with permission error

**Diagnosis**:
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'profiles';

-- Check policies
SELECT policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles';
```

**Solution**:

Ensure the trigger function has `SECURITY DEFINER` (runs with creator's privileges):
```sql
ALTER FUNCTION public.handle_new_user() SECURITY DEFINER;
```

Verify RLS policies allow user to read/update their own profile:
```sql
-- From backend/supabase/profiles_policies.sql
CREATE POLICY "Profiles are viewable by owners"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Profiles are insertable by owners"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles are updatable by owners"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

### Issue 3: Missing Required Columns

**Symptom**: Profile creation fails with "column does not exist" error

**Diagnosis**:
```sql
-- Check profiles table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;
```

**Solution**:

Run schema migrations to add missing columns:
```bash
npm run supabase:provision
```

Or manually apply:
```sql
-- From backend/supabase/profiles_schema.sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS qualifications jsonb,
  ADD COLUMN IF NOT EXISTS coordinates jsonb,
  ADD COLUMN IF NOT EXISTS card_details jsonb;
```

### Issue 4: Application-Level Profile Creation Fails

**Symptom**: Trigger creates profile but application still shows "profile creation failed"

**Diagnosis**:

Check browser console for errors during sign-up. Common causes:
- Network timeout
- RLS policy blocking read after creation
- Application trying to create duplicate profile

**Solution**:

1. Verify user can read their own profile:
```sql
-- Test as authenticated user
SELECT * FROM public.profiles WHERE id = auth.uid();
```

2. Check application logs in `AppContext.tsx`:
   - Look for "Error creating inferred profile" messages
   - Check for RLS or JWT-related errors

3. Ensure application waits for trigger to complete before checking:
   - The `refreshUser()` function includes a delay to allow trigger execution
   - If issues persist, increase the delay or add retry logic

### Issue 5: Profile Created But Missing Data

**Symptom**: Profile exists but lacks expected data (name, phone, etc.)

**Root Cause**: User metadata not passed correctly during sign-up

**Solution**:

1. Verify sign-up call includes metadata:
```typescript
// In AuthForm.tsx or sign-up flow
await signUp(email, password, {
  full_name: fullName,
  phone: phoneNumber,
  account_type: accountType,
  // ... other metadata
});
```

2. Check trigger extracts metadata correctly:
```sql
-- The trigger should read from raw_user_meta_data
SELECT 
  id,
  email,
  raw_user_meta_data ->> 'full_name' as full_name,
  raw_user_meta_data ->> 'phone' as phone,
  raw_user_meta_data ->> 'account_type' as account_type
FROM auth.users
WHERE email = 'test@example.com';
```

3. Update trigger to extract additional fields if needed (extend `handle_new_user()`):
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_type public.account_type_enum;
BEGIN
  v_account_type := COALESCE((NEW.raw_user_meta_data ->> 'account_type')::public.account_type_enum, 'SME');

  INSERT INTO public.profiles (
    id, email, account_type, full_name, phone, created_at, updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.raw_user_meta_data ->> 'email'),
    v_account_type,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'phone',
    timezone('utc', now()),
    timezone('utc', now())
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(public.profiles.email, EXCLUDED.email),
    account_type = COALESCE(public.profiles.account_type, EXCLUDED.account_type),
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
    updated_at = timezone('utc', now());

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
END;
$$;
```

## Testing Profile Creation

### Manual Test

1. Create a test user via Supabase Dashboard or SQL:
```sql
-- Insert test auth user (this will trigger profile creation)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'test-profile@example.com',
  crypt('TestPassword123!', gen_salt('bf')),
  now(),
  '{"account_type": "sme", "full_name": "Test User"}',
  now(),
  now()
);

-- Check if profile was created
SELECT * FROM public.profiles 
WHERE email = 'test-profile@example.com';
```

2. Test via application:
```bash
# Start the app
npm run dev

# Navigate to /signup
# Fill in the form and submit
# Check browser console for errors
# Verify profile in database
```

### Automated Test

Create a test to verify profile creation:

```typescript
// test/profile-creation.test.ts
import { supabase } from '@/lib/supabase-enhanced';

describe('Profile Creation', () => {
  it('should automatically create profile when user signs up', async () => {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    // Sign up
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User',
          account_type: 'sme',
        },
      },
    });

    expect(signUpError).toBeNull();
    expect(authData.user).toBeDefined();

    // Wait for trigger to execute
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check profile was created
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user!.id)
      .single();

    expect(profileError).toBeNull();
    expect(profile).toBeDefined();
    expect(profile.email).toBe(testEmail);
    expect(profile.account_type).toBe('sme');

    // Cleanup
    await supabase.auth.admin.deleteUser(authData.user!.id);
  });
});
```

## Monitoring Profile Creation in Production

### Key Metrics to Track

1. **Profile Creation Success Rate**
```sql
-- Check users without profiles (should be near 0)
SELECT COUNT(*) as users_without_profiles
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
  AND u.created_at > now() - interval '7 days';
```

2. **Profile Creation Lag**
```sql
-- Check delay between user creation and profile creation
SELECT 
  u.created_at as user_created,
  p.created_at as profile_created,
  p.created_at - u.created_at as lag
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
WHERE u.created_at > now() - interval '24 hours'
ORDER BY lag DESC
LIMIT 20;
```

3. **Failed Profile Creations**
```sql
-- Monitor for orphaned users (no profile after 5 minutes)
SELECT 
  u.id,
  u.email,
  u.created_at,
  now() - u.created_at as age
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
  AND u.created_at < now() - interval '5 minutes'
ORDER BY u.created_at DESC;
```

### Alerts

Set up alerts for:
- Users without profiles > 5 minutes old
- Profile creation success rate < 98%
- Sudden spike in profile creation errors

## Pre-Launch Checklist

Before launching to production, verify:

- [ ] Trigger `on_auth_user_created` is installed and active
- [ ] Trigger function has `SECURITY DEFINER` privilege
- [ ] RLS policies allow users to read/insert/update their own profiles
- [ ] All required profile columns exist
- [ ] Test user sign-up creates profile within 2 seconds
- [ ] Application fallback profile creation is working
- [ ] Monitoring queries return expected results
- [ ] Error logging captures profile creation failures

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/sql-createtrigger.html)
- [Database Setup Guide](./DATABASE_SETUP.md)
- [Launch Checklist](./docs/release/LAUNCH_CHECKLIST.md)

---

**Last Updated**: 2025-11-11  
**Maintainer**: WATHACI CONNECT Dev Team
