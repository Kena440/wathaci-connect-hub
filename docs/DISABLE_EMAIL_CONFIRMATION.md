# Disabling Supabase email confirmations

This project needs email/password signups to succeed without requiring a confirmation email. For the hosted project (`nrjcbdrzaxqvomeogptf`) and local Supabase CLI environments, use the steps below.

## Hosted dashboard settings
1. Open **Supabase Dashboard → Authentication → Providers → Email** (or **Authentication → Settings → Email** in the newer UI).
2. Turn **off** the toggle for **Confirm email** / **Require email confirmation** so new users are auto-confirmed.
3. Leave **Secure email change** enabled if desired; it does not affect initial signup.
4. Save changes.

With confirmation disabled, new users created via `supabase.auth.signUp` should immediately be treated as confirmed and can sign in right away.

## Prevent mailer invocations during signup
Even with confirmations off, ensure the mailer is not called on signup by disabling SMTP while confirmations are disabled:

```
Authentication → Email → SMTP → toggle off
```

This avoids `/auth/v1/signup` failing with SMTP errors such as `535 5.7.8`.

To re-enable confirmation emails later, turn **Confirm email** back **on** and re-enable your SMTP settings.

## Local Supabase CLI configuration
The local Supabase configuration mirrors the hosted setup for predictable behavior:

- `[auth.email].enable_confirmations = false` auto-confirms email/password users.
- `[auth.email.smtp].enabled = false` keeps the mailer disabled while confirmations are off.

Apply these settings locally by running `supabase start` after pulling the repo so the local GoTrue respects the updated configuration.
