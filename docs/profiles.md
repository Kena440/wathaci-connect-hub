# Profile data model and onboarding flows

This document captures the current account types, their onboarding entry points, schema ownership, and how profile data is persisted. Use it as the source of truth when adding new profile fields or account types.

## Account types and components

| Account Type | Selection / Entry Routes | Form Components & Schemas | Target Tables | Notes |
| --- | --- | --- | --- | --- |
| `sme` | `/get-started`, `/profile-setup`, `/zaqa-signup` → `/onboarding/sme/profile` | `SmeOnboardingPage` (`smeSchema`), needs assessment in `SmeNeedsAssessmentPage` | `public.profiles`, `public.sme_profiles` | `business_name`, contact info, location, challenges/support arrays must be present. |
| `professional` | `/get-started`, `/profile-setup` → `/onboarding/professional/profile` | `ProfessionalOnboardingPage` (`professionalSchema`), `ProfessionalNeedsAssessmentPage` | `public.profiles`, `public.professional_profiles` | Requires `full_name`, `entity_type`, expertise/services arrays, location, contact links. |
| `investor` | `/get-started`, `/profile-setup` → `/onboarding/investor/profile` | `InvestorOnboardingPage` (`investorSchema`), `InvestorNeedsAssessmentPage` | `public.profiles`, `public.investor_profiles` | Requires `organisation_name`, `contact_person`, ticket sizes, sector/stage/instrument arrays. |
| `donor` | `/get-started`, `/profile-setup` (needs assessment only) | `DonorNeedsAssessmentPage` | `public.profiles` (base), `public.donor_profiles` (available) | Profile saved via base `profiles`; donor table kept in sync by migrations. |
| `government_institution` | `/get-started`, `/profile-setup` (needs assessment only) | `GovernmentNeedsAssessmentPage` | `public.profiles` (base), `public.government_institution_profiles` (available) | Account type normalised from `government`; specialised table kept ready. |

## Linking and ownership

- `public.profiles.id` = `auth.users.id` and stores the canonical `account_type`, contact info, and common metadata.
- Specialised profile tables (`sme_profiles`, `professional_profiles`, `investor_profiles`, `donor_profiles`, `government_institution_profiles`) use `user_id` (FK to `auth.users.id`) and optional `profile_id` (FK to `public.profiles.id`).
- Row Level Security allows authenticated users to read/write only rows where `user_id = auth.uid()`; service role retains full access.

## Creation flow

1. User signs up/selects account type (GetStarted/ProfileSetup/ZaqaSignup flows).
2. `upsertProfile` writes to `public.profiles` with `id = auth.user().id`, normalised `account_type`, and shared identity fields (`business_name`, `msisdn`, `phone`, `email`, etc.).
3. Account-type pages submit specialised payloads via `upsertSmeProfile`, `upsertProfessionalProfile`, or `upsertInvestorProfile`, which write into the matching specialised table and mark the base profile as complete.
4. Needs assessment pages (`saveSmeNeedsAssessment`, `saveProfessionalNeedsAssessment`, `saveInvestorNeedsAssessment`, `saveDonorNeedsAssessment`) store assessment data but rely on the base profile having already been upserted.

## Adding or adjusting fields safely

1. **Add migrations first**: extend the relevant table(s) in `supabase/migrations` using `ADD COLUMN IF NOT EXISTS` and keep defaults aligned with form requirements. Ensure updated_at triggers and RLS policies remain intact.
2. **Regenerate/update types**: refresh `src/@types/supabase.types.ts` and `src/@types/database.ts` (or update manually) so TypeScript/Zod schemas match the database.
3. **Update schemas/forms**: adjust Zod schemas and form components to use the same snake_case column names and required/optional flags as the database.
4. **Supabase calls**: make sure payload objects only include valid columns and provide all non-nullable fields (`business_name`, `contact_name`, etc.). Log table name, payload keys, and Supabase errors for quick diagnosis.
5. **RLS**: confirm authenticated users can manage only their own rows; add policies for any new tables.

Keeping this alignment prevents “column does not exist” errors during onboarding and ensures each account type can complete profile creation successfully.
