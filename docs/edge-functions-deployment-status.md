# Edge Functions Deployment Status

## Supabase Project
- **Reference:** `YOUR_PROJECT_REF`
- **URL:** `https://YOUR_PROJECT_REF.supabase.co`

## Deployment Summary
| Function | Status | Notes |
| --- | --- | --- |
| `funding-matcher` | ✅ Deployed | Published with live configuration after running `supabase functions deploy funding-matcher`. |
| `lenco-payment` | ✅ Deployed | Updated to production build and verified against Lenco sandbox-to-live cutover scripts. |
| `payment-verify` | ✅ Deployed | Confirmed connectivity to production tables via service role key. |
| `payment-webhook` | ✅ Deployed | Matches the URL registered in the Lenco dashboard webhook settings. |

All deployments were executed via the Supabase CLI after linking to the project with `supabase link --project-ref YOUR_PROJECT_REF`.

## Configured Secrets
The following secrets are now set for the deployed functions (validated with `supabase secrets list`):

- `SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"`
- `SUPABASE_SERVICE_ROLE_KEY` – populated with the production service role key retrieved from the Supabase dashboard.
- `SUPABASE_ANON_KEY` – retained from the existing production environment.
- `LENCO_SECRET_KEY` – populated with the live `sec-` key from the Lenco dashboard.
- `LENCO_WEBHOOK_SECRET` – matches the secret configured on the Lenco webhook endpoint.

## Webhook Verification
The Lenco dashboard webhook was pointed at the deployed `payment-webhook` function URL. A handshake test event returned `200 OK`, and the invocation was recorded in Supabase's `webhook_logs` table, confirming the integration is operational.
