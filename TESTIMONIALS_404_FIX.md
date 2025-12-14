# Fix for testimonials 404 Error (PGRST205)

## Problem Summary

The landing page was failing to fetch testimonials, triggering a PostgREST `PGRST205` error on `GET /rest/v1/testimonials`:

```json
{
  "event_message": "GET | 404 | ... | https://nrjcbdrzaxqvomeogptf.supabase.co/rest/v1/testimonials?select=*&status=eq.active&featured=eq.true&order=created_at.desc&limit=6",
  "proxy_status": "PostgREST; error=PGRST205"
}
```

## Root Cause

The `testimonials` table did not exist in the public schema, so PostgREST could not serve the endpoint.

## Solution

Created a proper `testimonials` table and hardened access controls via migration `20251215093000_create_testimonials_table.sql`:

- ✅ Define table with required columns (`client_name`, `client_title`, `client_company`, `client_image_url`, `testimonial_text`, `rating`, `service_category`, `featured`, `status`, timestamps).
- ✅ Enforce data quality with `rating` range check (1–5) and `status` check constraint (`active`, `inactive`, `archived`).
- ✅ Add index on `(status, featured, created_at DESC)` for fast public queries.
- ✅ Enable RLS with:
  - Public read-only access restricted to rows where `status = 'active'`.
  - Full CRUD access for `service_role`.
- ✅ Refresh PostgREST cache via `NOTIFY pgrst, 'reload schema';`.

## Impact

- ✅ `/rest/v1/testimonials` now resolves successfully.
- ✅ Landing page testimonial section can load up to six featured, active testimonials ordered by recency.
- ✅ Unauthorized writes remain blocked; only service-role clients can manage testimonial records.

## Testing Recommendations

1. **Schema verification**
   ```sql
   \d+ public.testimonials
   ```

2. **Public read path** (anon key)
   ```bash
   curl -s "https://nrjcbdrzaxqvomeogptf.supabase.co/rest/v1/testimonials?select=*&status=eq.active&featured=eq.true&order=created_at.desc&limit=6" \
     -H "apikey: $SUPABASE_ANON_KEY"
   ```

3. **RLS guardrail** (expect 0 rows when status != active)
   ```bash
   curl -s "https://nrjcbdrzaxqvomeogptf.supabase.co/rest/v1/testimonials?select=*&status=eq.inactive" \
     -H "apikey: $SUPABASE_ANON_KEY"
   ```

4. **Service role management**
   ```bash
   curl -s -X POST "https://nrjcbdrzaxqvomeogptf.supabase.co/rest/v1/testimonials" \
     -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"client_name":"Test Client","testimonial_text":"Great service!","rating":5,"status":"active"}'
   ```

## Related Files

- `supabase/migrations/20251215093000_create_testimonials_table.sql`
- `src/components/TestimonialsSection.tsx` (frontend consumer)
