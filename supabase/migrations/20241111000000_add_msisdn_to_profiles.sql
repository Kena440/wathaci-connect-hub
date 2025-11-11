-- Add msisdn (mobile money number) field to profiles table
-- This is required for payment processing across all account types

begin;

-- Add msisdn column to profiles table if it doesn't exist
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'msisdn'
  ) then
    alter table public.profiles
      add column msisdn text;
  end if;
end $$;

-- Also add msisdn to the core schema's alter table section for consistency
-- This ensures the column is available regardless of migration order
alter table public.profiles
  add column if not exists msisdn text;

-- Add a check constraint to validate MSISDN format (international phone number)
-- Format: optional + followed by 9-15 digits
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_msisdn_format_check'
  ) then
    alter table public.profiles
      add constraint profiles_msisdn_format_check
      check (msisdn is null or msisdn ~ '^\+?[0-9]{9,15}$');
  end if;
end $$;

commit;
