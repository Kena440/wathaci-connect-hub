# Email Delivery Configuration Guide

## Overview

This document provides comprehensive instructions for configuring email delivery for the Wathaci platform using `support@wathaci.com` as the official email address for all platform communications.

## Email Address Usage

**Primary Platform Email:** `support@wathaci.com`

This email address is used for:
- Sign-up confirmation emails
- Email verification
- Password reset emails
- OTP / magic-link emails
- Transactional notifications (alerts, receipts, system messages)
- Admin/system notifications
- Any automated outgoing email
- User replies and support inquiries

## SMTP Configuration

### Provider: PrivateEmail (Namecheap)

The platform uses PrivateEmail hosted by Namecheap for SMTP email delivery.

### SMTP Settings

**Incoming Server Settings (IMAP):**
- **Server:** mail.privateemail.com
- **Port:** 993
- **Username:** support@wathaci.com
- **Connection:** SSL/TLS
- **Password:** Your account password (stored in environment secrets)

**Outgoing Server Settings (SMTP):**
- **Server:** mail.privateemail.com
- **Port:** 587
- **Username:** support@wathaci.com
- **Connection:** STARTTLS (explicit TLS)
- **Password:** PrivateEmail **app password** (not the mailbox login)

## Environment Variables

Add the following environment variables to your `.env.local` and `.env.production` files:

```bash
# Email / SMTP Configuration
SMTP_HOST="mail.privateemail.com"
SMTP_PORT="587" # STARTTLS
SMTP_USER="support@wathaci.com"
SMTP_PASSWORD="<your PrivateEmail app password>"
SMTP_FROM_EMAIL="support@wathaci.com"
SMTP_FROM_NAME="Wathaci"

# Supabase Email Configuration
SUPABASE_SMTP_ADMIN_EMAIL="support@wathaci.com"
SUPABASE_SMTP_SENDER_NAME="Wathaci"
```

⚠️ **Security Note:** Never commit actual passwords to version control. Store them securely in:
- Local development: `.env.local` (gitignored)
- Production: Vercel environment variables or Supabase secrets

## Supabase Configuration

### Local Development

1. Update `supabase/config.toml` to enable SMTP:

```toml
[auth.email.smtp]
enabled = true
host = "mail.privateemail.com"
port = 587
user = "support@wathaci.com"
pass = "env(SMTP_PASSWORD)"
admin_email = "support@wathaci.com"
sender_name = "Wathaci"
```

2. Start Supabase locally:
```bash
npm run supabase:start
```

### Production Configuration

1. Log in to your Supabase dashboard
2. Navigate to: **Project Settings → Authentication → SMTP Settings**
3. Enable custom SMTP
4. Configure the following (use the PrivateEmail **app password**):
   - **Sender email:** support@wathaci.com
   - **Sender name:** Wathaci
   - **Host:** mail.privateemail.com
   - **Port:** 587
   - **Username:** support@wathaci.com
   - **Password:** [PrivateEmail app password]
   - **Enable STARTTLS/SSL:** Enabled (STARTTLS on port 587)

5. Navigate to: **Project Settings → Authentication → Email Templates**
6. Update each template (Confirmation, Reset Password, Magic Link, etc.) to use:
   - **From:** support@wathaci.com
   - **Reply-to:** support@wathaci.com
   - Include the support footer in all templates

7. In **Authentication → URL Configuration**, allow the application redirect URLs:
   - `http://localhost:3000`
   - `https://wathaci-connect-platform-8fy8qoekg-amukenas-projects.vercel.app`
   - `https://wathaci-connect-platform-8fy8qoekg-amukenas-projects.vercel.app/signin`
   - `https://app.wathaci.com` and `https://app.wathaci.com/signin` (production)

## DNS Configuration

### Current DNS Records for wathaci.com

**DNS Provider:** Namecheap

#### DKIM Record

Add the following TXT record for email authentication:

**Record Type:** TXT  
**Host:** default._domainkey  
**Value:**
```
v=DKIM1;k=rsa;p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAy3Mb9SuoMAr5pIztL+UCHzhb3fktj2Qf5NGgRBECmM9vAkgh9ZiutJYq2ShZBrw28PuuQlcWAqNOVB3Ku8TaELewfZf1fNI8ladYWVcJPkpUcvxM4QRqouVH6BNoaJU+vtIfXMCiUi1f608avzldEzt9A6SYJw+/3bf28NdeUyL/BLqNGPK0DDMnpQ6YMnfHy4qkB29GD2XmtSO/L00IIaJ3pKzXJMv5h626fBmSRDJwAWdl+i3NaXidxioLDWXDgJ0aYU888Nn+Foy2le7bTNm9ezOn5X19TDCzuSTWcy0Og8lE8uv+clZzy0ocB1/1KI2D4cOomls7OEAgYeXPowIDAQAB
```

#### SPF Record

Add or update the following TXT record for sender verification:

**Record Type:** TXT  
**Host:** @  
**Value:**
```
v=spf1 include:_spf.privateemail.com ~all
```

This authorizes PrivateEmail servers to send emails on behalf of wathaci.com.

#### DMARC Record

Add the following TXT record for email authentication policy:

**Record Type:** TXT  
**Host:** _dmarc  
**Value:**
```
v=DMARC1; p=quarantine; rua=mailto:support@wathaci.com; ruf=mailto:support@wathaci.com; fo=1
```

Explanation:
- `p=quarantine`: Quarantine emails that fail authentication
- `rua`: Aggregate reports sent to support@wathaci.com
- `ruf`: Forensic reports sent to support@wathaci.com
- `fo=1`: Generate reports if any authentication mechanism fails

#### MX Records

Ensure MX records point to PrivateEmail servers (should already be configured by Namecheap):

**Record Type:** MX  
**Host:** @  
**Priority:** 10  
**Value:** mail.privateemail.com

### DNS Verification

After adding DNS records, verify them using:

1. **SPF Check:**
   ```bash
   dig txt wathaci.com | grep spf
   ```

2. **DKIM Check:**
   ```bash
   dig txt default._domainkey.wathaci.com
   ```

3. **DMARC Check:**
   ```bash
   dig txt _dmarc.wathaci.com
   ```

4. **Online Tools:**
   - [MXToolbox](https://mxtoolbox.com/)
   - [Mail-Tester](https://www.mail-tester.com/)
   - [DMARC Analyzer](https://www.dmarcanalyzer.com/)

## Email Templates

Custom email templates are located in `supabase/templates/`:

- `signup-confirmation.html` - Welcome email with email confirmation link
- `password-reset.html` - Password reset email
- `magic-link.html` - One-time password / magic link email
- `email-footer.html` - Reusable footer component for all emails

All templates include:
- Wathaci branding and logo
- Support contact information (support@wathaci.com)
- Help center link (https://wathaci.com/help)
- Professional styling with responsive design

### Template Customization

To customize email templates:

1. Edit the HTML files in `supabase/templates/`
2. Test locally using Supabase local development
3. Deploy to production via Supabase dashboard or CLI

## Testing Procedures

### Local Testing

1. Start Supabase locally:
   ```bash
   npm run supabase:start
   ```

2. Access the local email testing server (Inbucket):
   - Open: http://localhost:54324
   - All emails sent locally will appear here

3. Test email flows:
   - Sign up with a new account
   - Request password reset
   - Request magic link login

### Production Testing

1. **Sign-up Confirmation:**
   - Create a test account
   - Verify email arrives from support@wathaci.com
   - Check spam folder if not in inbox
   - Verify DKIM/SPF pass (check email headers)
   - Confirm all links work correctly

2. **Password Reset:**
   - Request password reset
   - Verify email from support@wathaci.com
   - Test reset link functionality
   - Verify branding is correct

3. **OTP/Magic Link:**
   - Request OTP login
   - Verify delivery time (should be within seconds)
   - Test code/link functionality

4. **Deliverability Check:**
   - Send test emails to:
     - Gmail
     - Outlook/Hotmail
     - Yahoo
     - iCloud
   - Verify inbox placement (not spam)
   - Check email headers for SPF/DKIM/DMARC status

### Email Header Analysis

To verify authentication:

1. Receive test email
2. View email source/headers
3. Look for:
   ```
   Authentication-Results: ... spf=pass ... dkim=pass ... dmarc=pass
   ```

## Troubleshooting

### Emails Not Sending

1. **Check SMTP credentials:**
   - Verify username and password in Supabase settings
   - Test credentials directly with email client

2. **Check Supabase logs:**
   ```bash
   npm run supabase:logs
   ```

3. **Verify environment variables:**
   - Ensure SMTP_PASSWORD is set correctly
   - Check for typos in configuration

### Emails Going to Spam

1. **Verify DNS records:**
   - Ensure SPF, DKIM, and DMARC are configured correctly
   - Allow 24-48 hours for DNS propagation

2. **Check email content:**
   - Avoid spam trigger words
   - Include unsubscribe link for bulk emails
   - Use proper HTML structure

3. **Warm up domain:**
   - Gradually increase email volume
   - Monitor bounce and complaint rates

### Authentication Failures

1. **Check DKIM signature:**
   - Verify DKIM record matches key provided by PrivateEmail
   - Ensure no typos in DNS configuration

2. **Check SPF alignment:**
   - Verify SPF record includes PrivateEmail servers
   - Ensure "From" address matches domain

## Reply Handling

Emails to `support@wathaci.com` should:

1. **Current Setup:**
   - Mailbox hosted on PrivateEmail
   - Accessible via IMAP/webmail

2. **Recommended Integration:**
   - Forward to help desk system (optional):
     - HelpScout
     - Freshdesk
     - Zendesk
   - Configure email-to-ticket automation

3. **Access Support Mailbox:**
   - Webmail: https://privateemail.com
   - IMAP client configuration (see SMTP Settings above)

## Platform Email Readiness Checklist

Use this checklist to verify complete email configuration:

- [ ] All Supabase auth emails use support@wathaci.com
- [ ] All transactional emails use support@wathaci.com
- [ ] All email template footers updated
- [ ] No references to old domains (wathaci.org)
- [ ] No references to other email addresses (info@, help@, noreply@)
- [ ] SMTP configured in Supabase dashboard
- [ ] Environment variables set in production
- [ ] SPF DNS record configured
- [ ] DKIM DNS record configured
- [ ] DMARC DNS record configured
- [ ] DNS records verified using dig/online tools
- [ ] Test emails sent to all major providers (Gmail, Outlook, Yahoo, iCloud)
- [ ] Emails deliver to inbox (not spam)
- [ ] Email authentication passes (SPF, DKIM, DMARC)
- [ ] Reply-to address set to support@wathaci.com
- [ ] Support mailbox accessible and monitored
- [ ] Email templates tested in development
- [ ] Email templates deployed to production
- [ ] Both dev and production environments match
- [ ] Documentation updated and complete

## Security Best Practices

1. **Credentials Management:**
   - Store SMTP password in environment secrets
   - Rotate passwords regularly
   - Use strong, unique passwords

2. **Access Control:**
   - Limit access to SMTP credentials
   - Monitor unauthorized access attempts
   - Enable 2FA for PrivateEmail account

3. **Email Authentication:**
   - Keep DKIM keys secure
   - Monitor DMARC reports
   - Act on authentication failures

4. **Rate Limiting:**
   - Configure Supabase rate limits for auth emails
   - Monitor for abuse/spam
   - Implement CAPTCHA for high-risk actions

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase SMTP Configuration](https://supabase.com/docs/guides/auth/auth-smtp)
- [PrivateEmail Support](https://www.namecheap.com/support/knowledgebase/subcategory/68/privateemail/)
- [SPF Record Syntax](https://dmarcian.com/spf-syntax-table/)
- [DKIM Overview](https://dkim.org/)
- [DMARC Guide](https://dmarc.org/overview/)

## Support

For questions or issues with email configuration, contact:
- **Email:** support@wathaci.com
- **Help Center:** https://wathaci.com/help
