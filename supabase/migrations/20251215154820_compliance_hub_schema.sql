-- Compliance Hub schema
-- Creates compliance areas, requirements, statuses, risk scores, and telemetry

begin;

-- Helper to keep updated_at fresh
create or replace function public.set_current_timestamp_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

-- Core areas
create table if not exists public.compliance_areas (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title text not null,
  description text not null,
  priority int,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Specific requirements/checklist items
create table if not exists public.compliance_requirements (
  id uuid primary key default gen_random_uuid(),
  area_id uuid references public.compliance_areas(id) on delete cascade,
  title text not null,
  description text,
  authority text,
  required_for text[],
  country text default 'Zambia',
  links text[],
  priority int,
  is_mandatory boolean default true,
  is_active boolean default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- SME-specific tracking
create table if not exists public.compliance_status (
  id uuid primary key default gen_random_uuid(),
  sme_id uuid not null references public.profiles(id) on delete cascade,
  area_id uuid references public.compliance_areas(id) on delete cascade,
  requirement_id uuid references public.compliance_requirements(id) on delete cascade,
  status text not null default 'not_started',
  evidence_url text,
  notes text,
  last_updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Unique per SME + requirement to simplify upserts
create unique index if not exists compliance_status_sme_requirement_idx on public.compliance_status(sme_id, requirement_id);

-- Compliance risk scores (AI powered)
create table if not exists public.compliance_risk_scores (
  id uuid primary key default gen_random_uuid(),
  sme_id uuid not null references public.profiles(id) on delete cascade,
  overall_score numeric,
  risk_band text,
  ai_summary text,
  details jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists compliance_risk_scores_sme_idx on public.compliance_risk_scores(sme_id);

-- Lightweight telemetry for analytics
create table if not exists public.compliance_events (
  id uuid primary key default gen_random_uuid(),
  sme_id uuid references public.profiles(id) on delete cascade,
  event_type text not null,
  context jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

-- Triggers to keep updated_at current
create trigger set_compliance_areas_updated_at before update on public.compliance_areas
for each row execute function public.set_current_timestamp_updated_at();

create trigger set_compliance_requirements_updated_at before update on public.compliance_requirements
for each row execute function public.set_current_timestamp_updated_at();

create trigger set_compliance_status_updated_at before update on public.compliance_status
for each row execute function public.set_current_timestamp_updated_at();

create trigger set_compliance_risk_scores_updated_at before update on public.compliance_risk_scores
for each row execute function public.set_current_timestamp_updated_at();

-- Enable RLS
alter table public.compliance_areas enable row level security;
alter table public.compliance_requirements enable row level security;
alter table public.compliance_status enable row level security;
alter table public.compliance_risk_scores enable row level security;
alter table public.compliance_events enable row level security;

-- Policies
create policy if not exists "Public can read compliance areas" on public.compliance_areas
for select using (is_active = true);

create policy if not exists "Public can read compliance requirements" on public.compliance_requirements
for select using (is_active = true);

create policy if not exists "SME can read own compliance status" on public.compliance_status
for select using (auth.uid() = sme_id);

create policy if not exists "SME can upsert own compliance status" on public.compliance_status
for insert, update using (auth.uid() = sme_id) with check (auth.uid() = sme_id);

create policy if not exists "SME can read own compliance risk scores" on public.compliance_risk_scores
for select using (auth.uid() = sme_id);

create policy if not exists "Service role can write compliance risk scores" on public.compliance_risk_scores
for insert, update using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy if not exists "Service role compliance events" on public.compliance_events
for insert using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

commit;
