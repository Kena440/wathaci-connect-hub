# Production Readiness Architecture

## Overview

This document describes the production-ready error handling, logging, and monitoring architecture implemented for the WATHACI CONNECT platform.

## 1. Error Handling Architecture

### 1.1 Backend Error Handling

The backend uses a centralized error handling system with the following components:

#### Global Error Handler (`backend/middleware/errorHandler.js`)

**Features:**
- Catches all unhandled errors in the application
- Returns standardized JSON error responses: `{ success: false, error: "message" }`
- Implements structured logging with request context
- Sanitizes error messages to prevent sensitive data leaks
- Uses appropriate HTTP status codes (400, 401, 403, 404, 409, 422, 500, 503)

**Usage Example:**
```javascript
// Automatically catches errors from async handlers
router.post('/users', asyncHandler(async (req, res) => {
  const user = await createUser(req.body);
  res.json({ success: true, user });
}));
```

#### Async Handler Wrapper

Wraps async route handlers to automatically catch errors and pass them to the error handler:

```javascript
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/data', asyncHandler(async (req, res) => {
  // Any error thrown here will be caught and handled
  const data = await fetchData();
  res.json({ success: true, data });
}));
```

#### 404 Handler

Catches requests to undefined routes and returns a proper 404 error:

```javascript
app.use(notFoundHandler);
```

### 1.2 Frontend Error Handling

The frontend uses multiple layers of error handling:

#### Root Error Boundary (`src/components/ErrorBoundary.tsx`)

**Features:**
- Catches React component errors at the root level
- Prevents white screen of death
- Shows user-friendly error message with reload option
- Logs errors to backend `/api/logs` endpoint
- Includes diagnostics (route, user agent, auth state)
- Shows detailed error stack in development mode

**What it catches:**
- Component rendering errors
- Lifecycle method errors
- Constructor errors in class components

**What it doesn't catch:**
- Event handler errors (must be handled separately)
- Async errors (must use try/catch)
- Errors outside React (window.onerror handles these)

#### Centralized API Client (`src/lib/api/client.ts`)

**Features:**
- Standardized error extraction from backend responses
- Proper handling of `{ success: false, error: "message" }` format
- Attaches status code to errors for better handling
- Throws errors that can be caught with try/catch

**Usage Example:**
```typescript
import { apiFetch } from '@/lib/api/client';

try {
  const data = await apiFetch('/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
  // Handle success
} catch (error) {
  // Error message from backend is in error.message
  setErrorMessage(error.message);
}
```

#### Global Error Handlers (`src/main.tsx`)

Registers window-level error handlers for uncaught errors:
- `window.addEventListener('error')` - Catches synchronous errors
- `window.addEventListener('unhandledrejection')` - Catches unhandled promise rejections

## 2. Logging Architecture

### 2.1 Backend Logging

#### Request Logging (`backend/middleware/requestLogger.js`)

**Features:**
- Logs every HTTP request with timing information
- Structured JSON format in production
- Color-coded human-readable format in development
- Includes: method, path, status code, duration, IP, user agent
- Warns about slow requests (>1 second)

**Production Output:**
```json
{
  "timestamp": "2025-01-15T10:30:45.123Z",
  "level": "info",
  "type": "http_request",
  "method": "POST",
  "path": "/users",
  "url": "/users",
  "statusCode": 201,
  "duration": 145,
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

**Development Output:**
```
[2025-01-15T10:30:45.123Z] POST /users 201 - 145ms
```

#### Error Logging

All errors are logged as structured JSON:

```json
{
  "timestamp": "2025-01-15T10:30:45.123Z",
  "level": "error",
  "message": "User validation failed",
  "statusCode": 400,
  "method": "POST",
  "path": "/users",
  "url": "/users",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "errorType": "ValidationError"
}
```

#### Sensitive Data Protection

The logging system automatically redacts:
- Database connection strings
- Passwords, tokens, secrets, API keys
- File system paths
- Any value matching patterns like `password=`, `token=`, `secret=`

### 2.2 Frontend Logging

- Error Boundary logs to `/api/logs` endpoint
- Console logging in development mode
- Production errors are minimal and user-friendly

## 3. Monitoring & Health Checks

### 3.1 Health Endpoint (`/health`, `/api/health`)

**Returns:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:45.123Z",
  "uptime": 3600,
  "uptimeHuman": "1h 0m 0s",
  "environment": "production",
  "version": "1.0.0",
  "services": {
    "supabase": {
      "configured": true,
      "status": "ok"
    },
    "email": {
      "configured": true,
      "status": "ok"
    },
    "sms": {
      "configured": true,
      "status": "ok"
    },
    "payment": {
      "configured": true,
      "status": "ok"
    }
  },
  "system": {
    "platform": "linux",
    "nodeVersion": "v20.0.0",
    "uptime": 86400,
    "memory": {
      "total": 16777216000,
      "free": 8388608000,
      "used": 8388608000,
      "usagePercent": 50
    },
    "cpus": 4,
    "loadAverage": [1.5, 1.2, 1.0]
  },
  "process": {
    "pid": 1234,
    "memory": {
      "rss": 125829120,
      "heapTotal": 83886080,
      "heapUsed": 52428800,
      "external": 1048576
    },
    "cpuUsage": {
      "user": 1000000,
      "system": 500000
    }
  }
}
```

**Usage:**
```bash
# Check if service is healthy
curl https://api.wathaci.com/health

# Monitor in production
watch -n 10 'curl -s https://api.wathaci.com/health | jq .status'
```

### 3.2 Monitoring Best Practices

1. **Regular Health Checks**: Set up external monitoring to ping `/health` every 1-5 minutes
2. **Alert on Failures**: Configure alerts when health check returns non-200 status
3. **Log Aggregation**: Use tools like Datadog, New Relic, or CloudWatch to aggregate logs
4. **Error Rate Monitoring**: Track error rate (5xx responses) and alert on spikes
5. **Performance Monitoring**: Track request duration and alert on slow requests

## 4. Security Hardening

### 4.1 Helmet Configuration

The application uses Helmet to set secure HTTP headers:

```javascript
app.use(helmet());
```

**Headers Set:**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (HSTS)
- Content Security Policy headers

### 4.2 Rate Limiting

Two levels of rate limiting:

**Global Rate Limit:**
- 100 requests per IP per 15 minutes
- Applied to all routes

**Auth Route Rate Limit:**
- 10 requests per IP per 15 minutes
- Applied to: `/users`, `/api/users`, `/api/auth/otp`
- Only counts failed attempts
- Returns: `{ success: false, error: "Too many authentication attempts, please try again later." }`

### 4.3 CORS Configuration

- Restricted to configured origins via `CORS_ALLOWED_ORIGINS` environment variable
- Credentials enabled for cookie-based auth
- Allowed methods: GET, POST, PUT, DELETE, OPTIONS
- Allowed headers: Content-Type, Authorization

### 4.4 Input Validation & Sanitization

All routes use Joi validation with HTML sanitization:

```javascript
const validate = require('../middleware/validate');

router.post('/', validate(userSchema), asyncHandler(async (req, res) => {
  // req.body is validated and sanitized
}));
```

## 5. Error Response Standardization

All API responses follow these formats:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  // or specific fields like "user", "message", etc.
}
```

### Error Response
```json
{
  "success": false,
  "error": "User-friendly error message"
}
```

### HTTP Status Codes

- **200 OK**: Successful GET request
- **201 Created**: Successful POST request (resource created)
- **400 Bad Request**: Validation error, malformed request
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Authenticated but not authorized
- **404 Not Found**: Resource or route not found
- **409 Conflict**: Resource already exists (e.g., duplicate email)
- **422 Unprocessable Entity**: Valid syntax but semantic errors
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Unexpected server error
- **503 Service Unavailable**: Service temporarily unavailable

## 6. How to Debug Issues

### Backend Issues

1. **Check logs in development:**
   ```bash
   cd backend && npm start
   # Logs will show colored output with request details
   ```

2. **Check health endpoint:**
   ```bash
   curl http://localhost:3000/health | jq
   ```

3. **Simulate an error:**
   ```bash
   curl -X POST http://localhost:3000/nonexistent-route
   # Should return: {"success":false,"error":"Route not found: POST /nonexistent-route"}
   ```

4. **Check error logs:**
   - Look for structured JSON logs with `"level": "error"`
   - Stack traces are included in development mode

### Frontend Issues

1. **Check browser console:**
   - Development: Full error details and stack traces
   - Production: Sanitized error messages

2. **Trigger Error Boundary:**
   - Navigate to `/test-error` (if available)
   - Any uncaught React error will show the boundary

3. **Check API errors:**
   - Open Network tab in browser DevTools
   - Failed requests will show error response from backend

4. **Review error logs:**
   - Check `/api/logs` endpoint if accessible
   - Errors from ErrorBoundary are posted there

## 7. Integration with External Monitoring

For production monitoring, integrate with services like:

### Datadog
```javascript
// Add Datadog RUM (Real User Monitoring)
// Add to frontend for user-side monitoring
```

### Sentry
```javascript
// Add Sentry SDK for error tracking
// Captures errors before they reach the error boundary
```

### CloudWatch (AWS)
```javascript
// Stream logs to CloudWatch Logs
// Set up alarms based on error rates
```

### Vercel Analytics
- Built-in monitoring for Vercel deployments
- Tracks deployments, performance, and errors

## 8. Maintenance Checklist

### Daily
- [ ] Check health endpoint status
- [ ] Review error logs for unusual patterns
- [ ] Monitor error rate dashboard

### Weekly
- [ ] Review slow request warnings
- [ ] Check service configuration status
- [ ] Verify rate limiting is working

### Monthly
- [ ] Rotate logs if necessary
- [ ] Review and update error messages for clarity
- [ ] Test error boundaries and fallbacks
- [ ] Update monitoring alerts if needed

## 9. Future Improvements

1. **Distributed Tracing**: Add request IDs to track requests across services
2. **Metrics Dashboard**: Create real-time dashboard for key metrics
3. **Alerting**: Set up automated alerts for critical errors
4. **Log Retention**: Implement log rotation and archival strategy
5. **Performance Monitoring**: Add APM (Application Performance Monitoring)
6. **Error Categorization**: Classify errors by type for better analytics
