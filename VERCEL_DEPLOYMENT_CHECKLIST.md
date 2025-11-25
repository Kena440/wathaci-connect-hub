# Vercel Deployment Checklist

## ✅ Pre-Deployment Verification

### Frontend Configuration Status

| Check | Status | Notes |
|-------|--------|-------|
| ✅ Frontend builds without errors | PASS | `npm run build` completes successfully |
| ✅ TypeScript type checking passes | PASS | `npm run typecheck` completes without errors |
| ✅ API configuration exists | PASS | `src/config/api.ts` provides centralized API_BASE_URL |
| ✅ API client utilities exist | PASS | `src/lib/api/client.ts` provides apiFetch, apiGet, apiPost, etc. |
| ✅ No hardcoded localhost URLs | PASS | All API calls use centralized API_BASE_URL |
| ⚠️ Production .env.production file configured | VERIFY | Update with actual backend URL |

### Backend Configuration Status

| Check | Status | Notes |
|-------|--------|-------|
| ✅ Backend has health endpoint | PASS | `/health` and `/api/health` return JSON |
| ✅ CORS package installed | PASS | `cors` npm package added |
| ✅ CORS middleware configured | PASS | Allows frontend origin with credentials |
| ✅ Request logging added | PASS | Logs all incoming requests with timestamp |
| ✅ Error handler added | PASS | Global error middleware returns JSON |
| ✅ Vercel configuration exists | PASS | `backend/vercel.json` created |
| ⚠️ Production environment variables set | VERIFY | Configure in Vercel dashboard |

## 🔧 Environment Variables Checklist

### Frontend Environment Variables (Set in Vercel)

**Critical Variables:**
- [ ] `VITE_API_BASE_URL` = `https://wathaci-connect-platform2.vercel.app`
- [ ] `VITE_SUPABASE_URL` = Your Supabase project URL
- [ ] `VITE_SUPABASE_ANON_KEY` = Your Supabase anonymous key
- [ ] `VITE_LENCO_PUBLIC_KEY` = Your Lenco public key

**Recommended Variables:**
- [ ] `VITE_APP_ENV` = `production`
- [ ] `VITE_APP_NAME` = `WATHACI CONNECT`
- [ ] `VITE_PAYMENT_CURRENCY` = `ZMW`
- [ ] `VITE_PAYMENT_COUNTRY` = `ZM`

### Backend Environment Variables (Set in Vercel)

**Critical Variables:**
- [ ] `CORS_ALLOWED_ORIGINS` = `https://www.wathaci.com,https://wathaci-connect-platform.vercel.app,https://wathaci-connect-platform-amukenas-projects.vercel.app`
- [ ] `SUPABASE_URL` = Your Supabase project URL
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = Your Supabase service role key (SECRET!)
- [ ] `LENCO_SECRET_KEY` = Your Lenco secret key (SECRET!)
- [ ] `LENCO_WEBHOOK_SECRET` = Your Lenco webhook secret (SECRET!)

**Recommended Variables:**
- [ ] `NODE_ENV` = `production`
- [ ] `LENCO_WEBHOOK_URL` = Your webhook endpoint URL
- [ ] `SUPPORT_EMAIL` = `support@wathaci.com`

**Optional Variables (if features enabled):**
- [ ] `TWILIO_ACCOUNT_SID` = For SMS OTP
- [ ] `TWILIO_AUTH_TOKEN` = For SMS OTP
- [ ] `SMTP_HOST` = For email functionality
- [ ] `SMTP_USERNAME` = For email functionality
- [ ] `SMTP_PASSWORD` = For email functionality

## 🧪 Testing Checklist

### Test Backend Independently

- [ ] Health check passes: `curl https://wathaci-connect-platform2.vercel.app/health`
- [ ] API info passes: `curl https://wathaci-connect-platform2.vercel.app/api`
- [ ] Returns HTTP 200 status code
- [ ] Returns valid JSON response
- [ ] No 500 Internal Server Error
- [ ] No missing environment variable errors in logs

### Test Frontend Independently

- [ ] Frontend URL loads: `https://www.wathaci.com`
- [ ] No blank white page
- [ ] No fatal console errors
- [ ] React app renders correctly
- [ ] Navigation works
- [ ] No "localhost" references in Network tab

### Test Frontend-Backend Integration

- [ ] Open browser DevTools → Console
- [ ] Open browser DevTools → Network tab
- [ ] Trigger an API call (e.g., load a page that fetches data)
- [ ] Verify request goes to correct backend URL
- [ ] Verify no CORS errors in console
- [ ] Verify API returns 2xx response (not 404, 500, or CORS error)
- [ ] Verify response contains expected data

### Test User Flows

- [ ] **Public Pages**
  - [ ] Home page loads
  - [ ] About page loads
  - [ ] Resources page loads

- [ ] **Authentication** (if enabled)
  - [ ] Sign up page loads
  - [ ] Sign in page loads
  - [ ] Password reset page loads
  - [ ] Sign up flow completes
  - [ ] Sign in flow completes

- [ ] **Authenticated Features** (if applicable)
  - [ ] Dashboard loads after sign in
  - [ ] Profile page loads
  - [ ] User can update profile
  - [ ] User can log out

## 🚀 Deployment Steps

### Step 1: Deploy Backend to Vercel

1. Go to Vercel Dashboard
2. Import `backend/` directory as new project
3. Set project name: `wathaci-connect-backend` (or similar)
4. Set environment variables (see Backend checklist above)
5. Deploy
6. Copy deployment URL: `https://wathaci-connect-platform2.vercel.app`

### Step 2: Configure Frontend Environment

1. Go to Vercel Dashboard → Frontend Project
2. Navigate to Settings → Environment Variables
3. Set `VITE_API_BASE_URL` to backend deployment URL from Step 1
4. Set all other required `VITE_*` environment variables
5. Save changes

### Step 3: Deploy Frontend to Vercel

1. Trigger new deployment (Vercel auto-deploys on git push)
2. Or manually redeploy from Vercel Dashboard → Deployments → Redeploy
3. Wait for deployment to complete
4. Frontend URL: `https://www.wathaci.com`

### Step 4: Verify Integration

1. Open frontend URL in browser
2. Open DevTools → Console
3. Open DevTools → Network
4. Navigate through the app
5. Verify:
   - ✅ No blank pages
   - ✅ No CORS errors
   - ✅ API calls go to backend URL
   - ✅ API calls return 2xx responses
   - ✅ App functions correctly

## 📋 Post-Deployment Verification

### Final Checks

- [ ] Frontend loads without blank screen
- [ ] Backend `/health` returns HTTP 200
- [ ] All API calls from frontend go to backend Vercel URL (not localhost)
- [ ] No CORS errors in browser console
- [ ] No "localhost" URLs in production builds
- [ ] Environment variables present and non-placeholder in Vercel dashboard
- [ ] Main user flows (auth, navigation) work in production

### Security Checks

- [ ] No secrets logged in browser console
- [ ] No secrets in frontend build files
- [ ] Backend returns JSON errors (not stack traces) in production
- [ ] CORS only allows whitelisted origins
- [ ] Rate limiting is active on backend

## 🎉 Success Criteria

**The integration is complete when:**

✅ Frontend (React on Vercel) loads at: `https://www.wathaci.com`

✅ Backend (Express on Vercel) responds at: `https://wathaci-connect-platform2.vercel.app`

✅ Frontend successfully communicates with backend

✅ Correct environment variables configured

✅ CORS properly configured

✅ Main user flows tested and working

---

## 📞 Support

If you encounter issues:

1. **Check Backend Logs**: Vercel Dashboard → Backend Project → Logs
2. **Check Frontend Console**: Browser DevTools → Console
3. **Review Network Tab**: Browser DevTools → Network → Look for failed requests
4. **Verify Environment Variables**: Vercel Dashboard → Project → Settings → Environment Variables

For help: support@wathaci.com

---

**Last Updated**: 2025-11-22  
**Version**: 1.0  
**Status**: ✅ Ready for Production Deployment
