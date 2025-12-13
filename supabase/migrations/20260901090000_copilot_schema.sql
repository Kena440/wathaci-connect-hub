-- Copilot schema
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

create table if not exists public.copilot_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  org_id uuid null,
  profile_id uuid not null,
  profile_type text not null,
  status text not null default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.copilot_runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.copilot_sessions(id) on delete cascade,
  run_type text not null,
  model text not null,
  input_hash text not null,
  output_hash text not null,
  input_redaction_summary jsonb not null default '{}'::jsonb,
  output jsonb not null,
  status text not null default 'completed',
  error text null,
  created_at timestamptz default now()
);

create table if not exists public.copilot_action_plans (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.copilot_sessions(id) on delete cascade,
  selected_path text not null,
  plan jsonb not null,
  status text not null default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.copilot_tasks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.copilot_action_plans(id) on delete cascade,
  task_order int not null,
  task_type text not null,
  action_key text not null,
  action_payload jsonb not null default '{}'::jsonb,
  requires_confirmation boolean not null default true,
  status text not null default 'pending',
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.copilot_artifacts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.copilot_sessions(id) on delete cascade,
  artifact_type text not null,
  storage_path text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.copilot_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.copilot_sessions(id) on delete cascade,
  run_id uuid null references public.copilot_runs(id) on delete set null,
  rating int null check (rating between 1 and 5),
  comment text null,
  created_at timestamptz default now()
);

create unique index if not exists copilot_sessions_unique_active on public.copilot_sessions(owner_user_id, profile_id) where status = 'active';
create index if not exists copilot_runs_session_created_idx on public.copilot_runs(session_id, created_at desc);
create index if not exists copilot_action_plans_session_updated_idx on public.copilot_action_plans(session_id, updated_at desc);
create index if not exists copilot_tasks_plan_order_idx on public.copilot_tasks(plan_id, task_order);
create index if not exists copilot_artifacts_session_created_idx on public.copilot_artifacts(session_id, created_at desc);
create index if not exists copilot_feedback_session_created_idx on public.copilot_feedback(session_id, created_at desc);

alter table public.copilot_sessions enable row level security;
alter table public.copilot_runs enable row level security;
alter table public.copilot_action_plans enable row level security;
alter table public.copilot_tasks enable row level security;
alter table public.copilot_artifacts enable row level security;
alter table public.copilot_feedback enable row level security;

-- session policies
create policy copilot_sessions_select_own on public.copilot_sessions
  for select using (owner_user_id = auth.uid());
create policy copilot_sessions_insert_own on public.copilot_sessions
  for insert with check (owner_user_id = auth.uid());
create policy copilot_sessions_update_own on public.copilot_sessions
  for update using (owner_user_id = auth.uid());

-- runs policies
create policy copilot_runs_select_own on public.copilot_runs
  for select using (exists (select 1 from public.copilot_sessions s where s.id = session_id and s.owner_user_id = auth.uid()));
create policy copilot_runs_insert_own on public.copilot_runs
  for insert with check (exists (select 1 from public.copilot_sessions s where s.id = session_id and s.owner_user_id = auth.uid()));
create policy copilot_runs_update_own on public.copilot_runs
  for update using (exists (select 1 from public.copilot_sessions s where s.id = session_id and s.owner_user_id = auth.uid()));

-- plans policies
create policy copilot_plans_select_own on public.copilot_action_plans
  for select using (exists (select 1 from public.copilot_sessions s where s.id = session_id and s.owner_user_id = auth.uid()));
create policy copilot_plans_insert_own on public.copilot_action_plans
  for insert with check (exists (select 1 from public.copilot_sessions s where s.id = session_id and s.owner_user_id = auth.uid()));
create policy copilot_plans_update_own on public.copilot_action_plans
  for update using (exists (select 1 from public.copilot_sessions s where s.id = session_id and s.owner_user_id = auth.uid()));

-- tasks policies
create policy copilot_tasks_select_own on public.copilot_tasks
  for select using (
    exists (
      select 1 from public.copilot_action_plans p
      join public.copilot_sessions s on s.id = p.session_id
      where p.id = plan_id and s.owner_user_id = auth.uid()
    )
  );
create policy copilot_tasks_insert_own on public.copilot_tasks
  for insert with check (
    exists (
      select 1 from public.copilot_action_plans p
      join public.copilot_sessions s on s.id = p.session_id
      where p.id = plan_id and s.owner_user_id = auth.uid()
    )
  );
create policy copilot_tasks_update_own on public.copilot_tasks
  for update using (
    exists (
      select 1 from public.copilot_action_plans p
      join public.copilot_sessions s on s.id = p.session_id
      where p.id = plan_id and s.owner_user_id = auth.uid()
    )
  );

-- artifacts policies
create policy copilot_artifacts_select_own on public.copilot_artifacts
  for select using (exists (select 1 from public.copilot_sessions s where s.id = session_id and s.owner_user_id = auth.uid()));
create policy copilot_artifacts_insert_own on public.copilot_artifacts
  for insert with check (exists (select 1 from public.copilot_sessions s where s.id = session_id and s.owner_user_id = auth.uid()));
create policy copilot_artifacts_update_own on public.copilot_artifacts
  for update using (exists (select 1 from public.copilot_sessions s where s.id = session_id and s.owner_user_id = auth.uid()));

-- feedback policies
create policy copilot_feedback_select_own on public.copilot_feedback
  for select using (exists (select 1 from public.copilot_sessions s where s.id = session_id and s.owner_user_id = auth.uid()));
create policy copilot_feedback_insert_own on public.copilot_feedback
  for insert with check (exists (select 1 from public.copilot_sessions s where s.id = session_id and s.owner_user_id = auth.uid()));
create policy copilot_feedback_update_own on public.copilot_feedback
  for update using (exists (select 1 from public.copilot_sessions s where s.id = session_id and s.owner_user_id = auth.uid()));

