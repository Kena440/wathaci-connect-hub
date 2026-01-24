# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## 🚀 Production Launch Checklist

Before deploying WATHACI CONNECT to production, complete all items in the comprehensive production readiness checklist.

### Key Pre-Launch Documents:
- **[PRODUCTION_READINESS_COMPLETE.md](PRODUCTION_READINESS_COMPLETE.md)** - ⭐ **START HERE** - Complete production deployment checklist
- **[SIGNUP_SIGNIN_FIX_COMPLETE.md](SIGNUP_SIGNIN_FIX_COMPLETE.md)** - Sign-up/sign-in fixes and implementation guide
- **[OTP_CONFIGURATION_COMPLETE_GUIDE.md](OTP_CONFIGURATION_COMPLETE_GUIDE.md)** - Complete OTP setup (SMS & WhatsApp)
- **[Production Launch Checklist](docs/release/LAUNCH_CHECKLIST.md)** - Management approvals, configuration validation, testing, and monitoring
- **[Production Deployment Guide](docs/PRODUCTION_DEPLOYMENT_GUIDE.md)** - Step-by-step deployment instructions with rollback procedures
- **[Profile Creation Troubleshooting](docs/PROFILE_CREATION_TROUBLESHOOTING.md)** - Diagnose and fix profile creation issues

**Critical**: Ensure `VITE_API_BASE_URL` is set to your live backend API before production deployment. See the deployment guide for details.

### Quick Start Validation

```bash
# Validate your configuration before deployment
npm run config:validate

# Apply database migrations
npm run supabase:push

# Run tests
npm test
```

---

## Supabase CLI Setup

The Supabase CLI is installed and configured for this project. To get started:

1. **Review the setup guide**: See [SUPABASE_CLI_SETUP.md](./SUPABASE_CLI_SETUP.md) for installation and authentication instructions
2. **Login to Supabase**: Run `npm run supabase:login` to authenticate with your Supabase account
3. **Common commands**: Available as npm scripts (see below)

### Supabase CLI Scripts

```bash
npm run supabase:login      # Authenticate with Supabase (interactive helper)
npm run supabase:link       # Link to remote Supabase project
npm run supabase:status     # Check project status
npm run supabase:pull       # Pull remote schema changes
npm run supabase:push       # Push local migrations to remote database
npm run supabase:deploy     # Deploy edge functions
```

For CI/CD integration, see [docs/SUPABASE_CLI_CICD.md](./docs/SUPABASE_CLI_CICD.md).

## Authentication & Email/SMS

### Complete Authentication System ✅

All authentication features are fully implemented and ready for production:

- ✅ **Email-based sign-up and sign-in**
- ✅ **SMS/WhatsApp OTP verification**
- ✅ **Email confirmations**
- ✅ **Password reset flows**
- ✅ **Multiple account types support**

### Email Confirmations

Email confirmations are now **enabled** for new user signups. Users will receive a confirmation email after registration.

Configuration details:
- **[Email Configuration Guide](EMAIL_CONFIGURATION_GUIDE.md)** - Complete SMTP setup and email configuration
- SMTP provider: PrivateEmail (Namecheap) via `mail.privateemail.com`
- Templates located in: `supabase/templates/`

### SMS OTP Support

Users can now choose to receive verification codes via SMS or WhatsApp during signup:

- **[OTP Configuration Complete Guide](OTP_CONFIGURATION_COMPLETE_GUIDE.md)** - ⭐ **Complete OTP setup guide with Twilio**
- **[SMS OTP Setup Guide](SMS_OTP_SETUP_GUIDE.md)** - Quick SMS configuration reference
- SMS/WhatsApp provider: Twilio
- Optional mobile number field in signup form
- Users can select email or SMS verification

Key features:
- Flexible authentication (email or SMS)
- International phone number support
- OTP expiry: 60 minutes
- Rate limiting: 60 seconds between SMS sends

## Payments

Integration steps and deployment details for Lenco payments are covered in the [Payment Integration Guide](docs/PAYMENT_INTEGRATION_GUIDE.md).

- **[Lenco Accounts API Reference](docs/LENCO_ACCOUNTS_API_REFERENCE.md)** – Details for fetching tenant accounts and balances via the `/accounts` endpoint.

### Webhook Setup

For production deployments, you must configure payment webhooks to receive real-time payment status updates:

- **[Webhook Setup Guide](docs/WEBHOOK_SETUP_GUIDE.md)** - Complete webhook configuration, testing, and troubleshooting
- **[Webhook Events Reference](docs/LENCO_WEBHOOK_EVENTS_REFERENCE.md)** - Current Lenco webhook payloads for transfers, collections, and account transactions
- **[Live Keys Update Required](docs/LIVE_KEYS_UPDATE_REQUIRED.md)** - Instructions for updating to production keys
- **[Lenco Keys Rotation Guide](docs/LENCO_KEYS_ROTATION_GUIDE.md)** - Comprehensive guide for rotating API keys

#### Quick Key Rotation

Use the automated helper script to rotate from test to production keys:

```bash
npm run keys:rotate
```

This interactive script will:
- Guide you through retrieving live keys from Lenco dashboard
- Update both frontend and backend `.env` files
- Push secrets to Supabase Edge Functions
- Validate the configuration
- Provide testing instructions

## Ciso Agent – How It Works and How to Debug

**Canonical path:** `https://<project-ref>.functions.supabase.co/agent` (Supabase Edge Function). Frontend calls this URL via `VITE_CISO_AGENT_URL` and always sends `Authorization: Bearer <supabase access token | anon key>`.

**Flow:**
- Frontend components (`CisoWidget`, onboarding/payment forms) call `callCisoAgent` in `src/lib/cisoClient.ts`.
- The client forwards the chat payload to the Supabase Edge Function `functions/agent/index.ts`, which enriches the prompt using the knowledge base RPC and then calls OpenAI.
- The function responds with `{ answer, traceId, source }`; structured errors include `type` and `traceId` for debugging.

**Key environment variables:**
- Frontend: `VITE_CISO_AGENT_URL` (defaults to `/agent` function), `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Edge Function: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, optional `CISO_KB_THRESHOLD`, `CISO_KB_MATCH_COUNT`.

**Health checks:**
- Backend Express: `/health` for core services, `/api/agent/health` for onboarding agent.
- Ciso Edge Function: send `POST /functions/v1/agent` with `{ "query": "ping" }` and a valid Supabase token; a 200 response confirms OpenAI + knowledge base connectivity.

**Common issues & fixes:**
- `401 Unauthorized` → ensure the Authorization header includes a Supabase user token or anon key; `VITE_SUPABASE_ANON_KEY` must be configured in the frontend.
- `config_error` → set `OPENAI_API_KEY` and Supabase service-role key in the Edge Function secrets.
- `validation_error` → queries must be present and under 4000 characters; keep message history under 40 items.
- Rate limits → the Express backend now trusts proxies and applies a dedicated limiter to `/api/agent`.

**Debug steps:**
1) Confirm env vars locally (`npm run config:validate`) and in Supabase/Vercel settings.
2) Call the Edge Function directly with `curl -H "Authorization: Bearer <anon-key>" -d '{"query":"hello"}' https://<project>.functions.supabase.co/agent`.
3) Check Supabase function logs for `[agent][trace-id]` entries; OpenAI errors will be surfaced there.

## AI Onboarding & Payments Agent (Ciso)

The Ciso agent orchestrates end-to-end signup, profile completion, and payments via dedicated API routes exposed by the Express backend:

- **Signup:** `POST /api/agent/signup` – validates credentials, creates Supabase auth users, seeds profile rows, and logs correlation IDs to `agent_logs`.
- **Signin:** `POST /api/agent/signin` – wraps Supabase password auth with consistent logging and error responses.
- **Profile:** `GET/PUT /api/agent/profile` – fetch and update profile states with status transitions (`incomplete`, `pending_verification`, `active`).
- **Checkout:** `POST /api/agent/payments/checkout` – records payments, calls the pluggable payment provider (Lenco placeholder), and returns checkout URLs.
- **Webhook:** `POST /api/agent/payments/webhook` – idempotently updates payments/subscriptions and logs every event.

Schema guardrails live in `supabase/migrations/20260101090000_onboarding_payments_agent.sql`, which ensures agent tables (`agent_logs`, `payments`, `subscriptions`) and profile status columns exist. Apply migrations with `npm run supabase:push` after deploying code changes.

### Extending the agent

- **Add a payment provider:** Implement `PaymentProvider` and wire it into `WathaciOnboardingAgent` (see `backend/services/payment-provider.js`).
- **Introduce new plans:** Update plan codes or defaults in environment variables (`DEFAULT_PLAN_CODE`, `DEFAULT_PLAN_AMOUNT`) and reuse the checkout endpoint.
- **Debug failures:** Check `agent_logs` for every signup, profile update, or payment webhook. Errors are never silent and return structured `{ code, error, details }` payloads to the frontend hooks under `src/hooks/useOnboardingAgent.ts`.

For manual rotation or troubleshooting, see the [Lenco Keys Rotation Guide](docs/LENCO_KEYS_ROTATION_GUIDE.md).

Key steps:
1. Deploy the `webhook_logs` table schema (via `npm run supabase:provision`)
2. **Rotate to live Lenco keys** (via `npm run keys:rotate`)
3. Deploy the `lenco-webhook` edge function to Supabase
4. Configure webhook URL in Lenco dashboard
5. Test webhook integration using the provided test script (see [Webhook Testing Guide](docs/WEBHOOK_TESTING_GUIDE.md))

## Environment Configuration

Project settings are managed through environment variables. Use the automated setup script to create all required environment files:

```bash
npm run env:setup
```

This will create:
- `.env` - Development environment configuration
- `.env.production` - Production environment configuration
- `backend/.env` - Backend development configuration
- `backend/.env.production` - Backend production configuration

Alternatively, you can manually copy the templates:

```bash
cp .env.example .env
cp .env.example .env.production
cp backend/.env.example backend/.env
cp backend/.env.example backend/.env.production
```

After creating the files, update them with your actual credentials:

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_PROJECT_URL` / `SUPABASE_URL` – Supabase project URL (mirrored for the backend runtime).
- `VITE_SUPABASE_KEY` / `VITE_SUPABASE_ANON_KEY` – Supabase anon key for client access.
- `SUPABASE_SERVICE_ROLE_KEY` – Required for any server-side inserts, including the Express API and Supabase Edge Functions.
- `VITE_LENCO_PUBLIC_KEY` – Lenco public API key (current dashboards issue `pub-…` keys; older projects may still use `pk_live_…`).
- `LENCO_SECRET_KEY` – Lenco secret API key (accepts `sec-…`, `sk_live_…`, or legacy 64-character hex secrets).
- `LENCO_WEBHOOK_SECRET` – Secret used to validate Lenco webhooks.
- `VITE_LENCO_API_URL` – Lenco API base URL, `https://api.lenco.co/access/v2`.
- `VITE_PAYMENT_CURRENCY` – ISO currency code for payments, e.g. `ZMW`.
- `VITE_PAYMENT_COUNTRY` – ISO country code, e.g. `ZM`.
- `VITE_PLATFORM_FEE_PERCENTAGE` – Platform fee percentage applied to each payment (e.g. `10`).
- `VITE_MIN_PAYMENT_AMOUNT` – Minimum allowed payment amount (e.g. `0`).
- `VITE_MAX_PAYMENT_AMOUNT` – Maximum allowed payment amount (e.g. `50000`).
- `VITE_APP_ENV` – Set to `production` for live deployments.
- `VITE_APP_NAME` – Application display name.
- `SMTP_PASSWORD` – SMTP password for email delivery (see [Email Configuration Guide](EMAIL_CONFIGURATION_GUIDE.md)).
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGE_SERVICE_SID` – Twilio credentials for SMS OTP (see [SMS OTP Setup Guide](SMS_OTP_SETUP_GUIDE.md)).

## Local Development

To run WATHACI CONNECT locally, you need to start both the frontend and backend servers:

### Prerequisites
1. Install dependencies:
   ```bash
   npm install
   cd backend && npm install && cd ..
   ```

2. Configure environment variables:
   ```bash
   # Ensure .env.local exists with required configuration
   # Backend API URL should be set to:
   VITE_API_BASE_URL="http://localhost:3000"
   ```

### Starting the Servers

**Terminal 1 - Backend API (runs on port 3000):**
```bash
cd backend
npm start
```
The backend Express server will start at `http://localhost:3000`

**Terminal 2 - Frontend (runs on port 8080):**
```bash
npm run dev
```
The frontend Vite dev server will start at `http://localhost:8080`

### Port Configuration
- **Frontend**: `http://localhost:8080` (configured in `vite.config.js`)
- **Backend API**: `http://localhost:3000` (configured in `backend/index.js`)
- **API Base URL**: Set `VITE_API_BASE_URL="http://localhost:3000"` in `.env.local`

### Accessing the Application
Open your browser and navigate to: `http://localhost:8080`

The frontend will automatically communicate with the backend API at `http://localhost:3000` for:
- User registration
- OTP verification
- Payment processing
- Logging and analytics

## SMS & WhatsApp OTP (Twilio)

The backend now exposes OTP endpoints backed by Twilio. Configure the following environment variables at runtime:

```
TWILIO_ACCOUNT_SID=<twilio-account-sid>
TWILIO_AUTH_TOKEN=<twilio-auth-token>
TWILIO_MESSAGE_SERVICE_SID=<preferred messaging service>
# Optional fallbacks
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_FROM=whatsapp:+1234567890

# Enable Supabase-backed persistence (recommended)
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

API contracts (JSON):

- `POST /api/auth/otp/send` with `{ "phone": "+260...", "channel": "sms" | "whatsapp" }` → `200 { ok: true }` when dispatched.
- `POST /api/auth/otp/verify` with `{ "phone": "+260...", "channel": "sms" | "whatsapp", "code": "123456" }` → `200 { ok: true, result: { phone_verified: boolean } }` when valid.

Codes are 6 digits, expire after 10 minutes, and allow up to 5 attempts. When Supabase credentials are present, OTPs are stored in `public.otp_challenges` and successful verifications stamp `profiles.phone_verified_at`.

**Validate your configuration:**

```bash
npm run env:check
```

This will scan all environment files and flag any missing or placeholder values.

When deploying to Vercel (or another hosting provider), add **both** `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` (or the Supabase
default `VITE_SUPABASE_ANON_KEY`) to the project
environment variables along with any server-side keys (such as `SUPABASE_SERVICE_ROLE_KEY` if you run edge functions). Use the
[deployment checklist](docs/VERCEL_SUPABASE_DEPLOYMENT.md) to mirror the values from `.env` into the `Production`, `Preview`, and
`Development` environments and verify them before triggering a build.

Run `npm run env:check` (backed by `scripts/env-check.mjs`) or `./scripts/setup-payments.sh` locally to confirm the `.env` files in
both the frontend and backend contain production values. The checker fails fast when required keys are missing or when placeholder/test
credentials are still present.

For a complete pre-launch overview—including database provisioning, Supabase Edge Function deployment, webhook validation, and
regression testing—consult the [Production Readiness Checklist](docs/PRODUCTION_READINESS_CHECKLIST.md).

## Testing

Lighthouse and automated accessibility checks are available via npm scripts.

```bash
# Run accessibility tests powered by jest-axe
npm run test:accessibility

# Generate a Lighthouse report (requires a running dev server)
npm run test:lighthouse
```

Make sure project dependencies are installed before executing the test commands.

