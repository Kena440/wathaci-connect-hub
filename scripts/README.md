# Scripts Directory

This directory contains helper scripts for managing the WATHACI CONNECT application.

## Available Scripts

### Environment Management

#### `env-check.mjs`
**Purpose**: Validates environment variables across `.env` files  
**Usage**: `npm run env:check`  
**Description**: Checks for missing, placeholder, or incorrectly formatted environment variables. Ensures production keys are properly configured.

#### `rotate-lenco-keys.sh`
**Purpose**: Automated helper for rotating Lenco API keys from test to production  
**Usage**: 
```bash
npm run keys:rotate
# or directly
./scripts/rotate-lenco-keys.sh
```
**Description**: Interactive script that:
- Prompts for live Lenco API keys
- Updates `.env` and `backend/.env` files
- Pushes secrets to Supabase Edge Functions
- Validates the configuration
- Provides next steps

**Documentation**: See [LENCO_KEYS_ROTATION_GUIDE.md](../docs/LENCO_KEYS_ROTATION_GUIDE.md)

### Database Management

#### `provision-supabase.sh`
**Purpose**: Provisions the Supabase database schema  
**Usage**: `npm run supabase:provision`  
**Description**: Executes all SQL files in `backend/supabase/` to create tables, functions, and RLS policies in the production database.

**Requirements**:
- Set `SUPABASE_DB_URL` environment variable
- Format: `postgres://postgres:[password]@db.[project-ref].supabase.co:5432/postgres`

#### `validate-database.ts`
**Purpose**: Validates database schema and configuration  
**Usage**: Run with Deno or Node.js  
**Description**: Checks database tables, columns, indexes, and RLS policies are correctly configured.

### Supabase Authentication

#### `supabase-login.sh`
**Purpose**: Authenticates with Supabase CLI  
**Usage**: `npm run supabase:login`  
**Description**: Interactive script to log in to Supabase CLI using access token from the dashboard.

**Prerequisites**: Supabase CLI must be installed

### Payment Configuration

#### `setup-payments.sh`
**Purpose**: Sets up payment configuration and Lenco integration  
**Usage**: `./scripts/setup-payments.sh`  
**Description**: Guides through configuring payment gateway settings, transaction limits, and webhook URLs.

### Testing

#### `test-webhook-integration.js`
**Purpose**: Tests Lenco webhook integration  
**Usage**: 
```bash
node scripts/test-webhook-integration.js <webhook-url> <webhook-secret>
```
**Description**: Sends test webhook events to verify:
- Signature validation
- Event processing
- Database logging
- Error handling

**Example**:
```bash
node scripts/test-webhook-integration.js \
  https://nrjcbdrzaxqvomeogptf.supabase.co/functions/v1/lenco-webhook \
  whsec_your_secret_key
```

### Smoke Test Scripts

#### `smoke-test-https.sh`
**Purpose**: Tests HTTPS availability and health endpoint  
**Usage**: 
```bash
npm run smoke:https <domain>
# or directly
./scripts/smoke-test-https.sh <domain>
```
**Description**: Validates:
- SSL/TLS certificate validity and expiration
- HTTPS endpoint availability (200/301/302 responses)
- Response time performance (< 500ms threshold)
- Health endpoint response format

**Exit Codes**:
- `0` - All checks passed
- `1` - Health check failed
- `2` - Certificate invalid or expired
- `3` - Response time too slow

#### `smoke-test-webhook.js`
**Purpose**: Tests webhook endpoint with properly signed payload  
**Usage**: 
```bash
WEBHOOK_URL=https://... WEBHOOK_SECRET=... npm run smoke:webhook
# or directly
node scripts/smoke-test-webhook.js
```
**Description**: Validates:
- Properly signed HMAC-SHA256 webhook payload
- HTTP 200/202 response from webhook endpoint
- Webhook processing verification

**Environment Variables**:
- `WEBHOOK_URL` - Production webhook endpoint URL
- `WEBHOOK_SECRET` - Webhook signing secret from Lenco

**Exit Codes**:
- `0` - Test passed
- `1` - Test failed

#### `setup-smoke-test-monitoring.sh`
**Purpose**: Interactive script to configure GitHub repository secrets for smoke test monitoring  
**Usage**: 
```bash
./scripts/setup-smoke-test-monitoring.sh
```
**Description**: Configures GitHub secrets for automated smoke tests:
- `WEBHOOK_URL` - Production webhook endpoint
- `WEBHOOK_SECRET` - Webhook signing secret
- `SLACK_WEBHOOK_URL` (optional) - Slack notifications
- `PAGERDUTY_INTEGRATION_KEY` (optional) - PagerDuty alerts

**Prerequisites**:
- GitHub CLI (gh) installed and authenticated
- Repository owner/admin permissions

**Documentation**: See [SMOKE_TEST_MONITORING.md](../docs/SMOKE_TEST_MONITORING.md)

## Common Workflows

### Initial Setup

1. Check environment configuration:
   ```bash
   npm run env:check
   ```

2. Authenticate with Supabase:
   ```bash
   npm run supabase:login
   ```

3. Link to your Supabase project:
   ```bash
   npm run supabase:link
   ```

4. Provision the database:
   ```bash
   export SUPABASE_DB_URL="postgres://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
   npm run supabase:provision
   ```

### Production Deployment

1. Rotate to live Lenco keys:
   ```bash
   npm run keys:rotate
   ```

2. Verify configuration:
   ```bash
   npm run env:check
   ```

3. Deploy Edge Functions:
   ```bash
   npm run supabase:deploy
   ```

4. Test webhook integration:
   ```bash
   node scripts/test-webhook-integration.js <url> <secret>
   ```

### Development

1. Start local Supabase:
   ```bash
   npm run supabase:start
   ```

2. Check status:
   ```bash
   npm run supabase:status
   ```

3. View logs:
   ```bash
   npm run supabase:logs
   ```

4. Stop local Supabase:
   ```bash
   npm run supabase:stop
   ```

## Script Permissions

All shell scripts (`.sh`) need execute permissions. If you encounter permission errors:

```bash
chmod +x scripts/*.sh
```

## Dependencies

### Required Tools

- **Node.js** (v18+): For npm scripts and JavaScript tools
- **Bash**: For shell scripts (pre-installed on macOS/Linux)
- **Supabase CLI**: For Supabase operations
  ```bash
  npm install -g supabase
  ```
- **Git**: For version control
- **OpenSSL**: For webhook signature generation (usually pre-installed)

### Optional Tools

- **jq**: For JSON processing in shell scripts
  ```bash
  # macOS
  brew install jq
  
  # Ubuntu/Debian
  apt-get install jq
  ```

## Troubleshooting

### Script Won't Execute

**Error**: `Permission denied`

**Solution**:
```bash
chmod +x scripts/rotate-lenco-keys.sh
```

### Supabase CLI Not Found

**Error**: `command not found: supabase`

**Solution**:
```bash
npm install -g supabase
# or
brew install supabase/tap/supabase
```

### Environment Variables Not Loading

**Error**: Variables not recognized

**Solution**:
1. Ensure `.env` files exist (copy from `.env.example`)
2. Check file permissions: `ls -la .env`
3. Verify no syntax errors in `.env` files
4. Run `npm run env:check` for diagnostics

### Database Connection Fails

**Error**: Connection timeout or refused

**Solution**:
1. Verify `SUPABASE_DB_URL` format
2. Check project reference is correct
3. Ensure password doesn't contain special characters that need escaping
4. Test connection with `psql` directly

## Script Development

When adding new scripts:

1. **Naming Convention**: Use kebab-case (e.g., `my-new-script.sh`)
2. **Make Executable**: `chmod +x scripts/my-new-script.sh`
3. **Add Shebang**: Start with `#!/bin/bash` or `#!/usr/bin/env node`
4. **Add to package.json**: Create an npm script alias if appropriate
5. **Document Here**: Add entry to this README
6. **Add Error Handling**: Use `set -e` for shell scripts
7. **Add Help**: Support `--help` flag where appropriate

## Security Notes

⚠️ **Important Security Practices**:

- Never commit `.env` files to version control
- Never hardcode secrets in scripts
- Always prompt for sensitive data (don't pass as CLI args)
- Use `read -sp` for password inputs (silent mode)
- Clear sensitive variables after use: `unset VARIABLE_NAME`
- Validate inputs before using them
- Log carefully - don't log secrets

## Support

For issues with:
- **Scripts**: Check this README and inline script documentation
- **Supabase CLI**: See [SUPABASE_CLI_SETUP.md](../docs/SUPABASE_CLI_SETUP.md)
- **Environment**: See [ENVIRONMENT_SETUP.md](../docs/ENVIRONMENT_SETUP.md)
- **Webhooks**: See [WEBHOOK_SETUP_GUIDE.md](../docs/WEBHOOK_SETUP_GUIDE.md)
- **Production**: See [PRODUCTION_READINESS_CHECKLIST.md](../docs/PRODUCTION_READINESS_CHECKLIST.md)

---

**Last Updated**: 2025-10-20  
**Maintained By**: WATHACI CONNECT Development Team
