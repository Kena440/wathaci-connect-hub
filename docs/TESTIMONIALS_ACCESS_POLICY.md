# Testimonials Endpoint Access Policy

**Intent:** testimonials is intended to be a **public, read-only endpoint returning up to six active, featured testimonials for the home page**. The data lives in `public.testimonials` with `status`, `featured`, and `created_at` fields used for filtering and ordering.

## RLS and Permissions
- Row Level Security stays **enabled** on `public.testimonials`.
- Policy: `Allow public read of active featured testimonials` grants **anon** and **authenticated** roles `SELECT` where `status = 'active' AND featured IS TRUE`.
- `service_role` retains full access for admin/back-office workflows.
- Grants: `SELECT` to `anon`/`authenticated`; `ALL` to `service_role`.

## How to call the endpoint
Prefer the shared Supabase client so headers are injected automatically:
```ts
import { supabase } from '@/lib/supabase-enhanced';

const { data, error } = await supabase
  .from('testimonials')
  .select('*')
  .eq('status', 'active')
  .eq('featured', true)
  .order('created_at', { ascending: false })
  .limit(6);
```

If you must use `fetch`, include both headers so PostgREST can authorize the call:
```ts
await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/testimonials?select=*&status=eq.active&featured=eq.true&order=created_at.desc&limit=6`,
  {
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
  },
);
```

## Monitoring guidance
- 401s **without** `apikey`/`Authorization` headers (often `Mozilla/5.0 (compatible)` bots) are expected and can be treated as low priority.
- 401/403 responses that **include** our Supabase client headers or `x-client-info` should be investigated immediately (likely env/key mismatch or RLS regression).
