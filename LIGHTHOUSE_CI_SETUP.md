# Lighthouse CI Setup Guide

## Requirements

Lighthouse requires a Chrome/Chromium binary to run. In CI environments, you need to install Chrome before running Lighthouse tests.

## Local Usage

Lighthouse is already installed as a dev dependency. To run Lighthouse tests locally:

1. Start the development server:
   ```bash
   npm run dev
   ```

2. In a separate terminal, run Lighthouse:
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
    # Add required environment variables
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_KEY: ${{ secrets.VITE_SUPABASE_KEY }}
    # ... other env vars

- name: Wait for server
  run: npx wait-on http://localhost:5173 --timeout 30000

- name: Run Lighthouse
  run: npm run test:lighthouse
```

## Why Lighthouse Currently Doesn't Run in CI

1. **Chrome Binary Required**: Lighthouse requires Chrome/Chromium to run headless tests
2. **Environment Configuration**: The app needs Supabase and other API credentials configured
3. **Server Must Be Running**: Lighthouse tests require the dev/preview server to be active

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
```

This action handles Chrome installation automatically.
