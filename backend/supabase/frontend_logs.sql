-- Stores sanitized client-side logs forwarded by the Express backend.
create table if not exists public.frontend_logs (
  id uuid primary key default gen_random_uuid(),
  level text not null default 'info',
  message text not null,
  context jsonb,
  stack text,
  component_stack text,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists frontend_logs_received_at_idx on public.frontend_logs (received_at desc);

alter table public.frontend_logs enable row level security;

create policy if not exists "frontend_logs_service_insert"
  on public.frontend_logs
  for insert
  to service_role
  with check (true);
