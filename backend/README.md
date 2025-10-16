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

### Database schema

Run the SQL files in [`backend/supabase`](./supabase) to provision the required
tables and policies:

- [`registrations.sql`](supabase/registrations.sql) creates the
  `registrations` table that stores validated sign-up submissions.
- [`frontend_logs.sql`](supabase/frontend_logs.sql) creates the
  `frontend_logs` table for centralized logging.
- [`profiles_policies.sql`](supabase/profiles_policies.sql) contains the
  policies used by the existing Supabase profile features.
- [`profiles_schema.sql`](supabase/profiles_schema.sql) normalizes the
  `profiles` table so nested JSON payloads (`qualifications`, `coordinates`,
  `card_details`) emitted by the frontend can be stored without casting errors.

## Supabase Edge Functions

To deploy or update the Supabase edge functions used by the front end, install the Supabase CLI and run:

```
supabase functions deploy funding-matcher
supabase functions deploy live-funding-matcher
supabase functions deploy matched-professionals
supabase functions deploy sme-assessment-recommendations
supabase functions deploy industry-matcher
```

After deployment, ensure the project has access to any required secrets (such as `SUPABASE_URL` and `SUPABASE_ANON_KEY`) so that the functions can read supporting data when executed.
