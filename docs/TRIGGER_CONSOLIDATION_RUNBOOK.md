# Trigger Consolidation Runbook

This runbook covers how to back up trigger function sources, deploy the `fetch-sources` Edge Function, and safely consolidate overlapping triggers in the auth/profile flow.

## Prerequisites
- Supabase CLI installed and authenticated (`npm run supabase:login`).
- Access to the project connection string (for `psql`) and service-role credentials (for Edge Functions).
- psql available locally.

## 1) Deploy the `fetch-sources` Edge Function
1. Confirm you want to deploy now: **Yes – proceed.**
2. Set Supabase environment in your shell (replace with project values):
   ```bash
   export SUPABASE_URL="https://<project>.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
   ```
3. Deploy only this function:
   ```bash
   supabase functions deploy fetch-sources
   ```
   - **Expected output:** `Finished deploying fetch-sources (d[-hash])` and HTTP endpoint printed.
4. Smoke-test the deployment (service role bearer):
   ```bash
   curl -s "https://<project>.supabase.co/functions/v1/fetch-sources" \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | jq '.count'
   ```
   - **Expected output:** a non-error JSON response such as `3` when the backup table has entries.

## 2) Capture trigger function definitions to the backups table and disk
Run from repository root.

1. Populate/refresh the `backups.trigger_function_defs` table and write a snapshot file:
   ```bash
   psql "$SUPABASE_DB_URL" -f supabase/backups/capture_trigger_function_defs.sql
   ```
   - **Expected output:**
     - Notices showing `CREATE SCHEMA`/`CREATE TABLE` (or "already exists").
     - A `COPY 3` (or similar) line showing rows written to `supabase/backups/trigger_function_defs_snapshot.csv`.
2. Verify the snapshot contents quickly:
   ```bash
   head -n 5 supabase/backups/trigger_function_defs_snapshot.csv
   ```
   - **Expected output:** CSV header followed by rows such as `autocreate_profile_on_user,"CREATE OR REPLACE FUNCTION..."`.
3. Re-run the smoke test against the Edge Function to confirm it can read the refreshed table:
   ```bash
   curl -s "https://<project>.supabase.co/functions/v1/fetch-sources?names=handle_new_user" \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | jq '.functions[0].name'
   ```
   - **Expected output:** `"handle_new_user -- public"`.

## 3) Checklist for consolidating triggers
- [ ] **Backup captured:** `trigger_function_defs_snapshot.csv` present and pushed to version control.
- [ ] **Edge Function live:** `fetch-sources` responds with HTTP 200 and expected rows.
- [ ] **Redundant triggers reviewed:** Results from `supabase/migrations/20251120120000_prepare_trigger_cleanup.sql` reviewed; keep `handle_new_user` as primary.
- [ ] **Disable/Drop plan approved:** Team agrees on which triggers to disable/drop (`autocreate_profile_trigger`, `handle_auth_user_created_trigger`).
- [ ] **Transactional test ready:** Insert/rollback test statement from the migration is prepared in a psql session.

## 4) Execute consolidation (manual, after approvals)
1. Open an interactive transaction for safety:
   ```bash
   psql "$SUPABASE_DB_URL"
   BEGIN;
   ```
2. Disable or drop redundant triggers/functions (adjust per decision):
   ```sql
   ALTER TABLE auth.users DISABLE TRIGGER autocreate_profile_trigger;
   ALTER TABLE auth.users DISABLE TRIGGER handle_auth_user_created_trigger;
   -- Or drop once validated:
   -- DROP TRIGGER IF EXISTS autocreate_profile_trigger ON auth.users;
   -- DROP FUNCTION IF EXISTS autocreate_profile_on_user();
   -- DROP TRIGGER IF EXISTS handle_auth_user_created_trigger ON auth.users;
   -- DROP FUNCTION IF EXISTS handle_auth_user_created();
   ```
   - **Expected output:** `ALTER TABLE` or `DROP TRIGGER` confirmations.
3. Run the transactional signup sanity test (from the migration file):
   ```sql
   INSERT INTO auth.users (id, email, raw_user_meta_data, aud)
   VALUES ('00000000-0000-0000-0000-000000000099','test+verify@example.com','{}','authenticated');
   SELECT id, email, account_type FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000099';
   ROLLBACK;
   ```
   - **Expected output:** profile row appears with `account_type` populated, and the transaction rolls back cleanly.
4. Commit changes only after validation:
   ```sql
   COMMIT;
   ```
   - **Expected output:** `COMMIT`.

## 5) Post-change verification
- Re-run the `fetch-sources` Edge Function to confirm definitions remain accessible.
- Check `backups.trigger_function_defs` for updated timestamps (ensures capture ran after consolidation).
- Review Supabase function/trigger logs for any errors during the change window.
