# SMTP Auth Recovery Playbook (nrjcbdrzaxqvomeogptf)

This playbook documents the exact steps to clear the `535 5.7.8` SMTP authentication failure that blocks Supabase Auth signup for project **nrjcbdrzaxqvomeogptf**. Follow the sequence to verify the error, correct the SMTP configuration, validate the mailbox credentials directly with the provider, and retest the hosted signup flow.

## 1) Verify the exact failure in Supabase logs
1. In the Supabase Dashboard, open **Logs → Auth**.
2. Add filters:
   - `path` = `/signup`
   - `level` = `error`
   - `request_id` = `9aa6bd9247e173ed-JNB` (or the same timestamp around `2025-12-07T20:23:27Z`).
3. Confirm the failing entry shows:
   - `msg`: `500: Error sending confirmation email`
   - `error`: `535 5.7.8 Error: authentication failed: (reason unavailable)`

If the log matches, the failure is isolated to SMTP authentication (not database or RLS).

## 2) Correct the Supabase Auth SMTP configuration
Use the values below in **Authentication → Email**. Apply, then re-save to ensure the settings stick.

| Setting | Value |
| --- | --- |
| Host | `mail.privateemail.com` |
| Port | Prefer `465` (implicit SSL). If the provider rejects, use `587` (STARTTLS). |
| Secure | `true` for port 465. If you switch to 587, set Secure/SSL to `false` so STARTTLS is used. |
| Username | `support@wathaci.com` |
| Password | The working mailbox password or app password. |
| Sender/From email | `support@wathaci.com` |
| Sender name | `Wathaci Support` |

For self-hosted GoTrue, the equivalent env vars are:
```bash
GOTRUE_SMTP_HOST=mail.privateemail.com
GOTRUE_SMTP_PORT=465            # or 587 for STARTTLS
GOTRUE_SMTP_SECURE=true         # false when using 587/STARTTLS
GOTRUE_SMTP_USER=support@wathaci.com
GOTRUE_SMTP_PASS=<mailbox-or-app-password>
GOTRUE_SMTP_ADMIN_EMAIL=support@wathaci.com
```
After updating env vars, restart GoTrue so the new credentials are loaded.

## 3) Validate the mailbox credentials directly with the provider
Eliminate guessing by testing the mailbox outside Supabase:
1. In a mail client (Outlook/Thunderbird) or an SMTP test tool, connect to `mail.privateemail.com` on port **465** with SSL/TLS.
2. Authenticate with `support@wathaci.com` and the same password you configured in Supabase.
3. Send a test message from `support@wathaci.com` to another inbox. Ensure no `535` errors appear.
4. If auth fails, fix at the provider:
   - Confirm the password.
   - Enable SMTP for the mailbox.
   - If the provider requires an app-specific password, generate and use it in Supabase.
5. If port 465 is blocked or unstable, retry with port **587** + STARTTLS (Secure/SSL **off** in Supabase, STARTTLS **on**).

Use exactly the host/port/TLS combination that succeeds here in Supabase Auth.

## 4) Retest hosted signup end-to-end
1. From the frontend (`http://localhost:3000` or `https://wathaci.com`), perform a fresh signup with a new email, e.g. `smtp.test+1@wathaci.com`.
2. Alternatively, use the Auth REST endpoint directly:
   ```bash
   SUPABASE_URL="https://nrjcbdrzaxqvomeogptf.supabase.co"
   SUPABASE_ANON_KEY="<anon-key>"
   curl -X POST "$SUPABASE_URL/auth/v1/signup" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"email":"smtp.test+1@wathaci.com","password":"<StrongP@ssw0rd>"}'
   ```
3. Expected: the request returns success (user created / confirmation pending) and a confirmation email arrives from `support@wathaci.com`.
4. Re-open **Logs → Auth** and filter by `path=/signup` (recent). Confirm there are no new entries with `msg: 500: Error sending confirmation email` or `error: 535 5.7.8`.

## 5) Keep failure modes clean
- Ensure malformed signups (bad email shape, weak password) return 4xx, not 500. Most of this is handled by GoTrue, but confirm your client surfaces the error message instead of retrying.
- If you rotate credentials, repeat Section 3 to validate the new password before updating Supabase.

## 6) Quick healthcheck (run after any SMTP change)
Run the signup curl above with a fresh email alias (e.g., `smtp.health+<timestamp>@wathaci.com`). If the request succeeds and the email arrives, SMTP is healthy. If it fails, immediately inspect **Logs → Auth** for a new 535/500 entry and re-validate the credentials with the provider.

Following this playbook ensures Supabase signup no longer returns `500: Error sending confirmation email` and confirmation emails are delivered reliably for normal users.
