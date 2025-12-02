begin;

create table if not exists public.support_tickets (
  id bigserial primary key,
  user_id uuid references public.profiles(id),
  email text not null,
  subject text not null,
  description text,
  category text not null default 'general',
  status text not null default 'open',
  priority text not null default 'standard',
  source text not null default 'in_app',
  external_message_id text,
  sla_due_at timestamptz,
  last_message_at timestamptz,
  last_response_at timestamptz,
  escalated_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists support_tickets_status_idx on public.support_tickets (status);
create index if not exists support_tickets_category_idx on public.support_tickets (category);
create index if not exists support_tickets_email_idx on public.support_tickets (email);

create or replace trigger support_tickets_set_timestamp
  before update on public.support_tickets
  for each row
  execute function public.set_updated_at();

create table if not exists public.support_ticket_messages (
  id bigserial primary key,
  ticket_id bigint not null references public.support_tickets(id) on delete cascade,
  sender_type text not null check (sender_type in ('user', 'agent', 'admin', 'system')),
  message_body text not null,
  message_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists support_ticket_messages_ticket_idx on public.support_ticket_messages (ticket_id);

create table if not exists public.processed_emails (
  message_id text primary key,
  ticket_id bigint references public.support_tickets(id) on delete cascade,
  sender_email text,
  subject text,
  received_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ciso_logs (
  id uuid primary key,
  event_type text not null,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

commit;
