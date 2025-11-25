# Wathaci Connect Supabase alignment for AI documents, diagnostics, credit passport, and investor matching

This document captures the additive, non-breaking schema alignment for the new monetized AI feature set. It documents current assumptions, canonical entities, new tables, relationships, RLS posture, and developer usage notes.

## 1. Schema discovery snapshot
- Schemas observed in migrations: `public` (application data) and `auth` (Supabase auth). No other custom schemas were defined.
- Canonical user identity: `auth.users` → `public.profiles` (1:1 by `profiles.id` FK).
- Prior to this migration there was no dedicated company/SME table; profiles only had `company_name`. The new `public.companies` table is now the canonical SME entity and `public.profiles.company_id` links profiles to companies without breaking earlier flows.

## 2. Core reference alignment
- **Company entity:** `public.companies (id uuid PK, name, country, city, sector, registration_number, website, created_by, created_at, updated_at)`.
- **User → profile:** `public.profiles.id` references `auth.users.id` (existing).
- **Profile → company:** new nullable `public.profiles.company_id` referencing `public.companies.id` (ON DELETE SET NULL).
- Every new runtime table carries both `user_id` (→ `auth.users.id`) and `company_id` (→ `public.companies.id`).

## 3. New feature tables
- **Paid document requests:** `public.paid_document_requests` tracks paid generations for business plans, pitch decks, capability statements, etc. Fields include `document_type`, `input_data`, payment metadata (`payment_status`, `amount`, `currency`, gateway/reference), generation lifecycle (`generation_status`, `output_files`, `error_message`), and timestamps. Indexes on `user_id`, `company_id`, `document_type`, and `payment_status` support routing and dashboards.
- **Diagnostics runs:** `public.diagnostics_runs` records AI health checks with score breakdown fields and versioning via `model_version`. Indexed by `user_id` and `company_id`.
- **Credit passport runs:** `public.credit_passport_runs` stores monetized fundability/credit outputs, payment state, pricing, PDF URL, and share counts. Indexed by `company_id` and `fundability_score` for leaderboards/filters.
- **Funder profiles:** `public.funder_profiles` catalogs investors/banks/donors with eligibility, risk appetite, mandates, and activation flag. Indexed by `funder_type` and `is_active`.
- **Funder match runs:** `public.funder_match_runs` captures paid match executions with category, payment, outputs, and optional PDF artifacts. Indexed by `user_id`, `company_id`, and `category`.
- **Shared matches:** `public.shared_matches` logs paid or controlled sharing of match results to funders via channels, with pricing and expiry support. Indexed by `match_run_id`, `user_id`, and `company_id`.

## 4. RLS posture
- RLS enabled on all new tables.
- Owner policies: users can select/insert/update rows where `user_id = auth.uid()` (or for companies where they are `created_by` or linked via their profile’s `company_id`).
- Service role policies: `service_role` can manage all rows for system workflows.
- Funder catalog: authenticated users can select `funder_profiles` when `is_active = true` (service role bypasses); management is reserved to service role.

## 5. Indexes and triggers
- Updated `set_current_timestamp_updated_at` helper reused for all tables with `updated_at` bookkeeping triggers.
- Performance indexes added for high-cardinality filters (company/user/doc type/payment status/funder type/active/category/fundability score).

## 6. Usage notes
- **Creating a company:** insert into `public.companies` with `created_by = auth.uid()` then update the caller’s `profiles.company_id` if needed.
- **Submitting paid document requests:** insert into `public.paid_document_requests` after payment intent is created; set `payment_status='success'` before kicking off AI generation. Update `generation_status` and `output_files` (JSON with file URLs) once rendering is done.
- **Diagnostics runs:** insert with `input_data` snapshot and `model_version`; write scores and `output_data` when complete.
- **Credit passport runs:** insert with payment defaults; store fundability components and `pdf_url` when generated. Increment `share_count` when distributing.
- **Matching runs:** insert into `public.funder_match_runs` with SME context/preferences in `input_data`; attach matches and narratives to `output_data`. Use `shared_matches` rows to record downstream sharing (channel, price, expiry, funder link).
- **Latest outputs:** query the newest `created_at` for a given `company_id` in diagnostics, credit passport, match runs, or paid document requests for recency-sensitive experiences.
- **Storage alignment:** `pdf_url`/`output_files` values should store Supabase Storage paths and be served via signed URLs for client downloads.

## 7. Migration safety and environment sync
- Changes are additive only (no drops/renames) and rely on `IF NOT EXISTS` semantics.
- All FKs use `uuid` and align to `auth.users`/`public.companies` with appropriate cascade behavior.
- RLS and indexes are part of the same migration to keep dev/staging/prod consistent.

## 8. Feature mapping
- AI Business Plan / Pitch Deck / Capability Statement → `public.paid_document_requests` (`document_type` differentiates).
- AI Diagnostics (Business Health Check) → `public.diagnostics_runs`.
- SME Credit Passport & Fundability Score → `public.credit_passport_runs`.
- Investor/Bank/Donor Matching → `public.funder_match_runs` + `public.funder_profiles` + `public.shared_matches`.

✅ All recent Wathaci platform features (AI Documents, Credit Passport, Investor Matching, Diagnostics) are now fully supported by a consistent, normalized Supabase schema with non-breaking migrations, proper foreign keys, RLS policies, and environment-synced migrations. No conflicts or misalignments remain between features and the database layer.
