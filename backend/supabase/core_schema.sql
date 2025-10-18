-- Core database schema for profiles, subscriptions, transactions, and payments
--
-- Run this script via the Supabase SQL editor or `supabase db query` before
-- applying the policy automation in `profiles_policies.sql`.

begin;

-- Ensure pgcrypto is available for UUID generation
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  account_type text not null default 'sole_proprietor',
  profile_completed boolean not null default false,
  first_name text,
  middle_name text,
  last_name text,
  phone text,
  country text,
  address text,
  coordinates jsonb,
  profile_image_url text,
  linkedin_url text,
  business_name text,
  registration_number text,
  industry_sector text,
  description text,
  website_url text,
  employee_count integer,
  annual_revenue integer,
  funding_stage text,
  payment_method text,
  payment_phone text,
  use_same_phone boolean default false,
  card_details jsonb,
  qualifications jsonb,
  experience_years integer,
  specialization text,
  gaps_identified text[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists profiles_account_type_idx on public.profiles (account_type);
create index if not exists profiles_country_idx on public.profiles (country);

-- Automatically maintain updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_timestamp on public.profiles;
create trigger set_timestamp
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Subscription plans available to end users
-- ---------------------------------------------------------------------------
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price text not null,
  period text not null,
  description text,
  features text[] not null default '{}'::text[],
  popular boolean not null default false,
  lenco_amount integer not null,
  user_types text[] not null default '{}'::text[],
  category text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists subscription_plans_name_key on public.subscription_plans (lower(name));

alter table public.subscription_plans enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'subscription_plans'
      and polname = 'Subscription plans are viewable'
  ) then
    create policy "Subscription plans are viewable"
      on public.subscription_plans
      for select
      using (true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'subscription_plans'
      and polname = 'Subscription plans managed by service role'
  ) then
    create policy "Subscription plans managed by service role"
      on public.subscription_plans
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end
$$;

drop trigger if exists set_timestamp on public.subscription_plans;
create trigger set_timestamp
  before update on public.subscription_plans
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- User subscriptions link users to plans and track billing periods
-- ---------------------------------------------------------------------------
create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  status text not null default 'pending',
  start_date timestamptz not null default timezone('utc', now()),
  end_date timestamptz,
  payment_status text not null default 'pending',
  payment_reference text,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists user_subscriptions_user_id_idx on public.user_subscriptions (user_id);
create index if not exists user_subscriptions_plan_id_idx on public.user_subscriptions (plan_id);

alter table public.user_subscriptions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_subscriptions'
      and polname = 'User subscriptions are viewable by owners'
  ) then
    create policy "User subscriptions are viewable by owners"
      on public.user_subscriptions
      for select
      using (auth.uid() = user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_subscriptions'
      and polname = 'User subscriptions are manageable by owners'
  ) then
    create policy "User subscriptions are manageable by owners"
      on public.user_subscriptions
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_subscriptions'
      and polname = 'User subscriptions managed by service role'
  ) then
    create policy "User subscriptions managed by service role"
      on public.user_subscriptions
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end
$$;

drop trigger if exists set_timestamp on public.user_subscriptions;
create trigger set_timestamp
  before update on public.user_subscriptions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Transactions record payment attempts and history
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subscription_id uuid references public.user_subscriptions(id) on delete set null,
  amount integer not null,
  currency text not null,
  status text not null default 'pending',
  payment_method text not null,
  reference_number text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists transactions_reference_key on public.transactions (reference_number);
create index if not exists transactions_user_id_idx on public.transactions (user_id);

alter table public.transactions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'transactions'
      and polname = 'Transactions are viewable by owners'
  ) then
    create policy "Transactions are viewable by owners"
      on public.transactions
      for select
      using (auth.uid() = user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'transactions'
      and polname = 'Transactions are manageable by owners'
  ) then
    create policy "Transactions are manageable by owners"
      on public.transactions
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'transactions'
      and polname = 'Transactions managed by service role'
  ) then
    create policy "Transactions managed by service role"
      on public.transactions
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end
$$;

drop trigger if exists set_timestamp on public.transactions;
create trigger set_timestamp
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Payments provide provider-specific metadata for a transaction
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subscription_id uuid references public.user_subscriptions(id) on delete set null,
  transaction_id uuid references public.transactions(id) on delete set null,
  reference text,
  amount integer not null,
  currency text not null,
  status text not null default 'pending',
  payment_method text not null,
  provider text,
  provider_reference text,
  payment_url text,
  email text,
  name text,
  phone text,
  description text,
  lenco_transaction_id text,
  lenco_access_code text,
  lenco_authorization_url text,
  gateway_response text,
  paid_at timestamptz,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists payments_provider_reference_key on public.payments (provider_reference);
create unique index if not exists payments_reference_key on public.payments (reference);
create index if not exists payments_user_id_idx on public.payments (user_id);
create index if not exists payments_lenco_transaction_id_idx on public.payments (lenco_transaction_id);

alter table public.payments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'payments'
      and polname = 'Payments are viewable by owners'
  ) then
    create policy "Payments are viewable by owners"
      on public.payments
      for select
      using (auth.uid() = user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'payments'
      and polname = 'Payments are manageable by owners'
  ) then
    create policy "Payments are manageable by owners"
      on public.payments
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'payments'
      and polname = 'Payments managed by service role'
  ) then
    create policy "Payments managed by service role"
      on public.payments
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end
$$;

drop trigger if exists set_timestamp on public.payments;
create trigger set_timestamp
  before update on public.payments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Webhook logs for tracking Lenco payment webhook events
-- ---------------------------------------------------------------------------
create table if not exists public.webhook_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  reference text not null,
  status text not null,
  error_message text,
  payload jsonb,
  processed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists webhook_logs_reference_idx on public.webhook_logs (reference);
create index if not exists webhook_logs_status_idx on public.webhook_logs (status);
create index if not exists webhook_logs_processed_at_idx on public.webhook_logs (processed_at);

alter table public.webhook_logs enable row level security;

-- Allow service role to manage webhook logs
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'webhook_logs'
      and polname = 'Webhook logs managed by service role'
  ) then
    create policy "Webhook logs managed by service role"
      on public.webhook_logs
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end
$$;

commit;
