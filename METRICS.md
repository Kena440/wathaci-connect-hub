# Our Impact & Growth Metrics

This document defines every metric exposed in the `business_stats` relation and rendered by the **Our Impact & Growth** section.

## Data source
- Relation: `public.business_stats` (table)
- Endpoint: `GET /rest/v1/business_stats?select=*&is_active=eq.true&order=order_index.asc`
- Columns: `metric_key`, `label`, `value`, `unit`, `description`, `is_active`, `order_index`, `stat_type`, `stat_value`
- Refresh strategy: triggers on `profiles`, `freelancers`, `transactions`, `marketplace_orders`, and `sme_profiles` call `public.refresh_business_stats()` to keep values live.

## Metric definitions
| Metric | metric_key | Definition | Source tables | Aggregation |
| --- | --- | --- | --- | --- |
| Total Registered Users | `total_users` | Count of all rows in `public.profiles` (any `account_type`). | `public.profiles` | `COUNT(*)` |
| SMEs Supported | `smes_supported` | Profiles where `account_type` IN (`'sme'`, `'sole_proprietor'`). | `public.profiles` | `COUNT(*)` |
| Business Professionals | `professionals` | Profiles where `account_type` = `'professional'`. | `public.profiles` | `COUNT(*)` |
| Independent Freelancers | `freelancers_active` | Freelancers where `COALESCE(status,'active') <> 'inactive'`. | `public.freelancers` | `COUNT(*)` |
| Active Investors | `investors` | Profiles where `account_type` = `'investor'`. | `public.profiles` | `COUNT(*)` |
| Donors & Supporters | `donors` | Profiles where `account_type` = `'donor'`. | `public.profiles` | `COUNT(*)` |
| Total Funding Processed (ZMW) | `total_funding_zmw` | Sum of `transactions.amount` where `status = 'completed'`. | `public.transactions` | `SUM(amount)` |
| Projects Completed | `projects_completed` | Marketplace orders whose status is **not** in (`'pending'`, `'failed'`, `'refunded'`, `'cancelled'`). | `public.marketplace_orders` | `COUNT(*)` |
| Jobs Supported | `jobs_supported` | Sum of `employee_count` across active SME profiles. | `public.sme_profiles` | `SUM(employee_count)` |
| Countries Served | `countries_served` | Distinct `location_country` values on active SME profiles (non-empty). | `public.sme_profiles` | `COUNT(DISTINCT location_country)` |
| Verified SME Stories | `success_stories` | Active SME profiles where `approval_status = 'approved'` and `is_profile_complete = true`. | `public.sme_profiles` | `COUNT(*)` |

## How to add a new metric
1. Update `public.refresh_business_stats()` with a new row in the `metrics` CTE (define `metric_key`, `label`, `value`, `unit`, `description`, `order_index`).
2. Ensure the aggregation query references existing columns/tables and accounts for nulls with `COALESCE` where appropriate.
3. Add the metric to the `iconMap` in `src/components/StatsSection.tsx` to select an icon/color (fallbacks exist).
4. Seed/mock values in `src/lib/supabase-enhanced.ts` if local mocks are required.
5. Run migrations (`supabase db push`) and verify via SQL:
   ```sql
   select * from public.business_stats where is_active = true order by order_index;
   ```
6. Reload the frontend; the `business_stats` endpoint will deliver the live value without code changes beyond the icon mapping.
