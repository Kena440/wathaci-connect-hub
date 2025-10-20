# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

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
npm run supabase:deploy     # Deploy edge functions
```

For CI/CD integration, see [docs/SUPABASE_CLI_CICD.md](./docs/SUPABASE_CLI_CICD.md).

## Payments

Integration steps and deployment details for Lenco payments are covered in the [Payment Integration Guide](docs/PAYMENT_INTEGRATION_GUIDE.md).

### Webhook Setup

For production deployments, you must configure payment webhooks to receive real-time payment status updates:

- **[Webhook Setup Guide](docs/WEBHOOK_SETUP_GUIDE.md)** - Complete webhook configuration, testing, and troubleshooting
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

- `VITE_SUPABASE_URL` / `SUPABASE_URL` – Supabase project URL (mirrored for the backend runtime).
- `VITE_SUPABASE_KEY` – Supabase anon key for client access.
- `SUPABASE_SERVICE_ROLE_KEY` – Required for any server-side inserts, including the Express API and Supabase Edge Functions.
- `VITE_LENCO_PUBLIC_KEY` – Lenco public API key (current dashboards issue `pub-…` keys; older projects may still use `pk_live_…`).
- `LENCO_SECRET_KEY` – Lenco secret API key (accepts `sec-…`, `sk_live_…`, or legacy 64-character hex secrets).
- `LENCO_WEBHOOK_SECRET` – Secret used to validate Lenco webhooks.
- `VITE_LENCO_API_URL` – Lenco API base URL, `https://api.lenco.co/access/v2`.
- `VITE_PAYMENT_CURRENCY` – ISO currency code for payments, e.g. `ZMK`.
- `VITE_PAYMENT_COUNTRY` – ISO country code, e.g. `ZM`.
- `VITE_PLATFORM_FEE_PERCENTAGE` – Platform fee percentage applied to each payment.
- `VITE_MIN_PAYMENT_AMOUNT` – Minimum allowed payment amount.
- `VITE_MAX_PAYMENT_AMOUNT` – Maximum allowed payment amount.
- `VITE_APP_ENV` – Set to `production` for live deployments.
- `VITE_APP_NAME` – Application display name.

**Validate your configuration:**

```bash
npm run env:check
```

This will scan all environment files and flag any missing or placeholder values.

When deploying to Vercel (or another hosting provider), add **both** `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` to the project
environment variables along with any server-side keys (such as `SUPABASE_SERVICE_ROLE_KEY` if you run edge functions). Use the
[deployment checklist](docs/VERCEL_SUPABASE_DEPLOYMENT.md) to mirror the values from `.env` into the `Production`, `Preview`, and
`Development` environments and verify them before triggering a build.

Run `npm run env:check` (backed by `scripts/env-check.mjs`) or `./scripts/setup-payments.sh` locally to confirm the `.env` files in
both the frontend and backend contain production values. The checker fails fast when required keys are missing or when placeholder/test
credentials are still present.

For a complete pre-launch overview—including database provisioning, Supabase Edge Function deployment, webhook validation, and
regression testing—consult the [Production Readiness Checklist](docs/PRODUCTION_READINESS_CHECKLIST.md).

### Security Verification

Before deploying to production, complete the comprehensive security verification:

```bash
# Run automated security checks
./scripts/run-security-verification.sh

# Or run individual checks
./scripts/check-tls-certificate.sh your-domain.vercel.app
./scripts/verify-security-config.sh https://your-domain.vercel.app
./scripts/verify-rate-limiting.sh https://your-backend.com/api/health
./scripts/verify-webhook-security.sh https://xxx.supabase.co/functions/v1/lenco-webhook "your-secret"
```

See the [Deployment Security Checklist](docs/DEPLOYMENT_SECURITY_CHECKLIST.md) for complete verification steps including:
- TLS certificate validation and monitoring
- Rate limiting verification and abuse detection
- Webhook signature validation and secret rotation
- Payment anomaly monitoring and fraud detection

Configure monitoring and alerting using the [Monitoring and Alerting Guide](docs/MONITORING_AND_ALERTING.md).

## Testing

Lighthouse and automated accessibility checks are available via npm scripts.

```bash
# Run accessibility tests powered by jest-axe
npm run test:accessibility

# Generate a Lighthouse report (requires a running dev server)
npm run test:lighthouse
```

Make sure project dependencies are installed before executing the test commands.

