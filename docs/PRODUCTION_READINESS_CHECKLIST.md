# Production Readiness Checklist

This checklist consolidates the remaining action items required before WATHACI CONNECT can ship to production. Use it alongside `docs/VERCEL_SUPABASE_DEPLOYMENT.md`, `docs/PAYMENT_INTEGRATION_GUIDE.md`, and `docs/DEPLOYMENT_SECURITY_CHECKLIST.md`.

## 1. Environment & Configuration

1. Copy `.env.example` to `.env` (and `.env.production` if you maintain a dedicated file for live builds).
2. Populate every Supabase and Lenco credential with production values – replace all `your-…`, `test_`, or sandbox placeholders.
3. Mirror the same values inside Vercel → **Settings → Environment Variables** for `Production`, `Preview`, and `Development` environments.
4. Run the automated audit to confirm nothing is missing or placeholder values remain:
   ```bash
   npm run env:check
   ```
   The command inspects `.env*` files in the frontend root and backend directories, flagging missing values and non-live payment keys.

## 2. Backend, Database & Supabase Functions

1. Export `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for the Express backend (or set them in the hosting provider) so registrations persist to Supabase.
2. Provision the production Supabase database schema:
   ```bash
   SUPABASE_DB_URL="postgres://…" npm run supabase:provision
   ```
   Alternatively, execute the SQL files in `backend/supabase/` manually.
3. Deploy the Supabase Edge Functions:
   ```bash
   supabase login
   supabase link --project-ref <project-ref>
   supabase functions deploy funding-matcher
   supabase functions deploy lenco-payment
   supabase functions deploy payment-verify
   supabase functions deploy payment-webhook
   ```
4. Set each function's secrets using the Supabase CLI or dashboard (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `LENCO_SECRET_KEY`, `LENCO_WEBHOOK_SECRET`, etc.) and verify them via `supabase secrets list`.
5. Update the Lenco dashboard webhook URL to the deployed `payment-webhook` endpoint and confirm the handshake using Lenco's webhook test utility.

## 3. Payments & Webhook Validation

1. Switch all payment credentials to production-mode keys (`pk_live_…`/`sk_live_…`).
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
