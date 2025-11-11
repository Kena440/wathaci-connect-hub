-- Ensure existing donations table has a mandatory MSISDN column for payments.
alter table if exists public.donations
  add column if not exists msisdn text;

update public.donations
set msisdn = coalesce(nullif(trim(msisdn), ''), '+0000000000')
where msisdn is null;

alter table if exists public.donations
  alter column msisdn set not null;

alter table if exists public.donations
  add constraint donations_msisdn_format_check check (msisdn ~ '^\+?[0-9]{9,15}$');
