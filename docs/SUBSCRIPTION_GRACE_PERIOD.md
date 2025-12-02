# WATHACI Connect Subscription Grace Period

## What changed
- Subscription enforcement is temporarily disabled for all signed-up users until **4 January 2026 (Africa/Lusaka)**.
- Backend and frontend share the same grace-period helper so routes, components, and hooks automatically allow access during the window.
- Profiles created during the grace window are marked with audit fields for later analysis.

## Key helpers
- `@/lib/subscriptionWindow` and `backend/lib/subscriptionWindow.js` load the cutoff from `shared/subscription-window.json`.
- `@/lib/ensureServiceAccess` (frontend) and `backend/lib/service-access.js` encapsulate subscription checks and short-circuit while the grace flag is active.

## Cutoff
- Current cutoff: **2026-01-04T23:59:59+02:00** (Africa/Lusaka).
- Update `shared/subscription-window.json` to change or extend the grace window.

## Behavior
- **During grace:** all authenticated users can reach subscription-gated APIs and UI without errors or paywalls. Upgrade banners are replaced with informational copy.
- **After cutoff:** guards revert to normal subscription enforcement; users without an active plan will see upgrade prompts or receive `Subscription required` errors from protected endpoints.
- Database fields (`grace_period_access`, `grace_period_started_at`, `grace_period_expires_at`) remain for analytics and do not affect post-grace enforcement.

## Database
- Migration `20260104000000_subscription_grace_period_flags.sql` adds the grace-period columns on `public.profiles` and backfills missing expiry timestamps for any flagged rows.
- Profiles created while the grace period is active are stamped with `grace_period_access=true`, the creation timestamp, and the cutoff expiry.

## Guard usage
- **Backend:** routes call `ensureServiceAccess(user_id)` before subscription-gated actions; the guard bypasses during grace and enforces active subscriptions afterward.
- **Frontend:** access gates and subscription-aware hooks rely on `ensureServiceAccess`, while paywall UI components honor the grace window and hide upgrade CTAs.
