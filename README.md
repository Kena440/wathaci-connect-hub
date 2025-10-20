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

Key steps:
1. Deploy the `webhook_logs` table schema (via `npm run supabase:provision`)
2. Deploy the `lenco-webhook` edge function to Supabase
3. Configure webhook URL in Lenco dashboard
4. Test webhook integration using the provided test script

## Production Monitoring

Automated smoke tests continuously monitor production health:

### Smoke Tests

The platform includes automated smoke tests that verify:
- **HTTPS Health Check** - SSL certificate validity, endpoint availability, and response time
- **Webhook Integration** - Signed webhook payload delivery and processing

Tests run automatically via GitHub Actions:
- Every 15 minutes during business hours (8am-8pm UTC)
- Every hour for continuous coverage
- On-demand via manual trigger

**Quick Commands:**
```bash
# Run HTTPS health check
npm run smoke:https app.wathaci.com

# Run webhook smoke test
WEBHOOK_URL=https://... WEBHOOK_SECRET=... npm run smoke:webhook

# Run all smoke tests
npm run smoke:all
```

**Documentation:**
- **[Smoke Test Monitoring Guide](docs/SMOKE_TEST_MONITORING.md)** - Complete monitoring setup, alert integration, and troubleshooting
- **[Post-Launch Schedule](docs/POST_LAUNCH_SMOKE_TEST_SCHEDULE.md)** - Deployment smoke test procedures

### Alert Integration

Configure monitoring alerts for immediate notification of failures:
- **Slack** - `#oncall-apps` channel notifications
- **PagerDuty** - Critical failure escalation
- **Email** - On-call engineer alerts

See the [Smoke Test Monitoring Guide](docs/SMOKE_TEST_MONITORING.md) for setup instructions.

## Environment Configuration

Project settings are managed through environment variables. Copy the provided template and update values for your setup:

```bash
cp .env.example .env
```

Update the new `.env` file with production values:

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

When deploying to Vercel (or another hosting provider), add **both** `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` to the project
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

