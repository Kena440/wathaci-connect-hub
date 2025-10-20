# Security Quick Reference Guide

Quick reference for security verification, monitoring, and incident response procedures.

## Pre-Deployment Security Checklist

### Run Automated Verification
```bash
# Set your configuration
export DOMAIN="your-domain.vercel.app"
export BACKEND_URL="https://your-backend.com"
export WEBHOOK_URL="https://xxx.supabase.co/functions/v1/lenco-webhook"
export WEBHOOK_SECRET="your-webhook-secret"

# Run comprehensive security verification
./scripts/run-security-verification.sh
```

### Individual Checks
```bash
# TLS/HTTPS verification
./scripts/check-tls-certificate.sh your-domain.vercel.app

# Security headers
./scripts/verify-security-config.sh https://your-domain.vercel.app

# Rate limiting
./scripts/verify-rate-limiting.sh https://your-backend.com/api/health

# Webhook security
./scripts/verify-webhook-security.sh \
  https://xxx.supabase.co/functions/v1/lenco-webhook \
  "your-webhook-secret"
```

## Critical Security Checks

### 1. TLS/HTTPS
- [ ] Certificate valid for >30 days
- [ ] TLS 1.2+ in use
- [ ] HSTS header present
- [ ] HTTP redirects to HTTPS

**Quick Check:**
```bash
curl -I https://your-domain.com | grep -E "(Strict-Transport-Security|HTTP)"
```

### 2. Webhook Security
- [ ] Valid signatures accepted (200 OK)
- [ ] Invalid signatures rejected (401)
- [ ] Missing signatures rejected (401)
- [ ] Webhook secret set in Supabase

**Quick Check:**
```bash
supabase secrets list | grep LENCO_WEBHOOK_SECRET
```

### 3. Rate Limiting
- [ ] Rate limit headers present
- [ ] 429 responses after 100 requests
- [ ] Security headers (X-Content-Type-Options, etc.)

**Quick Check:**
```bash
curl -I https://your-backend.com/api/health | grep X-RateLimit
```

### 4. Payment Monitoring
- [ ] Failed payment rate <10%
- [ ] High-risk transactions flagged
- [ ] Daily limits enforced
- [ ] Alerts configured

**Quick Check:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE status = 'failed')::float / COUNT(*) * 100 AS failure_rate
FROM payments
WHERE created_at > NOW() - INTERVAL '1 hour';
```

## Monitoring Queries

### Payment Health
```sql
-- Overall payment status (last 24 hours)
SELECT 
  status,
  COUNT(*) AS count,
  SUM(amount) AS total_amount
FROM payments
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

### High-Risk Transactions
```sql
-- Transactions with high fraud scores
SELECT 
  reference,
  user_id,
  amount,
  metadata->>'riskScore' AS risk_score,
  created_at
FROM payments
WHERE (metadata->>'riskScore')::int > 7
AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Webhook Failures
```sql
-- Recent webhook failures
SELECT 
  event_type,
  reference,
  error_message,
  processed_at
FROM webhook_logs
WHERE status = 'failed'
AND processed_at > NOW() - INTERVAL '1 hour'
ORDER BY processed_at DESC;
```

### Rate Limit Violations
```bash
# Check application logs for rate limit hits
grep "429" app.log | tail -20
```

## Alert Thresholds

| Metric | Threshold | Severity | Action |
|--------|-----------|----------|---------|
| Payment failure rate | >10% | High | Investigate within 15min |
| Fraud score | >7 | Critical | Review immediately |
| Webhook signature failures | Any | Critical | Security incident |
| Rate limit hits | >50/hr per IP | Medium | Monitor for abuse |
| Certificate expiry | <30 days | High | Schedule renewal |
| Gateway errors | >5% | High | Check Lenco status |

## Incident Response

### High Fraud Score (Critical)
1. **Immediate** (0-5 min):
   - Check transaction details in dashboard
   - Verify payment not yet completed
   - Check user history

2. **Investigation** (5-15 min):
   - Review security check details
   - Check for related suspicious transactions
   - Verify device and location data

3. **Resolution**:
   - If fraud: Block user, cancel transaction
   - If false positive: Update rules, approve transaction

**Query:**
```sql
SELECT * FROM payments WHERE reference = 'SUSPICIOUS_REF';
```

### Webhook Signature Failure (Critical)
1. **Immediate** (0-5 min):
   - Verify webhook secret in Supabase
   - Check recent secret rotations
   - Review webhook logs for pattern

2. **Investigation** (5-15 min):
   - Check if secret matches Lenco dashboard
   - Verify no unauthorized changes
   - Review edge function deployment

3. **Resolution**:
   - Rotate webhook secret if compromised
   - Update monitoring for similar events
   - Document incident

**Commands:**
```bash
supabase secrets list
supabase functions logs lenco-webhook --tail 50
```

### Rate Limit Abuse (High)
1. **Immediate** (0-5 min):
   - Identify attacking IP(s)
   - Check current system load
   - Verify if legitimate spike

2. **Mitigation** (5-15 min):
   - Add IP to block list if attack
   - Adjust limits if too restrictive
   - Scale infrastructure if needed

3. **Follow-up**:
   - Analyze attack pattern
   - Update WAF rules
   - Review rate limit config

**Commands:**
```bash
# Find top IPs hitting rate limits
grep "429" app.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -10
```

### Payment Gateway Outage (Critical)
1. **Immediate** (0-5 min):
   - Check Lenco status page
   - Verify network connectivity
   - Test with curl

2. **Communication** (5-10 min):
   - Update internal status page
   - Notify customer support
   - Post on status page

3. **Recovery**:
   - Monitor gateway restoration
   - Process queued payments
   - Verify normal operation

**Commands:**
```bash
# Test Lenco API
curl -I https://api.lenco.co/access/v2/health
```

## Webhook Secret Rotation

### Standard Rotation (Quarterly)
```bash
# 1. Generate new secret
NEW_SECRET=$(openssl rand -hex 32)

# 2. Update in Supabase (test/staging first)
supabase secrets set LENCO_WEBHOOK_SECRET="$NEW_SECRET"

# 3. Update in Lenco Dashboard
# - Log into Lenco Dashboard
# - Navigate to Webhooks settings
# - Update secret

# 4. Test webhook with new secret
./scripts/verify-webhook-security.sh \
  https://xxx.supabase.co/functions/v1/lenco-webhook \
  "$NEW_SECRET"

# 5. Document rotation
echo "$(date): Rotated webhook secret" >> security-log.txt
```

### Emergency Rotation (Compromised Secret)
```bash
# Same as above but execute immediately (15-minute target)
# Skip staging, go straight to production
# Notify security team immediately
```

## Daily Operations

### Morning Check (5 minutes)
```bash
# 1. Check dashboards
# - Open payment dashboard
# - Review security dashboard
# - Check operational metrics

# 2. Review overnight alerts
# - Check Slack #production-alerts
# - Review email alerts
# - Check for any incidents

# 3. Quick health check
curl -I https://your-domain.com/api/health
supabase functions logs lenco-webhook --tail 10
```

### Weekly Review (30 minutes)
```bash
# 1. Review failed payments
# 2. Check fraud detection false positives
# 3. Review rate limit patterns
# 4. Verify certificate expiry dates
# 5. Check webhook success rate
# 6. Review and adjust alert thresholds
```

### Monthly Tasks (2 hours)
```bash
# 1. Security review meeting
# 2. Review incident reports
# 3. Update fraud detection rules
# 4. Test disaster recovery
# 5. Review and update runbooks
# 6. Conduct security training
```

### Quarterly Tasks (4 hours)
```bash
# 1. Rotate webhook secrets
# 2. Security assessment
# 3. Update security policies
# 4. Review and update monitoring
# 5. Conduct penetration testing
# 6. Update incident response procedures
```

## Useful Commands

### Check Service Status
```bash
# Frontend
curl -I https://your-domain.com

# Backend API
curl -I https://your-backend.com/api/health

# Webhook endpoint
curl -X POST https://xxx.supabase.co/functions/v1/lenco-webhook

# Supabase status
supabase status
```

### View Logs
```bash
# Edge function logs
supabase functions logs lenco-webhook --tail 100

# Backend logs
tail -f /var/log/app.log

# Filter for errors
grep -i error /var/log/app.log | tail -20
```

### Database Queries
```bash
# Via Supabase CLI
supabase db query "SELECT COUNT(*) FROM payments WHERE status = 'failed';"

# Or use Supabase Dashboard SQL Editor
```

### Secret Management
```bash
# List secrets
supabase secrets list

# Set secret
supabase secrets set KEY="value"

# Remove secret
supabase secrets unset KEY
```

## Emergency Contacts

| Role | Contact | When to Call |
|------|---------|--------------|
| On-call Engineer | [CONTACT] | All critical alerts |
| Security Team | [CONTACT] | Security incidents |
| DevOps Manager | [CONTACT] | Infrastructure issues |
| Payment Operations | [CONTACT] | Payment/gateway issues |
| Executive Team | [CONTACT] | Major outages (>1hr) |

## Reference Documentation

- **Complete Security Checklist**: [DEPLOYMENT_SECURITY_CHECKLIST.md](./DEPLOYMENT_SECURITY_CHECKLIST.md)
- **Monitoring Configuration**: [MONITORING_AND_ALERTING.md](./MONITORING_AND_ALERTING.md)
- **Webhook Setup**: [WEBHOOK_SETUP_GUIDE.md](./WEBHOOK_SETUP_GUIDE.md)
- **Production Readiness**: [PRODUCTION_READINESS_CHECKLIST.md](./PRODUCTION_READINESS_CHECKLIST.md)
- **Payment Integration**: [PAYMENT_INTEGRATION_GUIDE.md](./PAYMENT_INTEGRATION_GUIDE.md)

## Quick Links

- Supabase Dashboard: https://app.supabase.com
- Lenco Dashboard: https://dashboard.lenco.co
- Monitoring Dashboard: [YOUR_MONITORING_URL]
- Status Page: [YOUR_STATUS_PAGE]
- Incident Management: [YOUR_INCIDENT_TOOL]

---

**Keep this document up to date. Review and update quarterly.**
