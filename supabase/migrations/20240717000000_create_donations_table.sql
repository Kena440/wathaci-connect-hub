-- supabase/migrations/20240717000000_create_donations_table.sql
-- Schema for tracking SME donations initiated via the Wathaci Connect platform.
-- Amount-related columns are stored as NUMERIC with two decimal places so we can
-- support future fractional ZMW donations if needed.

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid null,
  donor_user_id uuid null,
  donor_name text null,
  is_anonymous boolean not null default false,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'ZMW',
  payment_method text not null check (payment_method in ('mobile_money', 'card')),
  status text not null check (status in ('pending', 'completed', 'failed', 'cancelled')) default 'pending',
  lenco_reference text not null unique,
  platform_fee_amount numeric(12,2) not null default 0,
  net_amount numeric(12,2) not null default 0,
  message text null,
  source text not null default 'web',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists donations_campaign_id_idx on public.donations (campaign_id);
create index if not exists donations_donor_user_id_idx on public.donations (donor_user_id);
create index if not exists donations_status_idx on public.donations (status);

-- NOTE: Consider adding an "updated_at" trigger via supabase's built-in "moddatetime"
-- extension to keep the timestamp fresh without manual updates.
