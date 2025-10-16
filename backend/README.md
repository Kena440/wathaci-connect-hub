# Backend

This backend uses [Express](https://expressjs.com/).

Security middleware:

- [helmet](https://github.com/helmetjs/helmet) sets common HTTP headers to help protect the app.
- [express-rate-limit](https://github.com/nfriedly/express-rate-limit) applies basic request rate limiting.

Run the backend tests with:

```
npm --prefix backend test
```

## API Endpoints

- `POST /users` – Validates sign-up payloads, sanitizes input, prevents duplicate registrations by email, and stores the latest
  registration in memory.
- `POST /api/logs` – Accepts client-side error and activity logs, sanitizes payloads, stores a rolling in-memory history (up to 1000 entries), and
  prints them to the server console for monitoring.
- `GET /api/logs` – Returns the most recent 50 log entries for operational diagnostics. **Requires** the
  `LOGS_API_TOKEN` bearer token for authentication. Set this token in your environment to protect
  log history access.


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
