# SMTP Email System - Quick Reference Card

## 🚀 Quick Start

### 1. Configure Environment Variables
```bash
# Edit backend/.env
SMTP_HOST="mail.privateemail.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USERNAME="support@wathaci.com"
SMTP_PASSWORD="your-password-here"
FROM_EMAIL="support@wathaci.com"
REPLY_TO_EMAIL="support@wathaci.com"
```

### 2. Start Backend Server
```bash
cd backend
npm install
npm start
```

### 3. Test SMTP Connection
```bash
node test-email.cjs verify
```

### 4. Send Test Email
```bash
node test-email.cjs your-email@example.com
```

---

## 📡 API Endpoints

### Check Configuration Status
```bash
GET http://localhost:3000/api/email/status
```
**Response:**
```json
{
  "ok": true,
  "configured": true,
  "host": "mail.privateemail.com",
  "port": 465,
  "secure": true,
  "from": "support@wathaci.com"
}
```

### Verify SMTP Connection
```bash
GET http://localhost:3000/api/email/test
```
**Response:**
```json
{
  "ok": true,
  "message": "SMTP connection verified successfully"
}
```

### Send Generic Email
```bash
POST http://localhost:3000/api/email/send
Content-Type: application/json

{
  "to": "user@example.com",
  "subject": "Test Email",
  "text": "Plain text content",
  "html": "<p>HTML content</p>"
}
```

### Send OTP Email
```bash
POST http://localhost:3000/api/email/send-otp
Content-Type: application/json

{
  "to": "user@example.com",
  "otpCode": "123456",
  "expiryMinutes": 10
}
```

### Send Verification Email
```bash
POST http://localhost:3000/api/email/send-verification
Content-Type: application/json

{
  "to": "user@example.com",
  "verificationUrl": "https://wathaci.com/verify?token=abc123",
  "userName": "John Doe"
}
```

### Send Password Reset Email
```bash
POST http://localhost:3000/api/email/send-password-reset
Content-Type: application/json

{
  "to": "user@example.com",
  "resetUrl": "https://wathaci.com/reset?token=xyz789",
  "userName": "Jane Doe"
}
```

---

## 🧪 Testing Commands

### Check Configuration Status
```bash
node test-email.cjs status
```

### Verify SMTP Connection
```bash
node test-email.cjs verify
```

### Send Test Email
```bash
node test-email.cjs send your-email@example.com
```

### Send OTP Email
```bash
node test-email.cjs otp your-email@example.com
```

### Send Verification Email
```bash
node test-email.cjs verification your-email@example.com
```

### Send Password Reset Email
```bash
node test-email.cjs password-reset your-email@example.com
```

### Run All Tests
```bash
node test-email.cjs your-email@example.com
```

---

## 🔐 Environment Variables Reference

| Variable | Example | Description |
|----------|---------|-------------|
| `SMTP_HOST` | `mail.privateemail.com` | SMTP server address |
| `SMTP_PORT` | `465` | SMTP port (465=SSL, 587=STARTTLS) |
| `SMTP_SECURE` | `true` | Use SSL/TLS (true for 465) |
| `SMTP_USERNAME` | `support@wathaci.com` | SMTP authentication username |
| `SMTP_PASSWORD` | `********` | SMTP authentication password |
| `FROM_EMAIL` | `support@wathaci.com` | Default sender email |
| `FROM_NAME` | `Wathaci Support` | Default sender name |
| `REPLY_TO_EMAIL` | `support@wathaci.com` | Reply-to address |
| `EMAIL_PROVIDER` | `SMTP` | Provider identifier |
| `EMAIL_DEBUG` | `false` | Enable debug logging |

---

## 🔍 Troubleshooting

### "Email service is not configured"
**Solution:** Set SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD in environment variables.

### "SMTP connection verification failed"
**Causes:**
- Incorrect credentials
- Firewall blocking port
- Wrong host/port

**Solution:** 
1. Verify credentials in PrivateEmail
2. Check firewall settings
3. Try port 587 with `SMTP_SECURE="false"`

### Emails landing in spam
**Solution:**
1. Configure DNS records (SPF, DKIM, DMARC)
2. Wait for DNS propagation (24-48h)
3. Use https://www.mail-tester.com/
4. Warm up domain with small volumes

---

## 📋 DNS Records Checklist

### SPF Record
```
Type: TXT
Host: @
Value: v=spf1 include:privateemail.com ~all
```

### DKIM Record
```
Type: TXT
Host: default._domainkey
Value: [Get from PrivateEmail dashboard]
```

### DMARC Record
```
Type: TXT
Host: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:support@wathaci.com
```

### MX Record
```
Type: MX
Host: @
Priority: 10
Value: mail.privateemail.com
```

### Verify DNS
```bash
dig TXT wathaci.com | grep spf
dig TXT default._domainkey.wathaci.com
dig TXT _dmarc.wathaci.com
dig MX wathaci.com
```

---

## 📚 File Locations

| File | Purpose |
|------|---------|
| `backend/services/email-service.js` | Email service implementation |
| `backend/routes/email.js` | Email API endpoints |
| `backend/.env.example` | Environment variable template |
| `test-email.cjs` | Testing script |
| `SMTP_IMPLEMENTATION_GUIDE.md` | Complete setup guide |
| `SMTP_FINDINGS_REPORT.md` | Implementation report |

---

## ⚡ HTTP Status Codes

| Code | Meaning | When |
|------|---------|------|
| `200` | Success | Email sent or endpoint succeeded |
| `400` | Bad Request | Invalid input (validation failed) |
| `500` | Internal Error | Email sending failed |
| `503` | Service Unavailable | SMTP not configured |

---

## 🎯 Production Deployment

### 1. Set Environment Variables
**Render/Railway/Heroku:**
Add in platform dashboard under "Environment Variables"

**Vercel:**
Not needed for frontend (backend handles email)

**Supabase:**
Configure in: Authentication → Email Templates → SMTP Settings

### 2. Verify Configuration
```bash
curl https://your-api.com/api/email/test
```

### 3. Send Test Email
```bash
curl -X POST https://your-api.com/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test",
    "text": "Test email"
  }'
```

---

## 📞 Support

- **Email:** support@wathaci.com
- **Documentation:** SMTP_IMPLEMENTATION_GUIDE.md
- **Provider Support:** https://www.namecheap.com/support/

---

## ✅ Pre-Launch Checklist

- [ ] SMTP credentials configured
- [ ] Connection test passes
- [ ] Test email sent and received
- [ ] DNS records configured
- [ ] DNS propagated (24-48h)
- [ ] Supabase SMTP configured
- [ ] Tested on Gmail
- [ ] Tested on Outlook
- [ ] Tested on Yahoo
- [ ] Not landing in spam
- [ ] Mobile rendering verified
- [ ] Production environment variables set
- [ ] Monitoring configured

---

**Quick Help:**
```bash
# See all test options
node test-email.cjs --help

# Check server is running
curl http://localhost:3000/health

# View server logs
cd backend && npm start
```
