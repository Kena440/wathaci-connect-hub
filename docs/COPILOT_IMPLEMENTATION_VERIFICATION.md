# SME Co-Pilot Verification Guide

## Prerequisites
- Supabase URL and service role key configured in environment.
- Optional: OpenAI credentials (fallback responses are built-in when unavailable).
- Ensure `VITE_API_BASE_URL` points to the backend and the Supabase auth cookie or bearer token is available.

## Run migrations
```bash
supabase db push
```

## Start services
```bash
# Backend
cd backend && node server.js

# Frontend
npm install
npm run dev
```

## Manual test flow
1. Authenticate as an SME user and ensure a Supabase session cookie or bearer token is present.
2. Navigate to the **Co-Pilot** dashboard section.
3. Click **Start Co-Pilot** to create or reuse a session.
4. Run **Diagnose** and confirm snapshot, risks, opportunities, and missing data render.
5. Run **Decide** and verify three decision paths appear.
6. Select a path and generate an **Action Plan**; confirm tasks display with proper status badges.
7. Execute at least one platform task. For confirmation-required tasks, approve the modal before running.
8. Generate a **Business Health Brief** and download the rendered artifact link.
9. Submit optional feedback.

## Verification checks
- Audit: copilot runs, plans, tasks, artifacts, and feedback records appear in Supabase tables.
- RLS: users can only access rows tied to their session via owner_user_id.
- Storage: `copilot-artifacts` bucket contains uploaded brief HTML files (signed/public URL returned).
- Frontend: state view updates after each run and task execution without console errors.
