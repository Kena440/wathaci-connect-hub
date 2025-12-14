# Business Stats API (Our Impact & Growth)

## Purpose and expected shape
The `public.business_stats` relation powers the “Our Impact & Growth” section of the marketing site. It provides ordered, publicly readable KPI rows (e.g., SMEs supported, freelancers, investors, funding) that the frontend fetches via `/rest/v1/business_stats?select=*&is_active=eq.true&order=order_index.asc`. Each row exposes:

- `stat_type` (unique key used by the UI mapping)
- `stat_value` (numeric metric value)
- `label` and `description` (human readable context)
- `is_active` (public visibility flag)
- `order_index` (deterministic display order)
- Timestamps for auditability

## Stability and access guarantees
- The relation **must live in the `public` schema** so PostgREST can expose it without additional configuration.
- RLS is enabled with an explicit policy that allows `anon` reads of active rows. This is safe because the table only stores public marketing metrics.
- A trigger keeps `updated_at` fresh on updates.
- Seed rows are included so the endpoint never returns a 404/empty result during initial provisioning.

## Official query contract
```
GET /rest/v1/business_stats?select=*&is_active=eq.true&order=order_index.asc
Authorization: Bearer <anon-key>
apikey: <anon-key>
```

## Health checks
- From psql: `select stat_type, stat_value from public.business_stats where is_active = true order by order_index;`
- Via REST: `curl -H "apikey: $SUPABASE_ANON_KEY" "$SUPABASE_URL/rest/v1/business_stats?select=*&is_active=eq.true&order=order_index.asc"`
- CI guardrail: run `./scripts/verify-supabase-schema.sh` (now includes checks for the table, trigger, columns, and anon read policy).

## Change management
- Any schema change to business statistics must keep the `business_stats` relation alive (table or view) and update the frontend mapping in `src/components/StatsSection.tsx` in the same PR.
- Avoid renaming/dropping the relation; if aggregation is needed, wrap new sources behind a view named `public.business_stats` to preserve the API contract.
