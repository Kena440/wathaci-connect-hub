-- Stores raw webhook payloads received from external providers like Lenco.
create table if not exists public.webhook_logs (
  id bigserial primary key,
  source text not null default 'lenco',
  event text,
  payload jsonb,
  http_status integer,
  error text,
  received_at timestamptz not null default now()
);

create index if not exists webhook_logs_received_at_idx on public.webhook_logs (received_at desc);
create index if not exists webhook_logs_source_idx on public.webhook_logs (source);

alter table public.webhook_logs enable row level security;

create policy if not exists "webhook_logs_service_insert"
  on public.webhook_logs
  for insert
  to service_role
  with check (true);
