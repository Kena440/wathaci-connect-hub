# Supabase Dashboard Configuration Guide

## Complete Step-by-Step SMTP Setup for Production

This guide provides detailed instructions for configuring email (SMTP) settings in the Supabase dashboard for production deployment.

**Target Configuration:**
- Platform: Supabase
- Email Provider: PrivateEmail (Namecheap)
- From Address: support@wathaci.com
- Sender Name: Wathaci

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Access Supabase Dashboard](#2-access-supabase-dashboard)
3. [Configure SMTP Settings](#3-configure-smtp-settings)
4. [Configure Email Templates](#4-configure-email-templates)
5. [Configure Rate Limits](#5-configure-rate-limits)
6. [Test Configuration](#6-test-configuration)
7. [Verification Checklist](#7-verification-checklist)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Prerequisites

Before starting configuration, ensure you have:

- [ ] Supabase account with access to production project
- [ ] Project reference: `nrjcbdrzaxqvomeogptf` (or your project)
- [ ] PrivateEmail account credentials
  - Email: `support@wathaci.com`
  - Password: [Your SMTP password]
- [ ] DNS records configured and propagated (MX, SPF, DKIM, DMARC)
- [ ] Admin access to Supabase dashboard

**PrivateEmail SMTP Details:**
- Host: `mail.privateemail.com`
- Port: `465` (SSL/TLS)
- Username: `support@wathaci.com`
- Authentication: Password-based

---

## 2. Access Supabase Dashboard

### Step 1: Login to Supabase

1. **Navigate to:** https://supabase.com/dashboard

2. **Login with your credentials**
   - Email: [Your Supabase account email]
   - Password: [Your Supabase account password]
   - Or use OAuth (GitHub, Google, etc.)

3. **Enable Two-Factor Authentication (Recommended)**
   - Settings → Account → Security
   - Enable 2FA for additional security

### Step 2: Select Your Project

1. **From the dashboard home**, you'll see a list of your projects

2. **Click on your production project:**
   - Project Name: WATHACI-CONNECT.-V1
   - Project Reference: `nrjcbdrzaxqvomeogptf`
   - Or your specific project name

3. **Verify you're in the correct project:**
   - Check project name in top-left corner
   - Check project URL: `https://nrjcbdrzaxqvomeogptf.supabase.co`

---

## 3. Configure SMTP Settings

### Step 1: Navigate to SMTP Settings

1. **Click the gear icon (⚙️)** in the left sidebar
   - This opens "Project Settings"

2. **Click "Authentication"** in the left submenu

3. **Scroll down** to find the "SMTP Settings" section
   - If you don't see it, ensure you have the correct permissions
   - May be labeled "Email" or "SMTP" depending on Supabase version

### Step 2: Enable Custom SMTP

1. **Look for "Enable Custom SMTP" toggle**
   - By default, Supabase uses their built-in email service
   - Custom SMTP allows you to use your own email provider

2. **Toggle "Enable Custom SMTP" to ON**
   - Switch should turn green/blue
   - Additional configuration fields will appear

### Step 3: Configure SMTP Host and Port

**SMTP Host (Server):**
```
mail.privateemail.com
```

**SMTP Port:**
```
465
```

**What this means:**
- Port 465 uses SSL/TLS encryption from the start (implicit TLS)
- This is the most secure option for SMTP
- Alternative ports (587, 25) not recommended for PrivateEmail

**Enable SSL/TLS:**
- [ ] Check the "Enable SSL" checkbox (if present)
- Or select "SSL/TLS" from encryption dropdown
- This must be enabled for port 465

### Step 4: Configure Sender Information

**Sender Name:**
```
Wathaci
```
*This is the name that will appear in the "From" field of emails*

**Sender Email:**
```
support@wathaci.com
```
*This is the email address that will appear in the "From" field*

**What recipients see:**
```
From: Wathaci <support@wathaci.com>
```

### Step 5: Configure SMTP Authentication

**Username:**
```
support@wathaci.com
```
*For PrivateEmail, the username is your full email address*

**Password:**
```
[Your PrivateEmail password]
```
*Enter your PrivateEmail account password*

**⚠️ SECURITY NOTES:**
- This password is stored securely by Supabase (encrypted)
- Never share this password in Slack, email, or documentation
- Rotate password quarterly for security
- Use a strong, unique password (16+ characters recommended)

### Step 6: Save SMTP Configuration

1. **Click "Save" button** at the bottom of the SMTP settings section

2. **Wait for confirmation**
   - Success message should appear
   - "SMTP settings saved successfully" or similar

3. **Supabase will test the connection**
   - May take a few seconds
   - If successful, you'll see a green checkmark or success message
   - If failed, see Troubleshooting section

### Complete SMTP Configuration Summary

After completing, your configuration should look like:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SMTP SETTINGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Enable Custom SMTP:     [✓] ON

Sender Name:           Wathaci
Sender Email:          support@wathaci.com

SMTP Host:             mail.privateemail.com
SMTP Port:             465
Enable SSL/TLS:        [✓] ON

Username:              support@wathaci.com
Password:              ••••••••••••••••

[Save]  [Cancel]  [Test Connection]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 4. Configure Email Templates

Supabase provides several email templates for authentication flows. Customize each template to use Wathaci branding.

### Step 1: Access Email Templates

1. **Still in Authentication settings** (same page as SMTP)

2. **Scroll down** to find "Email Templates" section
   - May be on the same page or a separate tab
   - Look for "Templates" or "Email Templates"

### Step 2: Configure Confirmation Email Template

**Purpose:** Sent when a new user signs up

**Navigate to:**
- Click "Confirm your signup" or "Confirmation" template

**Customize:**

**Subject Line:**
```
Confirm your Wathaci account
```

**Email Body:**
You have two options:

**Option A: Use Custom HTML Template**
1. Copy content from: `supabase/templates/signup-confirmation.html`
2. Paste into the email body editor
3. Verify all variables are present: `{{ .ConfirmationURL }}`

**Option B: Use Supabase Editor**
1. Customize in Supabase's visual editor
2. Include:
   - Wathaci logo
   - Clear "Confirm Email" button
   - Confirmation link as fallback
   - Footer with support@wathaci.com
   - Help center link

**Template Variables:**
- `{{ .ConfirmationURL }}` - Full confirmation link
- `{{ .Token }}` - Confirmation token
- `{{ .SiteURL }}` - Application URL
- `{{ .Email }}` - User's email address

**Save:**
- Click "Save" button
- Test by signing up with a test account

### Step 3: Configure Password Reset Template

**Purpose:** Sent when user requests password reset

**Navigate to:**
- Click "Reset Password" or "Password Recovery" template

**Customize:**

**Subject Line:**
```
Reset your Wathaci password
```

**Email Body:**
- Copy from: `supabase/templates/password-reset.html`
- OR customize in editor with:
  - Wathaci logo
  - Clear "Reset Password" button
  - Security notice
  - Footer with support@wathaci.com

**Template Variables:**
- `{{ .ConfirmationURL }}` - Password reset link
- `{{ .Token }}` - Reset token
- `{{ .SiteURL }}` - Application URL

**Save:**
- Click "Save"
- Test with password reset flow

### Step 4: Configure Magic Link Template

**Purpose:** Sent for passwordless login (if enabled)

**Navigate to:**
- Click "Magic Link" template

**Customize:**

**Subject Line:**
```
Your Wathaci login code
```

**Email Body:**
- Copy from: `supabase/templates/magic-link.html`
- OR customize with:
  - OTP code or magic link
  - Expiration time (1 hour default)
  - Security notice
  - Footer with support@wathaci.com

**Template Variables:**
- `{{ .Token }}` - OTP code or token
- `{{ .ConfirmationURL }}` - Magic link URL
- `{{ .SiteURL }}` - Application URL

**Save and Test**

### Step 5: Configure Email Change Template

**Purpose:** Sent when user changes email address

**Navigate to:**
- Click "Email Change" or "Change Email" template

**Customize:**

**Subject Line:**
```
Confirm your email change
```

**Email Body:**
- Standard template with Wathaci branding
- Confirmation button
- Security notice
- Footer with support@wathaci.com

**Save and Test**

### Step 6: Configure Invite Email Template (Optional)

**Purpose:** Sent when admin invites a new user

**Navigate to:**
- Click "Invite User" template (if present)

**Customize:**
- Wathaci branding
- Clear invitation message
- Sign-up link
- Footer

### Email Template Checklist

After configuring all templates, verify:

- [ ] Confirmation email: Customized and saved
- [ ] Password reset email: Customized and saved
- [ ] Magic link email: Customized and saved
- [ ] Email change email: Customized and saved
- [ ] All templates include Wathaci logo
- [ ] All templates include support@wathaci.com in footer
- [ ] All templates include help center link
- [ ] Template variables properly formatted: `{{ .Variable }}`
- [ ] Subject lines clear and professional

---

## 5. Configure Rate Limits

Protect your email system from abuse by configuring appropriate rate limits.

### Step 1: Access Rate Limit Settings

1. **Still in Authentication settings**

2. **Look for "Rate Limits" section**
   - May be in the same page or separate tab
   - Look for "Security" or "Rate Limiting"

### Step 2: Configure Email Rate Limits

**Email Send Rate:**
```
Setting: Emails per hour
Recommended: 30-60 emails per hour
Development: 2-5 emails per hour (for testing)
```

**Token Verification Rate:**
```
Setting: OTP verifications per 5 minutes per IP
Recommended: 30 verifications
```

**Sign-up / Sign-in Rate:**
```
Setting: Sign-ups and sign-ins per 5 minutes per IP
Recommended: 30 attempts
```

### Step 3: Additional Security Settings

**Enable CAPTCHA (Recommended):**
- Navigate to: Authentication → CAPTCHA
- Enable hCaptcha or Turnstile
- Protect sign-up and password reset forms
- Reduces spam and abuse

**Session Settings:**
- JWT expiry: 3600 seconds (1 hour) default
- Refresh token rotation: Enabled
- Refresh token reuse interval: 10 seconds

### Rate Limit Checklist

- [ ] Email send rate configured (30-60/hour)
- [ ] Token verification rate configured (30/5min)
- [ ] Sign-up/sign-in rate configured (30/5min)
- [ ] CAPTCHA enabled (recommended)
- [ ] Session settings reviewed

---

## 6. Test Configuration

### Step 1: Test SMTP Connection

Some Supabase versions provide a "Test Connection" or "Send Test Email" button.

**If available:**
1. Click "Test Connection" button
2. Enter your test email address
3. Check inbox for test email
4. Verify: From address is support@wathaci.com

**If not available:**
- Proceed to Step 2 (test with real flow)

### Step 2: Test Sign-up Flow

**Most reliable test:**

1. **Navigate to your production site:**
   ```
   https://wathaci.com/signup
   ```

2. **Create a test account:**
   - Use a real email address you can access
   - Complete sign-up form
   - Submit

3. **Check email inbox:**
   - Should receive confirmation email within 30 seconds
   - From: Wathaci <support@wathaci.com>
   - Subject: Confirm your Wathaci account

4. **Verify email content:**
   - [ ] Logo displays correctly
   - [ ] "Confirm Email" button present
   - [ ] Confirmation link works
   - [ ] Footer includes support@wathaci.com
   - [ ] Footer includes help center link

5. **Click confirmation link:**
   - Should redirect to success page
   - User should now be able to log in

### Step 3: Test Password Reset Flow

1. **Navigate to:**
   ```
   https://wathaci.com/forgot-password
   ```

2. **Enter test email address**

3. **Check inbox:**
   - Password reset email should arrive
   - From: Wathaci <support@wathaci.com>

4. **Verify reset link works:**
   - Click link
   - Should redirect to password reset form
   - Enter new password
   - Verify password changed

### Step 4: Check Email Headers

**Verify authentication:**

1. Open test email in Gmail (or other provider)

2. View email source:
   - Gmail: Three dots → "Show original"

3. Look for "Authentication-Results":
   ```
   spf=pass
   dkim=pass
   dmarc=pass
   ```

4. All three should show "pass"

### Step 5: Check Supabase Logs

1. **Navigate to:**
   - Supabase Dashboard → Logs → Auth Logs

2. **Look for email send events:**
   - Should see successful email sends
   - No SMTP errors
   - No authentication failures

3. **If errors present:**
   - See Troubleshooting section below

### Testing Checklist

- [ ] SMTP connection test: Success
- [ ] Sign-up confirmation email: Received
- [ ] Password reset email: Received
- [ ] Email authentication (SPF/DKIM/DMARC): Pass
- [ ] Email arrives in inbox (not spam)
- [ ] All links work correctly
- [ ] Branding correct
- [ ] No errors in Supabase logs

---

## 7. Verification Checklist

### Complete Configuration Verification

Use this checklist to ensure everything is configured correctly:

**Supabase Dashboard - SMTP Settings:**
- [ ] Custom SMTP: Enabled
- [ ] SMTP Host: mail.privateemail.com
- [ ] SMTP Port: 465
- [ ] SSL/TLS: Enabled
- [ ] Sender Name: Wathaci
- [ ] Sender Email: support@wathaci.com
- [ ] Username: support@wathaci.com
- [ ] Password: Set (shows as ••••••••)
- [ ] Configuration saved successfully
- [ ] No error messages

**Supabase Dashboard - Email Templates:**
- [ ] Confirmation template: Customized with Wathaci branding
- [ ] Password reset template: Customized with Wathaci branding
- [ ] Magic link template: Customized with Wathaci branding
- [ ] Email change template: Customized with Wathaci branding
- [ ] All templates include support@wathaci.com in footer
- [ ] All templates saved successfully

**Supabase Dashboard - Rate Limits:**
- [ ] Email send rate: 30-60 per hour
- [ ] Token verification rate: 30 per 5 min
- [ ] Sign-up rate: 30 per 5 min
- [ ] CAPTCHA: Configured (recommended)

**Email Testing:**
- [ ] Test sign-up email: Sent and received
- [ ] Test password reset email: Sent and received
- [ ] Email arrives in inbox (not spam)
- [ ] SPF authentication: Pass
- [ ] DKIM authentication: Pass
- [ ] DMARC authentication: Pass
- [ ] All links work correctly
- [ ] Responsive design works (mobile and desktop)

**Supabase Logs:**
- [ ] No SMTP errors in logs
- [ ] Email send events logged successfully
- [ ] No authentication failures
- [ ] No rate limit errors

**DNS Records (External to Supabase):**
- [ ] MX record: mail.privateemail.com
- [ ] SPF record: v=spf1 include:_spf.privateemail.com ~all
- [ ] DKIM record: Configured with public key
- [ ] DMARC record: v=DMARC1; p=quarantine; ...
- [ ] All records verified with dig/online tools
- [ ] DNS propagation complete

**Final Verification:**
- [ ] All checklist items above marked complete
- [ ] No errors or warnings in Supabase dashboard
- [ ] Test emails delivered successfully
- [ ] Authentication passing (SPF/DKIM/DMARC)
- [ ] Support mailbox (support@wathaci.com) accessible
- [ ] Team briefed on email configuration

---

## 8. Troubleshooting

### Issue: "SMTP Connection Failed"

**Symptoms:**
- Error message when saving SMTP settings
- "Could not connect to SMTP server"
- "Authentication failed"

**Diagnosis:**

1. **Verify SMTP credentials:**
   - Host: `mail.privateemail.com` (no typos)
   - Port: `465` (not 587 or 25)
   - Username: `support@wathaci.com` (full email)
   - Password: Correct PrivateEmail password

2. **Test credentials directly:**
   - Login to PrivateEmail webmail: https://privateemail.com
   - Ensure account is active and not locked
   - Verify password is correct

3. **Check PrivateEmail account status:**
   - Login to Namecheap account
   - Navigate to PrivateEmail
   - Ensure account is active (not suspended or expired)
   - Check for any restrictions

**Solutions:**

- **Wrong password:**
  - Reset password in Namecheap/PrivateEmail control panel
  - Update password in Supabase dashboard

- **Account locked:**
  - Too many failed login attempts
  - Contact Namecheap support to unlock

- **SSL/TLS not enabled:**
  - Ensure "Enable SSL" checkbox is checked
  - Port 465 requires SSL/TLS

- **Firewall/Network issues:**
  - Supabase servers may have connectivity issues
  - Contact Supabase support if persistent

### Issue: Emails Not Sending

**Symptoms:**
- SMTP connection successful, but emails don't arrive
- No emails in inbox or spam
- Supabase logs show errors

**Diagnosis:**

1. **Check Supabase logs:**
   ```
   Dashboard → Logs → Auth Logs
   Look for email send events and errors
   ```

2. **Check PrivateEmail logs:**
   - Login to PrivateEmail
   - Check sent mail folder
   - Check for bounce messages

3. **Check rate limits:**
   - May have exceeded hourly email limit
   - Review rate limit settings

**Solutions:**

- **Rate limit exceeded:**
  - Wait for rate limit to reset (usually 1 hour)
  - Increase rate limit in settings
  - Implement email queue if needed

- **DNS issues:**
  - Verify DNS records configured (see DNS_RECORDS_SETUP_GUIDE.md)
  - Ensure DNS propagated (can take 24-48 hours)

- **Email blocked by recipient:**
  - Check spam folder
  - Verify SPF/DKIM/DMARC configured
  - Use Mail-Tester to check deliverability score

### Issue: Emails Going to Spam

**Symptoms:**
- Emails arriving in spam/junk folder
- Recipients not seeing emails
- Low deliverability

**Diagnosis:**

1. **Check email authentication:**
   - View email source/headers
   - Look for SPF, DKIM, DMARC results
   - Should all show "pass"

2. **Test with Mail-Tester:**
   - https://www.mail-tester.com/
   - Send email to test address
   - Review score and recommendations

**Solutions:**

- **SPF failing:**
  - Verify SPF DNS record
  - Ensure includes PrivateEmail: `include:_spf.privateemail.com`
  - Check: `dig TXT wathaci.com | grep spf`

- **DKIM failing:**
  - Verify DKIM DNS record
  - Check: `dig TXT default._domainkey.wathaci.com`
  - Ensure matches key from PrivateEmail

- **DMARC failing:**
  - Verify DMARC DNS record
  - Check: `dig TXT _dmarc.wathaci.com`
  - Ensure SPF or DKIM passes first

- **Content issues:**
  - Review email template HTML
  - Avoid spam trigger words
  - Ensure proper HTML structure
  - Include unsubscribe link for bulk emails

### Issue: Template Variables Not Working

**Symptoms:**
- Confirmation links don't work
- Template shows `{{ .ConfirmationURL }}` literally
- Variables not replaced

**Solutions:**

- **Check variable syntax:**
  - Must be exactly: `{{ .VariableName }}`
  - Note the space after {{ and before }}
  - Note the dot before VariableName

- **Available variables:**
  - `{{ .ConfirmationURL }}`
  - `{{ .Token }}`
  - `{{ .SiteURL }}`
  - `{{ .Email }}`

- **Site URL not set:**
  - Check: Authentication → URL Configuration
  - Ensure Site URL set: `https://wathaci.com`
  - Ensure Redirect URLs include your domain

### Issue: "From" Address Not Matching

**Symptoms:**
- Emails show different "From" address
- Not showing "Wathaci <support@wathaci.com>"

**Solutions:**

- **Check Sender Email:**
  - Must be: `support@wathaci.com`
  - No typos

- **Check Sender Name:**
  - Must be: `Wathaci`
  - This is the display name

- **Clear cache:**
  - Email client may cache sender information
  - Wait 24 hours or test with different email provider

### Getting Help

**Supabase Support:**
- Dashboard: Click "?" icon → "Contact Support"
- Email: support@supabase.com
- Community: https://github.com/supabase/supabase/discussions

**PrivateEmail Support:**
- Namecheap Support: https://www.namecheap.com/support/
- Submit ticket via Namecheap account
- Live chat (during business hours)

**Wathaci Internal Support:**
- Email: support@wathaci.com
- Documentation: EMAIL_SYSTEM_CONFIGURATION.md

---

## Appendix: Screenshots Reference

**Note:** Since this is a text document, we cannot include actual screenshots. When performing these steps, you should see:

**SMTP Settings Page:**
- Section labeled "SMTP Settings" or "Email"
- Toggle for "Enable Custom SMTP"
- Fields for Host, Port, Username, Password
- Dropdown or checkbox for SSL/TLS
- Fields for Sender Name and Sender Email
- Save/Cancel buttons

**Email Templates Page:**
- List of template types (Confirmation, Reset, Magic Link, etc.)
- Click each to edit
- Rich text or HTML editor
- Subject line field
- Template variable reference
- Preview button (may be available)
- Save button

**Rate Limits Page:**
- Section labeled "Rate Limits" or "Security"
- Sliders or input fields for various rate limits
- Descriptions of each limit
- Save button

---

## Quick Reference Card

**Copy this for quick access when configuring:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WATHACI EMAIL CONFIGURATION - QUICK REFERENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SMTP HOST:        mail.privateemail.com
SMTP PORT:        465
SSL/TLS:          ENABLED
USERNAME:         support@wathaci.com
PASSWORD:         [Your PrivateEmail password]

SENDER NAME:      Wathaci
SENDER EMAIL:     support@wathaci.com

RATE LIMITS:
  Emails/hour:    30-60
  OTP/5min:       30
  Sign-up/5min:   30

DNS RECORDS:
  MX:    mail.privateemail.com (priority 10)
  SPF:   v=spf1 include:_spf.privateemail.com ~all
  DKIM:  default._domainkey → [public key]
  DMARC: v=DMARC1; p=quarantine; rua=mailto:support@wathaci.com

TESTING:
  Mail-Tester:     https://www.mail-tester.com/
  DKIM Validator:  https://dkimvalidator.com/
  MXToolbox:       https://mxtoolbox.com/

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-17  
**Owner:** DevOps Team  
**Contact:** support@wathaci.com
