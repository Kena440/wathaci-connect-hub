# Scripts Directory

This directory contains helper scripts for managing the WATHACI CONNECT application.

## 🚀 NEW: Production Launch Scripts

### Quick Testing (Pre-Launch)
```bash
# Test email/OTP verification (2-3 min)
npm run test:email-otp

# Test password reset flow (2-3 min)
npm run test:password-reset -- --email test@example.com
```

### Launch Monitoring
```bash
# Monitor for 1 hour (default)
npm run launch:monitor

# Continuous monitoring until stopped
npm run launch:monitor:continuous
```

**📚 Full Documentation**: 
- [PRODUCTION_TESTING_AND_MONITORING_GUIDE.md](../PRODUCTION_TESTING_AND_MONITORING_GUIDE.md) - Comprehensive guide
- [QUICK_LAUNCH_TESTING_REFERENCE.md](../QUICK_LAUNCH_TESTING_REFERENCE.md) - Quick reference

---

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

#### `production-email-otp-test.mjs`
**Purpose**: Quick production verification of email/OTP authentication  
**Usage**: 
```bash
npm run test:email-otp
# or with custom email
node scripts/production-email-otp-test.mjs --email test@example.com
```
**Description**: Tests:
- Email signup with confirmation email
- OTP sign-in request
- Password reset email
- Email configuration
- Provides deliverability checklist

**Duration**: 2-3 minutes  
**Documentation**: See [PRODUCTION_TESTING_AND_MONITORING_GUIDE.md](../PRODUCTION_TESTING_AND_MONITORING_GUIDE.md)

#### `password-reset-test.mjs`
**Purpose**: Comprehensive password reset flow testing  
**Usage**: 
```bash
npm run test:password-reset -- --email test@example.com
# or directly
node scripts/password-reset-test.mjs --email test@example.com
```
**Description**: Tests:
- User existence verification
- Password reset email request
- Email authentication (SPF/DKIM/DMARC)
- Reset link validation
- Security checks

**Duration**: 2-3 minutes (automated) + 5 minutes (manual verification)

#### `launch-monitoring.mjs`
**Purpose**: Continuous monitoring during launch window  
**Usage**: 
```bash
npm run launch:monitor
# or continuous until stopped
npm run launch:monitor:continuous
# custom interval (30 seconds)
node scripts/launch-monitoring.mjs --interval=30 --duration=7200
```
**Description**: Monitors:
- Auth system health
- Database connectivity
- Response time metrics
- Error rate tracking
- Webhook processing status
- Automatic alerts

**Duration**: 1 hour default, configurable  
**Stop**: Press Ctrl+C for graceful shutdown with final report

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
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/lenco-webhook \
  whsec_your_secret_key
```

### Branch Management

#### `sync-version-branches.sh`
**Purpose**: Synchronizes version branches (V1, V2, V3) with main branch  
**Usage**: `./scripts/sync-version-branches.sh`  
**Description**: Interactive script that:
- Merges main into V1, V2, and V3 branches
- Resolves conflicts automatically (accepting main's version)
- Pushes updated branches to remote
- Provides color-coded status output

**Requirements**:
- Write access to the repository
- Clean working directory

**Documentation**: See [BRANCH_CONFLICT_RESOLUTION_SUMMARY.md](../BRANCH_CONFLICT_RESOLUTION_SUMMARY.md)

#### `verify-no-conflicts.sh`
**Purpose**: Verifies no merge conflicts exist between branches  
**Usage**: `./scripts/verify-no-conflicts.sh`  
**Description**: Tests all important merge combinations and reports:
- Which merges are clean
- Which merges have conflicts
- Overall pass/fail status

**When to use**:
- After merging branches
- Before creating a release
- As part of CI/CD pipeline

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

5. **NEW: Run pre-launch verification**:
   ```bash
   npm run test:email-otp
   npm run test:password-reset -- --email test@example.com
   ```

6. **NEW: Start launch monitoring**:
   ```bash
   npm run launch:monitor:continuous
   ```

### Launch Day Workflow

**T-1 Hour (Pre-Launch Testing)**:
```bash
# Run quick verification tests
npm run test:email-otp                                    # 2-3 min
npm run test:password-reset -- --email test@example.com  # 2-3 min

# Manually verify emails received
# Check email headers (SPF/DKIM/DMARC pass)
# Test all email links/buttons work
```

**T-0 (Launch + Monitoring)**:
```bash
# Start continuous monitoring
npm run launch:monitor:continuous

# Keep terminal visible during launch
# Monitor for any alerts
```

**T+1 Hour (First Check)**:
```bash
# Review monitoring stats (Ctrl+C to see report)
# Run quick verification test
npm run test:email-otp
```

**Full Guide**: See [PRODUCTION_TESTING_AND_MONITORING_GUIDE.md](../PRODUCTION_TESTING_AND_MONITORING_GUIDE.md)

### Branch Maintenance

1. Verify no conflicts exist:
   ```bash
   ./scripts/verify-no-conflicts.sh
   ```

2. If conflicts found, sync branches:
   ```bash
   ./scripts/sync-version-branches.sh
   ```

3. Verify again:
   ```bash
   ./scripts/verify-no-conflicts.sh
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
- **Branch Conflicts**: See [APPLYING_BRANCH_FIXES.md](../APPLYING_BRANCH_FIXES.md) and [BRANCH_CONFLICT_RESOLUTION_SUMMARY.md](../BRANCH_CONFLICT_RESOLUTION_SUMMARY.md)
- **Supabase CLI**: See [SUPABASE_CLI_SETUP.md](../docs/SUPABASE_CLI_SETUP.md)
- **Environment**: See [ENVIRONMENT_SETUP.md](../docs/ENVIRONMENT_SETUP.md)
- **Webhooks**: See [WEBHOOK_SETUP_GUIDE.md](../docs/WEBHOOK_SETUP_GUIDE.md)
- **Production**: See [PRODUCTION_READINESS_CHECKLIST.md](../docs/PRODUCTION_READINESS_CHECKLIST.md)

---

**Last Updated**: 2025-11-23  
**Maintained By**: WATHACI CONNECT Development Team
