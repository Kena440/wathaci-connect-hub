-- Supabase profiles table security and provisioning setup
--
-- Run this script in the Supabase SQL editor or via `supabase db query` to
-- configure row level security policies and automatic profile creation.

begin;

-- Ensure RLS is enabled on the profiles table
alter table public.profiles enable row level security;

-- Allow users to read their own profile
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and polname = 'Profiles are viewable by owners'
  ) then
    create policy "Profiles are viewable by owners"
      on public.profiles
      for select
      using (auth.uid() = id);
  end if;
end
$$;

-- Allow users to insert their profile once authenticated
-- (client-side insert is still optional thanks to the trigger below)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and polname = 'Profiles are insertable by owners'
  ) then
    create policy "Profiles are insertable by owners"
      on public.profiles
      for insert
      with check (auth.uid() = id);
  end if;
end
$$;

-- Allow users to update only their own profile row
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and polname = 'Profiles are updatable by owners'
  ) then
    create policy "Profiles are updatable by owners"
      on public.profiles
      for update
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end
$$;

-- Optional: allow deletions only by the owner (disabled by default)
-- Uncomment if self-service deletion is required.
-- do $$
-- begin
--   if not exists (
--     select 1 from pg_policies
--     where schemaname = 'public'
--       and tablename = 'profiles'
--       and polname = 'Profiles are deletable by owners'
--   ) then
--     create policy "Profiles are deletable by owners"
--       on public.profiles
--       for delete
--       using (auth.uid() = id);
--   end if;
-- end
-- $$;

-- Trigger to automatically create a profile whenever a new auth user is created
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email, account_type, profile_completed, created_at, updated_at)
  values (
    new.id,
    coalesce(new.email, new.raw_user_meta_data ->> 'email'),
    coalesce((new.raw_user_meta_data ->> 'account_type')::text, 'sole_proprietor'),
    false,
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = timezone('utc', now());

  return new;
exception
  when unique_violation then
    -- Ignore duplicate inserts that might occur during retries
    return new;
end;
$$;

-- Ensure the trigger exists on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

commit;
