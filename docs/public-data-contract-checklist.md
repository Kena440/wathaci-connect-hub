# Public Data Contract Checklist

Use this checklist before shipping any new public-facing Supabase query to avoid PostgREST 404 (PGRST205) and schema/role mismatches.

1. **Table or view exists in `public` schema**
   - Name matches the frontend query exactly (e.g. `impact_metrics`).
   - For views, ensure the source tables are accessible to the querying roles.
2. **Columns match the frontend contract**
   - All selected columns exist with correct casing and types.
   - Required defaults and `NOT NULL` constraints are defined where the UI expects guaranteed values.
3. **Row Level Security (RLS) aligns with the intended audience**
   - Anonymous read policies exist for public data (`anon`, `authenticated`).
   - Write policies restricted to `service_role` or explicit admin roles.
4. **Grants are in place**
   - `GRANT SELECT` for `anon, authenticated` where public read is intended.
   - `GRANT ALL` (or specific DML grants) for `service_role` or admin roles.
5. **Schema cache refreshed**
   - Run `NOTIFY pgrst, 'reload schema';` after creating or renaming tables/views.
6. **Empty-state tolerance**
   - Frontend treats an empty array as a valid response (no thrown errors).
7. **Smoke test the exact REST request**
   - Call the precise `/rest/v1/...` query observed in production logs and verify HTTP 200.
8. **Backfill or seed data (if needed)**
   - Insert representative rows for demos or monitoring, or document expected empty behavior.

Keep this document up to date as new public endpoints are added.
