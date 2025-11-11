# Environment configuration for WATHACI CONNECT

The application now exposes a single, canonical configuration surface for the frontend (Vite) build, runtime hosting environments (e.g. Vercel), and Supabase Edge Functions. This document explains which variables are required, how the readiness guard evaluates them, and how to provision both frontend and backend secrets.

## 1. Canonical environment variables

| Purpose | Canonical key | Accepted aliases | Notes |
| --- | --- | --- | --- |
| Supabase project URL | `VITE_SUPABASE_URL` | `VITE_SUPABASE_PROJECT_URL`, `SUPABASE_URL`, `SUPABASE_PROJECT_URL` | Required for any deployment. |
| Supabase anon/public key | `VITE_SUPABASE_ANON_KEY` | `VITE_SUPABASE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_KEY` | Required for any deployment. |
| Lenco API base URL | `VITE_LENCO_API_URL` | `LENCO_API_URL` | Required when payments are enabled (defaults to production endpoint if omitted). |
| Lenco public key | `VITE_LENCO_PUBLIC_KEY` | `LENCO_PUBLIC_KEY` | Required (fatal if missing). |
| Lenco secret key (frontend toggle) | `VITE_LENCO_SECRET_KEY` | `LENCO_SECRET_KEY` | Optional – prefer backend secret when possible. |
| Lenco webhook destination (frontend awareness) | `VITE_LENCO_WEBHOOK_URL` | `LENCO_WEBHOOK_URL` | Required for launch (fatal if missing). |
| Payment min amount | `VITE_MIN_PAYMENT_AMOUNT` | `MIN_PAYMENT_AMOUNT` | Optional number. |
| Payment max amount | `VITE_MAX_PAYMENT_AMOUNT` | `MAX_PAYMENT_AMOUNT` | Optional number. |
| Platform fee percentage | `VITE_PLATFORM_FEE_PERCENTAGE` | `PLATFORM_FEE_PERCENTAGE` | Optional number. |
| Payment currency | `VITE_PAYMENT_CURRENCY` | `PAYMENT_CURRENCY` | Defaults to `ZMW`. |
| Payment country | `VITE_PAYMENT_COUNTRY` | `PAYMENT_COUNTRY` | Defaults to `ZM`. |
| App environment flag | `VITE_APP_ENV` | — | Optional: `development` \| `production`. |

> ⚠️ Only variables prefixed with `VITE_` are exposed to the browser bundle. Any alias without the prefix is treated as a fallback for compatibility during the readiness check.

## 2. `.env.production` template (frontend build)

Create or update the file `./.env.production` (and optionally `.env` for local development) with the following template:

```env
# ── Supabase frontend configuration ──────────────────────────────────────
VITE_SUPABASE_URL="https://<project-ref>.supabase.co"
VITE_SUPABASE_ANON_KEY="<public-anon-key>"

# ── Lenco payments (browser usage) ───────────────────────────────────────
VITE_LENCO_API_URL="https://api.lenco.co/access/v2"
VITE_LENCO_PUBLIC_KEY="<pk_live_or_pk_test_value>"
# Optional: expose only if the frontend must call privileged endpoints.
VITE_LENCO_SECRET_KEY="<sk_live_or_test_value>"
VITE_LENCO_WEBHOOK_URL="https://<project-ref>.supabase.co/functions/v1/lenco-payments-validator"

# ── Payment limits and display settings ───────────────────────────────────
VITE_MIN_PAYMENT_AMOUNT="20"
VITE_MAX_PAYMENT_AMOUNT="10000"
VITE_PLATFORM_FEE_PERCENTAGE="5"
VITE_PAYMENT_CURRENCY="ZMW"
VITE_PAYMENT_COUNTRY="ZM"

# ── Environment tags ─────────────────────────────────────────────────────
# (used to switch between production/test payment credentials)
VITE_APP_ENV="production"
```

### Notes

1. **Frontend builds** (`npm run build`) read from `.env.production` by default. Add the same keys to `.env` (without the `.production` suffix) for local development if desired.
2. **Hosting providers (Vercel, Netlify, Render, etc.)**: define the same `VITE_*` variables in the project’s environment settings. Vercel instructions:
   - Navigate to *Project Settings → Environment Variables*.
   - Add each key from the table above under the *Production* environment.
   - Redeploy the project so that the build picks up the new values.
3. If you change any variable, trigger a new production build. Hot-swapping runtime values without rebuilding is not supported.

## 3. Supabase backend secrets (Edge Functions and database jobs)

Supabase Edge Functions and server-side integrations must use service-role credentials and the non-prefixed Lenco secrets. Store them via the Supabase CLI or Dashboard (`Settings → API → Config Variables`).

Example `supabase-prod-secrets.env`:

```env
# ── Supabase core ────────────────────────────────────────────────────────
SUPABASE_URL="https://<project-ref>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"

# ── Lenco secrets for functions/webhooks ─────────────────────────────────
LENCO_API_SECRET="<lenco-private-api-key>"
LENCO_SECRET="<shared-secret-if-required>"
LENCO_WEBHOOK_URL="https://<project-ref>.supabase.co/functions/v1/lenco-payments-validator"
LENCO_WEBHOOK_SECRET="<webhook-signing-secret-from-lenco>"

# ── Payment constraints mirrored on the backend (optional) ───────────────
MIN_PAYMENT_AMOUNT="20"
MAX_PAYMENT_AMOUNT="10000"
PLATFORM_FEE_PERCENTAGE="5"
```

Apply them via the CLI:

```bash
supabase secrets set --env-file supabase-prod-secrets.env
```

## 4. Lenco dashboard configuration

1. **Webhook URL**: set the dashboard to `https://<project-ref>.supabase.co/functions/v1/lenco-payments-validator` (or your chosen Supabase Function endpoint).
2. **Webhook signing secret**: copy the value from Lenco into `LENCO_WEBHOOK_SECRET` (Supabase secret) and surface the URL in the frontend via `VITE_LENCO_WEBHOOK_URL` so the readiness helper confirms it is configured.
3. **Environment parity**: ensure `VITE_APP_ENV="production"` when using live keys. The readiness check prevents deploying with `pk_test_...` keys while `VITE_APP_ENV` resolves to production.

## 5. How the readiness guard works

- `src/config/appConfig.ts` normalises aliases into the canonical keys, sanitises values, and produces an `AppConfig` snapshot.
- If either `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` (or their aliases) is missing, the UI renders the **Configuration required before launch** screen with precise instructions.
- Lenco configuration is validated via `src/lib/payment-config.ts` and `App.tsx`. Missing API URL, public key, or webhook URL is treated as a **blocking issue**; the guard will not allow the UI to render until all are provided.
- All resolved values are logged once on mount (`[app] Mounted`) to aid debugging.

## 6. Deployment checklist

1. Populate `.env.production` locally (or configure environment variables in your hosting provider).
2. Populate Supabase secrets with service-role keys and Lenco backend secrets.
3. Configure the Lenco dashboard webhook to point at your Supabase Edge Function.
4. Rebuild (`npm run build`) and redeploy.
5. Verify the landing page renders instead of the configuration guard. If the guard still appears, check the blocking issue list—it mirrors the validation performed during build/runtime.

Keeping frontend and backend variables in sync ensures the readiness helper recognises the deployment as production-ready and prevents accidental launches with missing Supabase or Lenco configuration.
