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
  msisdn text,
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
  investment_focus text,
  investment_ticket_min numeric,
  investment_ticket_max numeric,
  investment_stage text,
  investment_regions text,
  impact_focus text,
  support_services text,
  support_preferences text,
  partnership_preferences text,
  donor_type text,
  funding_focus text,
  annual_funding_budget numeric,
  institution_type text,
  department text,
  government_focus text,
  programs text,
  partnership_needs text,
  qualifications jsonb,
  experience_years integer,
  specialization text,
  gaps_identified text[],
  accepted_terms boolean not null default false,
  newsletter_opt_in boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists profiles_account_type_idx on public.profiles (account_type);
create index if not exists profiles_country_idx on public.profiles (country);

alter table public.profiles
  add column if not exists msisdn text,
  add column if not exists investment_focus text,
  add column if not exists investment_ticket_min numeric,
  add column if not exists investment_ticket_max numeric,
  add column if not exists investment_stage text,
  add column if not exists investment_regions text,
  add column if not exists impact_focus text,
  add column if not exists support_services text,
  add column if not exists support_preferences text,
  add column if not exists partnership_preferences text,
  add column if not exists donor_type text,
  add column if not exists funding_focus text,
  add column if not exists annual_funding_budget numeric,
  add column if not exists institution_type text,
  add column if not exists department text,
  add column if not exists government_focus text,
  add column if not exists programs text,
  add column if not exists partnership_needs text;

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
-- Needs assessment tables for each profile type
-- ---------------------------------------------------------------------------

create table if not exists public.sme_needs_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  monthly_revenue numeric not null,
  monthly_expenses numeric not null,
  cash_flow_positive boolean not null,
  debt_obligations numeric not null,
  financial_records_organized boolean not null,
  key_operational_challenges text[] not null,
  technology_gaps text[] not null,
  automation_level text not null,
  target_market_clarity integer not null,
  customer_acquisition_challenges text[] not null,
  competitive_position text not null,
  regulatory_compliance_status text not null,
  legal_structure_optimized boolean not null,
  intellectual_property_protected boolean not null,
  growth_strategy_defined boolean not null,
  funding_requirements jsonb not null,
  key_performance_metrics_tracked boolean not null,
  immediate_support_areas text[] not null,
  budget_for_professional_services numeric not null,
  overall_score integer not null,
  identified_gaps text[] not null,
  priority_areas text[] not null,
  completed_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists sme_needs_assessments_user_id_idx on public.sme_needs_assessments (user_id);

alter table public.sme_needs_assessments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'sme_needs_assessments'
      and polname = 'SME assessments are viewable by owners'
  ) then
    create policy "SME assessments are viewable by owners"
      on public.sme_needs_assessments
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
      and tablename = 'sme_needs_assessments'
      and polname = 'SME assessments are manageable by owners'
  ) then
    create policy "SME assessments are manageable by owners"
      on public.sme_needs_assessments
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
      and tablename = 'sme_needs_assessments'
      and polname = 'SME assessments managed by service role'
  ) then
    create policy "SME assessments managed by service role"
      on public.sme_needs_assessments
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end
$$;

drop trigger if exists set_timestamp on public.sme_needs_assessments;
create trigger set_timestamp
  before update on public.sme_needs_assessments
  for each row execute function public.set_updated_at();

create table if not exists public.professional_needs_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary_profession text not null,
  years_of_experience integer not null,
  specialization_areas text[] not null,
  current_employment_status text not null,
  services_offered text[] not null,
  service_delivery_modes text[] not null,
  hourly_rate_min numeric not null,
  hourly_rate_max numeric not null,
  target_client_types text[] not null,
  client_size_preference text[] not null,
  industry_focus text[] not null,
  availability_hours_per_week integer not null,
  project_duration_preference text not null,
  travel_willingness text not null,
  remote_work_capability boolean not null,
  key_skills text[] not null,
  certification_status text[] not null,
  continuous_learning_interest boolean not null,
  mentorship_interest text not null,
  client_acquisition_challenges text[] not null,
  marketing_channels text[] not null,
  business_development_support_needed text[] not null,
  networking_preferences text[] not null,
  collaboration_interest boolean not null,
  partnership_types text[] not null,
  referral_system_interest boolean not null,
  professional_profile jsonb not null,
  professional_strategy text[] not null,
  completed_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists professional_needs_assessments_user_id_idx on public.professional_needs_assessments (user_id);

alter table public.professional_needs_assessments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'professional_needs_assessments'
      and polname = 'Professional assessments are viewable by owners'
  ) then
    create policy "Professional assessments are viewable by owners"
      on public.professional_needs_assessments
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
      and tablename = 'professional_needs_assessments'
      and polname = 'Professional assessments are manageable by owners'
  ) then
    create policy "Professional assessments are manageable by owners"
      on public.professional_needs_assessments
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
      and tablename = 'professional_needs_assessments'
      and polname = 'Professional assessments managed by service role'
  ) then
    create policy "Professional assessments managed by service role"
      on public.professional_needs_assessments
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end
$$;

drop trigger if exists set_timestamp on public.professional_needs_assessments;
create trigger set_timestamp
  before update on public.professional_needs_assessments
  for each row execute function public.set_updated_at();

create table if not exists public.investor_needs_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  investment_amount_min numeric not null,
  investment_amount_max numeric not null,
  investment_horizon text not null,
  risk_tolerance text not null,
  support_types text[] not null,
  technical_assistance_areas text[] not null,
  mentorship_availability boolean not null,
  preferred_industries text[] not null,
  business_stages text[] not null,
  geographic_focus text[] not null,
  equity_percentage_min numeric not null,
  equity_percentage_max numeric not null,
  board_participation boolean not null,
  follow_on_investment boolean not null,
  due_diligence_requirements text[] not null,
  decision_timeline text not null,
  investment_committee boolean not null,
  impact_focus boolean not null,
  esg_criteria text[] not null,
  social_impact_importance integer not null,
  co_investment_interest boolean not null,
  lead_investor_preference text not null,
  syndicate_participation boolean not null,
  investor_profile jsonb not null,
  investment_strategy text[] not null,
  completed_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists investor_needs_assessments_user_id_idx on public.investor_needs_assessments (user_id);

alter table public.investor_needs_assessments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'investor_needs_assessments'
      and polname = 'Investor assessments are viewable by owners'
  ) then
    create policy "Investor assessments are viewable by owners"
      on public.investor_needs_assessments
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
      and tablename = 'investor_needs_assessments'
      and polname = 'Investor assessments are manageable by owners'
  ) then
    create policy "Investor assessments are manageable by owners"
      on public.investor_needs_assessments
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
      and tablename = 'investor_needs_assessments'
      and polname = 'Investor assessments managed by service role'
  ) then
    create policy "Investor assessments managed by service role"
      on public.investor_needs_assessments
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end
$$;

drop trigger if exists set_timestamp on public.investor_needs_assessments;
create trigger set_timestamp
  before update on public.investor_needs_assessments
  for each row execute function public.set_updated_at();

create table if not exists public.donor_needs_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  annual_donation_budget numeric not null,
  donation_frequency text not null,
  donation_amount_per_recipient numeric not null,
  focus_areas text[] not null,
  target_beneficiaries text[] not null,
  geographic_focus text[] not null,
  support_types text[] not null,
  capacity_building_interest boolean not null,
  mentorship_availability boolean not null,
  impact_measurement_importance integer not null,
  reporting_requirements text[] not null,
  follow_up_engagement boolean not null,
  organization_size_preference text[] not null,
  organization_stage_preference text[] not null,
  religious_affiliation_preference text not null,
  selection_criteria text[] not null,
  application_process text not null,
  decision_timeline text not null,
  collaborative_funding boolean not null,
  partner_organizations text[] not null,
  volunteer_opportunities boolean not null,
  donor_profile jsonb not null,
  donor_strategy text[] not null,
  completed_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists donor_needs_assessments_user_id_idx on public.donor_needs_assessments (user_id);

alter table public.donor_needs_assessments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'donor_needs_assessments'
      and polname = 'Donor assessments are viewable by owners'
  ) then
    create policy "Donor assessments are viewable by owners"
      on public.donor_needs_assessments
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
      and tablename = 'donor_needs_assessments'
      and polname = 'Donor assessments are manageable by owners'
  ) then
    create policy "Donor assessments are manageable by owners"
      on public.donor_needs_assessments
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
      and tablename = 'donor_needs_assessments'
      and polname = 'Donor assessments managed by service role'
  ) then
    create policy "Donor assessments managed by service role"
      on public.donor_needs_assessments
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end
$$;

drop trigger if exists set_timestamp on public.donor_needs_assessments;
create trigger set_timestamp
  before update on public.donor_needs_assessments
  for each row execute function public.set_updated_at();

create table if not exists public.government_needs_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  institution_name text not null,
  institution_type text not null,
  department_division text not null,
  geographic_jurisdiction text[] not null,
  current_programs text[] not null,
  target_beneficiaries text[] not null,
  annual_budget_allocation numeric not null,
  program_reach text not null,
  partnership_interests text[] not null,
  collaboration_types text[] not null,
  preferred_partners text[] not null,
  capacity_building_areas text[] not null,
  staff_development_priorities text[] not null,
  technical_assistance_needs text[] not null,
  policy_development_focus text[] not null,
  regulatory_challenges text[] not null,
  stakeholder_engagement_priorities text[] not null,
  digitalization_priorities text[] not null,
  innovation_focus_areas text[] not null,
  technology_adoption_challenges text[] not null,
  monitoring_systems boolean not null,
  evaluation_frequency text not null,
  impact_measurement_priorities text[] not null,
  reporting_requirements text[] not null,
  government_profile jsonb not null,
  government_strategy text[] not null,
  completed_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists government_needs_assessments_user_id_idx on public.government_needs_assessments (user_id);

alter table public.government_needs_assessments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'government_needs_assessments'
      and polname = 'Government assessments are viewable by owners'
  ) then
    create policy "Government assessments are viewable by owners"
      on public.government_needs_assessments
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
      and tablename = 'government_needs_assessments'
      and polname = 'Government assessments are manageable by owners'
  ) then
    create policy "Government assessments are manageable by owners"
      on public.government_needs_assessments
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
      and tablename = 'government_needs_assessments'
      and polname = 'Government assessments managed by service role'
  ) then
    create policy "Government assessments managed by service role"
      on public.government_needs_assessments
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end
$$;

drop trigger if exists set_timestamp on public.government_needs_assessments;
create trigger set_timestamp
  before update on public.government_needs_assessments
  for each row execute function public.set_updated_at();

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
