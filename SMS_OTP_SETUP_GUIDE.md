# SMS OTP Setup Guide

## Overview

This guide explains how to configure SMS OTP (One-Time Password) for user authentication in the Wathaci platform. Users can now choose to receive verification codes via SMS during signup instead of email.

## Features Added

1. **Email Confirmation Enabled**: Email confirmations are now properly enabled for new user signups
2. **SMS OTP Support**: Users can receive verification codes via SMS to their mobile phones
3. **Flexible Authentication**: Users can choose between email or SMS verification during signup
4. **Mobile Number Collection**: Optional mobile number field in signup form

## Configuration

### 1. Supabase Configuration

The following changes have been made to `supabase/config.toml`:

#### Email Confirmations (Line 176)
```toml
[auth.email]
enable_confirmations = true  # Changed from false to true
```

#### Custom Email Templates
Email templates are now enabled with proper subjects:
```toml
[auth.email.template.confirmation]
subject = "Confirm your email address - Wathaci"
content_path = "./supabase/templates/signup-confirmation.html"
```

#### SMS Configuration (Lines 217-225)
```toml
[auth.sms]
enable_signup = true
enable_confirmations = true
template = "Your Wathaci verification code is {{ .Code }}. Valid for 10 minutes."
max_frequency = "60s"
```

#### Twilio Provider (Lines 249-254)
```toml
[auth.sms.twilio]
enabled = true
account_sid = "env(TWILIO_ACCOUNT_SID)"
message_service_sid = "env(TWILIO_MESSAGE_SERVICE_SID)"
auth_token = "env(TWILIO_AUTH_TOKEN)"
```

### 2. Environment Variables

Add the following environment variables to your `.env.local` and `.env.production` files:

#### For Local Development (.env.local)
```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_MESSAGE_SERVICE_SID="your-twilio-message-service-sid"

# SMTP Configuration (already configured)
SMTP_PASSWORD="your-smtp-password"
```

#### For Production (.env.production)
```bash
# Twilio Configuration (use production credentials)
TWILIO_ACCOUNT_SID="your-production-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-production-twilio-auth-token"
TWILIO_MESSAGE_SERVICE_SID="your-production-twilio-message-service-sid"
```

### 3. Twilio Setup

To enable SMS OTP, you need to set up a Twilio account:

1. **Create a Twilio Account**
   - Go to [https://www.twilio.com/](https://www.twilio.com/)
   - Sign up for a free trial account (includes $15 credit)
   - Verify your email and phone number

2. **Get Your Credentials**
   - Navigate to the [Twilio Console](https://console.twilio.com/)
   - Find your Account SID and Auth Token on the dashboard
   - Copy these values to your environment variables

3. **Set Up Messaging Service**
   - Go to Messaging → Services in the Twilio Console
   - Click "Create Messaging Service"
   - Choose a friendly name (e.g., "Wathaci OTP")
   - Select "Notify my users" as the use case
   - Add a sender (phone number or Sender ID)
   - Copy the Messaging Service SID to your environment variables

4. **Get a Phone Number** (for trial accounts)
   - Go to Phone Numbers → Manage → Buy a number
   - Choose a number from your country (Zambia: +260)
   - For trial accounts, you can only send SMS to verified numbers

5. **For Production**
   - Upgrade your Twilio account to send SMS to any number
   - Consider using Twilio's Messaging Services for better deliverability
   - Set up proper error monitoring and logging

### 4. Supabase Dashboard Configuration (Production)

For production deployments, configure SMS settings in the Supabase Dashboard:

1. Log in to your Supabase Dashboard
2. Navigate to: **Authentication → Providers**
3. Enable **Phone** provider
4. Select **Twilio** as the SMS provider
5. Enter your production Twilio credentials:
   - Account SID
   - Auth Token
   - Message Service SID (or Phone Number)
6. Customize the SMS template if needed
7. Save the configuration

## User Experience

### Signup Flow

1. User fills in the signup form with:
   - Full name
   - Email address
   - Password
   - Mobile number (optional)

2. If mobile number is provided:
   - User sees an option to "Send verification code via SMS instead of email"
   - User can check this option to receive SMS OTP

3. After submission:
   - **Email verification**: User receives confirmation email (default)
   - **SMS verification**: User receives SMS with OTP code (if selected)

4. User verifies their account:
   - **Email**: Click the confirmation link in the email
   - **SMS**: Enter the OTP code received via SMS

### Form Changes

The `SignupForm.tsx` component now includes:

```typescript
// Mobile number field (optional)
<Input
  id="mobileNumber"
  type="tel"
  placeholder="+260 XXX XXXXXX"
  autoComplete="tel"
  {...register("mobileNumber")}
/>

// SMS OTP option (appears when mobile number is provided)
<Checkbox
  id="useSmsOtp"
  checked={useSmsOtp}
  label="Send verification code via SMS instead of email"
/>
```

## Testing

### Local Testing

1. Start Supabase locally:
   ```bash
   npm run supabase:start
   ```

2. For SMS testing without Twilio:
   - Use Supabase's test OTP feature
   - Add test phone numbers in `supabase/config.toml`:
   ```toml
   [auth.sms.test_otp]
   "+260971234567" = "123456"
   ```

3. Test email confirmations:
   - Emails are captured by Inbucket (local email server)
   - Access at: http://localhost:54324

### Production Testing

1. Use a test Twilio account initially
2. Test with verified phone numbers
3. Monitor Twilio logs for delivery status
4. Verify SMS delivery and OTP validation
5. Check Supabase logs for any errors

## Troubleshooting

### Email Confirmations Not Received

1. Check SMTP configuration in Supabase Dashboard
2. Verify SMTP password in environment variables
3. Check spam folder
4. Review Supabase Auth logs for errors
5. Ensure `enable_confirmations = true` in config.toml

### SMS Not Received

1. Verify Twilio credentials are correct
2. Check Twilio account balance
3. For trial accounts, ensure recipient number is verified
4. Check Twilio logs in console for error messages
5. Verify phone number format includes country code (+260)
6. Check Supabase logs for SMS provider errors

### Invalid Phone Number Error

- Ensure phone number includes country code
- Format: +260XXXXXXXXX (for Zambia)
- No spaces or special characters in the actual submission
- Validation regex: `/^\+?[1-9]\d{1,14}$/`

## Cost Considerations

### Twilio Pricing (as of 2024)

- **Trial Account**: $15 credit, SMS to verified numbers only
- **SMS Pricing**: Varies by country
  - Zambia (ZM): ~$0.02 - $0.05 per SMS
  - Check [Twilio Pricing](https://www.twilio.com/sms/pricing) for exact rates
- **Message Service**: No additional cost
- **Phone Number**: ~$1/month per number

### Recommendations

1. **Development**: Use test OTP configuration
2. **Staging**: Use Twilio trial account with verified numbers
3. **Production**: 
   - Budget for SMS costs based on expected user signups
   - Monitor usage via Twilio Console
   - Set up usage alerts to avoid unexpected charges
   - Consider email as primary method, SMS as fallback

## Security Considerations

1. **Rate Limiting**: Configured to 60s between SMS sends to prevent abuse
2. **OTP Expiry**: OTP codes expire after 60 minutes (3600 seconds)
3. **Environment Variables**: Never commit Twilio credentials to version control
4. **Phone Number Validation**: Client-side and server-side validation
5. **Supabase RLS**: Ensure Row Level Security policies are properly configured

## Support

For issues or questions:
- Email: support@wathaci.com
- Review Supabase documentation: https://supabase.com/docs/guides/auth/phone-login
- Review Twilio documentation: https://www.twilio.com/docs/sms

## Summary

✅ Email confirmations are now enabled
✅ SMS OTP support added via Twilio
✅ Users can choose email or SMS verification
✅ Mobile number collection added to signup form
✅ Environment configuration documented
✅ Production-ready with proper error handling
