# Blocked Signup Investigation & Hardening Playbook

## What does `[blocked]` mean in Supabase audit logs?
* Supabase (GoTrue) appends `" [blocked]"` to the `actor_username` in `auth.audit_log_entries` when a request is rate-limited or rejected by the built-in abuse protections. Typical triggers include repeated signup or confirmation requests from the same IP/device/email within a short window or hitting the email confirmation send quota.
* In these cases GoTrue **does not create an `auth.users` row**; instead it emits an audit entry with an `actor_id` that is a request identifier rather than a persisted user id. The request stops before any profile trigger runs, so **no `public.profiles` row is created**.
* Treat these events as “blocked attempts”. They are expected for abusive traffic and should surface to the user as a throttling/temporary block rather than an internal error.

Plain-English summary: For `actor_username = ... [blocked]` audit events, Supabase has blocked the request due to abuse/rate-limit rules, intentionally skips creating `auth.users`, and you should present a cooldown/blocked message instead of expecting a user record to exist.

## How to double-check for ghost or soft-deleted users
Run these targeted queries when you see a blocked actor:

```sql
-- Check for matching IDs
SELECT id, email, created_at, deleted_at
FROM auth.users
WHERE id IN (
  'b8d68fe1-1a7d-4a50-ab80-d98937e20b4f',
  '7c262cea-2966-4247-a660-c217ef64f8e8'
);

-- Case-insensitive email matches in profiles
SELECT id, email, created_at
FROM public.profiles
WHERE lower(email) IN (
  lower('amukenam1@gmail.com'),
  lower('kasamwakachomba@gmail.com')
);
```
If both queries return zero rows, there are no ghost or soft-deleted users/profiles for those IDs/emails. That matches Supabase’s behavior of dropping blocked requests before creating rows.

## Why the signups were blocked
* The audit actions `user_repeated_signup` and `user_confirmation_requested` in rapid succession indicate repeated signup/confirmation attempts for the same email.
* GoTrue rate-limits these flows; once the threshold is exceeded, further attempts are marked `[blocked]` and short-circuited before user creation.
* To unblock legitimate users: allow the cooldown window (typically ~1 hour) to expire, reduce aggressive retries in the UI, and avoid auto-resending confirmation emails too quickly.

## Application handling and user messaging
Handle Supabase auth errors explicitly so blocked users see clear feedback.

### Frontend (React / JS)
```ts
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: { emailRedirectTo: redirectUrl },
});

if (error) {
  if (error.status === 429 || /blocked/i.test(error.message)) {
    setMessage('Too many sign-up attempts. Please try again later or contact support.');
  } else if (error.status === 400) {
    setMessage('Please check your email and password.');
  } else {
    setMessage('Signup failed. Please try again.');
  }
  return;
}
setMessage('Check your email to confirm your account.');
```

### Backend (server-side wrapper)
```ts
const { data, error } = await serverSupabaseClient.auth.signUp(credentials);
if (error) {
  if (error.status === 429) {
    throw new Error('signup_blocked');
  }
  throw error;
}
```
Map `signup_blocked` to a 429 HTTP response with the same user-facing text as the frontend.

## Making sure legitimate signups work
1. Wait out or request removal of the block (cooldown) for the emails `amukenam1@gmail.com` and `kasamwakachomba@gmail.com`.
2. Start a clean browser session (clear cookies/localStorage) and run a fresh signup.
3. Verify outcomes:
   * The audit log should show `user_signedup` without `[blocked]`.
   * A new row appears in `auth.users`.
   * The `public.handle_new_user` trigger auto-creates `public.profiles` and logs `signup_completed` via `public.log_user_event`.

## Hardened signup → profile pipeline (already in place)
* `public.handle_new_user` creates profiles and logs `auth_user_created`, `profile_created`, and `signup_completed` events to `public.user_events`, ensuring each signup produces both auth and profile rows or a logged error path. 【F:supabase/migrations/20251124120000_audit_correlation_comprehensive_fix.sql†L83-L148】
* `public.ensure_profile_exists` backfills or updates profiles idempotently when invoked. 【F:supabase/migrations/20251124110000_signup_profile_reliability.sql†L63-L119】
* Use `public.backfill_missing_profiles()` if any historical auth users are missing profiles.

## Monitoring & alerting for blocked/failed signups
* Blocked rollup view: `public.audit_blocked_signup_rollup` aggregates `[blocked]` audit entries by email with counts and timestamps for quick triage. 【F:supabase/migrations/20251201100000_blocked_signup_monitoring.sql†L4-L16】
* Alert helper: `public.check_blocked_signups(p_hours := 1, p_threshold := 3)` highlights recent high-velocity blocked emails. 【F:supabase/migrations/20251201100000_blocked_signup_monitoring.sql†L19-L41】
* Missing-profile helper: `public.list_auth_without_profiles(p_minutes := 15)` surfaces auth users created recently without matching profiles. 【F:supabase/migrations/20251201100000_blocked_signup_monitoring.sql†L44-L68】
* Sample blocked query (already encapsulated in the view):

```sql
SELECT * FROM public.audit_blocked_signup_rollup LIMIT 50;
```

* Sample missing-profile check:

```sql
SELECT * FROM public.list_auth_without_profiles(30);
```

## Recommended thresholds and cadence
* Investigate if an email hits `check_blocked_signups(1, 3)` (3+ blocked attempts in the past hour).
* Page/alert if 10+ blocked attempts or if any domain shows sustained blocking across multiple emails.
* Add a cron/dashboard panel that runs `check_blocked_signups` and `list_auth_without_profiles` every 5–10 minutes and notifies when rows are returned.

## What to surface in the app
* For blocked responses (`status 429` or message containing `blocked`): “Too many sign-up attempts. Please try again later or contact support if this is unexpected.”
* For normal validation issues (`status 400`): “Please check your email and password.”
* After successful signup: “Check your email to confirm your account.”

By following these steps you can confidently unblock legitimate addresses, keep `auth.users` and `public.profiles` consistent, and detect future blocking behavior early.
