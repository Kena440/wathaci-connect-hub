# Vercel Deployment Guide for Wathaci Connect

This document describes the Vercel deployment structure for the Wathaci Connect platform, which consists of a frontend (Vite/React) and backend (Express API).

## Architecture Overview

The application is deployed as two separate Vercel projects:

1. **Frontend**: `wathaci-connect-platform`
   - URL: https://wathaci-connect-platform.vercel.app
   - Custom domain: https://www.wathaci.com
   - Built with Vite, hosted as static files

2. **Backend**: `wathaci-connect-platform2`
   - URL: https://wathaci-connect-platform2.vercel.app
   - Serverless Node.js API

## Deployment Structure

### Frontend Deployment

**Location**: Repository root

**Key Files**:
- `vercel.json` - Vercel configuration for SPA routing
- `.env.production` - Production environment variables (not committed)
- `.env.production.example` - Template for production env vars
- `package.json` - Build script: `npm run build`
- `dist/` - Build output directory

**Vercel Configuration** (`vercel.json`):
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Environment Variables** (Set in Vercel Project Settings):
```bash
VITE_API_BASE_URL="https://wathaci-connect-platform2.vercel.app"
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_ANON_KEY="<your-supabase-anon-key>"
VITE_MIN_PAYMENT_AMOUNT="5"
VITE_MAX_PAYMENT_AMOUNT="50000"
VITE_PLATFORM_FEE_PERCENTAGE="10"
VITE_LENCO_API_URL="https://api.lenco.co/access/v2"
VITE_LENCO_PUBLIC_KEY="<your-lenco-public-key>"
VITE_LENCO_WEBHOOK_URL="<your-webhook-url>"
```

### Backend Deployment

**Location**: `backend/` directory

**Key Files**:
- `backend/vercel.json` - Vercel serverless function configuration
- `backend/api/index.js` - Vercel function entrypoint
- `backend/index.js` - Express app (exported, not listening)
- `backend/server.js` - Local development server only
- `backend/package.json` - Dependencies and scripts

**Vercel Configuration** (`backend/vercel.json`):
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/api/index.js"
    }
  ]
}
```

**File Structure**:
```
backend/
├── api/
│   └── index.js          # Vercel serverless entrypoint (exports app)
├── index.js              # Express app configuration (no app.listen)
├── server.js             # Local development server (has app.listen)
├── routes/               # API route handlers
├── middleware/           # Express middleware
├── services/             # Business logic services
├── lib/                  # Utilities and helpers
├── package.json          # Dependencies
└── vercel.json           # Vercel configuration
```

**Environment Variables** (Set in Vercel Project Settings):
```bash
# Supabase
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"

# Lenco Payment Gateway
LENCO_API_URL="https://api.lenco.co/access/v2"
LENCO_SECRET_KEY="<your-lenco-secret-key>"
LENCO_WEBHOOK_SECRET="<your-webhook-secret>"
LENCO_WEBHOOK_URL="<your-webhook-endpoint>"
VITE_LENCO_PUBLIC_KEY="<your-lenco-public-key>"

# SMTP (for emails)
SMTP_HOST="<smtp-host>"
SMTP_PORT="587"
SMTP_USERNAME="<smtp-username>"
SMTP_PASSWORD="<smtp-password>"
SMTP_FROM="<from-email>"

# Twilio (for SMS OTP)
TWILIO_ACCOUNT_SID="<twilio-account-sid>"
TWILIO_AUTH_TOKEN="<twilio-auth-token>"
TWILIO_PHONE_NUMBER="<twilio-phone-number>"

# Optional
NODE_ENV="production"
```

## CORS Configuration

The backend automatically allows the following origins:

- `https://www.wathaci.com` (primary production domain)
- `https://wathaci.com` (bare domain)
- `https://wathaci-connect-platform.vercel.app` (Vercel frontend)
- `https://wathaci-connect-platform-amukenas-projects.vercel.app` (preview)
- `http://localhost:5173` (Vite dev server)
- `http://localhost:4173` (Vite preview)
- `http://localhost:8080` (alternative dev port)

Additional origins can be configured via the `ALLOWED_ORIGINS` environment variable:
```bash
ALLOWED_ORIGINS="https://custom-domain.com,https://another-domain.com"
```

## Deployment Steps

### First-Time Setup

#### 1. Deploy Backend

1. Create a new Vercel project for the backend
   - Name: `wathaci-connect-platform2`
   - Root Directory: `backend`

2. Set all required environment variables in Vercel dashboard

3. Deploy:
   ```bash
   # From repository root
   cd backend
   vercel --prod
   ```

4. Verify deployment:
   ```bash
   curl https://wathaci-connect-platform2.vercel.app/health
   ```

#### 2. Deploy Frontend

1. Create a new Vercel project for the frontend
   - Name: `wathaci-connect-platform`
   - Root Directory: `.` (repository root)

2. Set all required environment variables in Vercel dashboard

3. Deploy:
   ```bash
   # From repository root
   vercel --prod
   ```

4. Configure custom domain `www.wathaci.com` in Vercel dashboard

### Subsequent Deployments

Vercel automatically deploys:
- **Production**: On push to `main` branch
- **Preview**: On push to any other branch or PR

You can also manually deploy:
```bash
# Deploy frontend
vercel --prod

# Deploy backend
cd backend
vercel --prod
```

## Local Development

### Backend (Local)

The backend can be run locally using `server.js`:

```bash
cd backend
npm install
npm start        # Runs on port 4000
# or
npm run dev      # Runs with nodemon for auto-reload
```

Health check: http://localhost:4000/health

### Frontend (Local)

The frontend runs with Vite dev server:

```bash
npm install
npm run dev      # Runs on port 5173
```

The frontend will connect to `http://localhost:4000` by default in development mode.

### Using Docker (Local Only)

Docker is available for local development but NOT used in production:

```bash
docker-compose up
```

This starts both frontend and backend in containers.

## API Client

The frontend uses a centralized API client:

**Location**: `src/lib/api/client.ts`

**Configuration**: `src/config/api.ts`

The API base URL is automatically configured:
- **Development**: `http://localhost:4000`
- **Production**: `https://wathaci-connect-platform2.vercel.app`

Can be overridden with `VITE_API_BASE_URL` environment variable.

## Troubleshooting

### Backend Issues

1. **Check logs**:
   ```bash
   vercel logs <deployment-url>
   ```

2. **Verify environment variables** in Vercel dashboard

3. **Test health endpoint**:
   ```bash
   curl https://wathaci-connect-platform2.vercel.app/health
   ```

### Frontend Issues

1. **CORS errors**: Verify backend CORS configuration includes frontend domain

2. **API connection issues**: Check `VITE_API_BASE_URL` environment variable

3. **Build errors**: 
   ```bash
   npm run build
   ```

### Common Issues

**Issue**: API calls fail with CORS error
**Solution**: Ensure frontend domain is in backend's allowed origins list

**Issue**: Environment variables not updating
**Solution**: Redeploy after changing env vars in Vercel dashboard

**Issue**: 404 on SPA routes
**Solution**: Verify `vercel.json` rewrites configuration

## Monitoring

- **Backend health**: https://wathaci-connect-platform2.vercel.app/health
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Supabase Dashboard**: https://app.supabase.com

## Security Notes

1. Never commit `.env.production` or any files containing secrets
2. Use Vercel's environment variable management
3. Rotate API keys regularly
4. Keep dependencies updated
5. Review Vercel deployment logs for errors

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Documentation](https://vitejs.dev/guide/)
- [Express on Vercel](https://vercel.com/guides/using-express-with-vercel)
