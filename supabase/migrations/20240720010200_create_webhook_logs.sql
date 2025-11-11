create table if not exists public.webhook_logs (
  id bigserial primary key,
  source text not null default 'lenco',
  event text null,
  payload jsonb,
  http_status integer,
  error text,
  received_at timestamptz not null default timezone('utc', now())
);

create index if not exists webhook_logs_source_idx on public.webhook_logs (source);
create index if not exists webhook_logs_received_at_idx on public.webhook_logs (received_at);
