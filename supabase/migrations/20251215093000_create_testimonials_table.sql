-- Create testimonials table to fix PostgREST 404 for /rest/v1/testimonials
create table if not exists public.testimonials (
  id uuid default gen_random_uuid() primary key,
  client_name text not null,
  client_title text,
  client_company text,
  client_image_url text,
  testimonial_text text not null,
  rating int not null check (rating between 1 and 5),
  service_category text,
  featured boolean not null default false,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now()
);

-- Helpful index for public queries
create index if not exists testimonials_status_featured_created_at_idx
  on public.testimonials (status, featured, created_at desc);

alter table public.testimonials enable row level security;

grant select on public.testimonials to anon, authenticated;
grant all on public.testimonials to service_role;

create policy "Allow public read of active testimonials"
  on public.testimonials for select
  to anon, authenticated
  using (status = 'active');

create policy "Allow service role full access to testimonials"
  on public.testimonials for all
  to service_role
  using (true)
  with check (true);

-- Refresh PostgREST cache
notify pgrst, 'reload schema';
