-- Ensure required extension for UUID generation
create extension if not exists "pgcrypto";

-- Keep updated_at in sync on updates
create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- Partnership opportunities core table
create table if not exists public.partnership_opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  partner_org_name text not null,
  partner_org_type text,
  country_focus text[] default '{}',
  sectors text[] default '{}',
  partnership_type text[] default '{}',
  target_beneficiaries text[] default '{}',
  requirements_summary text,
  expected_value_for_partner text,
  expected_value_for_sme text,
  start_date date,
  end_date date,
  is_ongoing boolean default true,
  link_to_more_info text,
  contact_email text,
  is_active boolean default true,
  is_featured boolean default false,
  tags text[] default '{}',
  created_by_profile_id uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Backfill any missing columns/defaults in case the table exists but is incomplete
alter table public.partnership_opportunities
  add column if not exists partner_org_name text,
  add column if not exists partner_org_type text,
  add column if not exists country_focus text[] default '{}',
  add column if not exists sectors text[] default '{}',
  add column if not exists partnership_type text[] default '{}',
  add column if not exists target_beneficiaries text[] default '{}',
  add column if not exists requirements_summary text,
  add column if not exists expected_value_for_partner text,
  add column if not exists expected_value_for_sme text,
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists is_ongoing boolean default true,
  add column if not exists link_to_more_info text,
  add column if not exists contact_email text,
  add column if not exists is_active boolean default true,
  add column if not exists is_featured boolean default false,
  add column if not exists tags text[] default '{}',
  add column if not exists created_by_profile_id uuid references public.profiles(id),
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.partnership_opportunities
  alter column title set not null,
  alter column description set not null,
  alter column created_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now());

-- Supporting tables used by the API flows
create table if not exists public.partnership_interests (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.partnership_opportunities(id) on delete cascade,
  initiator_profile_id uuid not null references public.profiles(id) on delete cascade,
  role text,
  status text default 'new',
  matching_score numeric,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.partnership_interests
  add column if not exists matching_score numeric,
  add column if not exists notes text;

create table if not exists public.partnership_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  org_name text,
  org_type text,
  sectors text[] default '{}',
  partnerships_sought text[] default '{}',
  country_focus text[] default '{}',
  is_active boolean default true,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Indexes for API filters/sorting
create index if not exists partnership_opportunities_active_idx on public.partnership_opportunities(is_active);
create index if not exists partnership_opportunities_featured_updated_idx on public.partnership_opportunities(is_featured desc, updated_at desc);
create index if not exists partnership_opportunities_tags_idx on public.partnership_opportunities using gin(tags);
create index if not exists partnership_opportunities_sectors_idx on public.partnership_opportunities using gin(sectors);
create index if not exists partnership_opportunities_partnership_type_idx on public.partnership_opportunities using gin(partnership_type);
create index if not exists partnership_opportunities_country_idx on public.partnership_opportunities using gin(country_focus);
create index if not exists partnership_interests_initiator_idx on public.partnership_interests(initiator_profile_id);
create index if not exists partnership_interests_opportunity_idx on public.partnership_interests(opportunity_id);

-- Triggers to keep updated_at fresh
drop trigger if exists partnership_opportunities_updated_at on public.partnership_opportunities;
create trigger partnership_opportunities_updated_at
before update on public.partnership_opportunities
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists partnership_interests_updated_at on public.partnership_interests;
create trigger partnership_interests_updated_at
before update on public.partnership_interests
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists partnership_profiles_updated_at on public.partnership_profiles;
create trigger partnership_profiles_updated_at
before update on public.partnership_profiles
for each row execute function public.set_current_timestamp_updated_at();

-- Harden RLS
alter table public.partnership_opportunities enable row level security;
alter table public.partnership_interests enable row level security;
alter table public.partnership_profiles enable row level security;

-- Refresh policies to align with API usage
 drop policy if exists "Public can read active partnership opportunities" on public.partnership_opportunities;
 drop policy if exists "Owner can create partnership opportunities" on public.partnership_opportunities;
 drop policy if exists "Owner can update own partnership opportunities" on public.partnership_opportunities;
 drop policy if exists "Service role full access partnership opportunities" on public.partnership_opportunities;

create policy "Public read active partnership opportunities"
  on public.partnership_opportunities
  for select
  to anon, authenticated
  using (is_active is true);

create policy "Owner insert partnership opportunities"
  on public.partnership_opportunities
  for insert to authenticated
  with check (auth.uid() = created_by_profile_id);

create policy "Owner update partnership opportunities"
  on public.partnership_opportunities
  for update to authenticated
  using (auth.uid() = created_by_profile_id)
  with check (auth.uid() = created_by_profile_id);

create policy "Service role full access partnership opportunities"
  on public.partnership_opportunities
  for all to service_role
  using (true)
  with check (true);

-- Keep PostgREST schema cache in sync
notify pgrst, 'reload schema';
