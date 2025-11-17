-- Add accepted_terms and newsletter_opt_in fields to profiles table
-- This script extends the existing profiles table without modifying existing columns or constraints
-- Run this via Supabase SQL editor or `supabase db query < backend/supabase/add_signup_fields.sql`

begin;

-- Add accepted_terms column if it doesn't exist
do $$
declare
  col_exists boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'accepted_terms'
  ) into col_exists;

  if not col_exists then
    alter table public.profiles
      add column accepted_terms boolean not null default false;
    
    raise notice 'Added accepted_terms column to profiles table';
  else
    raise notice 'Column accepted_terms already exists';
  end if;
end $$;

-- Add newsletter_opt_in column if it doesn't exist
do $$
declare
  col_exists boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'newsletter_opt_in'
  ) into col_exists;

  if not col_exists then
    alter table public.profiles
      add column newsletter_opt_in boolean not null default false;
    
    raise notice 'Added newsletter_opt_in column to profiles table';
  else
    raise notice 'Column newsletter_opt_in already exists';
  end if;
end $$;

-- Verify created_at exists (it should from core_schema.sql, but let's be safe)
do $$
declare
  col_exists boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'created_at'
  ) into col_exists;

  if not col_exists then
    alter table public.profiles
      add column created_at timestamptz not null default timezone('utc', now());
    
    raise notice 'Added created_at column to profiles table';
  else
    raise notice 'Column created_at already exists';
  end if;
end $$;

-- Verify updated_at exists (it should from core_schema.sql, but let's be safe)
do $$
declare
  col_exists boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'updated_at'
  ) into col_exists;

  if not col_exists then
    alter table public.profiles
      add column updated_at timestamptz not null default timezone('utc', now());
    
    raise notice 'Added updated_at column to profiles table';
  else
    raise notice 'Column updated_at already exists';
  end if;
end $$;

commit;
