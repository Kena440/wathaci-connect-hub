# Quick Reference - Production Readiness

> **Status:** ✅ PRODUCTION-READY
> **Last Updated:** January 2025

---

## 🚀 Quick Start

### Check if Backend is Healthy
```bash
curl https://wathaci-connect-platform2-bayxdeseg-amukenas-projects.vercel.app/health
```

### View Backend Logs (Vercel)
1. Go to Vercel Dashboard
2. Select deployment
3. Click "Logs" tab

### Test Error Handling
```bash
# Should return: {"success":false,"error":"Route not found: POST /test"}
curl -X POST https://your-api.vercel.app/test
```

---

## 📚 Documentation Quick Links

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [PRODUCTION_ARCHITECTURE.md](./PRODUCTION_ARCHITECTURE.md) | Complete technical documentation | Understanding how things work, debugging |
| [REGRESSION_TEST_CHECKLIST.md](./REGRESSION_TEST_CHECKLIST.md) | 35 manual test cases | Before releases, regression testing |
| [SECURITY_SUMMARY.md](./SECURITY_SUMMARY.md) | Security measures & vulnerabilities | Security audits, compliance |
| [PRODUCTION_READINESS_FINAL_REPORT.md](./PRODUCTION_READINESS_FINAL_REPORT.md) | Implementation summary | Overview, executive summary |

---

## 🎯 Key Conventions

### API Response Format
```javascript
// Success
{ success: true, data: {...} }

// Error
{ success: false, error: "User-friendly message" }
```

### HTTP Status Codes
- `200` OK - Successful GET
- `201` Created - Successful POST (resource created)
- `400` Bad Request - Validation error
- `401` Unauthorized - Not authenticated
- `403` Forbidden - Not authorized
- `404` Not Found - Resource/route not found
- `409` Conflict - Resource already exists
- `422` Unprocessable Entity - Semantic errors
- `429` Too Many Requests - Rate limit exceeded
- `500` Internal Server Error - Unexpected error
- `503` Service Unavailable - Service down

---

## 🛠️ Common Tasks

### Adding a New Backend Route

```javascript
const { asyncHandler } = require('../middleware/errorHandler');
const validate = require('../middleware/validate');

// Define validation schema
const mySchema = Joi.object({
  field: Joi.string().required(),
});

// Create route with validation and error handling
router.post('/my-route', validate(mySchema), asyncHandler(async (req, res) => {
  const result = await doSomething(req.body);
  res.json({ success: true, result });
}));
```

### Adding Rate Limiting to a Route

```javascript
// In backend/index.js
const { authLimiter } = require('./middleware/rateLimiter'); // If extracted

app.use('/api/my-auth-route', authLimiter, myRoutes);
```

### Frontend API Call

```typescript
import { apiFetch } from '@/lib/api/client';

try {
  const data = await apiFetch('/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
  // Handle success
} catch (error) {
  // error.message contains user-friendly message
  setError(error.message);
}
```

### Handling Errors in React Components

```typescript
try {
  await doSomething();
} catch (error) {
  // Show error to user
  toast({
    variant: "destructive",
    title: "Error",
    description: error.message,
  });
}
```

---

## 🔍 Debugging Guide

### Backend Issues

1. **Check health endpoint first**
   ```bash
   curl https://your-api.vercel.app/health | jq
   ```

2. **Check logs in Vercel dashboard**
   - Look for structured JSON logs
   - Search for `"level":"error"`

3. **Test specific endpoint**
   ```bash
   curl -X POST https://your-api.vercel.app/endpoint \
     -H "Content-Type: application/json" \
     -d '{"test":"data"}'
   ```

### Frontend Issues

1. **Open browser DevTools (F12)**
   - Console tab: Check for errors
   - Network tab: Check API responses

2. **Check Error Boundary**
   - If you see "Something went wrong" page, check console
   - Error is logged to `/api/logs` endpoint

3. **Check API error format**
   - Inspect Network tab response bodies
   - Should be: `{ success: false, error: "message" }`

---

## 🔒 Security Checklist

- [x] Helmet configured (HTTP security headers)
- [x] Rate limiting enabled (100 global, 10 auth)
- [x] CORS restricted to configured origins
- [x] Input validation with Joi
- [x] HTML sanitization enabled
- [x] Error message sanitization (no sensitive data)
- [x] HTTPS enforced via Vercel
- [x] Strong password requirements

---

## 📊 Monitoring

### What to Monitor

1. **Health Endpoint**
   - Monitor every 1-5 minutes
   - Alert if returns non-200 or `"status":"error"`

2. **Error Rate**
   - Track 5xx responses
   - Alert if >5% of requests fail

3. **Response Time**
   - Monitor average request duration
   - Alert if >1 second

4. **Service Status**
   - Check health endpoint for service configuration
   - Alert if any service shows `"status":"not_configured"`

### Recommended Monitoring Tools

- **Vercel Analytics** (built-in)
- **Datadog** (log aggregation + APM)
- **CloudWatch** (AWS logs)
- **UptimeRobot** (simple uptime checks)

---

## 🚨 Common Issues & Solutions

### Issue: "Too many requests" error

**Cause:** Rate limit exceeded
**Solution:** Wait 15 minutes or contact admin to adjust limits

### Issue: CORS error in browser

**Cause:** Frontend origin not in `CORS_ALLOWED_ORIGINS`
**Solution:** Add frontend URL to `CORS_ALLOWED_ORIGINS` env var

### Issue: 500 error with no details

**Cause:** Error sanitization in production
**Solution:** Check backend logs in Vercel dashboard

### Issue: Session lost on page refresh

**Cause:** Supabase session not persisted
**Solution:** Check Supabase configuration and storage

---

## 🔧 Environment Variables

### Backend (Required)

```bash
# Database
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...

# Security
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://www.your-domain.com
NODE_ENV=production

# Email (Optional)
SMTP_HOST=mail.example.com
SMTP_PORT=465
SMTP_USER=...
SMTP_PASSWORD=...

# SMS (Optional)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...

# Payment (Optional)
LENCO_PUBLIC_KEY=pk_live_...
LENCO_SECRET_KEY=sk_live_...
LENCO_WEBHOOK_SECRET=...
```

### Frontend (Required)

```bash
# API
VITE_API_BASE_URL=https://your-backend.vercel.app

# Supabase
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...

# Payment (Optional)
VITE_LENCO_PUBLIC_KEY=pk_live_...
```

---

## 📞 Support

**Questions?**
- Check documentation files first
- Review code examples in this guide
- Contact: support@wathaci.com

**Found a bug?**
- Check `/health` endpoint
- Review error logs
- Create detailed bug report with:
  - Steps to reproduce
  - Expected vs actual behavior
  - Screenshots/logs
  - Browser/environment info

---

## ✅ Pre-Deployment Checklist

Before deploying to production:

- [ ] All environment variables set correctly
- [ ] Health endpoint returns 200
- [ ] CORS configured for production domains
- [ ] Rate limits appropriate for load
- [ ] Error logging working
- [ ] Manual regression tests passed
- [ ] No sensitive data in logs/errors
- [ ] HTTPS enforced
- [ ] Monitoring configured

---

## 📈 Success Metrics

**Platform is healthy when:**
- Health endpoint returns `"status":"ok"`
- Error rate < 5%
- Average response time < 500ms
- All services show `"status":"ok"`
- No CORS errors in production
- Rate limiting working as expected

---

**Last Updated:** January 2025
**Maintainer:** Development Team
**Status:** ✅ Production-Ready
