# Quick Reference: Vercel Deployment

## 🎯 Deployment URLs

| Service | URL |
|---------|-----|
| Frontend (Primary) | https://www.wathaci.com |
| Frontend (Vercel) | https://wathaci-connect-platform.vercel.app |
| Backend API | https://wathaci-connect-platform2.vercel.app |

## 📦 Project Structure

```
Frontend: Repository root
├── vercel.json          # Static build config
├── src/config/api.ts    # API base URL
└── dist/                # Build output

Backend: backend/ directory
├── api/index.js         # Vercel entrypoint
├── index.js             # Express app (no listen)
├── server.js            # Local dev (with listen)
└── vercel.json          # Serverless config
```

## 🚀 Quick Deploy

### Backend
```bash
cd backend
vercel --prod
```

### Frontend
```bash
vercel --prod
```

## 🔑 Key Environment Variables

### Frontend (Vercel Project: wathaci-connect-platform)
```
VITE_API_BASE_URL=https://wathaci-connect-platform2.vercel.app
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_LENCO_PUBLIC_KEY=<your-public-key>
```

### Backend (Vercel Project: wathaci-connect-platform2)
```
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-key>
LENCO_SECRET_KEY=<your-secret-key>
LENCO_WEBHOOK_SECRET=<your-webhook-secret>
```

## 🔍 Health Checks

### Local Development
- Backend: http://localhost:4000/health
- Frontend: http://localhost:5173

### Production
- Backend: https://wathaci-connect-platform2.vercel.app/health

## 🛠️ Local Development

### Backend
```bash
cd backend
npm install
npm start        # Port 4000
```

### Frontend
```bash
npm install
npm run dev      # Port 5173
```

### Docker (Optional)
```bash
docker-compose up
```

## 📚 Documentation

- **Full Guide**: [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md)
- **Summary**: [VERCEL_REFACTORING_SUMMARY.md](./VERCEL_REFACTORING_SUMMARY.md)

## 🔒 CORS Allowed Origins

- https://www.wathaci.com
- https://wathaci.com
- https://wathaci-connect-platform.vercel.app
- http://localhost:5173 (dev)
- http://localhost:4173 (preview)
- http://localhost:8080 (alternative)

## ⚡ Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS errors | Check backend allowed origins |
| API not found | Verify VITE_API_BASE_URL |
| Build fails | Run `npm run build` locally to debug |
| 404 on routes | Check vercel.json rewrites config |

## 📝 Important Notes

1. Backend runs on **port 4000** locally (not 3000)
2. No secrets should be committed (use Vercel env vars)
3. Docker configs are for local dev only
4. Frontend uses static build (not SSR)
5. Backend is serverless (no persistent connections)
