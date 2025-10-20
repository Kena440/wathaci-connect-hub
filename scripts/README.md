# Scripts Directory

This directory contains utility scripts for development, testing, and operations.

## Smoke Test Scripts

### smoke-test-https.sh

Tests HTTPS availability and health endpoint.

**Usage:**
```bash
bash scripts/smoke-test-https.sh <domain>

# Example
bash scripts/smoke-test-https.sh app.wathaci.com
```

**Tests:**
- SSL/TLS certificate validity
- HTTPS availability (200/301/302 response)
- Response time (< 500ms)
- Health endpoint response format

**Exit Codes:**
- `0` - All checks passed
- `1` - Health check failed
- `2` - Certificate invalid or expired
- `3` - Response time too slow

### smoke-test-webhook.js

Tests webhook endpoint with signed payload.

**Usage:**
```bash
node scripts/smoke-test-webhook.js <webhook-url> <webhook-secret>

# Example
node scripts/smoke-test-webhook.js \
  https://nrjcbdrzaxqvomeogptf.supabase.co/functions/v1/payment-webhook \
  your-webhook-secret
```

**Tests:**
- Properly signed webhook payload
- HTTP 200/202 response
- Webhook processing validation

**Exit Codes:**
- `0` - Test passed
- `1` - Test failed

### test-webhook-integration.js

Comprehensive webhook integration tests (used in development).

**Usage:**
```bash
node scripts/test-webhook-integration.js <webhook-url> <webhook-secret>
```

**Tests:**
- Valid signature acceptance
- Invalid signature rejection
- Missing signature rejection
- Different event types (success, failed, pending, cancelled)

## NPM Scripts

Convenient shortcuts defined in `package.json`:

```bash
# Run HTTPS smoke test (uses default domain)
npm run smoke:https

# Run webhook smoke test (requires env vars)
WEBHOOK_URL=https://... WEBHOOK_SECRET=... npm run smoke:webhook

# Run all smoke tests
npm run smoke:all
```

## Database Scripts

### provision-supabase.sh

Provisions Supabase database schema.

**Usage:**
```bash
SUPABASE_DB_URL="postgres://..." npm run supabase:provision
```

### setup-payments.sh

Sets up payment configuration.

### validate-database.ts

Validates database schema and configuration.

**Usage:**
```bash
npx ts-node scripts/validate-database.ts
```

## Environment Scripts

### env-check.mjs

Checks environment configuration for missing or invalid values.

**Usage:**
```bash
npm run env:check
```

### supabase-login.sh

Helper for Supabase CLI authentication.

**Usage:**
```bash
npm run supabase:login
```

## Automated Testing

Smoke tests run automatically via GitHub Actions:

- **Schedule**: Every 15 minutes (business hours), hourly (off-hours)
- **Workflow**: `.github/workflows/smoke-tests.yml`
- **Documentation**: `docs/SMOKE_TEST_MONITORING.md`

See the workflow file for configuration details and alert integration.

## Development

### Running Tests Locally

Before deployment, test the smoke test scripts:

```bash
# Test HTTPS check against localhost
bash scripts/smoke-test-https.sh localhost:3000

# Test webhook against local endpoint
node scripts/smoke-test-webhook.js \
  http://localhost:54321/functions/v1/payment-webhook \
  test-secret
```

### Adding New Scripts

When adding new scripts:

1. Add documentation to this README
2. Add npm script alias if appropriate
3. Make bash scripts executable: `chmod +x scripts/your-script.sh`
4. Include usage examples and exit codes
5. Add error handling and helpful error messages

## Troubleshooting

### "Permission denied" errors

Make scripts executable:
```bash
chmod +x scripts/*.sh
```

### "Command not found" errors

Ensure required tools are installed:
- `curl` - HTTP client
- `openssl` - SSL/TLS tools
- `bc` - Calculator for shell
- `node` - JavaScript runtime (v16+)

### Smoke test failures

1. Check script output for specific error
2. Verify endpoint is deployed and accessible
3. Confirm secrets/credentials are correct
4. Review application logs
5. See `docs/SMOKE_TEST_MONITORING.md` for detailed troubleshooting

## Reference

- **Smoke Test Monitoring Guide**: `docs/SMOKE_TEST_MONITORING.md`
- **Post-Launch Schedule**: `docs/POST_LAUNCH_SMOKE_TEST_SCHEDULE.md`
- **Webhook Setup**: `docs/WEBHOOK_SETUP_GUIDE.md`
- **GitHub Actions**: `.github/workflows/`
