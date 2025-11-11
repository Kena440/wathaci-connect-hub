-- Create donations table for tracking donations to support SMEs
-- This table stores all donation transactions with platform fee calculations

create table if not exists donations (
  id uuid primary key default gen_random_uuid(),
  
  -- Optional campaign or SME reference
  campaign_id uuid null,
  
  -- Donor information (nullable for anonymous donations)
  donor_user_id uuid null references auth.users(id) on delete set null,
  donor_name text null,
  
  -- Payment amounts (stored in smallest currency unit for precision)
  amount numeric(18,2) not null,
  currency text not null default 'ZMW',
  platform_fee_amount numeric(18,2) not null default 0,
  net_amount numeric(18,2) not null,
  
  -- Payment status tracking
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'cancelled')),
  
  -- Lenco payment integration
  lenco_reference text not null unique,
  lenco_transaction_id text null,
  lenco_authorization_url text null,
  lenco_access_code text null,
  
  -- Additional information
  message text null,
  source text not null default 'web',
  
  -- Metadata and audit
  metadata jsonb null default '{}'::jsonb,
  gateway_response jsonb null,
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create indexes for performance
create index if not exists donations_donor_user_id_idx on donations(donor_user_id);
create index if not exists donations_campaign_id_idx on donations(campaign_id);
create index if not exists donations_status_idx on donations(status);
create index if not exists donations_lenco_reference_idx on donations(lenco_reference);
create index if not exists donations_created_at_idx on donations(created_at desc);

-- Create updated_at trigger
create or replace function update_donations_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger donations_updated_at_trigger
  before update on donations
  for each row
  execute function update_donations_updated_at();

-- Add comment for documentation
comment on table donations is 'Stores donation transactions to support SMEs. Each donation helps struggling SMEs cover short-term gaps and become investment-ready.';
comment on column donations.amount is 'Total donation amount in ZMW (gross amount before platform fee)';
comment on column donations.platform_fee_amount is 'Platform fee amount deducted to support operations';
comment on column donations.net_amount is 'Net amount that goes to SME support after platform fee';
comment on column donations.lenco_reference is 'Unique reference for Lenco payment gateway integration';
comment on column donations.status is 'Payment status: pending (initial), completed (webhook confirmed), failed (payment failed), cancelled (user cancelled)';
