# Quick Start: Lenco Keys Rotation

**⏱️ Time Required**: 10-15 minutes  
**🎯 Goal**: Rotate Lenco API keys from test to production

## Step-by-Step (Simple)

### 1. Prerequisites Check (2 minutes)

```bash
# Verify you have the tools
npm --version      # Should show Node.js version
supabase --version # Should show Supabase CLI version

# If Supabase CLI is missing:
npm install -g supabase
```

### 2. Get Your Keys from Lenco (3 minutes)

1. Go to https://dashboard.lenco.co
2. Log in to your account
3. Navigate to **Settings** → **API Keys**
4. Copy these THREE keys (ensure they are LIVE/production keys, not test):
   - **Public Key**: Starts with `pub-` (current) or `pk_live_` (legacy)
   - **Secret Key**: Starts with `sec-`, `sk_live_`, or is a 64-character hexadecimal string
   - **Webhook Secret**: From Settings → Webhooks (string provided by Lenco)

**⚠️ Important**: Make sure you're copying LIVE keys, not test keys
- Test keys have `test` in them: `pk_test_`, `sk_test_`
- Live keys have `live` or use the newer `pub-`/`sec-` format

**💡 Tip**: Keep these in a secure note/password manager for now

### 3. Run the Rotation Script (3 minutes)

```bash
npm run keys:rotate
```

Follow the prompts:
1. Type "yes" when asked if you're ready
2. Paste your **Public Key** when prompted
3. Paste your **Secret Key** when prompted (won't show on screen)
4. Paste your **Webhook Secret** when prompted (won't show on screen)
5. Type "yes" to push secrets to Supabase

The script will:
- ✅ Update your `.env` files
- ✅ Push secrets to Supabase
- ✅ Validate everything

### 4. Configure Webhook URL (2 minutes)

1. Go back to Lenco Dashboard → **Settings** → **Webhooks**
2. Click **Add Webhook Endpoint**
3. Enter this URL (replace PROJECT_REF with yours):
   ```
   https://PROJECT_REF.supabase.co/functions/v1/lenco-webhook
   ```
4. Select these events:
   - ✅ payment.success
   - ✅ payment.failed
   - ✅ payment.pending
   - ✅ payment.cancelled
5. Click **Save**

**🔍 Finding your PROJECT_REF**:
- It's in your Supabase dashboard URL
- Format: `https://PROJECT_REF.supabase.co`
- Example: `nrjcbdrzaxqvomeogptf`

### 5. Test It (3 minutes)

In Lenco Dashboard:
1. Go to your webhook configuration
2. Click **Send Test Event**
3. Select **payment.success**
4. Click **Send**
5. Should see: **200 OK** ✅

In Supabase Dashboard:
1. Go to **SQL Editor**
2. Run this query:
   ```sql
   SELECT * FROM webhook_logs 
   ORDER BY processed_at DESC 
   LIMIT 5;
   ```
3. Should see your test event with `status = 'processed'` ✅

### 6. Done! 🎉

You've successfully rotated your keys. Now mark these complete:

- [x] Obtained live keys from Lenco dashboard
- [x] Ran key rotation script
- [x] Configured webhook URL in Lenco
- [x] Tested webhook integration
- [x] Verified in webhook_logs table

## Troubleshooting

### Script says "Supabase CLI not found"

**Fix**:
```bash
npm install -g supabase
supabase login
```

### Webhook returns 401 Unauthorized

**Fix**:
```bash
# Re-run the rotation script
npm run keys:rotate

# Or manually set secrets:
supabase secrets set LENCO_WEBHOOK_SECRET="your-secret"
```

### No entry in webhook_logs

**Fix**:
```bash
# Check if table exists
# Run in Supabase SQL Editor:
SELECT * FROM webhook_logs LIMIT 1;

# If error "table doesn't exist":
npm run supabase:provision
```

## Need More Help?

- **Detailed Guide**: [docs/LENCO_KEYS_ROTATION_GUIDE.md](./LENCO_KEYS_ROTATION_GUIDE.md)
- **Testing Guide**: [docs/WEBHOOK_TESTING_GUIDE.md](./WEBHOOK_TESTING_GUIDE.md)
- **Script Help**: [scripts/README.md](../scripts/README.md)

## Next Actions

After successful rotation:

1. **Update hosting environment** (if using Vercel, etc.):
   - Add `VITE_LENCO_PUBLIC_KEY`
   - Add `LENCO_SECRET_KEY`
   - Add `LENCO_WEBHOOK_SECRET`

2. **Test full payment flow**:
   - Make a small test payment
   - Verify it processes correctly
   - Check webhook triggered

3. **Set up monitoring**:
   - Monitor `webhook_logs` for failures
   - Set up alerts for errors

4. **Schedule next rotation**:
   - Recommended: Every 90 days
   - Add calendar reminder

---

**Questions?** See [LENCO_KEYS_ROTATION_GUIDE.md](./LENCO_KEYS_ROTATION_GUIDE.md) for comprehensive documentation.
