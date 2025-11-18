# Frontend-Backend Integration Guide

## Overview

This document describes the integration between the WATHACI CONNECT frontend (React/Vite) and backend (Express.js), including API endpoints, configuration, monitoring, and troubleshooting.

## Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Port**: 8080 (development)
- **API Client**: Native Fetch API with centralized configuration

### Backend
- **Framework**: Express.js
- **Port**: 3000 (default, configurable via PORT env var)
- **Runtime**: Node.js

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

## API Configuration

### Environment Variables

**Frontend (.env.local)**
```env
VITE_API_BASE_URL="http://localhost:3000"  # Development
# VITE_API_BASE_URL="https://api.wathaci.com"  # Production
```

**Backend (backend/.env)**
```env
PORT=3000
CORS_ALLOWED_ORIGINS="*"  # Or specific origins: "http://localhost:8080,https://wathaci.com"
```

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

## API Endpoints

### Health & Status

#### GET /health
Returns server health status and uptime.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-18T22:00:00.000Z",
  "uptime": 3600.5,
  "environment": "development"
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
    "otp": "POST /api/auth/otp/send, POST /api/auth/otp/verify"
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
    "registeredAt": "2025-11-18T22:00:00.000Z"
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
  "expiresAt": "2025-11-18T22:10:00.000Z"
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
  "timestamp": "2025-11-18T22:00:00.000Z",
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
      "timestamp": "2025-11-18T22:00:00.000Z",
      "context": { ... },
      "receivedAt": "2025-11-18T22:00:01.000Z"
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

## CORS Configuration

The backend supports CORS to allow frontend communication from different origins.

### Configuration

**Environment Variable:**
```env
CORS_ALLOWED_ORIGINS="http://localhost:8080,https://wathaci.com"
```

Or allow all origins (development only):
```env
CORS_ALLOWED_ORIGINS="*"
```

### CORS Headers Set
- `Access-Control-Allow-Origin`: Matches request origin or `*`
- `Access-Control-Allow-Methods`: GET, POST, PUT, DELETE, OPTIONS
- `Access-Control-Allow-Headers`: Content-Type, Authorization

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

### Manual Testing

1. **Health Check:**
   ```bash
   curl http://localhost:3000/health
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

## Production Deployment

### Frontend Configuration

1. Update `VITE_API_BASE_URL` to production API URL:
   ```env
   VITE_API_BASE_URL="https://api.wathaci.com"
   ```

2. Validate configuration:
   ```bash
   npm run config:validate
   ```

3. Build:
   ```bash
   npm run build
   ```

### Backend Configuration

1. Set production environment variables
2. Configure `CORS_ALLOWED_ORIGINS` with actual frontend domains
3. Deploy backend to production server

### Verification

After deployment, verify integration:

1. Check health endpoint: `https://api.wathaci.com/health`
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

### CORS Errors

**Symptom:** "CORS policy" errors in browser console
**Solutions:**
1. Check `CORS_ALLOWED_ORIGINS` includes frontend origin
2. Verify backend CORS middleware is configured
3. Check browser network tab for preflight (OPTIONS) requests

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

## Security Considerations

1. **Environment Variables**: Never commit `.env` files with secrets
2. **CORS**: Use specific origins in production, not `*`
3. **Rate Limiting**: Backend has rate limiting enabled (100 req/15min)
4. **Input Validation**: All inputs are validated and sanitized
5. **HTTPS**: Use HTTPS in production for all API communication

## Monitoring

### Health Checks

Set up automated health checks:
```bash
# Cron job example
*/5 * * * * curl -f https://api.wathaci.com/health || alert-team
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
2. Review backend logs
3. Verify environment configuration
4. Check integration tests: `npm test`
5. Review this documentation

## Version History

- **v1.0.0** (2025-11-18): Initial integration with health checks, monitoring, and comprehensive testing
