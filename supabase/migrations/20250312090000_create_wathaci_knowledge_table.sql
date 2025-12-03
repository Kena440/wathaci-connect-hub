-- Create WATHACI knowledge base table and seed initial data

-- 1) Enable pgcrypto if not already enabled (for gen_random_uuid)
create extension if not exists pgcrypto;

-- 2) Create the WATHACI knowledge base table
create table if not exists public.wathaci_knowledge (
  id uuid primary key default gen_random_uuid(),

  -- A short unique identifier, useful for referencing a specific entry
  slug text not null unique,

  -- Human-readable title for the entry
  title text not null,

  -- High-level category for this knowledge entry
  -- e.g. 'signup', 'signin', 'profile', 'payments', 'matching', 'support', 'general'
  category text not null,

  -- Intended primary audience
  -- e.g. 'all', 'sme', 'investor', 'donor', 'government', 'professional', 'admin'
  audience text not null default 'all',

  -- Main body of the knowledge entry (markdown or plain text)
  content text not null,

  -- Optional tags to help with filtering/search (e.g. ['lenco', 'error', 'signup'])
  tags text[] not null default '{}',

  -- Whether this entry is currently active and should be considered by Ciso
  is_active boolean not null default true,

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) Create an auto-updated updated_at trigger
create or replace function public.set_wathaci_knowledge_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_timestamp_wathaci_knowledge on public.wathaci_knowledge;

create trigger set_timestamp_wathaci_knowledge
before update on public.wathaci_knowledge
for each row
execute procedure public.set_wathaci_knowledge_updated_at();

-- 4) Optional: add a tsvector column for full-text search across title + content
alter table public.wathaci_knowledge
  add column if not exists search_document tsvector
  generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
  ) stored;

-- 5) Index for fast search
create index if not exists wathaci_knowledge_search_idx
  on public.wathaci_knowledge
  using gin (search_document);

-- 6) Helpful indexes for filtering
create index if not exists wathaci_knowledge_category_idx
  on public.wathaci_knowledge (category);

create index if not exists wathaci_knowledge_audience_idx
  on public.wathaci_knowledge (audience);

create index if not exists wathaci_knowledge_is_active_idx
  on public.wathaci_knowledge (is_active);

-- 7) Seed initial rows
insert into public.wathaci_knowledge (slug, title, category, audience, content, tags)
values
-- 1) General overview for all users
(
  'overview-what-is-wathaci-connect',
  'What is WATHACI Connect?',
  'general',
  'all',
  $$WATHACI Connect is a digital platform that connects SMEs with investors, donors, government programmes and professionals/freelancers.

For SMEs, the platform helps you:
- Present a credible, structured profile (not just a pitch deck).
- Discover relevant capital, grants, technical support and market opportunities.
- Connect with professionals and partners who can help you grow.

For investors, donors, government programmes and professionals, the platform helps you:
- Discover SMEs that fit your sector, geography and mandate.
- Filter opportunities by criteria like stage, ticket size and thematic focus.
- Build a qualified pipeline faster and more efficiently.$$,
  array['overview', 'general', 'about', 'platform']
),

-- 2) SME signup and onboarding
(
  'signup-sme-onboarding-basics',
  'How SME sign-up and onboarding works',
  'signup',
  'sme',
  $$When you sign up as an SME on WATHACI Connect, you will:

1. Choose your account type as "SME".
2. Provide basic details such as your name, email and password (or complete verification if using passwordless).
3. Complete your SME profile over a few steps:
   - Business identity (name, registration, location, sector).
   - What your business does (products/services and your customers).
   - Your current needs (capital, grants, technical support, markets, etc.).
   - Key traction and achievements if available (revenue, key clients, impact).

A stronger, more complete profile:
- Increases your chances of being discovered by relevant investors and programmes.
- Helps the platform suggest better matches for your business.
- Shows partners that you are serious and organised.$$,
  array['signup', 'sme', 'onboarding', 'profile']
),

-- 3) Payments and subscriptions overview
(
  'payments-subscriptions-overview',
  'How subscriptions and payments work on WATHACI Connect',
  'payments',
  'all',
  $$WATHACI Connect may offer different subscription plans and paid services for accessing advanced features.

Key ideas:
- Some features may be available for free or during a trial period.
- Paid plans or services can unlock:
  - Greater visibility on the platform.
  - Additional matching or analytics features.
  - Priority support or access to special programmes.
- Payments are processed via integrated gateways such as Lenco or card processors.
- Once payment is confirmed via the gateway, WATHACI updates your subscription or service access.

Important:
- Payment status can briefly be "pending" while the gateway confirms the transaction.
- You should never share full card details or sensitive financial information in chat or email.$$,
  array['payments', 'subscriptions', 'lenco', 'billing']
),

-- 4) Matching logic basics
(
  'matching-basics',
  'How matching works on WATHACI Connect',
  'matching',
  'all',
  $$WATHACI Connect suggests matches between SMEs and other actors such as investors, donors, government programmes and professionals.

Matching is primarily based on:
- Role: SME vs investor vs donor vs government vs professional.
- Sector focus: e.g. agriculture, manufacturing, services, digital, green economy.
- Geography: country or region where the SME operates and where the counterpart is willing to support.
- Stage and size: early-stage, growth, mature, and approximate size of the business.
- Ticket size or funding range: how much the SME needs vs what the provider offers.
- Thematic focus: climate, gender, youth, digital transformation, etc.
- Eligibility criteria: for example, registration status, turnover, years in operation.

A "good" match usually means the SME:
- Meets the basic eligibility criteria of the investor, donor or programme.
- Operates in the right sector and location.
- Has a realistic ask that fits the counterpart's funding or support range.$$,
  array['matching', 'logic', 'eligibility', 'criteria']
),

-- 5) Support and escalation
(
  'support-escalation',
  'How to get support on WATHACI Connect',
  'support',
  'all',
  $$If you experience a problem on WATHACI Connect that you cannot resolve with on-screen guidance or with the help of Ciso, you can contact the support team.

The official support channel is:
- Email: support@wathaci.com

To help the team respond faster, your email should include:
- Your full name.
- The email address you use for WATHACI.
- Your account type (SME, Investor, Donor, Government, Professional, or other).
- A short description of the problem, including any error messages.
- Screenshots if possible.
- For payment issues: the payment reference, approximate date and time, and the plan or service you were trying to pay for.

Do NOT send passwords or full card details via email.$$,
  array['support', 'escalation', 'help', 'contact']
);
