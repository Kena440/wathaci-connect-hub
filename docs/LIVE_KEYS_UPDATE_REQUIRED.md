# IMPORTANT: Update Payment Configuration for Production

## Action Required: Update to Live Lenco Keys

The current `.env` files contain test/development keys. For production deployment, you MUST update these with live keys from your Lenco dashboard.

### Steps to Update:

1. **Log in to Lenco Dashboard**
   - Go to https://dashboard.lenco.co
   - Navigate to Settings → API Keys

2. **Copy Your Live Keys**
   - Publishable Key (starts with `pub-` or `pk_live_`)
   - Secret Key (64-character hex or starts with `sk_live_`)
   - Webhook Secret (from Webhooks settings)

3. **Update `.env` File** (for local/frontend)
   ```bash
   VITE_LENCO_PUBLIC_KEY="pub-[YOUR-LIVE-PUBLIC-KEY]"
   ```

4. **Update `backend/.env` File** (for backend services)
   ```bash
   LENCO_SECRET_KEY="[YOUR-LIVE-SECRET-KEY]"
   LENCO_WEBHOOK_SECRET="[YOUR-WEBHOOK-SECRET]"
   ```

5. **Update Supabase Edge Function Secrets**
   ```bash
   supabase secrets set LENCO_SECRET_KEY="[YOUR-LIVE-SECRET-KEY]"
   supabase secrets set LENCO_WEBHOOK_SECRET="[YOUR-WEBHOOK-SECRET]"
   supabase secrets set SUPABASE_URL="[YOUR-SUPABASE-URL]"
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY="[YOUR-SERVICE-ROLE-KEY]"
   ```

### Security Notes:

⚠️ **NEVER commit live keys to version control**
- Keep live keys in `.env` files (already in `.gitignore`)
- Use environment-specific keys (test for dev, live for production)
- Rotate keys if they're ever exposed

### Current Key Status:

The repository currently contains:
- ✅ Development/test keys in `.env.example` (safe to commit)
- ⚠️ Placeholder keys in `.env` files (UPDATE BEFORE PRODUCTION)
- ⚠️ Backend `.env` needs live keys (UPDATE BEFORE PRODUCTION)

### Verification:

After updating keys, verify:
1. Frontend can initialize payment requests
2. Backend can verify payment status
3. Webhooks are received and validated
4. Test a small payment transaction

See `docs/WEBHOOK_SETUP_GUIDE.md` for detailed webhook configuration instructions.

---

**Last Updated:** 2025-10-18
**Status:** PENDING - Live keys not yet configured
