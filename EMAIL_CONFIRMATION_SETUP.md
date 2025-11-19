# Email Confirmation Configuration Guide

## Overview

This document explains how to configure email confirmations for user signups and password resets in the Wathaci Connect application.

## How Email Confirmation Works

When a user signs up or requests a password reset:

1. **User submits form** - The user enters their email and other required information
2. **Account created** - Supabase creates the auth user account
3. **Email sent** - Supabase sends a confirmation email with a magic link
4. **User clicks link** - The link redirects to your app with authentication tokens
5. **User logged in** - The app validates the tokens and logs the user in

## Configuration

### 1. Environment Variables

Add these variables to your environment files (`.env.local` for development, `.env.production` for production):

```bash
# Email Confirmation Redirect URLs
# URL to redirect users after they click the email confirmation link
VITE_EMAIL_CONFIRMATION_REDIRECT_URL="https://app.wathaci.com/signin"

# Alternative: use a path-only redirect (will use the app's base URL)
# VITE_EMAIL_CONFIRMATION_REDIRECT_PATH="/signin"

# Application Base URL (used to construct absolute redirect URLs)
VITE_APP_BASE_URL="https://app.wathaci.com"
VITE_SITE_URL="https://app.wathaci.com"
```

### 2. Supabase Configuration

#### Local Development

The `supabase/config.toml` file is already configured:

```toml
[auth]
enabled = true
site_url = "env(VITE_SITE_URL)"

[auth.email]
enable_signup = true
enable_confirmations = true

[auth.email.smtp]
enabled = true
host = "mail.privateemail.com"
port = 465
user = "support@wathaci.com"
pass = "env(SMTP_PASSWORD)"
admin_email = "support@wathaci.com"
sender_name = "Wathaci"
```

#### Production

Configure SMTP settings in your Supabase Dashboard:

1. Go to **Project Settings → Authentication → SMTP Settings**
2. Enable custom SMTP
3. Enter your SMTP credentials:
   - **Host**: mail.privateemail.com
   - **Port**: 465
   - **Username**: support@wathaci.com
   - **Password**: [Your SMTP password]
   - **Sender email**: support@wathaci.com
   - **Sender name**: Wathaci

### 3. Email Templates

Email templates are located in `supabase/templates/`:

- `signup-confirmation.html` - Sent when users sign up
- `password-reset.html` - Sent for password reset requests
- `magic-link.html` - Sent for magic link sign-ins

Templates use Supabase template variables:
- `{{ .ConfirmationURL }}` - The confirmation link
- `{{ .Token }}` - The OTP token (for OTP flows)
- `{{ .Email }}` - The user's email address

## How Redirect URLs Work

The app uses a helper function (`getEmailConfirmationRedirectUrl()`) to construct redirect URLs:

### Priority Order

1. **Absolute URL**: `VITE_EMAIL_CONFIRMATION_REDIRECT_URL`
   - Use this if you want to specify a complete URL
   - Example: `https://app.wathaci.com/signin`

2. **Path + Base URL**: `VITE_EMAIL_CONFIRMATION_REDIRECT_PATH` + `VITE_APP_BASE_URL`
   - Use this if you want to specify just the path
   - Example: `/signin` + `https://app.wathaci.com` = `https://app.wathaci.com/signin`

3. **Fallback Path + Base URL**: Default path (`/signin`) + `VITE_APP_BASE_URL`
   - Used when no specific redirect is configured
   - Example: `/signin` + `https://app.wathaci.com` = `https://app.wathaci.com/signin`

### Base URL Resolution

The base URL is resolved from these environment variables (in order of priority):

1. `VITE_APP_BASE_URL`
2. `VITE_SITE_URL`
3. `VITE_PUBLIC_SITE_URL`
4. `window.location.origin` (browser fallback)

## Testing

### Local Testing

1. Start Supabase locally:
   ```bash
   npm run supabase:start
   ```

2. Access Inbucket (email testing UI):
   - Open http://127.0.0.1:54324
   - All emails sent locally will appear here
   - No actual emails are sent during local development

3. Test the signup flow:
   - Navigate to http://127.0.0.1:3000/signup
   - Complete the signup form
   - Check Inbucket for the confirmation email
   - Click the confirmation link in the email

### Production Testing

⚠️ **Important**: Before testing in production, ensure:

1. SMTP credentials are configured in Supabase Dashboard
2. `VITE_EMAIL_CONFIRMATION_REDIRECT_URL` or `VITE_APP_BASE_URL` is set to your production domain
3. The redirect URL is added to Supabase's allowed redirect URLs:
   - Go to **Authentication → URL Configuration**
   - Add your redirect URL to the allowed list

## Troubleshooting

### Issue: Users not receiving confirmation emails

**Possible causes:**
1. SMTP not configured in Supabase Dashboard
2. Incorrect SMTP credentials
3. Email provider blocking outgoing emails
4. User's email in spam folder

**Solutions:**
1. Check SMTP configuration in Supabase Dashboard
2. Test SMTP credentials with an email client
3. Check email provider settings and logs
4. Ask user to check spam folder

### Issue: Confirmation link redirects to wrong URL

**Possible causes:**
1. `VITE_EMAIL_CONFIRMATION_REDIRECT_URL` not set
2. `VITE_APP_BASE_URL` pointing to wrong domain
3. Redirect URL not in Supabase's allowed list

**Solutions:**
1. Set `VITE_EMAIL_CONFIRMATION_REDIRECT_URL` environment variable
2. Verify `VITE_APP_BASE_URL` is correct for your environment
3. Add the URL to Supabase's allowed redirect URLs

### Issue: Users stuck after clicking confirmation link

**Possible causes:**
1. Session not being persisted
2. Redirect happening before session is established
3. CORS issues preventing session cookies

**Solutions:**
1. Ensure `detectSessionInUrl: true` in Supabase client options
2. Check browser console for errors
3. Verify CORS settings in Supabase Dashboard

## Security Considerations

1. **Always use HTTPS in production** - Email links contain sensitive tokens
2. **Keep SMTP credentials secret** - Never commit them to version control
3. **Use environment variables** - Store credentials securely
4. **Whitelist redirect URLs** - Only allow trusted domains in Supabase
5. **Token expiry** - Confirmation tokens expire after 1 hour by default

## Related Files

- `src/lib/emailRedirect.ts` - Helper functions for constructing redirect URLs
- `src/components/auth/SignupForm.tsx` - Signup form using email confirmation
- `src/pages/ZaqaSignup.tsx` - Alternative signup page using email confirmation
- `src/lib/services/user-service.ts` - User service with password reset functionality
- `supabase/config.toml` - Supabase local configuration
- `supabase/templates/` - Email template files

## Additional Resources

- [Supabase Auth Configuration](https://supabase.com/docs/guides/auth/auth-smtp)
- [Email Templates Guide](https://supabase.com/docs/guides/auth/auth-email-templates)
- [SMTP Configuration](https://supabase.com/docs/guides/auth/auth-smtp)
