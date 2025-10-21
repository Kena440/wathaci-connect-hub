# Supabase CLI Quick Reference

This is a quick reference for the most commonly used Supabase CLI commands in this project.

## Setup (One-time)

```bash
# 1. Login to Supabase (interactive helper)
npm run supabase:login

# Or manually with token
supabase login --token YOUR_ACCESS_TOKEN

# Or via environment variable
export SUPABASE_ACCESS_TOKEN="your_token_here"

# 2. Link to remote project (if not done during login)
npm run supabase:link
```

## Daily Workflow

### Check Status
```bash
npm run supabase:status
# or: supabase status
```

### Database Operations
```bash
# Pull remote schema changes
npm run supabase:pull
# or: supabase db pull

# Push local migrations to remote
npm run supabase:push
# or: supabase db push

# Generate migration from schema diff
supabase db diff -f migration_name
```

### Edge Functions
```bash
# Deploy all functions
npm run supabase:deploy
# or: supabase functions deploy

# Deploy specific function
supabase functions deploy lenco-webhook

# View function logs
npm run supabase:logs
# or: supabase functions logs lenco-webhook
```

### Local Development
```bash
# Start local Supabase (requires Docker)
npm run supabase:start
# or: supabase start

# Stop local Supabase
npm run supabase:stop
# or: supabase stop

# Check local services status
supabase status
```

## Project Information

- **Project Reference**: `YOUR_PROJECT_REF`
- **Supabase URL**: `https://YOUR_PROJECT_REF.supabase.co`
- **Config File**: `supabase/config.toml`
- **Edge Functions**: `supabase/functions/`

> Substitute `YOUR_PROJECT_REF` with the identifier from your Supabase dashboard before running these commands.

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| "Access token not provided" | Run `npm run supabase:login` or set `SUPABASE_ACCESS_TOKEN` |
| "Project not linked" | Run `npm run supabase:link` |
| "Cannot connect to Docker" | Install Docker and ensure it's running |
| "Permission denied" | Try with `sudo` or add user to docker group |

## Environment Variables

```bash
# Required for authentication
export SUPABASE_ACCESS_TOKEN="your_access_token"

# Required for project linking
export SUPABASE_PROJECT_REF="YOUR_PROJECT_REF"
export SUPABASE_DB_PASSWORD="your_db_password"
```

## Useful One-liners

```bash
# View all projects
supabase projects list

# Get project info
supabase projects info

# List all functions
supabase functions list

# View recent function logs
supabase functions logs lenco-webhook --limit 100

# Create a new migration
supabase migration new my_migration_name

# Reset local database
supabase db reset

# Generate TypeScript types from schema
supabase gen types typescript --local > src/types/supabase.ts
```

## Common Workflows

### Deploy Edge Function
```bash
cd supabase/functions/lenco-webhook
# Make your changes
cd ../../..
npm run supabase:deploy lenco-webhook
npm run supabase:logs lenco-webhook
```

### Create and Apply Migration
```bash
# 1. Create migration file
supabase migration new add_user_table

# 2. Edit the migration file in supabase/migrations/
# 3. Test locally
supabase db reset

# 4. Push to remote
npm run supabase:push
```

### Sync Schema Changes
```bash
# Pull remote changes
npm run supabase:pull

# Review changes in supabase/migrations/
# Commit to version control
git add supabase/migrations/
git commit -m "Sync database schema"
```

## Documentation Links

- [Full Setup Guide](./SUPABASE_CLI_SETUP.md)
- [CI/CD Integration](./docs/SUPABASE_CLI_CICD.md)
- [Database Setup](./DATABASE_SETUP.md)
- [Official Docs](https://supabase.com/docs/guides/cli)

## Need Help?

1. Check [SUPABASE_CLI_SETUP.md](./SUPABASE_CLI_SETUP.md) for detailed instructions
2. Review [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues
3. Visit [Supabase Discord](https://discord.supabase.com) for community support
4. Check [Supabase Docs](https://supabase.com/docs) for official documentation
