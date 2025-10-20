# Webhook Setup Quick Reference

## 🎯 Prerequisites Checklist

- [ ] Live Lenco API keys obtained from dashboard
- [ ] Supabase project set up and configured
- [ ] Database schema deployed (`npm run supabase:provision`)
- [ ] Edge function deployed (`supabase functions deploy lenco-webhook`)

## 🔐 Environment Variables (Supabase Secrets)

```bash
supabase secrets set LENCO_WEBHOOK_SECRET="[from-lenco-dashboard]"
supabase secrets set LENCO_SECRET_KEY="[from-lenco-dashboard]"
supabase secrets set SUPABASE_URL="[your-supabase-url]"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="[your-service-key]"
```

## 🌐 Webhook URL Format

```
https://[PROJECT-REF].supabase.co/functions/v1/lenco-webhook
```

Replace `[PROJECT-REF]` with your Supabase project reference ID.

## 📝 Lenco Dashboard Configuration

**Location:** Settings → Webhooks → Add Webhook Endpoint

**Events to Enable:**
- ✅ payment.success
- ✅ payment.failed
- ✅ payment.pending
- ✅ payment.cancelled
- ℹ️ Additional operational events (`transfer.*`, `collection.*`, `transaction.*`) are documented in [LENCO_WEBHOOK_EVENTS_REFERENCE.md](./LENCO_WEBHOOK_EVENTS_REFERENCE.md) and are logged automatically when received.

## 🧪 Testing Commands

### Run Integration Tests
```bash
node scripts/test-webhook-integration.js \
  https://[PROJECT-REF].supabase.co/functions/v1/lenco-webhook \
  [WEBHOOK-SECRET]
```

### Check Webhook Logs
```sql
SELECT event_type, reference, status, processed_at 
FROM webhook_logs 
ORDER BY processed_at DESC 
LIMIT 10;
```

### Verify Payment Updates
```sql
SELECT reference, status, lenco_transaction_id, paid_at 
FROM payments 
WHERE reference = '[PAYMENT-REF]';
```

## 🔍 Troubleshooting Quick Checks

| Issue | Check | Command |
|-------|-------|---------|
| Webhook not received | Edge function deployed | `supabase functions list` |
| Signature fails | Secret matches | Compare Lenco dashboard vs Supabase secrets |
| Database errors | Schema deployed | `npm run supabase:provision` |
| Payment not updated | Reference exists | Check `payments` table for reference |

## 📊 Success Criteria

- [ ] Test webhook sent from Lenco dashboard
- [ ] Webhook appears in `webhook_logs` with `status='processed'`
- [ ] Payment record updated correctly
- [ ] Invalid signature test returns 401
- [ ] All event types process successfully

## 🚨 Production Checklist

- [ ] Replace test keys with live keys
- [ ] Webhook URL uses HTTPS
- [ ] Environment variables set in Supabase
- [ ] Test webhook from Lenco dashboard
- [ ] Monitor webhook_logs for errors
- [ ] Set up alerts for failed webhooks

## 📚 Documentation Links

- **Full Guide:** `docs/WEBHOOK_SETUP_GUIDE.md`
- **Payment Integration:** `docs/PAYMENT_INTEGRATION_GUIDE.md`
- **Live Keys:** `docs/LIVE_KEYS_UPDATE_REQUIRED.md`

## 🆘 Support

If webhooks are not working:

1. Check Supabase Edge Function logs
2. Verify webhook secret matches exactly
3. Ensure database schema includes `webhook_logs` table
4. Test with integration script
5. Review error messages in `webhook_logs` table

## 🔒 Security Notes

- Never commit webhook secrets to version control
- Use timing-safe comparison (implemented in webhook handler)
- Always verify signatures before processing
- Log all webhook events for auditing
- Monitor for unusual webhook patterns

---

**Last Updated:** 2025-10-18
**Version:** 1.0
