# API Integration Quick Reference

## Quick Start

### Check Backend Status
```bash
curl http://localhost:3000/health
```

### View Available Endpoints
```bash
curl http://localhost:3000/api
```

## Frontend Usage

### Import API Utilities
```typescript
import { getApiEndpoint } from '@/config/api';
import { apiGet, apiPost } from '@/lib/api/client';
```

### Make API Calls
```typescript
// Using helper functions (recommended)
// User registration
const user = await apiPost('/users', { 
  firstName, lastName, email, accountType 
});

// Send OTP
const result = await apiPost('/api/auth/otp/send', { 
  phone, channel: 'sms' 
});

// Get health status
const health = await apiGet('/health');

// Using fetch directly (alternative)
const response = await fetch(getApiEndpoint('/users'), {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ firstName, lastName, email, accountType })
});
```

### Monitor Connection
```typescript
import { useApiConnection } from '@/hooks/useApiConnection';

const { isConnected, checkConnection } = useApiConnection();
```

### Add Connection Banner
```typescript
import { ApiConnectionBanner } from '@/components/ApiConnectionBanner';

<ApiConnectionBanner />
```

### Error Handling
```typescript
import { ApiErrorBoundary } from '@/components/ApiErrorBoundary';

<ApiErrorBoundary>
  <YourComponent />
</ApiErrorBoundary>
```

## Backend Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Health check |
| GET | `/api` | API info |
| POST | `/users` | Register user |
| POST | `/api/auth/otp/send` | Send OTP |
| POST | `/api/auth/otp/verify` | Verify OTP |
| POST | `/api/logs` | Submit logs |
| GET | `/api/logs` | Get logs |
| GET | `/api/payment/readiness` | Payment status |
| POST | `/api/payment/webhook` | Payment webhook |
| POST | `/resolve/lenco-merchant` | Merchant lookup |

## Environment Variables

### Frontend (.env.local)
```env
VITE_API_BASE_URL="http://localhost:3000"
```

### Backend (backend/.env)
```env
PORT=3000
CORS_ALLOWED_ORIGINS="*"
```

## Testing

### Run All Tests
```bash
npm test
```

### Run Specific Test
```bash
node --test test/integration.test.js
```

### Test API Manually
```bash
# Health check
curl http://localhost:3000/health

# Register user
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test@test.com","accountType":"sme"}'
```

## Common Issues

### "Cannot connect to backend"
1. Check backend is running: `curl http://localhost:3000/health`
2. Verify `VITE_API_BASE_URL` in `.env.local`
3. Check port 3000 is not in use

### CORS Errors
1. Add frontend origin to `CORS_ALLOWED_ORIGINS`
2. Restart backend after env changes
3. Clear browser cache

### 404 Errors
1. Check endpoint exists: `curl http://localhost:3000/api`
2. Verify you're using `getApiEndpoint()` correctly
3. Check for typos in endpoint paths

## Development Workflow

1. Start backend: `cd backend && npm start`
2. Start frontend: `npm run dev`
3. Verify health: `curl http://localhost:3000/health`
4. Open app: http://localhost:8080
5. Monitor network tab in browser DevTools

## Production Checklist

- [ ] Set `VITE_API_BASE_URL` to production URL
- [ ] Configure `CORS_ALLOWED_ORIGINS` with actual domains
- [ ] Run `npm run config:validate`
- [ ] Test health endpoint
- [ ] Verify CORS works
- [ ] Check all endpoints accessible
- [ ] Monitor logs

## Resources

- Full documentation: `FRONTEND_BACKEND_INTEGRATION.md`
- Backend code: `backend/index.js`
- API config: `src/config/api.ts`
- Integration tests: `test/integration.test.js`
