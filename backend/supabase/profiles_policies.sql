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

-- Prefer the enhanced handle_new_user() trigger installed via migrations.
-- If it is missing (e.g., on a fresh environment before migrations run),
-- install a minimal implementation so profile creation still works.
do $$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where p.proname = 'handle_new_user' and n.nspname = 'public'
  ) then
    create or replace function public.handle_new_user()
    returns trigger
    language plpgsql
    security definer
    set search_path = public, auth
    as $$
    declare
      v_email text;
      v_account_type text;
    begin
      v_email := coalesce(new.email, new.raw_user_meta_data ->> 'email');
      v_account_type := coalesce((new.raw_user_meta_data ->> 'account_type')::text, 'SME');

      insert into public.profiles (id, email, account_type, created_at, updated_at)
      values (
        new.id,
        v_email,
        v_account_type,
        timezone('utc', now()),
        timezone('utc', now())
      )
      on conflict (id) do update set
        email = excluded.email,
        account_type = coalesce(public.profiles.account_type, excluded.account_type),
        updated_at = timezone('utc', now());

      return new;
    exception
      when unique_violation then
        return new;
    end;
    $$;
  end if;
end;
$$;

-- Remove the legacy function to avoid confusion with the canonical trigger path.
drop function if exists public.handle_new_auth_user();

-- Ensure the trigger exists on auth.users and points to the canonical function.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

commit;
