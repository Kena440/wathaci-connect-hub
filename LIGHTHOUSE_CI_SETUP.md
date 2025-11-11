# Lighthouse CI Setup Guide

## Requirements

Lighthouse requires a Chrome/Chromium binary to run. In CI environments, you need to install Chrome before running Lighthouse tests.

## Environment Variables Required

For Lighthouse to successfully audit the application, the following environment variables must be configured:

### Required Supabase Variables
- `VITE_SUPABASE_URL`: Your Supabase project URL (e.g., `https://your-project.supabase.co`)
- `VITE_SUPABASE_KEY`: Your Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (for backend operations)

### Required Lenco Payment Variables
- `VITE_LENCO_PUBLIC_KEY`: Lenco public API key
- `LENCO_SECRET_KEY`: Lenco secret key (server-side only)
- `LENCO_WEBHOOK_SECRET`: Webhook signature verification secret
- `VITE_LENCO_API_URL`: Lenco API endpoint (default: `https://api.lenco.co/access/v2`)

### Optional Configuration Variables
- `VITE_APP_ENV`: Environment name (development/staging/production)
- `VITE_APP_NAME`: Application name (default: "WATHACI CONNECT")
- `VITE_PAYMENT_CURRENCY`: Payment currency code (default: "ZMW")
- `VITE_PAYMENT_COUNTRY`: Country code (default: "ZM")
- `VITE_PLATFORM_FEE_PERCENTAGE`: Platform fee percentage (default: "10")
- `VITE_API_BASE_URL`: Backend API URL (default: "http://localhost:3000")

**Note**: Without these environment variables, the application may fail to render properly, causing Lighthouse to report `NO_FCP` (No First Contentful Paint) failures.

## Local Usage

Lighthouse is already installed as a dev dependency. To run Lighthouse tests locally:

1. Set up your environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your actual values
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. In a separate terminal, run Lighthouse:
   ```bash
   npm run test:lighthouse
   ```

## CI Setup

To enable Lighthouse in CI (GitHub Actions), add these steps to your workflow:

```yaml
- name: Install Chrome
  uses: browser-actions/setup-chrome@latest
  with:
    chrome-version: stable

- name: Start dev server
  run: npm run dev &
  env:
    # Required Supabase environment variables
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_KEY: ${{ secrets.VITE_SUPABASE_KEY }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
    
    # Required Lenco payment variables
    VITE_LENCO_PUBLIC_KEY: ${{ secrets.VITE_LENCO_PUBLIC_KEY }}
    LENCO_SECRET_KEY: ${{ secrets.LENCO_SECRET_KEY }}
    LENCO_WEBHOOK_SECRET: ${{ secrets.LENCO_WEBHOOK_SECRET }}
    VITE_LENCO_API_URL: https://api.lenco.co/access/v2
    
    # Optional configuration
    VITE_APP_ENV: production
    VITE_APP_NAME: "WATHACI CONNECT"
    VITE_PAYMENT_CURRENCY: ZMW
    VITE_PAYMENT_COUNTRY: ZM
    VITE_PLATFORM_FEE_PERCENTAGE: "10"
    VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}

- name: Wait for server
  run: npx wait-on http://localhost:5173 --timeout 30000

- name: Run Lighthouse
  run: npm run test:lighthouse
```

### Setting Up GitHub Secrets

To configure the required secrets in your GitHub repository:

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each of the following secrets with their corresponding values:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `VITE_LENCO_PUBLIC_KEY`
   - `LENCO_SECRET_KEY`
   - `LENCO_WEBHOOK_SECRET`
   - `VITE_API_BASE_URL` (if using a custom backend)

## Troubleshooting NO_FCP Errors

If Lighthouse reports `NO_FCP` (No First Contentful Paint) errors:

1. **Check Environment Variables**: Ensure all required Supabase and Lenco variables are set
2. **Verify Server is Running**: Confirm the dev server starts without errors
3. **Check Console Logs**: Look for JavaScript errors that might prevent rendering
4. **Test Locally First**: Run Lighthouse locally with the same environment variables
5. **Increase Timeout**: The server might need more time to start - increase wait-on timeout

## Why Lighthouse Currently Doesn't Run in CI

1. **Chrome Binary Required**: Lighthouse requires Chrome/Chromium to run headless tests
2. **Environment Configuration**: The app needs Supabase and other API credentials configured
3. **Server Must Be Running**: Lighthouse tests require the dev/preview server to be active
4. **NO_FCP Issue**: Without proper environment variables, the app fails to render

## Alternative: Lighthouse CI Action

You can use the official Lighthouse CI GitHub Action:

```yaml
- name: Run Lighthouse CI
  uses: treosh/lighthouse-ci-action@v10
  with:
    urls: |
      http://localhost:5173
    uploadArtifacts: true
    temporaryPublicStorage: true
  env:
    # Include all required environment variables here
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_KEY: ${{ secrets.VITE_SUPABASE_KEY }}
    VITE_LENCO_PUBLIC_KEY: ${{ secrets.VITE_LENCO_PUBLIC_KEY }}
    # ... other variables
```

This action handles Chrome installation automatically and provides better reporting.
