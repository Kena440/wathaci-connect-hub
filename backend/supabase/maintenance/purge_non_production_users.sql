-- ============================================================================
-- Purge Non-Production Supabase Users
-- ============================================================================
-- 1. Enable maintenance mode (see docs/runbooks/MAINTENANCE_MODE.md)
-- 2. Update the allowlists below to reflect the production accounts that must remain
-- 3. Review the preview query output before running the DELETE
-- 4. Commit only after verifying that only test/demo users are selected
-- ============================================================================

begin;

-- --------------------------------------------------------------------------
-- Configure allowlists (edit before running)
-- --------------------------------------------------------------------------
create temp table purge_allowed_domains(domain text);
insert into purge_allowed_domains(domain)
values
  ('wathaci.com'),
  ('wathaci.org');

create temp table purge_allowed_emails(email text);
insert into purge_allowed_emails(email)
values
  ('founder@wathaci.com');

create temp table purge_allowed_account_types(account_type text);
insert into purge_allowed_account_types(account_type)
values
  ('admin');

-- --------------------------------------------------------------------------
-- Identify users eligible for deletion
-- --------------------------------------------------------------------------
create temp table purge_candidates as
select
  u.id,
  u.email,
  u.created_at,
  u.raw_user_meta_data ->> 'account_type' as account_type,
  u.raw_user_meta_data ->> 'full_name' as full_name,
  u.raw_user_meta_data ->> 'msisdn' as msisdn
from auth.users u
where not exists (
    select 1
    from purge_allowed_emails e
    where lower(u.email) = lower(e.email)
  )
  and not exists (
    select 1
    from purge_allowed_domains d
    where lower(u.email) like '%' || lower(d.domain)
  )
  and coalesce(u.raw_user_meta_data ->> 'account_type', '') not in (
    select account_type from purge_allowed_account_types
  );

-- --------------------------------------------------------------------------
-- Preview rows that will be deleted (review carefully!)
-- --------------------------------------------------------------------------
select
  id,
  email,
  account_type,
  msisdn,
  created_at
from purge_candidates
order by created_at;

-- --------------------------------------------------------------------------
-- Uncomment the DELETE once the previewed rows look correct
-- --------------------------------------------------------------------------
-- delete from auth.users au
-- using purge_candidates pc
-- where au.id = pc.id
-- returning au.id, au.email;

-- commit;  -- Only after the DELETE has been reviewed
rollback;  -- Safety default; replace with COMMIT when ready
