# Backend

This backend uses [Express](https://expressjs.com/).

Security middleware:

- [helmet](https://github.com/helmetjs/helmet) sets common HTTP headers to help protect the app.
- [express-rate-limit](https://github.com/nfriedly/express-rate-limit) applies basic request rate limiting.

Run the backend tests with:

```
npm --prefix backend test
```


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
