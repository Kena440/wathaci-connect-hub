-- Registrations table stores sign-up submissions received by the Express API.
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  account_type text not null,
  company text,
  mobile_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Prevent duplicate registrations for the same email address.
create unique index if not exists registrations_email_key on public.registrations (lower(email));

-- Make the table available to authenticated clients if needed.
alter table public.registrations enable row level security;

-- Allow service role inserts by default (the backend uses the service key).
create policy if not exists "registrations_service_insert"
  on public.registrations
  for insert
  to service_role
  with check (true);

create policy if not exists "registrations_service_select"
  on public.registrations
  for select
  to service_role
  using (true);
