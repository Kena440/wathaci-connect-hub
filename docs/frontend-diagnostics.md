# Frontend Diagnostics: User Creation & Profile Submission

## Overview
This document captures the current frontend implementation for Supabase powered
user creation and profile submission flows. It highlights the relevant code
paths, expected payloads, and potential sources of client-side errors.

## Authentication (User Sign-up)
- `userService.signUp` wraps `supabase.auth.signUp` via the helper in
  `src/lib/services/user-service.ts`. The call is executed inside the
  `withErrorHandling` utility, returning a `DatabaseResponse<User>` that
  surfaces Supabase errors to the UI.
- Upon successful sign-up, the service normalizes the response into the local
  `User` shape (id, email, timestamps) before handing control back to the
  caller.

## Profile Creation Flow
- After sign-up, `AppContext.signUp` invokes
  `profileService.createProfile(user.id, payload)`. The payload combines the
  user's email with any optional metadata supplied during registration.
- `ProfileService.createProfile` (in the same file) builds a profile object with
  timestamps, a `profile_completed` flag defaulting to `false`, and delegates to
  the shared `BaseService.create` helper.
- `BaseService.create` issues a `supabase.from('profiles').insert(...).select().single()`
  call, which will raise errors for validation or row-level security violations
  that surface back through `withErrorHandling`.

## Profile Setup Page
- `ProfileSetup.handleAccountTypeSelect` performs an `upsert` against the
  `profiles` table to persist the selected account type prior to rendering the
  full profile form.
- `ProfileSetup.handleProfileSubmit` prepares a payload containing personal
  information, sector selections, and conditional payment metadata before a
  second `upsert`. On success it triggers `refreshUser()` to reload the profile
  in context and routes to an account-type-specific assessment page.
- The associated `ProfileForm` component serializes the complex form state (e.g.
  country-aware phone formatting, qualification arrays, address coordinates)
  and submits it back to `handleProfileSubmit` unchanged, so the Supabase call
  receives the same data the user enters.

## Potential Client-side Error Sources
1. **Network / Auth errors** – `userService.signUp` already converts fetch
   failures into user-friendly error messages, but network outages will still be
   surfaced as exceptions in the console.
2. **Profile upsert validation** – The profile `upsert` sends nested JSON
   structures (e.g. `qualifications`, `coordinates`, `card_details`). Run
   [`backend/supabase/profiles_schema.sql`](../backend/supabase/profiles_schema.sql)
   so the Supabase columns are JSONB; otherwise, the insert will fail with a 400
   response logged in the console.
3. **Complete card capture** – When `payment_method` is `card`, the form now
   collects the cardholder name, card number, and expiry. The submission logic
   stores only masked metadata (`last4`, `expiry_month`, `expiry_year`,
   `cardholder_name`) to keep sensitive fields off Supabase while satisfying the
   validation rules required for card-based sign-ups.
4. **Existing row conflicts** – The initial account type `upsert` includes a
   `created_at` timestamp each time. If the column is configured as
   non-updatable or expects server defaults, Supabase will respond with an
   error captured by the toast error handler.

## Recommendations for Debugging
- Monitor the browser developer console for `SupabaseError` entries when either
  `handleAccountTypeSelect` or `handleProfileSubmit` runs; the toast error
  already displays the `.message`, but the console contains additional context
  like HTTP status codes.
- Confirm that the Supabase table definitions support all fields being sent
  (especially nested JSON fields and timestamps) to avoid 400-level validation
  errors during `upsert`.
- Add temporary `console.debug` statements around the `supabase.from('profiles')`
  calls in `ProfileSetup` when reproducing issues locally to inspect the exact
  payload being transmitted.
