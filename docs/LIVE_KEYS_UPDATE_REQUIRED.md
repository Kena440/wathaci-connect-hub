# IMPORTANT: Update Payment Configuration for Production

## ⚠️ Action Required: Update to Live Lenco Keys

The current `.env` files contain test/development keys. For production deployment, you **MUST** update these with live keys from your Lenco dashboard.

## 🚀 Quick Start (Recommended)

Use the automated rotation script:

```bash
./scripts/rotate-lenco-keys.sh
```

This script will:
- Guide you through retrieving keys from Lenco dashboard
- Update all `.env` files with your live keys
- Push secrets to Supabase Edge Functions
- Validate the configuration
- Provide next steps for testing

## 📚 Complete Documentation

For detailed instructions, troubleshooting, and manual steps, see:

**[Lenco Keys Rotation Guide](./LENCO_KEYS_ROTATION_GUIDE.md)**

This comprehensive guide covers:
- Prerequisites and preparation
- Automated rotation (recommended)
- Manual rotation step-by-step
- Webhook configuration
- Testing procedures
- Troubleshooting common issues
- Security best practices
- Verification checklist

## ⚡ Quick Reference

### Required Keys from Lenco Dashboard

1. **Publishable/Public Key**
   - Location: Lenco Dashboard → Settings → API Keys
   - Format: `pub-[64-char-hex]` or `pk_live_[string]`
   - Used in: Frontend (`.env`)

2. **Secret Key**
   - Location: Lenco Dashboard → Settings → API Keys
   - Format: `sec-[64-char-hex]`, `sk_live_[string]`, or `[64-char-hex]`
   - Used in: Backend (`.env` and `backend/.env`)

3. **Webhook Secret**
   - Location: Lenco Dashboard → Settings → Webhooks
   - Format: String provided by Lenco
   - Used in: Backend (`.env` and Supabase Edge Functions)

### Files to Update

```bash
# Frontend environment
.env
├── VITE_LENCO_PUBLIC_KEY="pub-YOUR-LIVE-KEY"
├── LENCO_SECRET_KEY="YOUR-LIVE-SECRET"
└── LENCO_WEBHOOK_SECRET="YOUR-WEBHOOK-SECRET"

# Backend environment
backend/.env
├── LENCO_SECRET_KEY="YOUR-LIVE-SECRET"
└── LENCO_WEBHOOK_SECRET="YOUR-WEBHOOK-SECRET"

# Supabase Edge Functions (via CLI)
supabase secrets set LENCO_SECRET_KEY="YOUR-LIVE-SECRET"
supabase secrets set LENCO_WEBHOOK_SECRET="YOUR-WEBHOOK-SECRET"
```

### Verification Commands

```bash
# Check environment files
npm run env:check

# List Supabase secrets
supabase secrets list

# Test webhook integration
node scripts/test-webhook-integration.js <webhook-url> <webhook-secret>
```

## 🔒 Security Notes

⚠️ **NEVER commit live keys to version control**
- Keep live keys in `.env` files (already in `.gitignore`)
- Use environment-specific keys (test for dev, live for production)
- Rotate keys immediately if they're ever exposed
- Store keys in a secure password manager

## ✅ Current Status

The repository currently contains:
- ✅ Development/test keys in `.env.example` (safe to commit)
- ⚠️ **ACTION REQUIRED**: Placeholder keys must be replaced with live keys
- ⚠️ **ACTION REQUIRED**: Secrets must be pushed to Supabase Edge Functions
- ⚠️ **ACTION REQUIRED**: Webhook integration must be tested

## 📋 Completion Checklist

- [ ] Retrieved live keys from Lenco dashboard
- [ ] Updated `.env` with live keys
- [ ] Updated `backend/.env` with live keys
- [ ] Pushed secrets to Supabase: `supabase secrets set`
- [ ] Verified configuration: `npm run env:check`
- [ ] Configured webhook URL in Lenco dashboard
- [ ] Tested webhook integration (200 OK response)
- [ ] Verified `webhook_logs` table has successful entries
- [ ] Updated hosting environment variables (Vercel, etc.)

## 🧪 Testing Webhook Integration

After rotating keys, test the webhook:

1. **Get your webhook URL**:
   ```
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/lenco-webhook
   ```

2. **Configure in Lenco Dashboard**:
   - Navigate to Settings → Webhooks
   - Add the webhook URL
   - Select events: payment.success, payment.failed, payment.pending, payment.cancelled

3. **Send test event** from Lenco dashboard

4. **Verify response**: Should return `200 OK`

5. **Check webhook logs**:
   ```sql
   SELECT * FROM webhook_logs
   WHERE status = 'processed'
   ORDER BY processed_at DESC
   LIMIT 5;
   ```

For detailed testing instructions, see [Lenco Keys Rotation Guide - Step 7](./LENCO_KEYS_ROTATION_GUIDE.md#step-7-test-webhook-integration).

## 📞 Support

- **Automated Script Issues**: Check script help: `./scripts/rotate-lenco-keys.sh --help`
- **Detailed Guide**: [LENCO_KEYS_ROTATION_GUIDE.md](./LENCO_KEYS_ROTATION_GUIDE.md)
- **Webhook Setup**: [WEBHOOK_SETUP_GUIDE.md](./WEBHOOK_SETUP_GUIDE.md)
- **Environment Config**: [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)
- **Lenco API Support**: support@lenco.co

---

**Last Updated:** 2025-10-20  
**Status:** ⚠️ **PENDING** - Live keys rotation required before production deployment  
**Priority:** 🔴 **HIGH** - Critical for production readiness
