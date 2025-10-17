# Vercel Deployment Checklist for Supabase Integration

This guide helps ensure Supabase is correctly configured when deploying the WATHACI CONNECT application to Vercel.

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
2. Add the following variables for each environment (`Production`, `Preview`, and `Development`):
   - `VITE_SUPABASE_URL` – Supabase project URL (for browser/runtime access).
   - `VITE_SUPABASE_KEY` – Supabase anon/public key.
   - `SUPABASE_SERVICE_ROLE_KEY` – Required only if Vercel Edge Functions or server actions need service role access.
3. Save the variables and redeploy the project so the new values are injected.

> **Tip:** Use the copy buttons in Supabase to avoid typos. Ensure each value matches the project you verified in step 1.

## 4. Validate Variables from the Terminal

Before deploying, confirm the environment file is correctly populated:

```bash
cp .env.example .env # if you have not created it yet
npm run env:check    # validates required Supabase/Lenco variables across .env files
```

For CI/CD, add a step that prints the variable names (not the values) to confirm they are present. Avoid logging secrets directly.

## 5. Troubleshooting Supabase Integration on Vercel

- **Missing Variables:** If the site builds locally but fails on Vercel, ensure the variables exist for the environment that triggered the deployment. Vercel does not inherit variables across environments.
- **Project Mismatch:** 403 or 404 responses from Supabase often mean the project URL or key came from a different organization/project. Recopy the values from Supabase settings.
- **Edge Function Secrets:** Deploying Supabase functions via CLI requires the `supabase` project to be linked. Run `supabase secrets list` to confirm the keys were set.
- **Re-deploy:** After updating environment variables, trigger a redeploy (`vercel --prod` or through the dashboard) to ensure the new secrets are available at runtime.

Following this checklist will help prevent most Supabase-related deployment issues on Vercel.
