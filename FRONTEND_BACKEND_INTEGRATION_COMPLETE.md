# Frontend-Backend Integration Guide

## Overview

This guide documents the integration between the React frontend and Express backend, both deployed on Vercel.

## Deployment URLs

- **Frontend (React)**: https://wathaci-connect-platform-git-v3-amukenas-projects.vercel.app
- **Backend (Express API)**: https://wathaci-connect-platform2-bayxdeseg-amukenas-projects.vercel.app

## Architecture

### Frontend
- **Framework**: React 18 with Vite
- **Deployment**: Vercel (Static Site)
- **API Configuration**: Centralized via `src/config/api.ts`
- **API Client**: Centralized utilities in `src/lib/api/client.ts`

### Backend
- **Framework**: Express.js (Node.js)
- **Deployment**: Vercel (Serverless Functions)
- **CORS**: Configured with `cors` package
- **Health Check**: Available at `/health` and `/api/health`

## Environment Variables

### Frontend Environment Variables

Set these in Vercel Dashboard → Frontend Project → Settings → Environment Variables:

| Variable | Required | Example Value | Description |
|----------|----------|---------------|-------------|
| `VITE_API_BASE_URL` | ✅ Yes | `https://wathaci-connect-platform2-bayxdeseg-amukenas-projects.vercel.app` | Backend API base URL |
| `VITE_SUPABASE_URL` | ✅ Yes | `https://your-project.supabase.co` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ Yes | `eyJhbGci...` | Supabase anonymous key |
| `VITE_SUPABASE_KEY` | ✅ Yes | `eyJhbGci...` | Supabase anonymous key (alias) |
| `VITE_LENCO_PUBLIC_KEY` | ✅ Yes | `pub-xxxxx` | Lenco payment gateway public key |
| `VITE_LENCO_API_URL` | ✅ Yes | `https://api.lenco.co/access/v2` | Lenco API endpoint |
| `VITE_APP_ENV` | ⚠️ Recommended | `production` | Application environment |
| `VITE_APP_NAME` | ⚠️ Recommended | `WATHACI CONNECT` | Application name |

### Backend Environment Variables

Set these in Vercel Dashboard → Backend Project → Settings → Environment Variables:

| Variable | Required | Example Value | Description |
|----------|----------|---------------|-------------|
| `CORS_ALLOWED_ORIGINS` | ✅ Yes | `https://wathaci-connect-platform-git-v3-amukenas-projects.vercel.app` | Comma-separated list of allowed frontend origins |
| `SUPABASE_URL` | ✅ Yes | `https://your-project.supabase.co` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | `eyJhbGci...` | Supabase service role key (SECRET!) |
| `LENCO_SECRET_KEY` | ✅ Yes | `sk_live_xxxxx` | Lenco payment gateway secret key (SECRET!) |
| `LENCO_WEBHOOK_SECRET` | ✅ Yes | `xxxxx` | Lenco webhook signature secret (SECRET!) |
| `LENCO_WEBHOOK_URL` | ✅ Yes | `https://your-project.supabase.co/functions/v1/lenco-payments-validator` | Webhook endpoint URL |
| `NODE_ENV` | ⚠️ Recommended | `production` | Node environment |
| `TWILIO_ACCOUNT_SID` | ⚠️ Optional | `ACxxxxx` | Twilio account SID (for OTP) |
| `TWILIO_AUTH_TOKEN` | ⚠️ Optional | `xxxxx` | Twilio auth token (for OTP) |
| `SMTP_HOST` | ⚠️ Optional | `mail.privateemail.com` | SMTP server host |
| `SMTP_USERNAME` | ⚠️ Optional | `support@wathaci.com` | SMTP username |
| `SMTP_PASSWORD` | ⚠️ Optional | `xxxxx` | SMTP password (SECRET!) |

## API Integration

### Using the API Client

The frontend provides centralized API utilities in `src/lib/api/client.ts`:

```typescript
import { apiFetch, apiGet, apiPost } from '@/lib/api/client';

// GET request
const health = await apiGet('/health');

// POST request
const user = await apiPost('/users', {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com'
});

// Generic fetch with options
const data = await apiFetch('/api/logs', {
  method: 'POST',
  body: JSON.stringify({ message: 'Test log' })
});
```

### Available API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check (status, uptime, system info) |
| `/api/health` | GET | Health check (alternative path) |
| `/api` | GET | API information and available endpoints |
| `/users` | POST | Register new user |
| `/api/users` | POST | Register new user (alternative path) |
| `/api/logs` | GET, POST | Log management |
| `/api/payment/readiness` | GET | Check payment gateway configuration |
| `/api/payment/webhook` | POST | Payment webhook handler |
| `/api/auth/otp/send` | POST | Send OTP verification code |
| `/api/auth/otp/verify` | POST | Verify OTP code |
| `/api/email/status` | GET | Email service status |
| `/api/email/send` | POST | Send email |

## CORS Configuration

The backend is configured to accept requests from the following origins:

1. **Production Frontend**: `https://wathaci-connect-platform-git-v3-amukenas-projects.vercel.app`
2. **Local Development**: `http://localhost:3000`, `http://localhost:5173`, `http://localhost:8080`
3. **Additional Origins**: Any origins specified in `CORS_ALLOWED_ORIGINS` environment variable

### CORS Settings

- **Credentials**: Enabled (allows cookies/sessions)
- **Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Headers**: Content-Type, Authorization

## Security Features

### Backend Security

1. **Helmet.js**: Sets security-related HTTP headers
2. **Rate Limiting**: 100 requests per 15 minutes per IP
3. **CORS Protection**: Whitelist-based origin validation
4. **Error Handling**: Sanitized error messages in production
5. **Request Logging**: Tracks all incoming requests

### Frontend Security

1. **Environment Variables**: Sensitive data managed via Vite environment variables
2. **Build-time Validation**: Production mode requires `VITE_API_BASE_URL`
3. **Type Safety**: TypeScript for compile-time error detection

## Testing

### Health Check Test

```bash
# Test backend health endpoint
curl https://wathaci-connect-platform2-bayxdeseg-amukenas-projects.vercel.app/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-11-22T08:00:00.000Z",
  "uptime": 123.456,
  "environment": "production",
  "supabase": {
    "configured": true
  },
  "system": {
    "uptime": 987654,
    "memory": {
      "free": 1234567890,
      "total": 9876543210
    }
  }
}
```

### CORS Test

```bash
# Test CORS headers
curl -H "Origin: https://wathaci-connect-platform-git-v3-amukenas-projects.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://wathaci-connect-platform2-bayxdeseg-amukenas-projects.vercel.app/api/users

# Should return 200 with CORS headers
```

## Deployment Checklist

### Before Deploying Frontend

- [ ] Verify `VITE_API_BASE_URL` points to backend URL
- [ ] Verify all `VITE_*` environment variables are set in Vercel
- [ ] Run `npm run typecheck` to verify TypeScript
- [ ] Run `npm run build` to verify build succeeds
- [ ] Check for console errors in browser DevTools

### Before Deploying Backend

- [ ] Verify `CORS_ALLOWED_ORIGINS` includes frontend URL
- [ ] Verify all required environment variables are set in Vercel
- [ ] Test `/health` endpoint returns 200
- [ ] Test `/api` endpoint returns API information
- [ ] Verify database connection (if using Supabase)

### After Deployment

- [ ] Open frontend URL in browser
- [ ] Check browser console for errors
- [ ] Test API calls in Network tab
- [ ] Verify CORS headers are present
- [ ] Test user flows (sign up, sign in, etc.)

## Troubleshooting

### CORS Errors

**Symptom**: Browser console shows "CORS policy: No 'Access-Control-Allow-Origin' header"

**Solutions**:
1. Verify frontend URL is in `CORS_ALLOWED_ORIGINS` backend environment variable
2. Check backend logs for CORS middleware errors
3. Verify request Origin header matches allowed origins exactly

### API Connection Failed

**Symptom**: "Failed to fetch" or "Network request failed"

**Solutions**:
1. Verify `VITE_API_BASE_URL` is set correctly in frontend
2. Test backend health endpoint directly: `/health`
3. Check backend deployment status in Vercel dashboard
4. Verify no typos in environment variable names

### Environment Variables Not Working

**Symptom**: App uses default/localhost values instead of production values

**Solutions**:
1. Verify variables are set in correct Vercel project (frontend vs backend)
2. Redeploy after setting environment variables
3. Check variable names have correct prefix (`VITE_` for frontend)
4. View build logs to confirm variables are loaded

## Support

For additional support or questions:
- Email: support@wathaci.com
- Review backend logs: Vercel Dashboard → Backend Project → Logs
- Review frontend logs: Browser DevTools → Console

## Version History

- **v1.0** (2025-11-22): Initial frontend-backend integration
  - Added CORS configuration
  - Created API client utilities
  - Configured production URLs
  - Added health check endpoint
