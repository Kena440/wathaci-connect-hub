# Environment Variable Validation Checklist

This checklist helps ensure your Supabase configuration is correct and consistent across all environments.

## Quick Validation

### 1. Frontend Environment Variables

Check your `.env.local` (development) or deployment platform settings (production):

```bash
# Required for frontend
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key...
VITE_SUPABASE_KEY=eyJhbGciOi...your-anon-key...  # Alternative name

# Optional but recommended
VITE_APP_BASE_URL=http://localhost:5173  # or your domain
VITE_API_BASE_URL=http://localhost:3000   # backend API URL
```

**Checklist:**
- [ ] `VITE_SUPABASE_URL` is set and starts with `https://`
- [ ] `VITE_SUPABASE_URL` ends with `.supabase.co`
- [ ] `VITE_SUPABASE_ANON_KEY` is set and starts with `eyJ`
- [ ] Both variables are for the SAME Supabase project
- [ ] No extra quotes around values
- [ ] No trailing spaces or newlines
- [ ] File is named `.env.local` (not `.env.local.txt`)

### 2. Backend Environment Variables

Check your backend `.env` file:

```bash
# Required for backend
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...your-service-role-key...

# Optional
SUPABASE_JWT_SECRET=your-jwt-secret
```

**Checklist:**
- [ ] `SUPABASE_URL` matches the frontend `VITE_SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set (NOT the anon key)
- [ ] Service role key is kept secret (never exposed to frontend)
- [ ] Backend and frontend point to the SAME project

### 3. Verify in Supabase Dashboard

Open your Supabase Dashboard at https://supabase.com/dashboard

**Project Settings → API:**
- [ ] Copy the `Project URL` - it should match your `SUPABASE_URL` / `VITE_SUPABASE_URL`
- [ ] Copy the `anon public` key - it should match your `VITE_SUPABASE_ANON_KEY`
- [ ] Copy the `service_role` key - it should match your `SUPABASE_SERVICE_ROLE_KEY`

**Project Settings → General:**
- [ ] Note your `Reference ID` (appears in the URL)
- [ ] Verify your project region

## Common Misconfigurations

### Issue 1: Frontend and Backend Point to Different Projects

**Symptom:** User can sign up but profile doesn't appear, or get "Database error"

**Fix:** Ensure both use the SAME project URL:
```bash
# ❌ WRONG - Different projects
VITE_SUPABASE_URL=https://abcd1234.supabase.co
SUPABASE_URL=https://efgh5678.supabase.co

# ✅ CORRECT - Same project
VITE_SUPABASE_URL=https://abcd1234.supabase.co
SUPABASE_URL=https://abcd1234.supabase.co
```

### Issue 2: Using Service Role Key in Frontend

**Symptom:** Security risk! The service role key bypasses RLS.

**Fix:** Never use `SUPABASE_SERVICE_ROLE_KEY` in frontend:
```bash
# ❌ WRONG - Service role in frontend
VITE_SUPABASE_KEY=eyJhbGci...service-role-key...

# ✅ CORRECT - Anon key in frontend
VITE_SUPABASE_ANON_KEY=eyJhbGci...anon-public-key...
```

### Issue 3: Development and Production URLs Mixed

**Symptom:** Works locally but fails in production (or vice versa)

**Fix:** Check deployment platform (e.g., Vercel, Netlify):
```bash
# Development (.env.local)
VITE_SUPABASE_URL=https://dev-project.supabase.co

# Production (deployment settings)
VITE_SUPABASE_URL=https://prod-project.supabase.co
```

### Issue 4: Quotes or Extra Characters

**Symptom:** Error about invalid URL or API key

**Fix:** Remove quotes and whitespace:
```bash
# ❌ WRONG - Has quotes
VITE_SUPABASE_URL="https://abcd1234.supabase.co"

# ❌ WRONG - Has trailing space
VITE_SUPABASE_URL=https://abcd1234.supabase.co 

# ✅ CORRECT - Clean value
VITE_SUPABASE_URL=https://abcd1234.supabase.co
```

### Issue 5: Wrong Variable Names

**Symptom:** "Supabase client not configured" error

**Fix:** Use correct variable names:
```bash
# ❌ WRONG - Incorrect names
SUPABASE_URL_PUBLIC=https://abcd1234.supabase.co
SUPABASE_ANON=eyJhbGci...

# ✅ CORRECT - Proper names
VITE_SUPABASE_URL=https://abcd1234.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

## Verification Script

Run this in your project root to verify configuration:

### Frontend Verification (Browser Console)

```javascript
// Open browser console on your app and run:
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Anon Key (first 20 chars):', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20));
console.log('Has URL:', !!import.meta.env.VITE_SUPABASE_URL);
console.log('Has Key:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
```

Expected output:
```
Supabase URL: https://abcd1234.supabase.co
Anon Key (first 20 chars): eyJhbGciOiJIUzI1NiIs
Has URL: true
Has Key: true
```

### Backend Verification (Node.js)

Create a temporary file `test-env.js`:

```javascript
// test-env.js
require('dotenv').config();

console.log('Backend Config Check:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SERVICE_ROLE_KEY (first 20):', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20));
console.log('Has URL:', !!process.env.SUPABASE_URL);
console.log('Has Service Key:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

// Verify they point to same project
const frontendUrl = process.env.VITE_SUPABASE_URL;
const backendUrl = process.env.SUPABASE_URL;

if (frontendUrl && backendUrl) {
  console.log('\nProject consistency check:');
  console.log('Frontend URL:', frontendUrl);
  console.log('Backend URL:', backendUrl);
  console.log('Match:', frontendUrl === backendUrl ? '✅ YES' : '❌ NO - FIX THIS!');
}
```

Run it:
```bash
node test-env.js
```

## Connection Test

### Test Frontend Connection

Add this to a React component (temporarily):

```tsx
import { supabase } from '@/lib/supabaseClient';
import { useEffect } from 'react';

export function SupabaseConnectionTest() {
  useEffect(() => {
    async function testConnection() {
      try {
        const { data, error } = await supabase.from('profiles').select('count');
        
        if (error) {
          console.error('❌ Connection test failed:', error.message);
        } else {
          console.log('✅ Supabase connection successful!');
        }
      } catch (err) {
        console.error('❌ Connection error:', err);
      }
    }
    
    testConnection();
  }, []);
  
  return null;
}
```

### Test Backend Connection

Create `test-backend-connection.js`:

```javascript
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count');
    
    if (error) {
      console.error('❌ Backend connection failed:', error.message);
      process.exit(1);
    }
    
    console.log('✅ Backend Supabase connection successful!');
  } catch (err) {
    console.error('❌ Connection error:', err);
    process.exit(1);
  }
}

testConnection();
```

Run it:
```bash
node test-backend-connection.js
```

## Deployment Platform Checks

### Vercel

1. Go to Project Settings → Environment Variables
2. Check that variables are set for the correct environment (Production, Preview, Development)
3. After updating, redeploy the project

**Checklist:**
- [ ] `VITE_SUPABASE_URL` is set in Vercel
- [ ] `VITE_SUPABASE_ANON_KEY` is set in Vercel
- [ ] Values match your Supabase dashboard
- [ ] No extra quotes or spaces
- [ ] Project has been redeployed after changes

### Netlify

1. Go to Site Settings → Build & deploy → Environment
2. Check variables are set
3. Trigger a new deployment

**Checklist:**
- [ ] `VITE_SUPABASE_URL` is set in Netlify
- [ ] `VITE_SUPABASE_ANON_KEY` is set in Netlify
- [ ] Values match your Supabase dashboard
- [ ] Site has been redeployed after changes

### Other Platforms

For other platforms (Render, Railway, Fly.io, etc.):
- [ ] Check their environment variable settings
- [ ] Ensure variables are set correctly
- [ ] Redeploy after making changes

## Security Best Practices

### ✅ DO:
- Use `.env.local` for local development (this is git-ignored)
- Use platform-specific environment variables in production
- Keep service role key secret (never in frontend or git)
- Use different projects for dev and production
- Rotate keys if they're ever exposed

### ❌ DON'T:
- Commit `.env` or `.env.local` to git
- Share your service role key
- Use production keys in development
- Hard-code credentials in source code
- Expose service role key in frontend

## Troubleshooting

### "Invalid API key" Error

1. Verify key starts with `eyJ`
2. Ensure no extra characters or quotes
3. Check it's the correct key type (anon for frontend, service_role for backend)
4. Regenerate key in Supabase dashboard if needed

### "Project not found" Error

1. Verify URL format: `https://[project-ref].supabase.co`
2. Check project hasn't been paused or deleted
3. Ensure you're using the correct region URL

### Works Locally, Fails in Production

1. Check deployment platform environment variables
2. Verify production uses production Supabase project
3. Ensure RLS policies are correctly set up
4. Check database migrations have been applied to production

## Summary Checklist

Before deploying or testing signup:

- [ ] All required environment variables are set
- [ ] Frontend and backend point to same Supabase project  
- [ ] Variables have no quotes or extra whitespace
- [ ] Service role key is only used in backend
- [ ] Anon key is used in frontend
- [ ] Values match Supabase dashboard
- [ ] Connection tests pass
- [ ] Environment variables are set in deployment platform
- [ ] Project has been redeployed after env changes

## Related Files

- Frontend config: `src/lib/supabaseClient.ts`
- Backend config: `backend/lib/supabaseClient.js` or `backend/lib/supabaseAdmin.js`
- Example env: `.env.example`
- This guide: `ENVIRONMENT_VARIABLES_CHECKLIST.md`
