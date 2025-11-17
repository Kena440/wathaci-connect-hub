# OTP Configuration Guide - SMS and WhatsApp Verification

This guide provides detailed instructions for configuring OTP (One-Time Password) verification via SMS and WhatsApp using Twilio for the WATHACI CONNECT platform.

## Overview

The OTP system allows users to verify their phone numbers during:
- Sign-up (optional SMS-based authentication)
- Profile verification
- Two-factor authentication
- Password reset

## Prerequisites

1. **Twilio Account** - Sign up at [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. **Verified Phone Number** - At least one phone number for testing
3. **Supabase Database** - OTP verifications table must be migrated
4. **Backend API** - Running with proper environment variables

## Step 1: Create Twilio Account and Get Credentials

### 1.1 Sign Up for Twilio

1. Go to [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Create a free account
3. Verify your email and phone number

### 1.2 Get Account Credentials

After signing up, you'll need:

1. **Account SID**: Found in Twilio Console dashboard
2. **Auth Token**: Found in Twilio Console dashboard (click "Show" to reveal)

Navigate to: [https://console.twilio.com/](https://console.twilio.com/)

## Step 2: Set Up Phone Number for SMS

### 2.1 Get a Twilio Phone Number

1. In Twilio Console, go to **Phone Numbers** → **Manage** → **Buy a number**
2. Select your country (e.g., Zambia +260)
3. Check **SMS** capability
4. Click **Search** and choose a number
5. Click **Buy** (free trial accounts get one number for free)

### 2.2 Configure SMS Messaging

1. Go to **Phone Numbers** → **Manage** → **Active numbers**
2. Click on your phone number
3. Under **Messaging**, configure:
   - **A message comes in**: Leave as default or configure webhook (optional)
   - Note: SMS sending is enabled by default

## Step 3: Set Up WhatsApp (Optional)

### 3.1 WhatsApp Sandbox (Development/Testing)

For development and testing, use Twilio's WhatsApp Sandbox:

1. Go to **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Follow instructions to join the sandbox:
   - Send the provided join code to the sandbox number
   - Example: Send "join <code>" to whatsapp:+14155238886
3. Note the sandbox number (format: `whatsapp:+14155238886`)

### 3.2 WhatsApp Business API (Production)

For production use, you need to:

1. Apply for WhatsApp Business API access
2. Get your WhatsApp Business number approved
3. This process can take several days

**For now, use the sandbox for testing.**

## Step 4: Configure Environment Variables

### 4.1 Backend Environment Variables

Update `backend/.env` or `backend/.env.production`:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your-auth-token-here"
TWILIO_PHONE_NUMBER="+1234567890"
TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"
```

**Important:**
- Replace `ACxxxx...` with your actual Account SID
- Replace `your-auth-token-here` with your actual Auth Token
- Use your Twilio phone number in E.164 format (e.g., +12345678901)
- For WhatsApp sandbox, use `whatsapp:+14155238886`

### 4.2 Frontend Environment Variables (Optional)

If you need to display configuration info in the frontend:

```bash
# Frontend .env
VITE_OTP_ENABLED="true"
```

## Step 5: Database Migration

Ensure the OTP tables are created:

```bash
# Run database migrations
npm run supabase:push
```

Or manually apply migrations:
- `supabase/migrations/20250317100000_create_otp_verifications.sql`
- `supabase/migrations/20251117093000_add_otp_challenges.sql`

## Step 6: Test OTP Functionality

### 6.1 Start Backend Server

```bash
cd backend
npm start
```

The server should show:
```
[TwilioClient] Twilio client initialized successfully
```

### 6.2 Test SMS OTP

Using cURL or Postman:

```bash
# Send OTP via SMS
curl -X POST http://localhost:3000/api/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+260971234567",
    "channel": "sms"
  }'

# Expected response:
# {
#   "ok": true,
#   "message": "OTP sent successfully",
#   "expiresAt": "2024-03-17T10:30:00Z"
# }
```

### 6.3 Verify OTP Code

```bash
# Verify OTP
curl -X POST http://localhost:3000/api/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+260971234567",
    "channel": "sms",
    "code": "123456"
  }'

# Expected response:
# {
#   "ok": true,
#   "message": "OTP verified successfully",
#   "phoneVerified": true
# }
```

### 6.4 Test WhatsApp OTP

First, join the WhatsApp sandbox by sending the join code to the sandbox number.

```bash
# Send OTP via WhatsApp
curl -X POST http://localhost:3000/api/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+260971234567",
    "channel": "whatsapp"
  }'
```

Check your WhatsApp for the verification code.

## Step 7: Frontend Integration

The frontend already has OTP integration in the signup form:

1. Users enter their mobile number
2. They can choose to receive verification via SMS
3. The verification code is sent to their phone
4. They enter the code to verify their account

## OTP Configuration Options

### Message Customization

To customize OTP messages, edit `backend/services/otp-service.js`:

```javascript
const messageBody = `Your Wathaci verification code is ${otpCode}. It expires in ${OTP_EXPIRY_MINUTES} minutes. Do not share this code with anyone.`;
```

### OTP Settings

Default settings in `backend/services/otp-service.js`:

```javascript
const OTP_LENGTH = 6;              // 6-digit code
const OTP_EXPIRY_MINUTES = 10;     // 10-minute expiration
const MAX_ATTEMPTS = 5;             // Maximum verification attempts
```

## Security Best Practices

1. **Never expose Twilio credentials** in frontend code or version control
2. **Use environment variables** for all sensitive configuration
3. **Enable rate limiting** on OTP endpoints (already configured)
4. **Monitor usage** in Twilio Console to prevent abuse
5. **Use HTTPS** in production for all API endpoints
6. **Validate phone numbers** before sending OTP
7. **Log failed attempts** for security monitoring

## Troubleshooting

### Issue: "Twilio not configured"

**Solution:** Ensure environment variables are set:
```bash
# Check if variables are loaded
cd backend
node -e "console.log(process.env.TWILIO_ACCOUNT_SID)"
```

### Issue: "SMS service is not configured"

**Solution:** Set `TWILIO_PHONE_NUMBER` in backend/.env

### Issue: "WhatsApp service is not configured"

**Solution:** Set `TWILIO_WHATSAPP_FROM` in backend/.env and join the sandbox

### Issue: OTP not received

**Checklist:**
1. Phone number is in E.164 format (+260XXXXXXXXX)
2. Phone number is verified in Twilio (for trial accounts)
3. Backend server is running
4. Twilio credentials are correct
5. Check Twilio Console logs for delivery status

### Issue: "Failed to send OTP"

**Common causes:**
1. Invalid phone number format
2. Unverified phone number (trial accounts)
3. Insufficient Twilio balance
4. Geographic permissions not enabled

**Solution:** Check Twilio Console → Logs for detailed error messages

## Monitoring and Analytics

### Twilio Console Monitoring

1. Go to **Monitor** → **Logs** → **Messaging Logs**
2. View delivery status, errors, and costs
3. Set up alerts for failures

### Database Monitoring

Query OTP verification attempts:

```sql
-- Check recent OTP verifications
SELECT 
  phone, 
  channel, 
  created_at, 
  verified_at,
  attempt_count
FROM otp_verifications
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

## Cost Considerations

### Free Trial
- $15 in free credit
- One free phone number
- SMS: ~$0.0075 per message
- WhatsApp: ~$0.005 per message

### Production Costs
- Phone number: ~$1-2/month
- SMS: $0.0075 per message (varies by country)
- WhatsApp: $0.005 per message

**Budget Planning:**
- 1000 SMS verifications ≈ $7.50/month
- 1000 WhatsApp verifications ≈ $5/month

## Production Readiness Checklist

- [ ] Twilio account verified and phone number purchased
- [ ] Environment variables configured in production
- [ ] Database migrations applied
- [ ] Rate limiting enabled on OTP endpoints
- [ ] Phone number format validation tested
- [ ] SMS delivery tested in production region
- [ ] WhatsApp sandbox or Business API configured
- [ ] Error handling and logging verified
- [ ] Monitoring and alerts configured
- [ ] Twilio balance alerts set up
- [ ] Geographic permissions configured
- [ ] Documentation updated

## Support and Resources

- **Twilio Documentation**: https://www.twilio.com/docs
- **Twilio Console**: https://console.twilio.com/
- **Phone Number Formatting**: https://www.twilio.com/docs/glossary/what-e164
- **WhatsApp API**: https://www.twilio.com/docs/whatsapp
- **Support**: support@wathaci.com

## Related Documentation

- [SMS OTP Setup Guide](SMS_OTP_SETUP_GUIDE.md)
- [Email Configuration Guide](EMAIL_CONFIGURATION_GUIDE.md)
- [Authentication Documentation](AUTHENTICATION_VERIFICATION.md)
- [Production Deployment Guide](docs/PRODUCTION_DEPLOYMENT_GUIDE.md)
