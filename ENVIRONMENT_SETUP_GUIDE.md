# Environment Setup Guide

This guide explains how to properly configure environment variables for WATHACI CONNECT to ensure the application runs correctly in development, preview, and production environments.

## Quick Start

### For Local Development

Create or update `.env.local` with:

```env
# --- Supabase Configuration (REQUIRED) ---
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key-here"

# --- Backend API Configuration (REQUIRED for local development) ---
VITE_API_BASE_URL="http://localhost:3000"

# --- Lenco Payment Configuration (REQUIRED for payments) ---
VITE_LENCO_PUBLIC_KEY="your-lenco-public-key"
VITE_LENCO_API_URL="https://api.lenco.co/access/v2"
VITE_LENCO_WEBHOOK_URL="https://your-project.supabase.co/functions/v1/lenco-payments-validator"

# --- Payment Settings ---
VITE_PAYMENT_CURRENCY="ZMW"
VITE_PAYMENT_COUNTRY="ZM"
VITE_PLATFORM_FEE_PERCENTAGE="10"
VITE_MIN_PAYMENT_AMOUNT="0"
VITE_MAX_PAYMENT_AMOUNT="50000"

# --- Environment ---
VITE_APP_ENV="development"
VITE_APP_NAME="WATHACI CONNECT"
```

### For Production

Create or update `.env.production` with:

```env
# --- Supabase Configuration (REQUIRED) ---
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key-here"

# --- Backend API Configuration (REQUIRED) ---
VITE_API_BASE_URL="https://api.your-domain.com"

# --- Lenco Payment Configuration (REQUIRED for payments) ---
VITE_LENCO_PUBLIC_KEY="your-live-lenco-public-key"
VITE_LENCO_API_URL="https://api.lenco.co/access/v2"
VITE_LENCO_WEBHOOK_URL="https://your-project.supabase.co/functions/v1/lenco-payments-validator"

# --- Payment Settings ---
VITE_PAYMENT_CURRENCY="ZMW"
VITE_PAYMENT_COUNTRY="ZM"
VITE_PLATFORM_FEE_PERCENTAGE="10"
VITE_MIN_PAYMENT_AMOUNT="0"
VITE_MAX_PAYMENT_AMOUNT="50000"

# --- Environment ---
VITE_APP_ENV="production"
VITE_APP_NAME="WATHACI CONNECT"
```

## Required Environment Variables

### Supabase Configuration (Critical - App Won't Start Without These)

The app requires **both** of these Supabase variables:

1. **VITE_SUPABASE_URL** - Your Supabase project URL
   - Format: `https://your-project-id.supabase.co`
   - Find it in: Supabase Dashboard → Settings → API → Project URL
   - **Aliases supported:** `VITE_SUPABASE_PROJECT_URL`, `SUPABASE_URL`, `SUPABASE_PROJECT_URL`

2. **VITE_SUPABASE_ANON_KEY** - Your Supabase anonymous/public key
   - Find it in: Supabase Dashboard → Settings → API → `anon` `public` key
   - **Aliases supported:** `VITE_SUPABASE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_KEY`

> **⚠️ IMPORTANT:** If these are missing, you'll see a "Configuration required before launch" blocking screen.

### Backend API Configuration (Required for Local Development)

The frontend communicates with a separate Express backend for user registration, OTP verification, and logging.

1. **VITE_API_BASE_URL** - Backend API base URL
   - **Local Development:** `http://localhost:3000` (default port for backend server)
   - **Production:** `https://api.your-domain.com` (your deployed backend API)
   - This value is embedded at build time

> **📝 Note:** 
> - The backend Express server runs on port 3000 by default (configured in `backend/index.js`)
> - The frontend Vite dev server runs on port 8080 (configured in `vite.config.js`)
> - For local development, start both servers separately (see Local Development section in README.md)

### Lenco Payment Configuration (Required for Payment Features)

For production deployments with payment functionality enabled:

1. **VITE_LENCO_PUBLIC_KEY** - Your Lenco public API key
   - Development: Use test keys (starts with `pk_test_` or `pub-...`)
   - Production: Use live keys (starts with `pk_live_`)
   - **Aliases supported:** `LENCO_PUBLIC_KEY`

2. **VITE_LENCO_API_URL** - Lenco API endpoint
   - Usually: `https://api.lenco.co/access/v2`
   - **Aliases supported:** `LENCO_API_URL`

3. **VITE_LENCO_WEBHOOK_URL** - Your webhook endpoint URL
   - Format: `https://your-project.supabase.co/functions/v1/lenco-payments-validator`
   - Must be HTTPS in production
   - **Aliases supported:** `LENCO_WEBHOOK_URL`

> **Note:** The app will show warnings in development if payment keys are missing, but will block in production.

## Environment Variable Resolution Order

The configuration system checks environment variables in this priority order:

### For Supabase URL:
1. `VITE_SUPABASE_URL` (recommended)
2. `VITE_SUPABASE_PROJECT_URL`
3. `SUPABASE_URL`
4. `SUPABASE_PROJECT_URL`

### For Supabase Anon Key:
1. `VITE_SUPABASE_ANON_KEY` (recommended)
2. `VITE_SUPABASE_KEY`
3. `SUPABASE_ANON_KEY`
4. `SUPABASE_KEY`

The first non-empty value found is used. This allows flexibility while maintaining a canonical recommended variable name.

## How Vite Handles Environment Variables

### Build-Time vs Runtime

**Important:** Vite processes environment variables at **build time**, not runtime. This means:

1. **Development (`npm run dev`):**
   - Reads from `.env`, `.env.local`, `.env.development`, `.env.development.local`
   - Variables prefixed with `VITE_` are available in the client-side code
   - Variables without `VITE_` prefix are only available server-side (in Vite config, etc.)

2. **Production Build (`npm run build`):**
   - Reads from `.env`, `.env.local`, `.env.production`, `.env.production.local`
   - All `VITE_*` values are **embedded as literal strings** in the built JavaScript
   - The built files in `dist/` contain the actual values, not variable references

3. **Preview (`npm run preview`):**
   - Serves the **already-built** files from `dist/`
   - Does NOT re-read environment files
   - To test with different env vars, you must rebuild: `npm run build && npm run preview`

### File Priority Order

Vite loads environment files in this order (later files override earlier ones):

1. `.env` - Shared defaults for all environments
2. `.env.local` - Local overrides (git-ignored)
3. `.env.[mode]` - Mode-specific defaults (e.g., `.env.production`)
4. `.env.[mode].local` - Mode-specific local overrides (git-ignored)

## Deployment Instructions

### Vercel / Netlify / Similar Platforms

1. **Set environment variables in your hosting dashboard:**
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_LENCO_PUBLIC_KEY=your-live-key
   VITE_LENCO_API_URL=https://api.lenco.co/access/v2
   VITE_LENCO_WEBHOOK_URL=https://your-project.supabase.co/functions/v1/lenco-payments-validator
   VITE_APP_ENV=production
   ```

2. **Trigger a new deployment** - The build process will embed these values.

### Docker / Custom Hosting

If you're building a Docker image or deploying to a custom server:

1. **At Build Time:**
   - Provide environment variables during `docker build` or before running `npm run build`
   - Use build arguments or `.env.production` file

2. **Example Dockerfile:**
   ```dockerfile
   FROM node:18-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   # Environment variables must be set at build time
   ARG VITE_SUPABASE_URL
   ARG VITE_SUPABASE_ANON_KEY
   ARG VITE_LENCO_PUBLIC_KEY
   ARG VITE_LENCO_API_URL
   ARG VITE_LENCO_WEBHOOK_URL
   ARG VITE_APP_ENV=production
   RUN npm run build

   FROM nginx:alpine
   COPY --from=builder /app/dist /usr/share/nginx/html
   ```

3. **Build with environment variables:**
   ```bash
   docker build \
     --build-arg VITE_SUPABASE_URL=https://your-project.supabase.co \
     --build-arg VITE_SUPABASE_ANON_KEY=your-key \
     --build-arg VITE_LENCO_PUBLIC_KEY=your-key \
     --build-arg VITE_LENCO_API_URL=https://api.lenco.co/access/v2 \
     --build-arg VITE_LENCO_WEBHOOK_URL=https://your-webhook-url \
     -t wathaci-connect .
   ```

## Troubleshooting

### "Configuration required before launch" Screen Appears

**Symptoms:**
- Orange/red error screen with "Configuration required before launch"
- Lists missing Supabase URL and/or anon key

**Solution:**
1. Check that `VITE_SUPABASE_URL` is set (or one of its aliases)
2. Check that `VITE_SUPABASE_ANON_KEY` is set (or one of its aliases)
3. Ensure values are not empty, `"undefined"`, or `"null"`
4. Rebuild the application: `npm run build`
5. Restart preview/production server

### Environment Variables Not Taking Effect

**Problem:** Changed `.env` file but app still uses old values.

**Solution:**
- For development: Restart `npm run dev`
- For preview: Rebuild first: `npm run build && npm run preview`
- For production: Trigger a new deployment/build

### Mixed Development/Production Keys

**Problem:** Using test keys in production or vice versa.

**Solution:**
1. Use `.env.local` for development overrides (git-ignored)
2. Use `.env.production` for production defaults (can be committed)
3. Use hosting platform's environment variables for production secrets
4. The app will warn if using `pk_test_` keys in production

### Payment Warnings in Console

**Problem:** Seeing warnings about missing payment configuration.

**This is normal for development** if you don't need payment features yet. The app will still work.

For production, ensure all payment variables are set:
- `VITE_LENCO_PUBLIC_KEY`
- `VITE_LENCO_API_URL`
- `VITE_LENCO_WEBHOOK_URL`

## Testing Your Configuration

### 1. Check Build Output

```bash
npm run build
```

Look for any warnings about missing configuration. A successful build should complete without configuration errors.

### 2. Test Preview Mode

```bash
npm run build && npm run preview
```

Open http://localhost:4173 and verify:
- No "Configuration required" screen appears
- Console shows: `[app] Mounted {mode: production, supabaseConfigured: true, ...}`

### 3. Test Development Mode

To run the full application in development mode, you need to start both servers:

**Terminal 1 - Backend API:**
```bash
cd backend
npm install  # First time only
npm start    # Runs on http://localhost:3000
```

**Terminal 2 - Frontend:**
```bash
npm install  # First time only (in project root)
npm run dev  # Runs on http://localhost:8080
```

Open http://localhost:8080 and verify:
- The app loads correctly
- Frontend can communicate with backend at http://localhost:3000
- No CORS errors in the browser console

> **💡 Tip:** Keep both terminal windows open while developing. The backend must be running for features like user registration and OTP verification to work.

## Security Best Practices

1. **Never commit secrets:**
   - Add `.env.local` and `.env.*.local` to `.gitignore`
   - Only commit `.env.example` files with placeholder values

2. **Use appropriate keys for each environment:**
   - Development: Test/sandbox keys
   - Production: Live keys

3. **Supabase Row Level Security (RLS):**
   - The `anon` key is safe to expose publicly
   - RLS policies in Supabase protect your data

4. **Rotate keys periodically:**
   - Update keys in your hosting platform's dashboard
   - Trigger a new deployment

## Getting Help

If you're still experiencing issues:

1. Check the browser console for error messages
2. Verify environment variables are being read: check the Network tab for API calls
3. Review the [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) file
4. Contact support@wathaci.com

## Summary Checklist

Before deploying to production:

- [ ] `VITE_SUPABASE_URL` is set correctly
- [ ] `VITE_SUPABASE_ANON_KEY` is set correctly
- [ ] `VITE_LENCO_PUBLIC_KEY` uses a **live** key (not test)
- [ ] `VITE_LENCO_WEBHOOK_URL` uses **HTTPS**
- [ ] `VITE_APP_ENV` is set to `production`
- [ ] Built and tested with `npm run build && npm run preview`
- [ ] No "Configuration required" screen appears
- [ ] Console shows `supabaseConfigured: true`
- [ ] Payment features work (if enabled)
