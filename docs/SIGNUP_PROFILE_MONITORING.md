# Signup & Profile Observability

This repository now treats Supabase `auth.audit_log_entries` as informational only for signup flows. Recent payloads no longer include `traits.user_id`/`traits.user_email`, so reliable correlation now comes from the application-owned `public.user_events` table and the `public.signup_profile_mismatches` view.

## Root-Cause Summary
- Supabase signup-related audit events (`user_signedup`, `user_repeated_signup`, `user_confirmation_requested`) currently omit `traits.user_id` and `traits.user_email`, leaving joins to `auth.users`/`public.profiles` empty.
- The new logging layer writes `user_id`, `email`, and `event_type` into `public.user_events` for every signup/profile bootstrap step. Audit logs remain useful for timing but cannot be the source of truth for identifiers.

## Key Database Changes
- `public.user_events` now has explicit `event_type`, `email`, and `metadata` columns (legacy `kind`/`payload` are still maintained for compatibility).
- The `on_auth_user_created` trigger calls `public.handle_new_user()`, which:
  - Creates/merges the profile via `ensure_profile_exists`.
  - Logs `auth_user_created`, `profile_created`, and `signup_completed` events with the user’s email.
  - Records `profile_creation_failed` if profile creation raises an error.
- `public.signup_profile_mismatches` now monitors signup health using `user_events` instead of audit traits.

## Investigative Queries
- Inspect raw audit payloads (informational only):
```sql
SELECT id, payload, created_at
FROM auth.audit_log_entries
WHERE payload->>'action' IN ('user_signedup','user_repeated_signup','user_confirmation_requested')
ORDER BY created_at DESC
LIMIT 50;
```

- Compare auth users to profiles and capture the latest signup-related event:
```sql
SELECT
  u.id AS auth_user_id,
  u.email AS auth_email,
  u.created_at AS auth_created_at,
  p.id AS profile_id,
  p.created_at AS profile_created_at,
  spm.event_type,
  spm.event_email,
  spm.event_created_at,
  spm.status
FROM public.signup_profile_mismatches spm
JOIN auth.users u ON u.id = spm.auth_user_id
LEFT JOIN public.profiles p ON p.id = spm.auth_user_id
ORDER BY u.created_at DESC
LIMIT 200;
```

- List auth users missing profiles (for backfill/alerting):
```sql
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ORDER BY u.created_at DESC;
```

## Backfill & Repair
- Create missing profiles safely:
```sql
INSERT INTO public.profiles (id, email, created_at)
SELECT u.id, COALESCE(u.email, 'missing-email-' || u.id || '@example.invalid'), now()
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;
```

## Monitoring Queries
- Profiles missing within 10 minutes of signup:
```sql
SELECT
  u.id,
  u.email,
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
  AND u.created_at > now() - interval '10 minutes';
```

- Users with profiles but no `signup_completed` event:
```sql
SELECT
  u.id,
  u.email,
  u.created_at
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.user_events e ON e.user_id = u.id AND e.event_type = 'signup_completed'
WHERE e.user_id IS NULL
  AND u.created_at > now() - interval '10 minutes';
```

**Recommended cadence:** run the monitoring queries via cron every few minutes and alert if any rows are returned. An empty result indicates the signup → profile → logging pipeline is healthy.
