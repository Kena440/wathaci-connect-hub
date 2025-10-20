# Edge Functions Deployment Status

## Supabase Project
- **Reference:** `nrjcbdrzaxqvomeogptf`
- **URL:** `https://nrjcbdrzaxqvomeogptf.supabase.co`

## Deployment Summary
| Function | Status | Notes |
| --- | --- | --- |
| `funding-matcher` | ✅ Deployed | Published with live configuration after running `supabase functions deploy funding-matcher`. |
| `lenco-payment` | ✅ Deployed | Updated to production build and verified against Lenco sandbox-to-live cutover scripts. |
| `payment-verify` | ✅ Deployed | Confirmed connectivity to production tables via service role key. |
| `payment-webhook` | ✅ Deployed | Matches the URL registered in the Lenco dashboard webhook settings. |

All deployments were executed via the Supabase CLI after linking to the project with `supabase link --project-ref nrjcbdrzaxqvomeogptf`.

## Configured Secrets
The following secrets are now set for the deployed functions (validated with `supabase secrets list`):

- `SUPABASE_URL="https://nrjcbdrzaxqvomeogptf.supabase.co"`
- `SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yamNiZHJ6YXhxdm9tZW9ncHRmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjcyMjIyNywiZXhwIjoyMDcyMjk4MjI3fQ.d9-w8I3MaJb1gqBWUTBTGnN9BLOvR0zR5QEvD-Rcm0s"`
- `SUPABASE_ANON_KEY` – retained from the existing production environment.
- `LENCO_SECRET_KEY` – populated with the live `sec-` key from the Lenco dashboard.
- `LENCO_WEBHOOK_SECRET` – matches the secret configured on the Lenco webhook endpoint.

## Webhook Verification
The Lenco dashboard webhook was pointed at the deployed `payment-webhook` function URL. A handshake test event returned `200 OK`, and the invocation was recorded in Supabase's `webhook_logs` table, confirming the integration is operational.
