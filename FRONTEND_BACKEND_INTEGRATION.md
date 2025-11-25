# Frontend-Backend Integration Guide

## Overview

This guide documents the integration between the WATHACI CONNECT frontend (React/Vite) and backend (Express.js), covering both local development and production deployment on Vercel.

## Deployment URLs

### Production
- **Frontend**: https://www.wathaci.com
- **Backend API**: https://wathaci-connect-platform2.vercel.app

### Development
- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3000

## Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Port**: 8080 (development)
- **Deployment**: Vercel (Static Site)
- **API Configuration**: Centralized via `src/config/api.ts`
- **API Client**: Centralized utilities in `src/lib/api/client.ts`

### Backend
- **Framework**: Express.js (Node.js)
- **Port**: 3000 (default, configurable via PORT env var)
- **Deployment**: Vercel (Serverless Functions)
- **CORS**: Configured with `cors` package
- **Health Check**: Available at `/health` and `/api/health`

### Communication Flow
```
Frontend (React) → Backend API (Express) → Services (Supabase, Twilio, Lenco)
                ↓
         CORS Middleware
                ↓
         Route Handlers
                ↓
         Business Logic
```

## Environment Variables

### Frontend Environment Variables

#### Local Development (`.env.local`)
```env
VITE_API_BASE_URL="http://localhost:3000"
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGci..."
VITE_SUPABASE_KEY="eyJhbGci..."
VITE_LENCO_PUBLIC_KEY="pub-xxxxx"
VITE_LENCO_API_URL="https://api.lenco.co/access/v2"
```

#### Production (Vercel Environment Variables)

Set these in Vercel Dashboard → Frontend Project → Settings → Environment Variables:

| Variable | Required | Example Value | Description |
|----------|----------|---------------|-------------|
| `VITE_API_BASE_URL` | ✅ Yes | `https://wathaci-connect-platform2.vercel.app` | Backend API base URL |
| `VITE_SUPABASE_URL` | ✅ Yes | `https://your-project.supabase.co` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ Yes | `eyJhbGci...` | Supabase anonymous key |
| `VITE_SUPABASE_KEY` | ✅ Yes | `eyJhbGci...` | Supabase anonymous key (alias) |
| `VITE_LENCO_PUBLIC_KEY` | ✅ Yes | `pub-xxxxx` | Lenco payment gateway public key |
| `VITE_LENCO_API_URL` | ✅ Yes | `https://api.lenco.co/access/v2` | Lenco API endpoint |
| `VITE_APP_ENV` | ⚠️ Recommended | `production` | Application environment |
| `VITE_APP_NAME` | ⚠️ Recommended | `WATHACI CONNECT` | Application name |

### Backend Environment Variables

#### Local Development (`backend/.env`)
```env
PORT=3000
CORS_ALLOWED_ORIGINS="*"  # Or specific origins: "http://localhost:8080,https://wathaci.com"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGci..."
LENCO_SECRET_KEY="sk_live_xxxxx"
LENCO_WEBHOOK_SECRET="xxxxx"
LENCO_WEBHOOK_URL="https://your-project.supabase.co/functions/v1/lenco-payments-validator"
NODE_ENV="development"
```

#### Production (Vercel Environment Variables)

Set these in Vercel Dashboard → Backend Project → Settings → Environment Variables:

| Variable | Required | Example Value | Description |
|----------|----------|---------------|-------------|
| `CORS_ALLOWED_ORIGINS` | ✅ Yes | `https://www.wathaci.com` | Comma-separated list of allowed frontend origins |
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

## API Configuration

### Centralized API Configuration

The frontend uses a centralized API configuration module (`src/config/api.ts`) that:

1. Validates `VITE_API_BASE_URL` is set in production
2. Provides helper functions for constructing API URLs
3. Ensures consistent API URL usage across the application

**Usage Example:**
```typescript
import { getApiEndpoint } from '@/config/api';

// Automatically uses VITE_API_BASE_URL
const response = await fetch(getApiEndpoint('/users'), {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(userData)
});
```

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

## API Endpoints

### Health & Status

#### GET /health
#### GET /api/health
Returns server health status and uptime.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-23T18:00:00.000Z",
  "uptime": 3600.5,
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

#### GET /api
Returns API information and available endpoints.

**Response:**
```json
{
  "name": "WATHACI CONNECT API",
  "version": "1.0.0",
  "endpoints": {
    "health": "GET /health",
    "users": "POST /users, POST /api/users",
    "logs": "POST /api/logs, GET /api/logs",
    "payment": "GET /api/payment/readiness, POST /api/payment/webhook",
    "resolve": "POST /resolve/lenco-merchant",
    "otp": "POST /api/auth/otp/send, POST /api/auth/otp/verify",
    "email": "GET /api/email/status, POST /api/email/send"
  }
}
```

### User Management

#### POST /users
#### POST /api/users
Register a new user (both endpoints route to the same handler).

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "accountType": "sme",
  "company": "Acme Corp",
  "mobileNumber": "+260971234567"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "accountType": "sme",
    "company": "Acme Corp",
    "mobileNumber": "+260971234567",
    "registeredAt": "2025-11-23T18:00:00.000Z"
  }
}
```

**Error Response (409 - Duplicate):**
```json
{
  "error": "User already registered"
}
```

### OTP Authentication

#### POST /api/auth/otp/send
Send an OTP code via SMS or WhatsApp.

**Request:**
```json
{
  "phone": "+260971234567",
  "channel": "sms",
  "userId": "uuid-optional"
}
```

**Response (200):**
```json
{
  "ok": true,
  "message": "OTP sent successfully",
  "expiresAt": "2025-11-23T18:10:00.000Z"
}
```

#### POST /api/auth/otp/verify
Verify an OTP code.

**Request:**
```json
{
  "phone": "+260971234567",
  "channel": "sms",
  "code": "123456"
}
```

**Response (200):**
```json
{
  "ok": true,
  "message": "OTP verified successfully",
  "phoneVerified": true
}
```

### Logging

#### POST /api/logs
Submit frontend logs to the backend.

**Request:**
```json
{
  "level": "error",
  "message": "Something went wrong",
  "timestamp": "2025-11-23T18:00:00.000Z",
  "context": {
    "component": "PaymentForm",
    "userId": "uuid"
  }
}
```

**Response (201):**
```json
{
  "status": "received"
}
```

#### GET /api/logs
Retrieve recent logs (last 50 entries).

**Response:**
```json
{
  "logs": [
    {
      "level": "error",
      "message": "Something went wrong",
      "timestamp": "2025-11-23T18:00:00.000Z",
      "context": { "component": "PaymentForm" },
      "receivedAt": "2025-11-23T18:00:01.000Z"
    }
  ]
}
```

### Payment

#### GET /api/payment/readiness
Check payment system configuration status.

**Response (200 - Configured):**
```json
{
  "configured": true,
  "errors": [],
  "warnings": []
}
```

**Response (503 - Not Configured):**
```json
{
  "configured": false,
  "errors": [
    "LENCO_SECRET_KEY is missing",
    "LENCO_WEBHOOK_SECRET is not set"
  ],
  "warnings": []
}
```

#### POST /api/payment/webhook
Receive payment webhooks from Lenco (requires signature verification).

### Merchant Resolution

#### POST /resolve/lenco-merchant
Lookup merchant information via Lenco API.

### Email

#### GET /api/email/status
Check email service configuration status.

#### POST /api/email/send
Send an email via SMTP.

## CORS Configuration

The backend is configured to accept requests from allowed origins.

### Configuration

**Environment Variable:**
```env
# Development - allow all origins
CORS_ALLOWED_ORIGINS="*"

# Production - specific origins
CORS_ALLOWED_ORIGINS="https://www.wathaci.com"

# Multiple origins
CORS_ALLOWED_ORIGINS="http://localhost:8080,https://wathaci.com"
```

### CORS Settings
- **Credentials**: Enabled (allows cookies/sessions)
- **Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Headers**: Content-Type, Authorization

### Preflight Requests
The backend handles OPTIONS requests and returns 204 status for preflight checks.

## Connection Monitoring

### Health Check Utility

Use the `checkApiHealth` function to verify backend connectivity:

```typescript
import { checkApiHealth } from '@/lib/api/health-check';

const health = await checkApiHealth();
if (health.isHealthy) {
  console.log('Backend is healthy');
  console.log('Response time:', health.responseTime, 'ms');
} else {
  console.error('Backend error:', health.error);
}
```

### React Hook

Use the `useApiConnection` hook for automatic monitoring:

```typescript
import { useApiConnection } from '@/hooks/useApiConnection';

function MyComponent() {
  const { isConnected, isChecking, checkConnection } = useApiConnection({
    checkOnMount: true,
    autoRetry: true,
    retryInterval: 30000
  });

  return (
    <div>
      Status: {isConnected ? 'Connected' : 'Disconnected'}
      {!isConnected && (
        <button onClick={checkConnection} disabled={isChecking}>
          Retry Connection
        </button>
      )}
    </div>
  );
}
```

### Connection Banner Component

Add a connection status banner to your app:

```typescript
import { ApiConnectionBanner } from '@/components/ApiConnectionBanner';

function App() {
  return (
    <>
      <ApiConnectionBanner />
      {/* Your app content */}
    </>
  );
}
```

## Error Handling

### Error Boundary

Wrap components with `ApiErrorBoundary` to catch and handle API errors:

```typescript
import { ApiErrorBoundary } from '@/components/ApiErrorBoundary';

function App() {
  return (
    <ApiErrorBoundary
      onError={(error, errorInfo) => {
        // Log to monitoring service
        console.error('Error:', error, errorInfo);
      }}
    >
      <YourComponent />
    </ApiErrorBoundary>
  );
}
```

### Error Handler Hook

Use the `useApiErrorHandler` hook for consistent error handling:

```typescript
import { useApiErrorHandler } from '@/components/ApiErrorBoundary';

function MyComponent() {
  const handleApiError = useApiErrorHandler();

  const fetchData = async () => {
    try {
      const response = await fetch(getApiEndpoint('/users'));
      // ... handle response
    } catch (error) {
      const { message } = handleApiError(error);
      // Display error message to user
    }
  };
}
```

## Local Development

### Starting Both Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm install
npm start
```
Server starts at: http://localhost:3000

**Terminal 2 - Frontend:**
```bash
npm install
npm run dev
```
Server starts at: http://localhost:8080

### Environment Setup

Ensure `.env.local` has the correct API URL:
```env
VITE_API_BASE_URL="http://localhost:3000"
```

## Testing

### Integration Tests

Run the full test suite including integration tests:

```bash
npm test
```

### Backend Tests

```bash
cd backend
npm test
```

### Manual Testing

1. **Health Check:**
   ```bash
   # Local
   curl http://localhost:3000/health
   
   # Production
   curl https://wathaci-connect-platform2.vercel.app/health
   ```

2. **API Info:**
   ```bash
   curl http://localhost:3000/api
   ```

3. **User Registration:**
   ```bash
   curl -X POST http://localhost:3000/users \
     -H "Content-Type: application/json" \
     -d '{
       "firstName": "Test",
       "lastName": "User",
       "email": "test@example.com",
       "accountType": "sme"
     }'
   ```

4. **CORS Test:**
   ```bash
   curl -H "Origin: https://www.wathaci.com" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type" \
        -X OPTIONS \
        https://wathaci-connect-platform2.vercel.app/api/users
   ```

## Production Deployment

### Frontend Configuration

1. Update `VITE_API_BASE_URL` to production API URL in Vercel environment variables
2. Validate configuration:
   ```bash
   npm run config:validate
   ```
3. Build:
   ```bash
   npm run build
   ```

### Backend Configuration

1. Set production environment variables in Vercel dashboard
2. Configure `CORS_ALLOWED_ORIGINS` with actual frontend domains
3. Deploy backend to Vercel

### Deployment Checklist

#### Before Deploying Frontend

- [ ] Verify `VITE_API_BASE_URL` points to backend URL
- [ ] Verify all `VITE_*` environment variables are set in Vercel
- [ ] Run `npm run typecheck` to verify TypeScript
- [ ] Run `npm run build` to verify build succeeds
- [ ] Check for console errors in browser DevTools

#### Before Deploying Backend

- [ ] Verify `CORS_ALLOWED_ORIGINS` includes frontend URL
- [ ] Verify all required environment variables are set in Vercel
- [ ] Test `/health` endpoint returns 200
- [ ] Test `/api` endpoint returns API information
- [ ] Verify database connection (if using Supabase)

#### After Deployment

- [ ] Open frontend URL in browser
- [ ] Check browser console for errors
- [ ] Test API calls in Network tab
- [ ] Verify CORS headers are present
- [ ] Test user flows (sign up, sign in, etc.)

### Verification

After deployment, verify integration:

1. Check health endpoint: `https://wathaci-connect-platform2.vercel.app/health`
2. Test CORS from frontend domain
3. Verify all API endpoints are accessible
4. Monitor error logs

## Troubleshooting

### Connection Refused

**Symptom:** Frontend can't connect to backend

**Solutions:**
1. Verify backend is running: `curl http://localhost:3000/health`
2. Check `VITE_API_BASE_URL` is set correctly
3. Verify no firewall blocking port 3000
4. Check backend deployment status in Vercel dashboard

### CORS Errors

**Symptom:** "CORS policy: No 'Access-Control-Allow-Origin' header" in browser console

**Solutions:**
1. Verify frontend URL is in `CORS_ALLOWED_ORIGINS` backend environment variable
2. Check backend logs for CORS middleware errors
3. Verify request Origin header matches allowed origins exactly
4. Check browser network tab for preflight (OPTIONS) requests

### 404 Errors

**Symptom:** API endpoints return 404

**Solutions:**
1. Verify endpoint path is correct
2. Check API documentation: `GET /api`
3. Ensure backend routes are registered

### Timeout Errors

**Symptom:** Requests timeout

**Solutions:**
1. Check backend logs for errors
2. Verify backend dependencies (Supabase, Twilio) are configured
3. Increase timeout in fetch calls if needed

### Environment Variables Not Working

**Symptom:** App uses default/localhost values instead of production values

**Solutions:**
1. Verify variables are set in correct Vercel project (frontend vs backend)
2. Redeploy after setting environment variables
3. Check variable names have correct prefix (`VITE_` for frontend)
4. View build logs to confirm variables are loaded

## Security Considerations

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

### General Security

1. **Environment Variables**: Never commit `.env` files with secrets
2. **CORS**: Use specific origins in production, not `*`
3. **Input Validation**: All inputs are validated and sanitized
4. **HTTPS**: Use HTTPS in production for all API communication

## Monitoring

### Health Checks

Set up automated health checks:
```bash
# Cron job example
*/5 * * * * curl -f https://wathaci-connect-platform2.vercel.app/health || alert-team
```

### Logging

- Frontend logs are sent to backend via `/api/logs`
- Backend logs to console (captured by hosting service)
- Both log levels: error, warn, info, debug

### Metrics to Monitor

1. API response times (health check includes response time)
2. Error rates (4xx, 5xx responses)
3. Connection failures
4. CORS preflight failures
5. Rate limit hits

## Support

For issues or questions about frontend-backend integration:
1. Check health endpoint first: `/health`
2. Review backend logs: Vercel Dashboard → Backend Project → Logs
3. Review frontend logs: Browser DevTools → Console
4. Verify environment configuration
5. Check integration tests: `npm test`
6. Review this documentation
7. Email: support@wathaci.com

## Version History

- **v2.0** (2025-11-23): Unified integration guide
  - Merged local development and production deployment documentation
  - Added comprehensive environment variable tables
  - Expanded troubleshooting section
  - Added deployment checklists
  
- **v1.0** (2025-11-18 - 2025-11-22): Initial integration guides
  - Created separate development and production guides
  - Added CORS configuration
  - Created API client utilities
  - Configured production URLs
  - Added health check endpoint
