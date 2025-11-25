# 🚀 Quick Start: Vercel Deployment

## Overview
This guide provides the fastest path to deploy the WATHACI CONNECT platform to Vercel.

**Deployment URLs:**
- **Frontend**: https://www.wathaci.com
- **Backend**: https://wathaci-connect-platform2.vercel.app

---

## ⚡ 5-Minute Setup

### Step 1: Deploy Backend (2 minutes)

1. Go to https://vercel.com/dashboard
2. Click "Import Project"
3. Select the `backend/` directory
4. Set environment variables (minimum required):
   ```
   CORS_ALLOWED_ORIGINS=https://www.wathaci.com,https://wathaci-connect-platform.vercel.app,https://wathaci-connect-platform-amukenas-projects.vercel.app
   SUPABASE_URL=https://nrjcbdrzaxqvomeogptf.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   NODE_ENV=production
   ```
5. Click "Deploy"
6. ✅ Verify: Visit `https://your-backend.vercel.app/health` (should return JSON)

### Step 2: Configure Frontend (1 minute)

1. Go to Vercel Dashboard → Your Frontend Project
2. Navigate to Settings → Environment Variables
3. Add:
   ```
   VITE_API_BASE_URL=https://wathaci-connect-platform2.vercel.app
   VITE_SUPABASE_URL=https://nrjcbdrzaxqvomeogptf.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   ```
4. Save and redeploy

### Step 3: Test (2 minutes)

1. Open frontend URL in browser
2. Open DevTools (F12) → Console
3. Check for errors ❌
4. Open Network tab
5. Trigger an action (navigate pages)
6. Verify API calls go to backend URL ✅
7. Verify no CORS errors ✅

---

## 📋 Complete Checklist

- [ ] Backend deployed to Vercel
- [ ] Backend `/health` returns HTTP 200
- [ ] Frontend environment variables set
- [ ] Frontend redeployed after env var changes
- [ ] Frontend loads without blank page
- [ ] No console errors
- [ ] API calls go to backend Vercel URL
- [ ] No CORS errors

---

## 🆘 Troubleshooting

### Issue: CORS Error
**Fix:** Add frontend URL to `CORS_ALLOWED_ORIGINS` in backend environment variables

### Issue: API 404 Error
**Fix:** Verify backend is deployed and `/health` endpoint works

### Issue: Blank Frontend Page
**Fix:** Check console for errors, verify `VITE_API_BASE_URL` is set

---

## 📚 Full Documentation

- **Integration Guide**: [FRONTEND_BACKEND_INTEGRATION_COMPLETE.md](./FRONTEND_BACKEND_INTEGRATION_COMPLETE.md)
- **Deployment Checklist**: [VERCEL_DEPLOYMENT_CHECKLIST.md](./VERCEL_DEPLOYMENT_CHECKLIST.md)
- **Complete Report**: [INTEGRATION_COMPLETE_REPORT.md](./INTEGRATION_COMPLETE_REPORT.md)

---

## ✅ Success Criteria

Your deployment is successful when:

1. ✅ Frontend loads at: `https://www.wathaci.com`
2. ✅ Backend health check passes at: `https://wathaci-connect-platform2.vercel.app/health`
3. ✅ No CORS errors in browser console
4. ✅ API calls visible in Network tab going to backend URL
5. ✅ Main user flows work (navigation, auth, etc.)

---

**Need Help?** Email: support@wathaci.com

**Status**: ✅ Code Complete - Ready for Deployment
