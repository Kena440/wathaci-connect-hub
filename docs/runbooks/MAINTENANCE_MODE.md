# Maintenance Mode Runbook

This runbook documents how to safely enable and disable the Wathaci Connect maintenance guard during database cleanup windows.

## Overview

Maintenance mode ensures no new accounts are created while data is being purged. The frontend displays a blocking banner, disables the authentication forms, and optionally allows a limited email-domain allowlist to pass manual review.

## Prerequisites

- Access to the deployment platform (Vercel) and Supabase project.
- Ability to update environment variables and redeploy the frontend.
- Supabase service-role key configured locally for CLI commands.

## Enable Maintenance Mode

1. **Update frontend environment variables** (Vercel dashboard → Project → Settings → Environment Variables or the `.env` file for local builds):

   ```env
   VITE_MAINTENANCE_MODE=true
   VITE_MAINTENANCE_ALLOW_SIGNIN=true
   VITE_MAINTENANCE_ALLOW_SIGNUP=false
   VITE_MAINTENANCE_BANNER_TITLE="Scheduled maintenance in progress"
   VITE_MAINTENANCE_BANNER_MESSAGE="We are preparing Wathaci Connect for production launch. Sign-ups are temporarily disabled while we migrate real user data."
   VITE_MAINTENANCE_ALLOWED_EMAIL_DOMAINS="wathaci.com"
   ```

2. **Deploy the configuration**:

   - For Vercel, trigger a redeploy after saving the variables.
   - For local maintenance rehearsals, restart `npm run dev` so Vite picks up the updated `.env` values.

3. **(Optional) Restrict Supabase sign-ups to an allowlist** while the purge runs:

   ```bash
   supabase login
   supabase projects list  # identify <project-ref>
   supabase link --project-ref <project-ref>
   supabase auth update --disable-signups true
   supabase auth update --email-allowlist "wathaci.com"
   ```

4. **Verify maintenance banner**:

   - Navigate to `/signin` and `/signup`.
   - The forms should render in a disabled state with the maintenance banner visible.
   - Ensure the submit button reads “Temporarily unavailable”.

## Disable Maintenance Mode

1. **Restore environment variables**:

   ```env
   VITE_MAINTENANCE_MODE=false
   VITE_MAINTENANCE_ALLOW_SIGNIN=true
   VITE_MAINTENANCE_ALLOW_SIGNUP=true
   VITE_MAINTENANCE_ALLOWED_EMAIL_DOMAINS=""
   ```

2. **Redeploy the frontend** (or restart the dev server) to pick up the change.

3. **Re-enable Supabase sign-ups** (if they were disabled):

   ```bash
   supabase auth update --disable-signups false
   supabase auth update --email-allowlist ""
   ```

4. **Smoke-test authentication**:

   - Confirm the banner is hidden.
   - Verify new sign-ups succeed end-to-end (including profile bootstrap).
   - Confirm existing users can still sign in.

## Troubleshooting

- **Banner still visible after disabling** – check that the deployment picked up the new environment variables and there are no stale preview builds.
- **Sign-ups still blocked** – confirm Supabase sign-ups were re-enabled and email confirmation settings are correct (Authentication → Providers → Email → “Enable email confirmations”).
- **Need to allow a temporary tester** – keep maintenance mode on but add their domain or full email to `VITE_MAINTENANCE_ALLOWED_EMAIL_DOMAINS` and the Supabase email allowlist.

## Related Scripts & References

- [`docs/runbooks/BACKUP_AND_RESTORE.md`](./BACKUP_AND_RESTORE.md)
- [`backend/supabase/maintenance/purge_non_production_users.sql`](../../backend/supabase/maintenance/purge_non_production_users.sql)
- [`backend/supabase/maintenance/verify_user_fk_cascade.sql`](../../backend/supabase/maintenance/verify_user_fk_cascade.sql)
