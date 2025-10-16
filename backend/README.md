# Backend

This backend uses [Express](https://expressjs.com/) and can optionally persist
data to Supabase when the necessary environment variables are provided.

Security middleware:

- [helmet](https://github.com/helmetjs/helmet) sets common HTTP headers to help protect the app.
- [express-rate-limit](https://github.com/nfriedly/express-rate-limit) applies basic request rate limiting.

Run the backend tests with:

```
npm --prefix backend test
```

## API Endpoints

- `POST /users` – Validates sign-up payloads, sanitizes input, prevents duplicate
  registrations by email, and persists each submission to the `registrations`
  Supabase table when credentials are available (otherwise it falls back to an
  in-memory store).
- `POST /api/logs` – Accepts client-side error and activity logs, sanitizes
  payloads, stores a rolling in-memory history (up to 1000 entries), prints them
  to the server console for monitoring, and forwards them to the `frontend_logs`
  Supabase table when configured.
- `GET /api/logs` – Returns the most recent 50 log entries for operational diagnostics.

## Supabase integration

Set the following environment variables when deploying the backend to enable
database persistence:

```bash
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="service-role-key"
```

The service role key is required because the backend performs server-side
inserts regardless of user authentication. When these variables are missing the
API still works, but data is kept only in memory.

The Express server automatically loads variables from the project `.env` (and
`.env.local`) files when they are available, so you can define the credentials
once at the repository root and reuse them for both the frontend and backend.

### Database schema

Run the SQL files in [`backend/supabase`](./supabase) to provision the required
tables and policies:

- [`core_schema.sql`](supabase/core_schema.sql) creates the foundational
  `profiles`, `subscription_plans`, `user_subscriptions`, `transactions`, and
  `payments` tables, including row-level security (RLS) rules for customer
  isolation and helper triggers that keep `updated_at` timestamps fresh.
- [`registrations.sql`](supabase/registrations.sql) creates the
  `registrations` table that stores validated sign-up submissions.
- [`frontend_logs.sql`](supabase/frontend_logs.sql) creates the
  `frontend_logs` table for centralized logging.
- [`profiles_policies.sql`](supabase/profiles_policies.sql) contains the
  policies used by the existing Supabase profile features.

After the tables exist, run `profiles_policies.sql` to (re)enable the
automation that seeds a profile row for every new Supabase auth user and
confirms that authenticated clients can access only their own profile
information. You can validate the behaviour by:

1. Creating a test user through Supabase Auth and confirming that a matching
   row appears instantly in `public.profiles`.
2. Running a `select` against `public.profiles` with the test user's session to
   verify that only a single row is returned.
3. Repeating the query with a different user's session (or the anon key) to
   ensure that cross-account data is not exposed.
4. Using the service role key to confirm that administrators can still manage
   every row despite RLS.

## Supabase Edge Functions

To deploy or update the Supabase edge functions used by the front end, install the Supabase CLI and run:

```
supabase functions deploy funding-matcher
supabase functions deploy live-funding-matcher
supabase functions deploy matched-professionals
supabase functions deploy sme-assessment-recommendations
supabase functions deploy industry-matcher
supabase functions deploy lenco-payment
supabase functions deploy payment-verify
supabase functions deploy payment-webhook
supabase functions deploy freelancer-matcher
```

Make sure the Supabase CLI is authenticated (`supabase login`) and linked to the
correct project (`supabase link --project-ref <project-ref>`) before deploying.

After deployment, provide each function with the secrets it requires so runtime
requests can succeed:

```
supabase secrets set \
  SUPABASE_URL="https://your-project.supabase.co" \
  SUPABASE_ANON_KEY="anon-key" \
  SUPABASE_SERVICE_ROLE_KEY="service-role-key" \
  LENCO_SECRET_KEY="lenco-secret" \
  LENCO_WEBHOOK_SECRET="webhook-secret" \
  --project-ref <project-ref>
```

Adjust the list of secrets to match your deployment needs (for example, omit
the Lenco values for non-payment functions). You can rerun the command whenever
credentials rotate.
