# SMTP configuration with Namecheap Private Email

Supabase Auth is currently returning `535 5.7.8 Error: authentication failed` when attempting to send confirmation emails for `support@wathaci.com`. The correct SMTP settings for the Namecheap Private Email mailbox are documented below so that they can be applied directly in the Supabase dashboard or GoTrue environment.

## Required Supabase / GoTrue SMTP settings
- **Host / Server:** `mail.privateemail.com`
- **Port:** `465`
- **Encryption:** SSL/TLS
- **Username:** `support@wathaci.com`
- **Password:** use the mailbox password (or provider-issued app password)
- **From / Admin email:** `support@wathaci.com`
- **Sender name (recommended):** `Wathaci Support`

### Self-hosted environment variables
If the project uses self-hosted GoTrue, ensure the following are set:
```
GOTRUE_SMTP_HOST=mail.privateemail.com
GOTRUE_SMTP_PORT=465
GOTRUE_SMTP_USER=support@wathaci.com
GOTRUE_SMTP_PASS=<mailbox password>
GOTRUE_SMTP_ADMIN_EMAIL=support@wathaci.com
GOTRUE_SMTP_SECURE=true
```

## Verification steps required
1. Use an external SMTP test (e.g., `openssl s_client -connect mail.privateemail.com:465 -crlf` or a mail client) with the credentials above to confirm authentication succeeds and that a test email can be sent from `support@wathaci.com`.
2. Apply the same working credentials in **Supabase Dashboard → Authentication → Email / SMTP Settings** and save.
3. Re-run a Supabase signup (e.g., `smtp.test+1@wathaci.com`) and confirm:
   - The signup endpoint responds without 500/`unexpected_failure`.
   - A confirmation email arrives from `support@wathaci.com` (check spam).
   - Supabase Auth logs show no new `535 5.7.8 Error: authentication failed` entries.
4. Confirm redirect URLs in **Auth → URL Configuration** include `http://localhost:3000` and the deployed Vercel URL (e.g., `https://wathaci-connect-platform-8fy8qoekg-amukenas-projects.vercel.app` and any `/signin` path used).

## Notes
- The password for the `support@wathaci.com` mailbox is required to complete the configuration and cannot be set from within this repository. Apply the values directly in the Supabase dashboard or the GoTrue environment.
- Once working, keep the credentials synchronized between all environments (local Supabase CLI, staging, production).
