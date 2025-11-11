create table if not exists lenco_payments (
  id              bigserial primary key,
  reference       text not null,
  amount          numeric(18,2),
  currency        text,
  status          text,
  raw_payload     jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists lenco_payments_reference_key
  on lenco_payments (reference);
