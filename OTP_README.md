# OTP Verification via SMS & WhatsApp

This document describes the OTP (One-Time Password) verification system implemented for Wathaci Connect using Twilio.

## Overview

The OTP system provides phone number verification via SMS and WhatsApp. It is designed as an **additional verification factor** that complements the existing email/password authentication system without replacing it.

### Features

- **Dual Channel Support**: Send OTP codes via SMS or WhatsApp
- **Secure Storage**: OTP codes are hashed (SHA-256) before storage
- **Time-Limited**: Codes expire after 10 minutes
- **Attempt Limiting**: Maximum 5 verification attempts per OTP
- **E.164 Format Support**: Automatic phone number normalization
- **Database Integration**: OTPs stored in Supabase with RLS policies

## Architecture

### Backend Components

```
backend/
├── lib/
│   ├── twilioClient.js       # Twilio client initialization
│   └── supabaseAdmin.js      # Supabase admin client
├── services/
│   └── otp-service.js        # OTP generation, sending, verification
└── routes/
    └── otp.js                # API endpoints for OTP operations
```

### Database Schema

```sql
otp_verifications (
  id uuid PRIMARY KEY,
  phone text NOT NULL,
  channel text CHECK (channel IN ('sms', 'whatsapp')),
  hashed_code text NOT NULL,
  attempt_count integer DEFAULT 0,
  created_at timestamptz,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  user_id uuid REFERENCES auth.users(id)
)
```

## Configuration

### Environment Variables

Add the following to your `.env.local` or `.env.production`:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID="your_account_sid_from_twilio_console"
TWILIO_AUTH_TOKEN="your_auth_token_from_twilio_console"
TWILIO_PHONE_NUMBER="+1234567890"              # For SMS
TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"  # For WhatsApp
```

### Getting Twilio Credentials

1. **Sign up for Twilio**: https://www.twilio.com/try-twilio
2. **Get Account SID & Auth Token**:
   - Go to [Twilio Console](https://console.twilio.com)
   - Navigate to **Account Info**
   - Copy **Account SID** and **Auth Token**

3. **Get Phone Number for SMS**:
   - Go to **Phone Numbers** → **Manage** → **Active Numbers**
   - Buy a phone number if you don't have one
   - Copy the phone number in E.164 format (e.g., `+12345678901`)

4. **Configure WhatsApp**:
   - **Testing (Sandbox)**:
     - Go to **Messaging** → **Try it out** → **Send a WhatsApp message**
     - Use the sandbox number: `whatsapp:+14155238886`
     - Join the sandbox by sending the provided code from your phone
   - **Production**:
     - Go to **Messaging** → **WhatsApp** → **Senders**
     - Apply for WhatsApp Business approval
     - Use your approved sender number

### Database Setup

Run the migration to create the `otp_verifications` table:

```bash
# If using Supabase CLI
supabase db push

# Or apply the migration manually in Supabase Dashboard
# SQL Editor → New query → Paste contents of:
# supabase/migrations/20250317100000_create_otp_verifications.sql
```

## API Reference

### Base URL

- Development: `http://localhost:3000`
- Production: `https://your-api-domain.com`

### Endpoints

#### 1. Send OTP

Send an OTP code to a phone number via SMS or WhatsApp.

**Endpoint**: `POST /api/auth/otp/send`

**Request Body**:
```json
{
  "phone": "+260971234567",
  "channel": "sms",
  "userId": "optional-uuid-if-authenticated"
}
```

**Parameters**:
- `phone` (string, required): Phone number (E.164 format recommended, e.g., `+260971234567`)
- `channel` (string, required): `"sms"` or `"whatsapp"`
- `userId` (string, optional): UUID of authenticated user to associate OTP

**Success Response** (200 OK):
```json
{
  "ok": true,
  "message": "OTP sent successfully",
  "expiresAt": "2024-03-17T10:30:00.000Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid phone number or channel
- `500 Internal Server Error`: Service unavailable

**Example with cURL**:
```bash
curl -X POST http://localhost:3000/api/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+260971234567",
    "channel": "sms"
  }'
```

---

#### 2. Verify OTP

Verify an OTP code entered by the user.

**Endpoint**: `POST /api/auth/otp/verify`

**Request Body**:
```json
{
  "phone": "+260971234567",
  "channel": "sms",
  "code": "123456"
}
```

**Parameters**:
- `phone` (string, required): Same phone number used in send request
- `channel` (string, required): Same channel used in send request (`"sms"` or `"whatsapp"`)
- `code` (string, required): 6-digit OTP code (e.g., `"123456"`)

**Success Response** (200 OK):
```json
{
  "ok": true,
  "message": "OTP verified successfully",
  "phoneVerified": true
}
```

**Error Responses**:
- `400 Bad Request`: Invalid code, expired, or max attempts exceeded
- `500 Internal Server Error`: Verification failed

**Example with cURL**:
```bash
curl -X POST http://localhost:3000/api/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+260971234567",
    "channel": "sms",
    "code": "123456"
  }'
```

---

## Usage Examples

### Frontend Integration (React)

```typescript
// Example: Send OTP
async function sendOTP(phone: string, channel: 'sms' | 'whatsapp') {
  const response = await fetch('/api/auth/otp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, channel }),
  });
  
  const data = await response.json();
  
  if (data.ok) {
    console.log('OTP sent, expires at:', data.expiresAt);
  } else {
    console.error('Failed to send OTP:', data.error);
  }
  
  return data;
}

// Example: Verify OTP
async function verifyOTP(phone: string, channel: 'sms' | 'whatsapp', code: string) {
  const response = await fetch('/api/auth/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, channel, code }),
  });
  
  const data = await response.json();
  
  if (data.ok && data.phoneVerified) {
    console.log('Phone verified successfully!');
  } else {
    console.error('Verification failed:', data.error);
  }
  
  return data;
}
```

---

## Testing

### Manual Testing (Development)

1. **Start the backend server**:
   ```bash
   cd backend
   npm start
   ```

2. **Configure Twilio environment variables** in `.env.local`

3. **Test SMS**:
   ```bash
   # Send OTP
   curl -X POST http://localhost:3000/api/auth/otp/send \
     -H "Content-Type: application/json" \
     -d '{"phone": "+260971234567", "channel": "sms"}'
   
   # Check your phone for the SMS
   # Then verify with the received code:
   curl -X POST http://localhost:3000/api/auth/otp/verify \
     -H "Content-Type: application/json" \
     -d '{"phone": "+260971234567", "channel": "sms", "code": "123456"}'
   ```

4. **Test WhatsApp** (using Twilio Sandbox):
   ```bash
   # First, join the Twilio WhatsApp Sandbox:
   # - Send "join <your-sandbox-code>" to whatsapp:+14155238886 from your phone
   
   # Send OTP via WhatsApp
   curl -X POST http://localhost:3000/api/auth/otp/send \
     -H "Content-Type: application/json" \
     -d '{"phone": "+260971234567", "channel": "whatsapp"}'
   
   # Check WhatsApp for the message
   # Then verify:
   curl -X POST http://localhost:3000/api/auth/otp/verify \
     -H "Content-Type: application/json" \
     -d '{"phone": "+260971234567", "channel": "whatsapp", "code": "123456"}'
   ```

### Automated Testing

Unit tests are located in `/test/otp-service.test.js` (if implemented).

```bash
cd backend
npm test
```

---

## Security Considerations

### Implemented Security Measures

1. **Hashed Storage**: OTP codes are hashed with SHA-256 before storage
2. **Time Expiration**: Codes expire after 10 minutes
3. **Attempt Limiting**: Maximum 5 verification attempts per OTP
4. **Rate Limiting**: Applied at Express server level (15-minute window, 100 requests)
5. **Input Validation**: Joi schema validation on all inputs
6. **RLS Policies**: Database-level access control via Supabase RLS

### Best Practices

1. **Use HTTPS in production** - Always use TLS/SSL
2. **Apply additional rate limiting** - Consider per-phone-number limits
3. **Monitor for abuse** - Track failed attempts and unusual patterns
4. **Rotate credentials regularly** - Change Twilio auth tokens quarterly
5. **Use dedicated Twilio project** - Separate dev/prod environments
6. **Never log OTP codes** - Current implementation only logs last 4 digits of phone

### Preventing Abuse

To prevent SMS/WhatsApp bombing attacks:

1. Add per-phone-number rate limiting (e.g., max 3 OTPs per hour)
2. Implement CAPTCHA before sending OTP
3. Require email verification before allowing OTP
4. Monitor Twilio usage and set up billing alerts

---

## Integration with Existing Auth Flow

The OTP system is designed to work **alongside** the existing email/password authentication:

### Use Case 1: Phone Verification for Existing Users

```typescript
// After user logs in with email/password:
// 1. User navigates to profile settings
// 2. User enters phone number
// 3. System sends OTP
// 4. User enters OTP code
// 5. Phone number is verified and saved to profile
```

### Use Case 2: Two-Factor Authentication (2FA)

```typescript
// After email/password login:
// 1. If user has phone verified and 2FA enabled
// 2. Send OTP to verified phone
// 3. Require OTP verification before creating session
// 4. Grant access only after OTP verified
```

### Use Case 3: Passwordless Phone Login (Future)

```typescript
// Alternative login flow:
// 1. User enters phone number
// 2. System sends OTP
// 3. User enters OTP code
// 4. System verifies OTP and creates session
```

---

## Troubleshooting

### Common Issues

**1. "Twilio not configured" error**
- Check that `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are set
- Verify credentials are correct in Twilio Console
- Restart backend server after adding environment variables

**2. "SMS service is not configured" error**
- Check that `TWILIO_PHONE_NUMBER` is set in environment
- Verify phone number is in E.164 format (e.g., `+12345678901`)
- Ensure phone number is active in Twilio Console

**3. "WhatsApp service is not configured" error**
- Check that `TWILIO_WHATSAPP_FROM` is set
- For testing, use Twilio Sandbox: `whatsapp:+14155238886`
- For production, ensure WhatsApp Business approval is complete

**4. WhatsApp message not received**
- For Sandbox: Ensure you've joined by sending the code to the sandbox
- Check that recipient phone is opted-in to receive WhatsApp messages
- Verify WhatsApp is installed on the recipient's device

**5. "Database error" or OTP not storing**
- Check that Supabase migration has been applied
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- Check Supabase Dashboard → Table Editor → `otp_verifications` exists

**6. Phone number format issues**
- Always use E.164 format: `+[country code][number]`
- Example: `+260971234567` (Zambia)
- System attempts auto-normalization but explicit format is better

### Logging

Backend logs include:
- Twilio client initialization status
- OTP send success/failure (without code, only last 4 digits of phone)
- OTP verification attempts
- Database operation errors

Check backend console output for detailed error messages.

---

## Production Deployment

### Checklist

- [ ] Configure production Twilio credentials in hosting environment
- [ ] Apply database migration to production Supabase
- [ ] Set up Twilio billing alerts
- [ ] Configure production WhatsApp sender (requires business approval)
- [ ] Add per-phone rate limiting
- [ ] Enable monitoring and alerting
- [ ] Test with real phone numbers in production
- [ ] Document support procedures for OTP issues

### Environment Variables (Production)

Set in your hosting platform (e.g., Vercel, Railway, Heroku):

```bash
TWILIO_ACCOUNT_SID=<production_account_sid>
TWILIO_AUTH_TOKEN=<production_auth_token>
TWILIO_PHONE_NUMBER=<production_phone_number>
TWILIO_WHATSAPP_FROM=<approved_whatsapp_sender>
```

**Note**: WhatsApp in production requires:
1. Twilio WhatsApp Business Profile
2. Facebook Business Verification
3. Message template approval for certain use cases

---

## Support & Resources

### Documentation
- [Twilio SMS Quickstart](https://www.twilio.com/docs/sms/quickstart)
- [Twilio WhatsApp API](https://www.twilio.com/docs/whatsapp/api)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

### Support Channels
- Wathaci Support: support@wathaci.com
- Twilio Support: https://support.twilio.com
- Supabase Support: https://supabase.com/docs/support

---

## License

This OTP implementation is part of the Wathaci Connect platform.

© 2024 Wathaci Connect. All rights reserved.
