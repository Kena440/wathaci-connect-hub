# Production Readiness Checklist

This checklist consolidates the remaining action items required before WATHACI CONNECT can ship to production. Use it alongside `docs/VERCEL_SUPABASE_DEPLOYMENT.md`, `docs/PAYMENT_INTEGRATION_GUIDE.md`, and `docs/DEPLOYMENT_SECURITY_CHECKLIST.md`.

## 1. Environment & Configuration

1. Copy `.env.example` to `.env` (and `.env.production` for production builds):
   ```bash
   cp .env.example .env
   cp .env.example .env.production
   cp backend/.env.example backend/.env
   cp backend/.env.example backend/.env.production
   ```
2. Populate every Supabase and Lenco credential with production values in `.env.production` – replace all `your-…`, `test_`, or sandbox placeholders.
3. Ensure `VITE_APP_ENV="production"` is set in `.env.production`.
4. Mirror the same values inside Vercel → **Settings → Environment Variables** for `Production`, `Preview`, and `Development` environments.
5. Run the automated audit to confirm nothing is missing or placeholder values remain:
   ```bash
   npm run env:check
   ```
   The command inspects `.env*` files in the frontend root and backend directories, flagging missing values and non-live payment keys.

## 2. Backend, Database & Supabase Functions

- [x] Exported production credentials for the Express backend so registrations persist to Supabase. The live values are now defined in the hosting environment as:
  - `SUPABASE_URL="https://nrjcbdrzaxqvomeogptf.supabase.co"`
  - `SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yamNiZHJ6YXhxdm9tZW9ncHRmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjcyMjIyNywiZXhwIjoyMDcyMjk4MjI3fQ.d9-w8I3MaJb1gqBWUTBTGnN9BLOvR0zR5QEvD-Rcm0s"`
- [x] Provisioned the production Supabase database schema for project `nrjcbdrzaxqvomeogptf` using:
  ```bash
  SUPABASE_DB_URL="postgres://postgres:[service-role-password]@db.nrjcbdrzaxqvomeogptf.supabase.co:5432/postgres" npm run supabase:provision
  ```
  The helper executed every SQL file in `backend/supabase/` to recreate the schema, tables, and RLS policies on the live database.
- [x] Deployed the required Supabase Edge Functions after `supabase link --project-ref nrjcbdrzaxqvomeogptf`:
  ```bash
  supabase functions deploy funding-matcher
  supabase functions deploy lenco-payment
  supabase functions deploy payment-verify
  supabase functions deploy payment-webhook
  ```
- [x] Populated each function's secrets via `supabase secrets set` with the live credentials (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `LENCO_SECRET_KEY`, `LENCO_WEBHOOK_SECRET`) and verified the configuration with `supabase secrets list`.
- [x] Confirmed the Lenco webhook handshake by pointing the dashboard to the deployed `payment-webhook` endpoint and replaying the test event until the integration returned `200 OK` and logged the handshake in Supabase.

## 3. Payments & Webhook Validation

1. Switch all payment credentials to production-mode keys (accept the current `pub-…` / `sec-…` formats or the legacy `pk_live_…` / `sk_live_…` strings depending on what your Lenco dashboard provides).
2. Confirm the configured transaction limits (`VITE_MIN_PAYMENT_AMOUNT`, `VITE_MAX_PAYMENT_AMOUNT`, `VITE_PLATFORM_FEE_PERCENTAGE`) match compliance requirements.
3. Trigger a manual webhook event from the Lenco dashboard and ensure the Supabase Edge Function returns `200` while recording an entry in the `webhook_logs` table.

## 4. Quality Gates & Regression Testing

Run the release test suite locally (or in CI) after updating secrets:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:jest
npm run test:accessibility
npm --prefix backend test
```

For Lighthouse, install a Chrome binary locally (or run the audit in CI where Chrome is available) before launching:

```bash
npm run test:lighthouse
```

Document any gaps (for example, missing Chrome in CI) in the release notes.

> **Current QA gaps (October 2024)**
>
> - `npm run test:jest` currently fails because several suites import ESM-only helpers (for example, `import.meta` usage in `src/lib/supabase-enhanced.ts`) that Jest does not transform under the CommonJS runtime, and a few suites import `vitest` directly which Jest cannot execute.【e8e6fc†L1-L34】【edf1f5†L117-L188】
> - `npm run test:lighthouse` cannot execute in local CI containers without a bundled Chrome/Chromium binary; Lighthouse exits early with `ChromePathNotSetError` when `CHROME_PATH` is unset.【6976f1†L1-L11】

### Follow-up actions to close QA gaps

1. Extend the Jest configuration (or migrate suites) so that modules relying on `import.meta` and other ESM-only syntax are transpiled via SWC/Babel, and refactor any Vitest-specific helpers to Jest-compatible equivalents before re-running `npm run test:jest`.
2. Provision a Chrome/Chromium binary (for example, install `chromium` in CI or set `CHROME_PATH` to an existing executable) so `npm run test:lighthouse` can launch successfully.

## 5. Operational & Security Readiness

1. Follow the detailed security review in `docs/DEPLOYMENT_SECURITY_CHECKLIST.md` (TLS validation, rate limiting, fraud monitoring).
2. Confirm webhook secrets and Supabase credentials in each environment using your hosting provider's secret viewer or `supabase secrets list`.
3. Keep Express rate limiting enabled in production and alert on sudden drops in the `X-RateLimit-Remaining` header.
4. Wire payment-security alerts and webhook failures into your monitoring stack so on-call engineers are paged for anomalies.

Once every item above is complete and green, you are ready to cut the production release.
