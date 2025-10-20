# Monitoring and Alerting Configuration

This document provides comprehensive monitoring and alerting setup for production deployment, with special focus on payment anomaly detection and security monitoring.

## Overview

Production monitoring covers:
- **Payment Anomalies**: Failed transactions, fraud attempts, unusual patterns
- **Webhook Health**: Delivery failures, signature validation errors, processing delays
- **Rate Limiting**: API abuse detection, DDoS mitigation
- **TLS/Security**: Certificate expiry, security headers, HTTPS enforcement

## 1. Payment Anomaly Monitoring

### 1.1 Key Metrics to Monitor

Monitor these critical payment metrics in real-time:

#### Failed Payment Rate
- **Metric**: `payment_failures_per_hour`
- **Threshold**: Alert if >10% of payments fail within 1 hour
- **Query**:
```sql
SELECT 
  COUNT(*) FILTER (WHERE status = 'failed') AS failed_count,
  COUNT(*) AS total_count,
  (COUNT(*) FILTER (WHERE status = 'failed')::float / COUNT(*)) * 100 AS failure_rate
FROM payments
WHERE created_at > NOW() - INTERVAL '1 hour';
```
- **Alert Severity**: High if failure_rate > 10%, Critical if > 25%

#### Fraud Detection Triggers
- **Metric**: `payment_security_violations`
- **Threshold**: Alert on any security check failure with risk score > 7
- **Query**:
```sql
SELECT 
  p.reference,
  p.user_id,
  p.amount,
  p.metadata->>'riskScore' AS risk_score,
  p.metadata->>'securityChecks' AS security_checks,
  p.created_at
FROM payments p
WHERE 
  (p.metadata->>'riskScore')::int > 7
  AND p.created_at > NOW() - INTERVAL '5 minutes';
```
- **Alert Severity**: Critical
- **Action**: Immediately flag for manual review

#### Daily Transaction Limit Breaches
- **Metric**: `daily_limit_violations`
- **Threshold**: Alert when users approach or exceed daily limits
- **Query**:
```sql
SELECT 
  user_id,
  SUM(amount) AS daily_total,
  COUNT(*) AS transaction_count
FROM payments
WHERE 
  DATE(created_at) = CURRENT_DATE
  AND status IN ('completed', 'pending')
GROUP BY user_id
HAVING SUM(amount) > 45000; -- 90% of 50,000 limit
```
- **Alert Severity**: Medium (preventive)

#### Unusual Transaction Patterns
- **Metric**: `payment_anomaly_score`
- **Threshold**: Alert on rapid consecutive transactions (>5 in 5 minutes)
- **Query**:
```sql
SELECT 
  user_id,
  COUNT(*) AS transaction_count,
  SUM(amount) AS total_amount,
  ARRAY_AGG(reference ORDER BY created_at) AS references
FROM payments
WHERE created_at > NOW() - INTERVAL '5 minutes'
GROUP BY user_id
HAVING COUNT(*) > 5;
```
- **Alert Severity**: High

### 1.2 Payment Gateway Health

Monitor Lenco payment gateway integration:

#### Gateway Response Time
- **Metric**: `lenco_api_response_time_ms`
- **Threshold**: Alert if p95 > 5000ms
- **Source**: Application logs, payment initiation to response time
- **Alert Severity**: Medium if >5s, High if >10s

#### Gateway Error Rate
- **Metric**: `lenco_gateway_errors`
- **Threshold**: Alert if error rate > 5% in 15 minutes
- **Query**:
```sql
SELECT 
  COUNT(*) FILTER (WHERE gateway_response LIKE '%error%' OR gateway_response LIKE '%fail%') AS error_count,
  COUNT(*) AS total_count
FROM payments
WHERE 
  created_at > NOW() - INTERVAL '15 minutes'
  AND gateway_response IS NOT NULL;
```
- **Alert Severity**: High

## 2. Webhook Monitoring

### 2.1 Webhook Delivery Health

#### Failed Webhook Processing
- **Metric**: `webhook_processing_failures`
- **Threshold**: Alert on any failed webhook in last 5 minutes
- **Query**:
```sql
SELECT 
  event_type,
  reference,
  error_message,
  processed_at
FROM webhook_logs
WHERE 
  status = 'failed'
  AND processed_at > NOW() - INTERVAL '5 minutes'
ORDER BY processed_at DESC;
```
- **Alert Severity**: Critical
- **Action**: Immediate investigation required

#### Webhook Signature Validation Failures
- **Metric**: `webhook_signature_failures`
- **Threshold**: Alert if >3 failures in 10 minutes (possible attack)
- **Source**: Edge function logs, lenco-webhook function
- **Pattern to detect**: "Invalid webhook signature"
- **Alert Severity**: Critical
- **Action**: Check for security breach, verify webhook secret

#### Duplicate Webhook Events
- **Metric**: `webhook_duplicate_rate`
- **Threshold**: Info alert if >5% duplicates (indicates retry issues)
- **Query**:
```sql
SELECT 
  COUNT(*) FILTER (WHERE status = 'duplicate') AS duplicate_count,
  COUNT(*) AS total_count
FROM webhook_logs
WHERE processed_at > NOW() - INTERVAL '1 hour';
```
- **Alert Severity**: Info

#### Webhook Processing Latency
- **Metric**: `webhook_processing_time_ms`
- **Threshold**: Alert if processing takes >3 seconds
- **Source**: Edge function logs
- **Alert Severity**: Medium

### 2.2 Payment Event Synchronization

Monitor that webhook events properly update payment records:

```sql
-- Find payments with webhook events but not updated
SELECT 
  p.reference,
  p.status AS payment_status,
  w.event_type,
  w.processed_at,
  p.updated_at AS payment_updated_at,
  (w.processed_at - p.updated_at) AS sync_delay
FROM payments p
JOIN webhook_logs w ON w.reference = p.reference
WHERE 
  w.status = 'processed'
  AND w.processed_at > p.updated_at + INTERVAL '30 seconds'
  AND w.processed_at > NOW() - INTERVAL '15 minutes';
```
- **Threshold**: Alert if sync delay > 30 seconds
- **Alert Severity**: High

## 3. Rate Limiting Monitoring

### 3.1 Rate Limit Health Checks

#### Rate Limit Hit Rate
- **Metric**: `rate_limit_hits_per_minute`
- **Threshold**: Alert if sudden spike (>10x normal rate)
- **Source**: Express rate-limit middleware logs
- **Header to monitor**: `X-RateLimit-Remaining`
- **Alert Severity**: Medium

#### IP-Based Abuse Detection
Monitor for IPs hitting rate limits repeatedly:
```bash
# Parse application logs for rate limit violations
grep "Too Many Requests" app.log | \
  awk '{print $NF}' | \
  sort | uniq -c | sort -rn | head -10
```
- **Threshold**: Alert if single IP hits limit >50 times in 1 hour
- **Alert Severity**: High
- **Action**: Consider IP blocking

### 3.2 Rate Limit Configuration Validation

Verify rate limiting is active in production:
```bash
# Test rate limit headers
curl -I https://your-domain.com/api/health

# Expected headers:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 99
```

## 4. TLS and Security Monitoring

### 4.1 TLS Certificate Monitoring

#### Certificate Expiry
- **Metric**: `tls_certificate_expiry_days`
- **Threshold**: Alert if <30 days to expiry
- **Check Script**: See `scripts/check-tls-certificate.sh`
- **Alert Severity**: High if <30 days, Critical if <7 days

#### TLS Configuration Validation
- **Protocol Version**: Must be TLS 1.2 or higher
- **Cipher Suites**: Must use secure ciphers only
- **Certificate Chain**: Must be complete and valid
- **Check Script**: See `scripts/verify-tls-config.sh`

### 4.2 Security Headers Monitoring

Monitor that security headers are present:
- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `X-XSS-Protection`

Check script:
```bash
curl -I https://your-domain.com | grep -E "Strict-Transport-Security|X-Content-Type-Options|X-Frame-Options"
```

## 5. Alerting Configuration

### 5.1 Alert Channels

Configure multiple alert channels for redundancy:

#### Email Alerts
- **For**: Medium to Critical alerts
- **Recipients**: ops-team@example.com, security@example.com
- **Format**: Include metric name, threshold, current value, query link

#### Slack/Teams Alerts
- **For**: All alerts
- **Channel**: #production-alerts
- **Format**: Rich formatting with metric graphs and quick action buttons

#### SMS/Phone Alerts
- **For**: Critical alerts only
- **Recipients**: On-call engineer
- **Triggers**: Payment fraud, security breaches, system down

#### PagerDuty Integration
- **For**: Critical alerts requiring immediate action
- **Escalation**: Tier 1 (5 min) → Tier 2 (15 min) → Manager

### 5.2 Alert Severity Levels

| Severity | Response Time | Example Triggers |
|----------|--------------|------------------|
| **Critical** | Immediate (< 5 min) | Webhook signature failures, high fraud score, system down |
| **High** | Within 15 minutes | Payment failure spike, webhook processing failures, unusual patterns |
| **Medium** | Within 1 hour | Gateway slow response, rate limit abuse, approaching limits |
| **Low** | Within 4 hours | Duplicate webhooks, configuration warnings |
| **Info** | Review daily | Successful operations summaries, capacity trends |

### 5.3 Alert Suppression and De-duplication

Configure alert suppression to avoid noise:
- **De-duplicate**: Same alert within 15-minute window
- **Group**: Related alerts into single notification
- **Snooze**: Allow manual snoozing of non-critical alerts
- **Business Hours**: Adjust severity based on time (lower severity outside business hours for medium alerts)

## 6. Dashboard Configuration

### 6.1 Real-Time Payment Dashboard

Create a dashboard showing:
- **Payment Success Rate** (last 1 hour, 24 hours, 7 days)
- **Active Payment Volume** (transactions per minute)
- **Failed Payment Count** with breakdown by error type
- **Average Payment Amount** and trend
- **Top Payment Methods** (pie chart)
- **Geographic Distribution** (if available)

### 6.2 Security Dashboard

Display security metrics:
- **Fraud Detection Triggers** (last 24 hours)
- **High-Risk Transactions** (pending review)
- **Rate Limit Violations** (by IP)
- **Webhook Signature Failures** (timeline)
- **TLS Certificate Status** (expiry countdown)
- **Security Score Trend** (7-day average)

### 6.3 Operational Dashboard

Monitor system health:
- **API Response Time** (p50, p95, p99)
- **Error Rate** (4xx, 5xx responses)
- **Database Connection Pool** utilization
- **Edge Function Invocations** (count and errors)
- **Cache Hit Rate**
- **Storage Usage**

## 7. Implementation Examples

### 7.1 Supabase Database Webhooks

Configure database webhooks for real-time alerts:

```sql
-- Create notification function
CREATE OR REPLACE FUNCTION notify_payment_anomaly()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.metadata->>'riskScore' IS NOT NULL 
     AND (NEW.metadata->>'riskScore')::int > 7 THEN
    PERFORM pg_notify(
      'payment_anomaly',
      json_build_object(
        'reference', NEW.reference,
        'user_id', NEW.user_id,
        'risk_score', NEW.metadata->>'riskScore',
        'amount', NEW.amount
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER payment_anomaly_trigger
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION notify_payment_anomaly();
```

### 7.2 Log Aggregation Query Examples

#### Daily Payment Summary
```sql
SELECT 
  DATE(created_at) AS date,
  COUNT(*) AS total_payments,
  COUNT(*) FILTER (WHERE status = 'completed') AS successful,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending,
  SUM(amount) FILTER (WHERE status = 'completed') AS total_revenue,
  AVG(amount) FILTER (WHERE status = 'completed') AS avg_payment
FROM payments
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

#### Top Error Messages
```sql
SELECT 
  gateway_response,
  COUNT(*) AS occurrence_count,
  MAX(created_at) AS last_seen
FROM payments
WHERE 
  status = 'failed'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY gateway_response
ORDER BY occurrence_count DESC
LIMIT 10;
```

#### User Risk Profile
```sql
SELECT 
  user_id,
  COUNT(*) AS total_transactions,
  COUNT(*) FILTER (WHERE metadata->>'riskScore' IS NOT NULL) AS risk_scored,
  AVG((metadata->>'riskScore')::int) FILTER (WHERE metadata->>'riskScore' IS NOT NULL) AS avg_risk_score,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed_count,
  SUM(amount) AS total_spent
FROM payments
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY user_id
HAVING AVG((metadata->>'riskScore')::int) FILTER (WHERE metadata->>'riskScore' IS NOT NULL) > 5
ORDER BY avg_risk_score DESC;
```

## 8. Incident Response Procedures

### 8.1 High Fraud Score Alert Response

1. **Immediate Actions** (within 5 minutes):
   - Review the flagged transaction in admin dashboard
   - Check user payment history for patterns
   - Verify payment is not yet completed
   
2. **Investigation** (within 15 minutes):
   - Review security check details
   - Check for related transactions from same user/IP
   - Verify device fingerprint and location data
   
3. **Resolution**:
   - If confirmed fraud: Block user, cancel transaction, add to blacklist
   - If false positive: Update fraud rules, approve transaction, document

### 8.2 Webhook Failure Response

1. **Immediate Actions**:
   - Check webhook_logs table for error details
   - Verify webhook secret is correct
   - Check Supabase edge function status
   
2. **Investigation**:
   - Review edge function logs for stack traces
   - Verify payment record exists in database
   - Check for database connectivity issues
   
3. **Recovery**:
   - Manually update payment status if needed
   - Retry webhook processing if safe
   - Fix underlying issue and redeploy

### 8.3 Rate Limit Abuse Response

1. **Immediate Actions**:
   - Identify the attacking IP(s) from logs
   - Verify if legitimate traffic or attack
   - Check current system load
   
2. **Mitigation**:
   - Add IP to temporary block list if confirmed attack
   - Adjust rate limits if too restrictive
   - Scale infrastructure if legitimate spike
   
3. **Follow-up**:
   - Analyze attack pattern
   - Update WAF rules if available
   - Review rate limit configuration

## 9. Testing Monitoring and Alerts

### 9.1 Synthetic Tests

Create synthetic monitoring tests:
```bash
# Test payment endpoint availability
curl -f https://your-domain.com/api/health || alert "Payment API down"

# Test webhook endpoint
curl -X POST https://your-project.supabase.co/functions/v1/lenco-webhook \
  -H "Content-Type: application/json" \
  -H "x-lenco-signature: test" \
  -d '{"test": true}'

# Test rate limiting
for i in {1..150}; do
  curl -s -o /dev/null -w "%{http_code}\n" https://your-domain.com/api/health
done | grep -c "429"
```

### 9.2 Alert Testing

Test each alert configuration:
1. Trigger the condition that should create an alert
2. Verify alert is sent to all configured channels
3. Verify alert contains correct information
4. Verify alert severity is appropriate
5. Test alert suppression and de-duplication

### 9.3 Dashboard Validation

Verify dashboards display correctly:
- Load dashboard and check all panels render
- Verify metrics update in real-time
- Test date range selectors
- Verify drill-down links work
- Check mobile responsiveness

## 10. Monitoring Checklist

Before going live, verify:

- [ ] All payment anomaly queries tested and return expected results
- [ ] Alert thresholds configured and documented
- [ ] Alert channels (email, Slack, SMS) configured and tested
- [ ] Dashboards created and accessible to ops team
- [ ] Incident response procedures documented and team trained
- [ ] Synthetic monitoring tests deployed
- [ ] Log aggregation configured with retention policy
- [ ] Webhook monitoring active with failure alerts
- [ ] Rate limiting verified with test traffic
- [ ] TLS certificate monitoring configured
- [ ] Security headers verified in production
- [ ] On-call rotation schedule established
- [ ] Escalation procedures documented
- [ ] Runbooks created for common incidents
- [ ] All team members have access to monitoring tools
- [ ] Historical baseline established (1 week of production data)

## 11. Maintenance

### 11.1 Regular Reviews

- **Daily**: Review dashboard for anomalies
- **Weekly**: Review alert noise, adjust thresholds
- **Monthly**: Review incident patterns, update procedures
- **Quarterly**: Review and update fraud detection rules

### 11.2 Continuous Improvement

- Track alert false positive rate
- Measure mean time to detection (MTTD)
- Measure mean time to resolution (MTTR)
- Gather feedback from on-call engineers
- Update documentation based on learnings

## Support

For monitoring infrastructure questions:
- **Supabase Monitoring**: Check Supabase Dashboard → Logs
- **Edge Function Logs**: `supabase functions logs lenco-webhook`
- **Database Queries**: Use Supabase SQL Editor
- **External Monitoring**: Configure with Datadog, New Relic, or similar

For alert configuration assistance, consult the ops team or reference this document.
