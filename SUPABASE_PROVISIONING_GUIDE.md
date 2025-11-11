# Supabase Database Provisioning Guide

## Overview

This guide provides step-by-step instructions for applying the Supabase SQL bundles to your production database. These scripts create the necessary schemas, tables, triggers, policies, and indexes required for the WATHACI CONNECT platform to function properly.

**⚠️ Important**: This is the final blocker called out in the authentication verification report. The database must be provisioned before the application can go live.

---

## What Gets Provisioned

The provisioning scripts create:

1. **Core Schema** (`core_schema.sql`)
   - Base tables for application functionality
   - Essential functions and triggers
   - Indexes for performance optimization

2. **Profiles Schema** (`profiles_schema.sql`)
   - User profiles table with all required fields
   - Profile completion tracking
   - Account type management

3. **Registrations Table** (`registrations.sql`)
   - User registration tracking
   - Sign-up flow data

4. **Frontend Logs** (`frontend_logs.sql`)
   - Client-side error logging
   - Analytics and monitoring

5. **Webhook Logs** (`webhook_logs.sql`)
   - Payment webhook event tracking
   - Audit trail for integrations

6. **Profiles RLS Policies** (`profiles_policies.sql`)
   - Row Level Security policies
   - User data access controls
   - Profile creation trigger

---

## Prerequisites

Before running the provisioning scripts:

1. **Supabase Project Created**
   - Project must be created in Supabase dashboard
   - Note your project URL and service role key

2. **PostgreSQL Client Installed**
   - Install `psql` command-line tool
   - On Ubuntu/Debian: `sudo apt-get install postgresql-client`
   - On macOS: `brew install postgresql`
   - On Windows: Download from [PostgreSQL website](https://www.postgresql.org/download/windows/)

3. **Database Connection String**
   - Get from Supabase dashboard: **Project Settings** → **Database** → **Connection string** → **URI**
   - Format: `postgres://postgres:[password]@[host]:5432/postgres`

4. **Backup Existing Data** (if applicable)
   - If you have existing data, create a backup first
   - Use Supabase dashboard: **Database** → **Backups** → **Create Backup**

---

## Method 1: Using npm Script (Recommended)

This is the easiest method and works on any platform with Node.js installed.

### Step 1: Set Environment Variables

Set your database connection string as an environment variable:

**Linux/macOS:**
```bash
export SUPABASE_DB_URL="postgres://postgres:[YOUR_PASSWORD]@[YOUR_HOST]:5432/postgres"
```

**Windows (PowerShell):**
```powershell
$env:SUPABASE_DB_URL="postgres://postgres:[YOUR_PASSWORD]@[YOUR_HOST]:5432/postgres"
```

**Windows (Command Prompt):**
```cmd
set SUPABASE_DB_URL=postgres://postgres:[YOUR_PASSWORD]@[YOUR_HOST]:5432/postgres
```

### Step 2: Run Provisioning Script

```bash
npm run supabase:provision
```

### Step 3: Verify Success

The script will output:
```
➡️  Executing core_schema.sql
✅  Completed core_schema.sql

➡️  Executing profiles_schema.sql
✅  Completed profiles_schema.sql

➡️  Executing registrations.sql
✅  Completed registrations.sql

➡️  Executing frontend_logs.sql
✅  Completed frontend_logs.sql

➡️  Executing webhook_logs.sql
✅  Completed webhook_logs.sql

➡️  Executing profiles_policies.sql
✅  Completed profiles_policies.sql

🎉 Supabase schema provisioning complete.

🔎 Running post-provision verification checks...
```

---

## Method 2: Using Supabase CLI

If you have the Supabase CLI installed, you can use this method.

### Step 1: Link Your Project

```bash
supabase link --project-ref [YOUR_PROJECT_REF]
```

### Step 2: Run SQL Scripts

```bash
cd backend/supabase

# Run each script in order
supabase db query < core_schema.sql
supabase db query < profiles_schema.sql
supabase db query < registrations.sql
supabase db query < frontend_logs.sql
supabase db query < webhook_logs.sql
supabase db query < profiles_policies.sql
```

---

## Method 3: Manual Execution via Supabase Dashboard

If you prefer a GUI approach or don't have CLI access:

### Step 1: Open SQL Editor

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar

### Step 2: Execute Scripts in Order

Execute each script in the following order by copying and pasting the content:

1. **core_schema.sql**
   - Open file in your code editor
   - Copy entire contents
   - Paste into SQL Editor
   - Click "Run"
   - Wait for completion

2. **profiles_schema.sql**
   - Repeat the process

3. **registrations.sql**
   - Repeat the process

4. **frontend_logs.sql**
   - Repeat the process

5. **webhook_logs.sql**
   - Repeat the process

6. **profiles_policies.sql**
   - Repeat the process

**⚠️ Important**: Execute scripts in this exact order. Some scripts depend on objects created by previous scripts.

---

## Method 4: Using Direct psql Command

If you prefer using `psql` directly:

### Step 1: Set Connection String

```bash
export SUPABASE_DB_URL="postgres://postgres:[YOUR_PASSWORD]@[YOUR_HOST]:5432/postgres"
```

### Step 2: Execute Scripts

```bash
cd backend/supabase

# Run each script
psql "$SUPABASE_DB_URL" --file core_schema.sql
psql "$SUPABASE_DB_URL" --file profiles_schema.sql
psql "$SUPABASE_DB_URL" --file registrations.sql
psql "$SUPABASE_DB_URL" --file frontend_logs.sql
psql "$SUPABASE_DB_URL" --file webhook_logs.sql
psql "$SUPABASE_DB_URL" --file profiles_policies.sql
```

---

## Verification Steps

After provisioning, verify that everything was created correctly:

### 1. Check Tables Exist

Run in SQL Editor or psql:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected tables:
- `profiles`
- `registrations`
- `frontend_logs`
- `webhook_logs`
- `subscription_plans`
- `user_subscriptions`
- `transactions`
- `payments`

### 2. Check Triggers

```sql
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

Expected triggers:
- `on_auth_user_created` on `auth.users` table

### 3. Check RLS Policies

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Expected policies on `profiles` table:
- `Users can view own profile`
- `Users can update own profile`
- `Users can insert own profile`

### 4. Test Profile Creation Trigger

Create a test user and verify profile is automatically created:

```sql
-- This should be done through the application's sign-up flow
-- But you can verify the trigger function exists:
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'handle_new_auth_user';
```

### 5. Run Verification Script

If you used Method 1, the verification script runs automatically. Otherwise, run it manually:

```bash
bash scripts/verify-supabase-schema.sh
```

---

## Troubleshooting

### Error: "psql: command not found"

**Solution**: Install PostgreSQL client tools
- Ubuntu/Debian: `sudo apt-get install postgresql-client`
- macOS: `brew install postgresql`
- Windows: Download from [postgresql.org](https://www.postgresql.org/download/)

### Error: "connection refused"

**Solution**: 
1. Check your connection string is correct
2. Verify your IP address is allowed in Supabase (Project Settings → Database → Connection pooling)
3. Ensure you're using port 5432 (direct connection) or 6543 (connection pooling)

### Error: "relation already exists"

**Solution**: 
- The table already exists from a previous run
- Either:
  1. Drop the existing table (⚠️ WARNING: This will delete data)
  2. Skip the script if you're re-running provisioning
  3. Modify the script to use `CREATE TABLE IF NOT EXISTS`

### Error: "permission denied"

**Solution**:
1. Ensure you're using the service role key, not the anon key
2. Check that your database user has CREATE privileges
3. Verify you're connected to the correct database

### Scripts Fail Partway Through

**Solution**:
1. Check which script failed (look at the output)
2. Fix the issue causing the failure
3. Re-run only the failed script and subsequent scripts
4. Or restore from backup and run all scripts again

---

## Post-Provisioning Configuration

After successful provisioning:

### 1. Enable Row Level Security

Verify RLS is enabled on all tables:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

If RLS is not enabled on a table, enable it:

```sql
ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;
```

### 2. Set Up Realtime (Optional)

If you need real-time subscriptions:

1. Go to **Database** → **Replication** in Supabase dashboard
2. Enable replication for tables that need real-time updates
3. Select tables: `profiles`, `payments`, `user_subscriptions`

### 3. Configure Storage Buckets (If Needed)

If your application uses file uploads:

1. Go to **Storage** in Supabase dashboard
2. Create buckets for:
   - Profile pictures: `profile-pictures`
   - Document uploads: `documents`
   - Company logos: `company-logos`

### 4. Set Up Edge Functions

Deploy necessary edge functions:

```bash
supabase functions deploy lenco-webhook
# Deploy other functions as needed
```

---

## Maintenance and Updates

### Backing Up Before Changes

Always backup before running new migrations:

```bash
# Using Supabase CLI
supabase db dump -f backup-$(date +%Y%m%d-%H%M%S).sql

# Or create backup in dashboard
```

### Running New Migrations

When new SQL files are added:

1. Review the migration file
2. Test in development/staging first
3. Create database backup
4. Run the new migration script
5. Verify changes
6. Test application functionality

### Rolling Back Changes

If something goes wrong:

1. Restore from backup
2. Review what went wrong
3. Fix the migration script
4. Try again in a test environment first

---

## Production Deployment Checklist

Before deploying to production:

- [ ] Backup existing production database
- [ ] Test provisioning scripts in staging environment
- [ ] Verify all tables and policies are created
- [ ] Test authentication flow (sign-up, sign-in)
- [ ] Test profile creation and updates
- [ ] Test payment webhook logging
- [ ] Verify RLS policies are working
- [ ] Run manual smoke tests (see PRE_LAUNCH_MANUAL_SMOKE_TESTS.md)
- [ ] Monitor database performance after provisioning
- [ ] Document any custom changes made

---

## Database Schema Documentation

For detailed information about the database schema, see:
- [DATABASE_SETUP.md](./DATABASE_SETUP.md) - Complete schema documentation
- [AUTHENTICATION_VERIFICATION.md](./AUTHENTICATION_VERIFICATION.md) - Auth system details

---

## Getting Help

If you encounter issues:

1. **Check Supabase Logs**: Dashboard → Logs → Postgres Logs
2. **Review SQL Script**: Look at the specific script that failed
3. **Supabase Community**: [Discord](https://discord.supabase.com/) or [GitHub Discussions](https://github.com/supabase/supabase/discussions)
4. **PostgreSQL Documentation**: [postgresql.org/docs](https://www.postgresql.org/docs/)

---

## Summary

The provisioning process:
1. ✅ Creates all required database tables
2. ✅ Sets up RLS policies for security
3. ✅ Creates triggers for automation (profile creation)
4. ✅ Adds indexes for performance
5. ✅ Prepares database for production use

**Next Steps After Provisioning**:
1. Test authentication flow
2. Run manual smoke tests
3. Deploy edge functions
4. Configure environment variables
5. Launch! 🚀
