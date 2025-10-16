-- Ensure the profiles table supports nested JSON payloads used by the frontend
-- forms. This script can be executed from the Supabase SQL editor or via the
-- Supabase CLI (e.g. `supabase db query < backend/supabase/profiles_schema.sql`).

begin;

-- Ensure the qualifications column exists and uses JSONB so arrays of nested
-- qualification objects can be persisted without 400-level validation errors.
do $$
declare
  col_type text;
begin
  select data_type
    into col_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'profiles'
    and column_name = 'qualifications';

  if col_type is null then
    alter table public.profiles
      add column qualifications jsonb default '[]'::jsonb;
  elsif col_type <> 'jsonb' then
    alter table public.profiles
      alter column qualifications type jsonb using (
        case
          when qualifications is null then '[]'::jsonb
          when trim(qualifications::text) = '' then '[]'::jsonb
          when left(trim(qualifications::text), 1) in ('{', '[') then qualifications::jsonb
          else '[]'::jsonb
        end
      );
  end if;

  -- drop the default once the column exists to avoid unexpected implicit values
  alter table public.profiles
    alter column qualifications drop default;
end $$;

-- Ensure the coordinates column exists and is JSONB so the geocoded
-- latitude/longitude pair from the address autocomplete widget can be stored.
do $$
declare
  col_type text;
begin
  select data_type
    into col_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'profiles'
    and column_name = 'coordinates';

  if col_type is null then
    alter table public.profiles add column coordinates jsonb;
  elsif col_type <> 'jsonb' then
    alter table public.profiles
      alter column coordinates type jsonb using (
        case
          when coordinates is null then null
          when trim(coordinates::text) = '' then null
          when left(trim(coordinates::text), 1) in ('{', '[') then coordinates::jsonb
          else null
        end
      );
  end if;
end $$;

-- Ensure the card_details column exists and is JSONB so masked card metadata
-- can be stored while keeping sensitive fields off the database.
do $$
declare
  col_type text;
begin
  select data_type
    into col_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'profiles'
    and column_name = 'card_details';

  if col_type is null then
    alter table public.profiles add column card_details jsonb;
  elsif col_type <> 'jsonb' then
    alter table public.profiles
      alter column card_details type jsonb using (
        case
          when card_details is null then null
          when trim(card_details::text) = '' then null
          when left(trim(card_details::text), 1) in ('{', '[') then card_details::jsonb
          else null
        end
      );
  end if;
end $$;

commit;
