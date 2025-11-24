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

#### `diagnose-auth-profile.sh`
**Purpose**: Comprehensive diagnostic tool for auth/profile consistency issues  
**Usage**: `npm run supabase:diagnose`  
**Description**: Analyzes and reports on inconsistencies between Supabase authentication and application profiles. Generates a detailed report including:
- Overall diagnostic summary
- Profile completeness verification
- Recent signup health metrics
- Trigger function status
- RLS policy configuration
- Recent errors and issues

**Requirements**:
- Set `SUPABASE_DB_URL` environment variable
- PostgreSQL client tools (`psql`)

**Documentation**: See [AUTH_PROFILE_CONSISTENCY_GUIDE.md](../docs/AUTH_PROFILE_CONSISTENCY_GUIDE.md)

#### `backfill-profiles.sh`
**Purpose**: Safe utility for backfilling missing user profiles  
**Usage**: 
```bash
# Dry run (preview only, no changes)
npm run supabase:backfill

# Execute actual backfill
bash ./scripts/backfill-profiles.sh false

# Custom batch size (e.g., 50 profiles)
bash ./scripts/backfill-profiles.sh false 50
```
**Description**: Creates profiles for users that exist in auth.users but are missing from public.profiles. Features:
- Defaults to dry-run mode for safety
- Interactive confirmation required for actual changes
- Batch processing with configurable size
- ON CONFLICT handling prevents duplicates
- Comprehensive error logging
- Post-backfill verification

**Documentation**: See [AUTH_PROFILE_CONSISTENCY_GUIDE.md](../docs/AUTH_PROFILE_CONSISTENCY_GUIDE.md)

#### `validate-migrations.sh`
**Purpose**: Validates SQL syntax of migration files  
**Usage**: `bash ./scripts/validate-migrations.sh`  
**Description**: Checks migration files for syntax errors before applying them. Performs lightweight validation of SQL patterns and common mistakes.

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

5. Verify auth/profile consistency:
   ```bash
   npm run supabase:diagnose
   ```

6. Backfill missing profiles if needed:
   ```bash
   npm run supabase:backfill  # dry run first
   bash ./scripts/backfill-profiles.sh false  # execute if needed
   ```

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
- **Auth/Profile Consistency**: See [AUTH_PROFILE_CONSISTENCY_GUIDE.md](../docs/AUTH_PROFILE_CONSISTENCY_GUIDE.md)
- **Branch Conflicts**: See [APPLYING_BRANCH_FIXES.md](../APPLYING_BRANCH_FIXES.md) and [BRANCH_CONFLICT_RESOLUTION_SUMMARY.md](../BRANCH_CONFLICT_RESOLUTION_SUMMARY.md)
- **Supabase CLI**: See [SUPABASE_CLI_SETUP.md](../docs/SUPABASE_CLI_SETUP.md)
- **Environment**: See [ENVIRONMENT_SETUP.md](../docs/ENVIRONMENT_SETUP.md)
- **Webhooks**: See [WEBHOOK_SETUP_GUIDE.md](../docs/WEBHOOK_SETUP_GUIDE.md)
- **Production**: See [PRODUCTION_READINESS_CHECKLIST.md](../docs/PRODUCTION_READINESS_CHECKLIST.md)

---

**Last Updated**: 2025-11-23  
**Maintained By**: WATHACI CONNECT Development Team
