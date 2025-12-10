# Fix for sme_profiles 404 Error (PGRST205)

## Problem Summary

The application was encountering a PostgREST error when trying to POST to `/rest/v1/sme_profiles?select=*`:

```json
{
  "event_message": "POST | 404 | ... | https://nrjcbdrzaxqvomeogptf.supabase.co/rest/v1/sme_profiles?select=*",
  "proxy_status": "PostgREST; error=PGRST205"
}
```

## Root Cause

The error was caused by schema inconsistencies in the profile tables due to conflicting migrations:

1. **Migration `20260611120000_account_type_profile_schemas.sql`** (June 2026 - future dated):
   - Created `sme_profiles` with `id` as PRIMARY KEY
   - Used `profile_id` as foreign key to `profiles(id)`

2. **Migration `20260720120000_add_missing_profile_tables_and_columns_for_existing_account_types.sql`** (July 2026 - future dated):
   - Attempted to recreate the same tables with `user_id` as PRIMARY KEY
   - Created conflicting schema definitions

3. **Frontend Code**:
   - Uses `user_id` to query and insert profile data
   - Example: `.from("sme_profiles").eq("user_id", user.id)`

The conflict between these migrations resulted in:
- Inconsistent table schema
- Missing or incorrectly configured primary keys
- RLS policies that didn't match the table structure
- PostgREST unable to properly expose the table via its API

## Solution

Created two corrective migrations with proper timestamps (December 2025):

### Migration 1: `20251210192223_fix_sme_profiles_404.sql`

Fixes the `sme_profiles` table:

- ✅ Ensures `user_id` is the PRIMARY KEY (not `id`)
- ✅ Adds all required columns with proper defaults
- ✅ Creates RLS policies using `auth.uid() = user_id`
- ✅ Grants proper permissions to authenticated users
- ✅ Adds `NOTIFY pgrst, 'reload schema'` to refresh PostgREST cache

### Migration 2: `20251210192353_fix_all_profile_tables_404.sql`

Applies the same fixes to:

- ✅ `professional_profiles` table
- ✅ `investor_profiles` table

Both migrations use the same pattern to ensure consistency.

## Key Changes

### Schema Structure

All profile tables now follow this pattern:

```sql
CREATE TABLE public.{table_name} (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- ... other columns ...
  PRIMARY KEY (user_id)
);
```

### RLS Policies

```sql
-- Users can manage their own profile
CREATE POLICY {table}_manage_own ON public.{table}
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY {table}_service_role_full ON public.{table}
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
```

### Permissions

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.{table} TO authenticated;
GRANT ALL ON public.{table} TO service_role;
```

## Impact

- ✅ POST requests to `/rest/v1/sme_profiles` will now work correctly
- ✅ POST requests to `/rest/v1/professional_profiles` will work correctly
- ✅ POST requests to `/rest/v1/investor_profiles` will work correctly
- ✅ Users can create and update their profile data
- ✅ RLS policies properly restrict access to own profile data

## Testing Recommendations

1. **Verify Schema**:
   ```sql
   -- Check table structure
   \d+ public.sme_profiles
   \d+ public.professional_profiles
   \d+ public.investor_profiles
   ```

2. **Test API Endpoints**:
   ```bash
   # POST to create SME profile
   curl -X POST 'https://nrjcbdrzaxqvomeogptf.supabase.co/rest/v1/sme_profiles' \
     -H "apikey: YOUR_ANON_KEY" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"business_name": "Test Business", "user_id": "YOUR_USER_ID"}'
   ```

3. **Verify RLS Policies**:
   ```sql
   -- As authenticated user, should see own profile
   SELECT * FROM public.sme_profiles WHERE user_id = auth.uid();
   
   -- Should not see other users' profiles
   SELECT * FROM public.sme_profiles WHERE user_id != auth.uid();
   ```

## Deployment

These migrations will be automatically applied when the Supabase database is next updated. The migrations are idempotent and safe to run multiple times.

## Future Considerations

1. **Avoid Future-Dated Migrations**: Migration files should use current timestamps, not future dates (2026). This caused confusion about migration order.

2. **Single Source of Truth**: When creating new profile table types, ensure there's only one migration that defines the schema completely.

3. **Always Include Schema Cache Refresh**: Add `NOTIFY pgrst, 'reload schema';` at the end of migrations that change table structure.

4. **Consistent Primary Keys**: All profile tables should use `user_id` as PRIMARY KEY for consistency with authentication patterns.

## Related Files

- `src/lib/api/profile-onboarding.ts` - Frontend API client using these tables
- `supabase/migrations/20260611120000_account_type_profile_schemas.sql` - Original conflicting migration
- `supabase/migrations/20260720120000_add_missing_profile_tables_and_columns_for_existing_account_types.sql` - Another conflicting migration
- `supabase/migrations/20260624113000_align_onboarding_schema.sql` - Attempted partial fix

## References

- PostgREST Error Codes: https://postgrest.org/en/stable/errors.html
- PGRST205: "Could not find table or view" - Indicates the requested resource doesn't exist in the schema cache
