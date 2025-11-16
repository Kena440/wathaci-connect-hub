# Prompt for Investigating and Fixing Sign-Up/Sign-In Rendering Errors

Use this prompt when diagnosing the "Something went wrong" screen that appears during authentication flows. It is designed for engineers or AI assistants to methodically identify and fix the root causes behind the unexpected error boundary render in WATHACI CONNECT.

---

## Context and Objective
- The error boundary (`src/components/ErrorBoundary.tsx`) renders when a React render or effect throws. Users currently encounter it on sign-up and sign-in.
- Authentication flows are implemented in `src/components/AuthForm.tsx` and orchestrated via `AppProvider` (`src/contexts/AppContext.tsx`) backed by Supabase services (`src/lib/services/user-service.ts`).
- Goal: identify the exact failing step in auth (client validation, Supabase calls, profile creation, or configuration guards) and deliver a fix or mitigation.

## Step-by-Step Diagnostic Instructions
1. **Reproduce with console open**
   - Run `npm run dev` with all `.env` variables loaded.
   - Open DevTools console and Network tab; attempt sign-in and sign-up to capture runtime stack traces and failing requests.

2. **Check configuration gatekeepers**
   - Confirm `supabaseConfigStatus` is valid; otherwise `ConfigurationError` should render instead of the boundary (`src/App.tsx`). Missing `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` will block auth entirely.
   - Verify maintenance flags (`src/config/featureFlags.ts`) aren’t disabling auth: `VITE_MAINTENANCE_MODE`, `VITE_MAINTENANCE_ALLOW_SIGNIN`, `VITE_MAINTENANCE_ALLOW_SIGNUP`.

3. **Instrument the auth form flow**
   - Inspect `AuthForm.onSubmit` for thrown errors. Confirm `logSupabaseAuthError` captures the Supabase error payload and ensure `setFormError` receives the message instead of allowing an uncaught exception (`src/components/AuthForm.tsx`).
   - Add temporary `console.error` lines around `signIn`/`signUp` calls to catch unexpected shapes in responses (e.g., `undefined` user objects).

4. **Trace AppContext state transitions**
   - In `src/contexts/AppContext.tsx`, log every early return in `signIn` and `signUp`, especially the retry loop that creates profiles after registration. Check for unhandled `profileService.createProfile` errors that might bubble and trigger the error boundary.
   - Validate offline session persistence (`wathaci_offline_session`) does not store circular data that breaks JSON parsing when the provider rehydrates.

5. **Validate Supabase client behavior**
   - Ensure environment variables are available at runtime; otherwise the client falls back to the mock implementation in `src/lib/supabase-enhanced.ts`, which may not mirror production policies.
   - Confirm `getEmailRedirectTo` in `src/lib/services/user-service.ts` resolves to a valid HTTPS URL—misconfigured redirect URLs can cause Supabase to throw during `auth.signUp`.

6. **Review network failures**
   - Observe `/api/logs` calls triggered by `ErrorBoundary.logErrorToService`. If these return 4xx/5xx, inspect backend logging endpoints for misconfiguration.
   - For Supabase requests, check CORS and status codes; a 401/42501 indicates row-level security blocking profile creation.

7. **Add tests or repro harness**
   - Create a minimal Jest/React Testing Library test that mounts `AuthForm` within `AppProvider` using mock Supabase configs to catch regressions without a browser.

8. **Propose fixes once root cause is known**
   - If the issue is configuration-related, update `.env.example` and `ConfigurationError` messaging to prevent silent failure.
   - If profile creation intermittently fails, implement better retries and fallbacks in `AppContext.signUp` and surface actionable error text via `setFormError`.
   - If Supabase rejects redirect URLs, harden `getEmailRedirectTo` to default to a safe in-app path and log a warning instead of throwing.

9. **Verify resolution**
   - After applying fixes, repeat sign-in/sign-up flows and ensure the boundary does not render.
   - Confirm success toasts fire and profile records are created in Supabase.
   - Add a smoke test script to CI if possible.

## Artifacts to collect for support
- Full console stack trace and network HAR for the failing attempt.
- Supabase error payloads (message, code, status, and context) from `logSupabaseAuthError`.
- Environment variable values used at runtime (sanitized of secrets) to confirm configuration alignment.

## Expected outcome
Following this prompt should produce either a concrete code/config fix or a narrowed-down repro case that prevents the generic "Something went wrong" experience during authentication.
