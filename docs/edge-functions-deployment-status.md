# Edge Functions Deployment Status

## Identified Edge Functions
- `lenco-webhook` (located at `supabase/functions/lenco-webhook/index.ts`)

## Deployment Attempt
- Deployment was not executed because the Supabase CLI is not available in the execution environment.
- Supabase organization/project credentials are also required but were not provided in this environment.

## Environment Variables Required
The following environment variables are referenced by the `lenco-webhook` Edge Function and must be configured in Supabase:
- `LENCO_WEBHOOK_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Recommended Manual Steps
1. Install the Supabase CLI locally: `npm install -g supabase` (or follow the official installation guide).
2. Authenticate: `supabase login`.
3. Deploy the function: `supabase functions deploy lenco-webhook`.
4. Set the environment variables:
   ```bash
   supabase secrets set LENCO_WEBHOOK_SECRET="<your-secret>"
   supabase secrets set SUPABASE_URL="<your-supabase-url>"
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"
   ```
5. Test the function locally with curl:
   ```bash
   curl -X POST \
     -H "Content-Type: application/json" \
     -H "x-lenco-signature: <calculated-signature>" \
     -d '{"event":"test","data":{"reference":"ref123","status":"success","metadata":{}}}' \
     https://<project-ref>.functions.supabase.co/lenco-webhook
   ```
   Ensure the payload and signature align with Lenco's webhook requirements.

## Next Actions
- Provision Supabase CLI and credentials in the deployment environment to enable automated deployment and testing.
