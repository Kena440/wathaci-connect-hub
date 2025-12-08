# Supabase Auth SMTP troubleshooting (Namecheap Private Email)

This playbook documents how to clear `unexpected_failure` errors during sign-up when email delivery fails with Namecheap Private Email (e.g., `535 5.7.8 authentication failed`).

## 1) Confirm the Auth error in Supabase logs

1. In the Supabase Dashboard, open **Logs → Auth**.
2. Filter by either:
   - `sb_request_id = "019afa7b-b76d-7b1f-b040-881c1f49499f"`, or
   - `path = "/signup"`, `status_code = 500`, and the timestamp around `2025-12-07T20:23:27Z`.
3. Open the full entry and confirm the fields show:
   - `msg`: `500: Error sending confirmation email`
   - `error`: `535 5.7.8 Error: authentication failed: (reason unavailable)`

This confirms the SMTP authentication issue is still the root cause of the 500 response.

## 2) Apply working SMTP settings (Namecheap Private Email)

Use the mailbox `support@wathaci.com` and the correct mailbox password (or app password if required by Namecheap). Configure **Authentication → Email / SMTP** as follows:

**Preferred (implicit SSL):**
- Host: `mail.privateemail.com`
- Port: `465`
- Encryption: SSL/TLS (implicit)
- Username: `support@wathaci.com`
- Password: `<mailbox or app password>`
- Sender email: `support@wathaci.com`
- Sender name: `Wathaci Support`

If 465/SSL is blocked, use STARTTLS instead:
- Host: `mail.privateemail.com`
- Port: `587`
- Encryption: STARTTLS (secure = false, upgrade via TLS)
- Username: `support@wathaci.com`
- Password: `<mailbox or app password>`
- Sender email: `support@wathaci.com`
- Sender name: `Wathaci Support`

### Validate credentials against Private Email directly

From a workstation, verify the credentials before saving them in Supabase:

- **Test 465/SSL** (implicit TLS):
  - Connect with an SMTP tester (e.g., `openssl s_client -connect mail.privateemail.com:465` or an SMTP test tool) and authenticate with the same username/password.
- **Test 587/STARTTLS** (explicit TLS):
  - Connect on 587, issue `STARTTLS`, then authenticate with the same credentials.

Authentication must succeed (no `535`). Send a test email to confirm deliverability, and apply the exact working combination in the Supabase dashboard.

## 3) Verify redirect and site URLs

In **Authentication → URL Configuration**, ensure all production URLs are whitelisted so `redirect_to=https://wathaci.com/auth/callback` does not get rejected:

- `https://wathaci.com`
- `https://wathaci.com`
- `https://wathaci.com/auth/callback`
- Optionally `http://localhost:3000` for local testing.

## 4) Re-test production signup

1. From `https://wathaci.com`, sign up with a fresh email (e.g., `prod.test+1@wathaci.com`).
2. Confirm the `/auth/v1/signup?redirect_to=https%3A%2F%2Fwathaci.com%2Fauth%2Fcallback` call returns 200 (no 500 or `unexpected_failure`).
3. Ensure the confirmation email arrives from `support@wathaci.com` and the link redirects successfully to `https://wathaci.com/auth/callback`.
4. Back in **Logs → Auth**, filter recent `/signup` events and verify there are no new `500: Error sending confirmation email` entries and no `535 5.7.8` errors.
