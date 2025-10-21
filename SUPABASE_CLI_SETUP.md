# Supabase CLI Setup Guide

This guide walks you through installing and configuring the Supabase CLI for the WATHACI-CONNECT project.

## Installation

The Supabase CLI has been installed in this project. To verify the installation:

```bash
supabase --version
```

Expected output: `Supabase CLI 2.51.0` (or later)

### Manual Installation (if needed)

If you need to install the Supabase CLI on your local machine:

**Linux/macOS:**
```bash
# Download and install from GitHub releases
cd /tmp
curl -LO https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz
tar -xzf supabase_linux_amd64.tar.gz
sudo mv supabase /usr/local/bin/
```

**macOS with Homebrew:**
```bash
brew install supabase/tap/supabase
```

**Windows:**
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

## Authentication

To use the Supabase CLI with your project, you need to authenticate with an access token.

### Step 1: Generate an Access Token

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Click on your account icon (top right)
3. Select "Account Settings" or "Access Tokens"
4. Click "Generate new token"
5. Give it a name (e.g., "CLI Access") and copy the token

### Step 2: Login to Supabase CLI

**Option A: Login with token (recommended for local development)**
```bash
supabase login --token YOUR_ACCESS_TOKEN
```

**Option B: Use environment variable (recommended for CI/CD)**
```bash
export SUPABASE_ACCESS_TOKEN="your_access_token_here"
```

Add this to your shell profile (~/.bashrc, ~/.zshrc) to persist across sessions.

### Step 3: Link Your Project

Once authenticated, link the CLI to your Supabase project:

```bash
# Using project reference and database password
supabase link --project-ref YOUR_PROJECT_REF --password "your-db-password"
```

> Replace `YOUR_PROJECT_REF` and `your-db-password` with the values from your Supabase dashboard. The project reference is the subdomain portion of `https://YOUR_PROJECT_REF.supabase.co`.

Or use the interactive mode:
```bash
supabase link
```

## Project Configuration

The project has been initialized with a `supabase/config.toml` file. This configuration file defines:

- Local development settings
- Database configuration
- API settings
- Edge Functions configuration

### Key Configuration Values

- **Project ID**: `WATHACI-CONNECT.-V1`
- **Project Reference**: `YOUR_PROJECT_REF`
- **Supabase URL**: `https://YOUR_PROJECT_REF.supabase.co`

## Common Commands

### Database Management

```bash
# Pull remote schema changes
supabase db pull

# Push local migrations to remote
supabase db push

# Reset local database
supabase db reset

# Generate migration from schema diff
supabase db diff -f migration_name

# Run migrations
supabase migration up
```

### Local Development

```bash
# Start local Supabase services
supabase start

# Stop local Supabase services
supabase stop

# Check status of local services
supabase status
```

### Edge Functions

```bash
# Deploy an edge function
supabase functions deploy function-name

# Serve edge functions locally
supabase functions serve

# View function logs
supabase functions logs function-name
```

### Project Information

```bash
# Show project status
supabase status

# List all projects
supabase projects list

# Show project details
supabase projects info
```

## Verification

To verify your setup is working correctly:

```bash
# Check CLI version
supabase --version

# Check authentication status
supabase projects list

# Check project link status
supabase status
```

## Environment Variables

The following environment variables are used by the Supabase CLI:

- `SUPABASE_ACCESS_TOKEN`: Your Supabase access token
- `SUPABASE_DB_PASSWORD`: Database password (stored in .env)
- `SUPABASE_PROJECT_REF`: Project reference (YOUR_PROJECT_REF)

## NPM Scripts

Convenient npm scripts have been added to `package.json`:

```bash
# Initialize Supabase (already done)
npm run supabase:init

# Link to remote project
npm run supabase:link

# Start local development
npm run supabase:start

# Stop local development
npm run supabase:stop

# Check status
npm run supabase:status

# Pull remote schema
npm run supabase:pull

# Deploy edge functions
npm run supabase:deploy

# View function logs
npm run supabase:logs
```

## Troubleshooting

### "Access token not provided"

If you get this error, make sure you've logged in:
```bash
supabase login --token YOUR_ACCESS_TOKEN
```

Or set the environment variable:
```bash
export SUPABASE_ACCESS_TOKEN="your_token_here"
```

### "Project not linked"

Run the link command:
```bash
supabase link --project-ref YOUR_PROJECT_REF --password "your-db-password"
```

### "Cannot connect to Docker"

For local development, ensure Docker is installed and running:
```bash
docker --version
sudo systemctl start docker
```

### "Permission denied"

If you get permission errors, you may need to run with sudo or add your user to the docker group:
```bash
sudo usermod -aG docker $USER
```

## Next Steps

1. **Generate Access Token**: Visit your Supabase dashboard to generate an access token
2. **Login**: Run `supabase login --token YOUR_TOKEN`
3. **Link Project**: Run `supabase link` to connect to your remote project
4. **Start Developing**: Use `supabase start` for local development or deploy functions with `supabase functions deploy`

## Additional Resources

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Local Development Guide](https://supabase.com/docs/guides/local-development)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Database Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)

## Support

For issues specific to this project, check:
- [DATABASE_SETUP.md](./DATABASE_SETUP.md)
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- [docs/VERCEL_SUPABASE_DEPLOYMENT.md](./docs/VERCEL_SUPABASE_DEPLOYMENT.md)
