# SME Profiles Schema

The `public.sme_profiles` table stores onboarding data for SME accounts and is the table the frontend calls through `supabase.from("sme_profiles")` for inserts and updates.

## Relation shape

`supabase/migrations/20260725160000_harden_sme_profiles_relation.sql` creates and aligns the table with these columns:

- `user_id uuid` **PK**, FK -> `auth.users(id)` (one row per user)
- `id uuid` auto-generated surrogate key for legacy references
- `profile_id uuid` FK -> `public.profiles(id)` (optional)
- `account_type text` default `sme`
- `email text`, `msisdn text`, `full_name text`, `profile_slug text unique`
- `is_active boolean` default `true`
- `is_profile_complete boolean` default `false`
- `approval_status text` default `pending`
- `business_name text` default `"Unnamed Business"`
- `registration_number text`, `registration_type text`
- `sector text`, `subsector text`, `years_in_operation integer`, `employee_count integer`, `turnover_bracket text`
- `products_overview text`, `target_market text`
- `location_city text`, `location_country text`
- `contact_name text`, `contact_phone text`, `business_email text`, `website_url text`
- `social_links text[]`, `main_challenges text[]`, `support_needs text[]`, `logo_url text`, `photos text[]`
- `created_at timestamptz`, `updated_at timestamptz`

Array columns default to empty arrays and timestamps default to `timezone('utc', now())`.

## RLS and grants

Row Level Security is enabled. Two policies are defined:

1. `sme_profiles_manage_own` (role: `authenticated`): `auth.uid() = user_id` for all operations.
2. `sme_profiles_service_role_full` (role: `service_role`): unrestricted access for backend jobs.

Grants:
- `authenticated`: `SELECT, INSERT, UPDATE, DELETE`
- `service_role`: `ALL`

## API usage from the frontend

Example create/update from the browser:

```ts
const { data, error } = await supabase
  .from('sme_profiles')
  .upsert({
    ...payload,
    social_links: payload.social_links ?? [],
    main_challenges: payload.main_challenges ?? [],
    support_needs: payload.support_needs ?? [],
    photos: payload.photos ?? [],
    user_id: user.id,
  })
  .select('*')
  .single();
```

The `user_id` must match the authenticated user or the insert is rejected by RLS. Because `return=representation` is used, the endpoint returns the inserted/updated row.

## Verification checklist

Run the following in Supabase SQL after deploying migrations:

```sql
select * from public.sme_profiles limit 1;
select table_name from information_schema.tables where table_name = 'sme_profiles';
```

Test the REST endpoint (with a valid JWT):

```bash
curl "https://<project>.supabase.co/rest/v1/sme_profiles?select=*" \
  -H "apikey: <anon_or_service_key>" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"user_id": "<user-uuid>", "business_name": "Test SME"}'
```

A 200/201 response indicates PostgREST can see the relation and RLS permits the operation.
