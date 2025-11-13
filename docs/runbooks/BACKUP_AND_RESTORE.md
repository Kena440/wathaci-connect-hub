# Backup and Restore Runbook

This runbook documents how to capture and restore Supabase authentication data (and dependent tables) prior to deleting non-production users.

## Scope

- `auth.users`
- `public.profiles`
- Dependent needs assessment tables (`sme_needs_assessments`, `professional_needs_assessments`, `investor_needs_assessments`, `donor_needs_assessments`, `government_needs_assessments`)
- `public.donations`
- Any other tables cascading from `public.profiles`

## Backup Checklist

1. **Confirm maintenance mode** is enabled (`docs/runbooks/MAINTENANCE_MODE.md`).
2. **Export authentication and profile tables**:

   ```bash
   # Authenticate with Supabase
   supabase login
   supabase link --project-ref <project-ref>

   # Dump auth schema and dependent tables to a timestamped file
   supabase db dump \
     --data-only \
     --schema auth \
     --schema public \
     --table auth.users \
     --table public.profiles \
     --table public.sme_needs_assessments \
     --table public.professional_needs_assessments \
     --table public.investor_needs_assessments \
     --table public.donor_needs_assessments \
     --table public.government_needs_assessments \
     --table public.donations \
     --file backups/$(date +%Y%m%d-%H%M)-auth-and-profiles.sql
   ```

   > **Tip:** Commit the dump to a secure, private S3 bucket or encrypted storage, not to the repository.

3. **Create a full Postgres backup** (recommended for production):

   ```bash
   pg_dump \
     --format=custom \
     --no-owner \
     --no-privileges \
     --dbname="postgresql://postgres:<password>@<host>:5432/postgres" \
     --file backups/$(date +%Y%m%d-%H%M)-full.pgcustom
   ```

4. **Export storage objects** (if user-uploaded assets exist):

   ```bash
   supabase storage list-buckets
   supabase storage download --bucket avatars --path . --destination backups/storage/avatars
   ```

5. **Verify backups**:

   ```bash
   ls -lh backups
   head -n 20 backups/*-auth-and-profiles.sql
   ```

## Restore Procedures

### Restore a targeted table snapshot

```bash
supabase db reset --project-ref <project-ref>  # optional (wipes database!)

psql "postgresql://postgres:<password>@<host>:5432/postgres" \
  -f backups/20250206-0900-auth-and-profiles.sql
```

### Restore from full pg_dump

```bash
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --dbname="postgresql://postgres:<password>@<host>:5432/postgres" \
  backups/20250206-0900-full.pgcustom
```

## Verification After Restore

1. Run [`backend/supabase/maintenance/verify_user_fk_cascade.sql`](../../backend/supabase/maintenance/verify_user_fk_cascade.sql) via the Supabase SQL editor.
2. Confirm `auth.users` contains expected admin emails only.
3. Validate the application login flow end-to-end.
4. Ensure maintenance mode is disabled when complete.

## Storage and Retention

- Store encrypted backups in the company-owned S3 bucket (`s3://wathaci-backups/supabase/`).
- Retain at least two historical snapshots.
- Rotate credentials after the purge window.

## Related Documents

- [`docs/runbooks/MAINTENANCE_MODE.md`](./MAINTENANCE_MODE.md)
- [`backend/supabase/maintenance/purge_non_production_users.sql`](../../backend/supabase/maintenance/purge_non_production_users.sql)
