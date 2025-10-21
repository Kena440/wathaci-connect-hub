# Vercel Deployment Guide for WATHACI CONNECT

This comprehensive guide covers deploying the WATHACI CONNECT application to Vercel with proper Supabase integration and environment configuration.

## 1. Confirm Supabase Project Access

1. Log in to the Supabase dashboard and verify you are in the correct **organization** and **project**.
2. Copy the project reference from **Project Settings → General**.
3. Confirm the REST URL format matches `https://<project-ref>.supabase.co` and that the anon/service role keys are available.

## 2. Install and Link Supabase CLI (Optional but Recommended)

If you deploy Supabase Edge Functions or manage secrets locally, install the Supabase CLI and authenticate:

```bash
npm install -g supabase
supabase login
supabase link --project-ref <project-ref>
```

Linking the CLI ensures you are operating on the correct Supabase project before deploying functions or setting secrets.

## 3. Configure Vercel Environment Variables

In the Vercel dashboard:

1. Navigate to your project → **Settings → Environment Variables**.
2. Add the following variables for **each environment** (`Production`, `Preview`, and `Development`):

### Supabase Variables (Required)
   - `VITE_SUPABASE_URL` – Supabase project URL (e.g., `https://abc123xyz789.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY` – Supabase anon/public key (JWT token)
   - `SUPABASE_URL` – Same as VITE_SUPABASE_URL (for backend/server usage)
   - `SUPABASE_SERVICE_ROLE_KEY` – Supabase service role key (required for server-side operations)

### Lenco Payment Variables (Required)
   - `VITE_LENCO_PUBLIC_KEY` – Lenco publishable key (use `pub-...` or `pk_live_...` for production)
   - `LENCO_SECRET_KEY` – Lenco secret key (use `sec-...`, `sk_live_...`, or 64-char hex for production)
   - `LENCO_WEBHOOK_SECRET` – Webhook signing secret from Lenco dashboard
   - `VITE_LENCO_API_URL` – Lenco API base URL (default: `https://api.lenco.co/access/v2`)

### Payment Configuration (Required)
   - `VITE_PAYMENT_CURRENCY` – ISO currency code (e.g., `ZMW`)
   - `VITE_PAYMENT_COUNTRY` – ISO country code (e.g., `ZM`)
   - `VITE_PLATFORM_FEE_PERCENTAGE` – Platform fee percentage (e.g., `5`)
   - `VITE_MIN_PAYMENT_AMOUNT` – Minimum payment amount (e.g., `5`)
   - `VITE_MAX_PAYMENT_AMOUNT` – Maximum payment amount (e.g., `1000000`)

### Application Metadata (Required)
   - `VITE_APP_ENV` – Set to `production` for Production environment, `development` for Preview/Development
   - `VITE_APP_NAME` – Application display name (e.g., `WATHACI CONNECT`)

### Optional Variables
   - `SUPABASE_ANON_KEY` – Supabase anon key (used by some edge functions)
   - `CORS_ALLOWED_ORIGINS` – Comma-delimited list of origins for CORS (e.g., `https://yourdomain.com,https://preview.yourdomain.com`)

3. **Important:** Set different values for each environment:
   - **Production:** Use live Supabase project and live Lenco keys (`pk_live_`/`sk_live_`)
   - **Preview:** Use staging Supabase project and test Lenco keys (`pk_test_`/`sk_test_`)
   - **Development:** Use development Supabase project and test Lenco keys

4. Save the variables and trigger a redeploy so the new values are injected.

> **Security Tip:** Never use production credentials in Preview or Development environments. Always use separate Supabase projects and test payment keys for non-production deployments.

> **Copy Tip:** Use the copy buttons in Supabase and Lenco dashboards to avoid typos. Ensure each value matches the project you verified in step 1.

## 4. Validate Variables from the Terminal

Before deploying, confirm the environment file is correctly populated:

```bash
# Create environment files if not already created
npm run env:setup

# Update .env and .env.production with actual credentials
# Edit .env for development, .env.production for production

# Validate your configuration
npm run env:check
```

The `env:check` command will:
- Check for missing required variables
- Detect placeholder values that need to be replaced
- Validate Lenco key formats (ensuring live keys for production)
- Report configuration issues

For CI/CD, add a step that runs `npm run env:check` to validate environment variables before deployment. The script will exit with code 1 if there are issues.

## 5. Syncing Environment Variables Across Vercel Environments

To ensure runtime environments stay in sync, follow these best practices:

### Method 1: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Pull environment variables from Vercel (to sync with team)
vercel env pull

# Add a new environment variable to all environments
vercel env add VARIABLE_NAME

# Update existing environment variables
vercel env rm VARIABLE_NAME production
vercel env add VARIABLE_NAME production
```

### Method 2: Using Vercel Dashboard

1. Go to your project → **Settings → Environment Variables**
2. When adding a variable, check all three environments where it should apply:
   - ☑️ Production
   - ☑️ Preview
   - ☑️ Development
3. For environment-specific values (like `VITE_APP_ENV`), add separate entries for each environment

### Environment-Specific Configuration

Some variables should have different values per environment:

**Production-only values:**
- `VITE_APP_ENV="production"`
- Live Lenco keys (`pk_live_...`, `sk_live_...`)
- Production Supabase project URL and keys

**Preview/Development values:**
- `VITE_APP_ENV="development"`
- Test Lenco keys (`pk_test_...`, `sk_test_...`)
- Staging/Development Supabase project URL and keys

**Shared values (same across all environments):**
- `VITE_PAYMENT_CURRENCY`
- `VITE_PAYMENT_COUNTRY`
- `VITE_PLATFORM_FEE_PERCENTAGE`
- `VITE_MIN_PAYMENT_AMOUNT`
- `VITE_MAX_PAYMENT_AMOUNT`
- `VITE_APP_NAME`
- `VITE_LENCO_API_URL`

### Verification Checklist

After setting up Vercel environment variables:

- [ ] All required variables are set for Production environment
- [ ] All required variables are set for Preview environment
- [ ] All required variables are set for Development environment
- [ ] Production uses live Supabase and Lenco credentials
- [ ] Preview/Development use test/staging credentials
- [ ] `VITE_APP_ENV` is correctly set for each environment
- [ ] Redeploy triggered after variable updates
- [ ] Test deployment in each environment

## 6. Troubleshooting Supabase Integration on Vercel

- **Missing Variables:** If the site builds locally but fails on Vercel, ensure the variables exist for the environment that triggered the deployment. Vercel does not inherit variables across environments.
- **Project Mismatch:** 403 or 404 responses from Supabase often mean the project URL or key came from a different organization/project. Recopy the values from Supabase settings.
- **Edge Function Secrets:** Deploying Supabase functions via CLI requires the `supabase` project to be linked. Run `supabase secrets list` to confirm the keys were set.
- **Re-deploy:** After updating environment variables, trigger a redeploy (`vercel --prod` or through the dashboard) to ensure the new secrets are available at runtime.

Following this checklist will help prevent most Supabase-related deployment issues on Vercel.
