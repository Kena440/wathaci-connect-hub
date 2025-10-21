# Environment Variables Quick Reference

This document provides a quick reference for setting up environment variables in WATHACI CONNECT.

## Quick Setup

```bash
# 1. Create environment files
npm run env:setup

# 2. Edit the files with your credentials
# - Edit .env for local development
# - Edit .env.production for production builds
# - Edit backend/.env for backend development
# - Edit backend/.env.production for backend production

# 3. Validate your configuration
npm run env:check
```

## Required Environment Variables

### Frontend (Root .env files)

| Variable | Description | Example | Environment |
|----------|-------------|---------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` | All |
| `VITE_SUPABASE_KEY` / `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key | `eyJhbGci...` | All |
| `VITE_API_BASE_URL` | Express backend base URL for onboarding API | `http://localhost:3000` or `https://api.example.com` | All |
| `VITE_LENCO_PUBLIC_KEY` | Lenco publishable key (Production: `pub-...` or `pk_live_...`, Development: `pk_test_...`) | `pub-abc123...` or `pk_live_xyz789` | All |
| `VITE_LENCO_API_URL` | Lenco API base URL | `https://api.lenco.co/access/v2` | All |
| `VITE_PAYMENT_CURRENCY` | ISO currency code | `ZMW` | All |
| `VITE_PAYMENT_COUNTRY` | ISO country code | `ZM` | All |
| `VITE_PLATFORM_FEE_PERCENTAGE` | Platform fee percentage | `5` | All |
| `VITE_MIN_PAYMENT_AMOUNT` | Minimum payment amount | `5` | All |
| `VITE_MAX_PAYMENT_AMOUNT` | Maximum payment amount | `1000000` | All |
| `VITE_APP_ENV` | Runtime environment | `production` or `development` | All |
| `VITE_APP_NAME` | Application display name | `WATHACI CONNECT` | All |

### Backend (backend/.env files)

| Variable | Description | Example | Environment |
|----------|-------------|---------|-------------|
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` | All |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJhbGci...` | All |
| `LENCO_SECRET_KEY` | Lenco secret key (Production: `sec-...` or `sk_live_...`, Development: `sk_test_...`) | `sec-abc123...` or `sk_live_xyz789` | All |
| `LENCO_WEBHOOK_SECRET` | Webhook signing secret | `whsec_...` | All |
| `LENCO_WEBHOOK_URL` | Webhook endpoint URL | `https://xxx.supabase.co/functions/v1/lenco-webhook` | All |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SUPABASE_ANON_KEY` | Supabase anon key (some edge functions) | - |
| `CORS_ALLOWED_ORIGINS` | Comma-delimited CORS origins | - |

## Vercel Environment Variables

When deploying to Vercel, add ALL the variables listed above to:
- **Production environment** (with live credentials)
- **Preview environment** (with test credentials)
- **Development environment** (with test credentials)

### Vercel Setup Steps

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable and select which environments it applies to
3. For environment-specific values (like `VITE_APP_ENV`), add separate entries:
   - Production: `VITE_APP_ENV=production`
   - Preview: `VITE_APP_ENV=development`
   - Development: `VITE_APP_ENV=development`
4. Trigger a redeploy after adding variables

## Key Formats

### Lenco Keys

**Production (Live) Keys:**
- Public: `pub-[64-char-hex]` or `pk_live_[string]`
- Secret: `sec-[64-char-hex]`, `sk_live_[string]`, or `[64-char-hex]`

**Test Keys:**
- Public: `pk_test_[string]`
- Secret: `sk_test_[string]`

### Supabase Keys

- URL format: `https://[project-ref].supabase.co`
- Keys are JWT tokens starting with `eyJ...`

## Validation

The `env:check` script validates:
- ✅ All required variables are present
- ✅ No placeholder values (like `your-project`)
- ✅ Lenco keys match expected format for production
- ✅ All environment files are checked

## Security Best Practices

1. **Never commit .env files** - They're in .gitignore
2. **Use different keys per environment** - Production vs Test
3. **Rotate credentials regularly** - Especially after exposure
4. **Store secrets securely** - Use environment variables in production
5. **Validate before deployment** - Run `npm run env:check`

## Common Issues

### ❌ Placeholder values detected

**Problem:** `env:check` reports placeholder values

**Solution:** Replace `your-project`, `your-anon-key`, etc. with actual values from Supabase/Lenco dashboards

### ❌ Missing required variables

**Problem:** `env:check` reports missing variables

**Solution:** Add the missing variables to your `.env` files

### ❌ Expected live Lenco key

**Problem:** `env:check` reports non-production Lenco keys

**Solution:** Replace test keys (`pk_test_`, `sk_test_`) with live keys (`pk_live_`, `sk_live_`, etc.)

### ❌ Build fails with environment errors

**Problem:** Vite build fails with missing environment variables

**Solution:** Ensure all `VITE_*` prefixed variables are set in your `.env` file

## Related Documentation

- [Environment Setup Guide](./ENVIRONMENT_SETUP.md) - Detailed setup instructions
- [Production Readiness Checklist](./PRODUCTION_READINESS_CHECKLIST.md) - Pre-deployment checklist
- [Vercel Deployment Guide](./VERCEL_SUPABASE_DEPLOYMENT.md) - Vercel-specific instructions
- [Payment Integration Guide](./PAYMENT_INTEGRATION_GUIDE.md) - Payment configuration details
