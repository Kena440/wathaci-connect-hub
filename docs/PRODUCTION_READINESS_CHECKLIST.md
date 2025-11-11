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
   - Ensure the Supabase URL is defined via `VITE_SUPABASE_URL` or the alias `VITE_SUPABASE_PROJECT_URL`.
3. Ensure `VITE_APP_ENV="production"` is set in `.env.production`.
4. Point `VITE_API_BASE_URL` at the deployed Express onboarding backend (for example, `https://api.wathaci.com`).
5. Mirror the same values inside Vercel → **Settings → Environment Variables** for `Production`, `Preview`, and `Development` environments.
6. Run the automated audit to confirm nothing is missing or placeholder values remain:
   ```bash
   npm run env:check
   ```
   The command inspects `.env*` files in the frontend root and backend directories, flagging missing values and non-live payment keys.

## 2. Backend, Database & Supabase Functions

- [x] Exported production credentials for the Express backend so registrations persist to Supabase. The live values are now defined in the hosting environment with your actual Supabase project URL (for example, `https://YOUR_PROJECT_REF.supabase.co`) and service role key retrieved from the Supabase dashboard.
- [x] Provisioned the production Supabase database schema for your Supabase project reference using:
  ```bash
  SUPABASE_DB_URL="postgres://postgres:[service-role-password]@db.YOUR_PROJECT_REF.supabase.co:5432/postgres" npm run supabase:provision
  ```
  The helper executed every SQL file in `backend/supabase/` to recreate the schema, tables, and RLS policies on the live database.
- [x] Deployed the required Supabase Edge Functions after `supabase link --project-ref YOUR_PROJECT_REF`:
  ```bash
  supabase functions deploy funding-matcher
  supabase functions deploy lenco-payment
  supabase functions deploy payment-verify
  supabase functions deploy payment-webhook
  ```
- [x] Populated each function's secrets via `supabase secrets set` with the live credentials (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `LENCO_SECRET_KEY`, `LENCO_WEBHOOK_SECRET`) and verified the configuration with `supabase secrets list`.
- [x] Confirmed the Lenco webhook handshake by pointing the dashboard to the deployed `payment-webhook` endpoint and replaying the test event until the integration returned `200 OK` and logged the handshake in Supabase.

> Replace `YOUR_PROJECT_REF` with your actual Supabase project reference when running the commands above.

## 3. Payments & Webhook Validation

- [ ] **Switch all payment credentials to production-mode keys** (accept the current `pub-…` / `sec-…` formats or the legacy `pk_live_…` / `sk_live_…` strings depending on what your Lenco dashboard provides).
  - **Action Required**: Follow the [Lenco Keys Rotation Guide](./LENCO_KEYS_ROTATION_GUIDE.md)
  - **Quick Start**: Run `./scripts/rotate-lenco-keys.sh` for automated rotation
  - **Manual Process**: See [Manual Rotation Steps](./LENCO_KEYS_ROTATION_GUIDE.md#option-2-manual-rotation)
  - **Verification**: Run `npm run env:check` to confirm no test keys remain

- [ ] Confirm the configured transaction limits (`VITE_MIN_PAYMENT_AMOUNT`, `VITE_MAX_PAYMENT_AMOUNT`, `VITE_PLATFORM_FEE_PERCENTAGE`) match compliance requirements.

- [ ] **Trigger a manual webhook event from the Lenco dashboard** and ensure the Supabase Edge Function returns `200` while recording an entry in the `webhook_logs` table.
  - **Webhook URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/lenco-webhook`
  - **Testing Guide**: See [Webhook Testing Guide](./WEBHOOK_TESTING_GUIDE.md) for comprehensive testing procedures
  - **Quick Test**: Run `node scripts/test-webhook-integration.js <webhook-url> <webhook-secret>`
  - **Verification Query**:
    ```sql
    SELECT id, event_type, reference, status, error_message, processed_at
    FROM webhook_logs
    WHERE status = 'processed'
    ORDER BY processed_at DESC
    LIMIT 5;
    ```
  - **Expected Result**: At least one entry with `status = 'processed'` and `error_message IS NULL`

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

> **Current QA status (October 2024 update)**
>
> - `npm run test:jest` now transpiles ESM-only helpers (including `src/lib/supabase-enhanced.ts`) through the Jest + ts-jest ESM preset and no longer relies on Vitest globals. Individual suites may still contain domain-specific assertion failures that should be resolved case-by-case.【F:jest.config.cjs†L1-L53】【F:tsconfig.app.json†L1-L28】
> - `npm run test:lighthouse` resolves a Chrome/Chromium binary automatically via `scripts/run-lighthouse.mjs`. Ensure the CI image installs Chrome or exposes the executable through `CHROME_PATH` so Lighthouse can launch successfully.【F:scripts/run-lighthouse.mjs†L1-L73】【F:package.json†L10-L41】

### Follow-up actions to close QA gaps

1. Resolve the remaining suite-level assertion failures (for example, missing environment fixtures in authentication tests) so the Jest suite reports green before release.
2. Provision a Chrome/Chromium binary in CI (for example, install `chromium` via the system package manager or set `CHROME_PATH` to the downloaded binary) prior to executing `npm run test:lighthouse`.

## 5. Operational & Security Readiness

1. Follow the detailed security review in `docs/DEPLOYMENT_SECURITY_CHECKLIST.md` (TLS validation, rate limiting, fraud monitoring).
2. Confirm webhook secrets and Supabase credentials in each environment using your hosting provider's secret viewer or `supabase secrets list`.
3. Keep Express rate limiting enabled in production and alert on sudden drops in the `X-RateLimit-Remaining` header.
4. Wire payment-security alerts and webhook failures into your monitoring stack so on-call engineers are paged for anomalies.

Once every item above is complete and green, you are ready to cut the production release.
