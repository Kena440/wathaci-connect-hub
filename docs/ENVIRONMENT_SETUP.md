# Environment Setup Guide

This guide explains how to properly configure environment variables for the WATHACI CONNECT application.

## Quick Start

1. **Copy the example files**:
   ```bash
   # Create development environment files
   cp .env.example .env
   cp backend/.env.example backend/.env
   
   # Create production environment files (optional but recommended)
   cp .env.example .env.production
   cp backend/.env.example backend/.env.production
   ```

2. **Update the `.env` file** with your actual values (see sections below)

3. **For production deployments**, update `.env.production` files with live credentials

4. **Validate your configuration**:
   ```bash
   npm run env:check
   ```

## Environment Files

### Root `.env` File
Located at the project root, this file contains:
- Frontend environment variables (prefixed with `VITE_`)
- Backend environment variables
- Payment gateway configuration
- Application metadata

**Multiple environment files:**
- `.env` - Default environment file for local development
- `.env.production` - Production-specific overrides (optional)
- `.env.local` - Local overrides (git-ignored, highest priority)

The `env:check` script checks all these files in order and uses the first value it finds for each variable.

### Backend `.env` File
Located at `backend/.env`, this file contains:
- Supabase backend credentials
- Service role keys

**Backend environment files:**
- `backend/.env` - Default backend environment
- `backend/.env.production` - Production backend overrides (optional)
- `backend/.env.local` - Local backend overrides (git-ignored)

## Required Environment Variables

### Supabase Configuration

**Frontend Variables:**
- `VITE_SUPABASE_URL` - Your Supabase project URL (e.g., `https://your-project.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon/public key (JWT token)

**Backend Variables:**
- `SUPABASE_URL` - Your Supabase project URL (same as frontend)
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (JWT token with elevated permissions)

> **Security Note:** The service role key bypasses Row Level Security. Keep it secret and never expose it to the frontend.

### Lenco Payment Gateway

**Payment API Keys:**
- `VITE_LENCO_PUBLIC_KEY` - Lenco publishable key
  - Production: `pub-[64-char-hex]` or `pk_live_[string]`
  - Development: `pk_test_[string]`
- `LENCO_SECRET_KEY` - Lenco secret key (backend only)
  - Production: `sec-[64-char-hex]`, `sk_live_[string]`, or `[64-char-hex]`
  - Development: `sk_test_[string]`
- `LENCO_WEBHOOK_SECRET` - Webhook signing secret from Lenco dashboard
- `VITE_LENCO_API_URL` - Lenco API base URL (default: `https://api.lenco.co/access/v2`)

### Payment Configuration

- `VITE_PAYMENT_CURRENCY` - ISO currency code (e.g., `ZMW` for Zambian Kwacha)
- `VITE_PAYMENT_COUNTRY` - ISO country code (e.g., `ZM` for Zambia)
- `VITE_PLATFORM_FEE_PERCENTAGE` - Platform fee percentage (e.g., `5` for 5%)
- `VITE_MIN_PAYMENT_AMOUNT` - Minimum payment amount (e.g., `5`)
- `VITE_MAX_PAYMENT_AMOUNT` - Maximum payment amount (e.g., `1000000`)

### Application Metadata

- `VITE_APP_ENV` - Runtime environment (`development` or `production`)
- `VITE_APP_NAME` - Application display name (e.g., `WATHACI CONNECT`)

### Optional Variables

- `SUPABASE_ANON_KEY` - Supabase anon key (used by some edge functions)
- `CORS_ALLOWED_ORIGINS` - Comma-delimited list of origins for the Express backend

## Security Best Practices

### ⚠️ Important Security Rules

1. **Never commit `.env` files** to version control
   - The `.env` file is already in `.gitignore`
   - Only commit `.env.example` files with placeholder values

2. **Use different keys for each environment**
   - Development keys should use `test_` prefix
   - Production keys should use `live_` prefix
   - Never use test keys in production

3. **Rotate credentials regularly**
   - Change service role keys periodically
   - Rotate webhook secrets after security incidents
   - Update payment gateway keys according to your security policy

4. **Store secrets securely**
   - Use environment variables in production (Vercel, AWS, etc.)
   - Never hardcode credentials in source code
   - Use secret management services for team environments

## Environment Validation

Run the environment checker to validate your configuration:

```bash
npm run env:check
```

This script will:
- Check for missing required variables
- Detect placeholder values
- Validate Lenco key formats
- Report configuration issues

Expected output for a valid configuration:
```
🎉  All required environment variables are populated with non-placeholder values.
```

## Development vs Production

### Development Environment

Set `VITE_APP_ENV="development"` in your `.env` file and use:
- Test Supabase project
- Test Lenco keys (prefixed with `pk_test_` / `sk_test_`)
- Lower transaction limits for testing

### Production Environment

Set `VITE_APP_ENV="production"` in your `.env.production` file and use:
- Production Supabase project
- Live Lenco keys (prefixed with `pk_live_` / `sk_live_` or proper format)
- Real transaction limits
- Valid SSL/TLS certificates
- Monitoring and alerting enabled

**Important:** When deploying to production:
1. Ensure `.env.production` is created with production credentials
2. The build process should use production environment variables
3. Never mix test and production credentials

## Deployment Configuration

When deploying to hosting providers (Vercel, AWS, etc.):

1. **Add environment variables** to the hosting provider's dashboard
   - Both `VITE_*` prefixed variables (frontend)
   - And non-prefixed variables (backend/edge functions)

2. **Set environment-specific values** for each deployment target:
   - Production
   - Preview/Staging
   - Development

3. **Verify after deployment** by running smoke tests

See [VERCEL_SUPABASE_DEPLOYMENT.md](./VERCEL_SUPABASE_DEPLOYMENT.md) for Vercel-specific instructions.

## Troubleshooting

### Error: Missing required environment variables

**Solution:** Run `npm run env:check` to see which variables are missing and add them to your `.env` file.

### Error: Placeholder values detected

**Solution:** Replace placeholder values like `your-project`, `your-anon-key` with actual values from your Supabase and Lenco dashboards.

### Error: Invalid Lenco key format

**Solution:** Ensure Lenco keys match the expected formats:
- Public keys: `pub-[64-char-hex]` or `pk_live_[string]`
- Secret keys: `sec-[64-char-hex]`, `sk_live_[string]`, or `[64-char-hex]`

### Build fails with environment errors

**Solution:** Ensure all `VITE_*` prefixed variables are set before running the build. Vite only includes variables with the `VITE_` prefix in the frontend bundle.

## Related Documentation

- [Production Readiness Checklist](./PRODUCTION_READINESS_CHECKLIST.md)
- [Deployment Security Checklist](./DEPLOYMENT_SECURITY_CHECKLIST.md)
- [Payment Integration Guide](./PAYMENT_INTEGRATION_GUIDE.md)
- [Webhook Setup Guide](./WEBHOOK_SETUP_GUIDE.md)
- [Vercel Deployment Guide](./VERCEL_SUPABASE_DEPLOYMENT.md)

## Getting Help

If you encounter issues with environment configuration:

1. Run `npm run env:check` for diagnostics
2. Check the [Troubleshooting Guide](../TROUBLESHOOTING.md)
3. Review the [Production Readiness Checklist](./PRODUCTION_READINESS_CHECKLIST.md)
4. Consult the deployment-specific guides in the `docs/` directory
