-- Marketplace core tables and policies

set check_function_bodies = off;

create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  description text not null,
  listing_type text not null,
  category text not null,
  tags text[],
  seller_profile_id uuid references public.profiles(id) on delete set null,
  price_type text,
  price_amount numeric,
  currency text default 'ZMW',
  delivery_mode text[],
  delivery_timeline text,
  includes text[],
  requirements_from_buyer text[],
  cover_image_url text,
  asset_url text,
  is_active boolean default true,
  is_featured boolean default false,
  moderation_status text default 'approved',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.marketplace_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_profile_id uuid references public.profiles(id) on delete set null,
  listing_id uuid references public.marketplace_listings(id) on delete cascade,
  quantity int default 1,
  amount numeric,
  currency text,
  status text default 'created',
  buyer_notes text,
  delivery_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.marketplace_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.marketplace_orders(id) on delete cascade,
  rating int,
  comment text,
  created_at timestamptz default now()
);

create table if not exists public.marketplace_saved (
  id uuid primary key default gen_random_uuid(),
  buyer_profile_id uuid references public.profiles(id) on delete cascade,
  listing_id uuid references public.marketplace_listings(id) on delete cascade,
  created_at timestamptz default now(),
  unique(buyer_profile_id, listing_id)
);

create or replace function public.update_marketplace_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_marketplace_listings_updated
before update on public.marketplace_listings
for each row execute procedure public.update_marketplace_updated_at();

create trigger trg_marketplace_orders_updated
before update on public.marketplace_orders
for each row execute procedure public.update_marketplace_updated_at();

alter table public.marketplace_listings enable row level security;
alter table public.marketplace_orders enable row level security;
alter table public.marketplace_reviews enable row level security;
alter table public.marketplace_saved enable row level security;

create policy "Public can read approved active listings" on public.marketplace_listings
for select using (is_active = true and moderation_status = 'approved');

create policy "Seller can manage own listings" on public.marketplace_listings
for all using (auth.uid() = seller_profile_id) with check (auth.uid() = seller_profile_id);

create policy "Buyer can manage own orders" on public.marketplace_orders
for all using (auth.uid() = buyer_profile_id) with check (auth.uid() = buyer_profile_id);

create policy "Seller can read orders for own listings" on public.marketplace_orders
for select using (
  exists (
    select 1 from public.marketplace_listings l
    where l.id = listing_id and l.seller_profile_id = auth.uid()
  )
);

create policy "Allow buyers to read own reviews" on public.marketplace_reviews
for select using (
  exists (
    select 1 from public.marketplace_orders o
    where o.id = order_id and o.buyer_profile_id = auth.uid()
  )
);

create policy "Allow sellers to read reviews for own listings" on public.marketplace_reviews
for select using (
  exists (
    select 1 from public.marketplace_orders o
    join public.marketplace_listings l on l.id = o.listing_id
    where o.id = order_id and l.seller_profile_id = auth.uid()
  )
);

create policy "Buyers can manage their saved listings" on public.marketplace_saved
for all using (auth.uid() = buyer_profile_id) with check (auth.uid() = buyer_profile_id);

create policy "Public can read saved listings for discovery" on public.marketplace_saved
for select using (true);
