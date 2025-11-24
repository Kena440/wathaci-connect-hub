# Admin Guide: Managing Blocked Signups

## Overview

This guide provides step-by-step instructions for administrators to monitor, investigate, and manage blocked signup attempts in the Wathaci Connect application.

## Table of Contents

1. [Accessing the Blocked Signups Monitor](#accessing-the-blocked-signups-monitor)
2. [Understanding the Dashboard](#understanding-the-dashboard)
3. [Investigating Blocked Attempts](#investigating-blocked-attempts)
4. [Helping Legitimate Users](#helping-legitimate-users)
5. [SQL Queries for Direct Database Access](#sql-queries-for-direct-database-access)
6. [Alerting and Monitoring](#alerting-and-monitoring)
7. [Common Scenarios](#common-scenarios)

---

## Accessing the Blocked Signups Monitor

### Via Admin Dashboard (Recommended)

1. Log in to your admin account
2. Navigate to the Admin section
3. Click on "Blocked Signups Monitor"
4. The dashboard will load and auto-refresh every 5 minutes

### Via Direct Component

```tsx
import BlockedSignupsMonitor from '@/components/admin/BlockedSignupsMonitor';

// Use in your admin route
<BlockedSignupsMonitor />
```

---

## Understanding the Dashboard

### Metrics Cards

The dashboard displays four key metrics for the last 24 hours:

1. **Total Attempts**: All signup attempts (successful + blocked)
2. **Successful**: Completed signups with success rate percentage
3. **Blocked**: Blocked attempts with block rate percentage
4. **Health Score**: Overall health (Good >80%, Fair >50%, Poor <50%)

### Anomaly Alerts

The system automatically detects and displays:

- **Critical**: High block rate (>50%), distributed attacks
- **Warning**: Elevated block rate (>25%), legitimate users being blocked
- **Info**: Normal operation, no anomalies detected

### Recent Blocked Signups List

Shows blocked emails from the last 24 hours with:
- Email address
- Number of blocked attempts
- First and last blocked timestamps
- Rate limit status (likely_expired, expiring_soon, still_active)
- Account status (whether user eventually succeeded)

---

## Investigating Blocked Attempts

### Step 1: Identify the Blocked Email

From the dashboard, note the email address that appears blocked.

### Step 2: Check Rate Limit Status

Use the SQL function to check current rate limit status:

```sql
-- Check if email is currently rate-limited
SELECT public.is_email_rate_limited('user@example.com', 2);
-- Returns: true (rate-limited) or false (clear to retry)
```

### Step 3: Get Detailed Attempt History

```sql
-- Get detailed blocked attempt history
SELECT * FROM public.get_blocked_attempts_for_email('user@example.com', 20);
```

This returns:
- Timestamp of each blocked attempt
- Action type (user_repeated_signup, user_confirmation_requested)
- IP address
- Internal actor ID
- Minutes since attempt

### Step 4: Investigate the Actor

For the specific actor_id found in audit logs:

```sql
-- Investigate a specific blocked actor
SELECT * FROM public.investigate_blocked_actor('b8d68fe1-1a7d-4a50-ab80-d98937e20b4f');
```

This returns:
- Whether actor_id is a real user ID (usually no for blocked attempts)
- Email associated with the actor
- Whether user has auth.users record
- Whether user has profile
- Total blocked attempts
- Conclusion (blocked_only, eventually_succeeded, etc.)

### Step 5: Check if User Eventually Succeeded

```sql
-- Check if user exists in auth.users
SELECT id, email, created_at, confirmed_at
FROM auth.users
WHERE email = 'user@example.com'
ORDER BY created_at DESC
LIMIT 1;

-- Check if profile exists
SELECT id, email, account_type, created_at
FROM public.profiles
WHERE email = 'user@example.com'
ORDER BY created_at DESC
LIMIT 1;
```

---

## Helping Legitimate Users

### Scenario 1: User Reports "Can't Sign Up"

**Diagnosis:**
1. Check if email is in recent blocked list
2. Check last attempt time
3. Verify rate limit status

**Solution:**
```sql
-- Check when rate limit will expire
SELECT 
  email,
  last_blocked_at,
  EXTRACT(EPOCH FROM (NOW() - last_blocked_at))/3600 AS hours_since_block,
  CASE
    WHEN EXTRACT(EPOCH FROM (NOW() - last_blocked_at))/3600 > 1 THEN 'Can retry now'
    ELSE 'Wait ' || ROUND(60 - EXTRACT(EPOCH FROM (NOW() - last_blocked_at))/60) || ' minutes'
  END AS retry_status
FROM public.v_blocked_signups_by_email
WHERE email = 'user@example.com';
```

**Response to User:**
- If >1 hour since last block: "You can try signing up again now. Please ensure you submit the form only once and wait for confirmation."
- If <1 hour: "Please wait [X] minutes and try again. Avoid clicking the signup button multiple times."

### Scenario 2: User Was Blocked But Claims They Never Signed Up

**Diagnosis:**
1. Check IP addresses in blocked attempts
2. Check for patterns suggesting credential stuffing or account takeover

```sql
-- Check IP addresses and patterns
SELECT
  email,
  blocked_actions,
  ip_addresses,
  unique_ip_count,
  first_blocked_at,
  last_blocked_at
FROM public.v_blocked_signups_by_email
WHERE email = 'user@example.com';
```

**If Suspicious:**
- Many IPs (>5): Likely botnet or account takeover attempt
- Rapid attempts: Automated attack
- Normal pattern: Legitimate user confusion

**Response:**
- Suspicious: "Your email may be targeted by automated bots. Please wait 1 hour and try again. Contact support if issues persist."
- Normal: "It appears you attempted signup multiple times. Please wait 1 hour, then try once and wait for email confirmation."

### Scenario 3: User Successfully Signed Up But Was Previously Blocked

**Diagnosis:**
```sql
-- Check user's full journey
SELECT
  email,
  total_blocked_attempts,
  first_blocked_at,
  last_blocked_at,
  has_auth_user,
  has_profile
FROM public.v_blocked_signups_by_email
WHERE email = 'user@example.com'
  AND has_auth_user = true
  AND has_profile = true;
```

**Response:**
- This is normal and expected behavior
- User was initially rate-limited but later succeeded
- No action needed

---

## SQL Queries for Direct Database Access

### Monitor Signup Health

```sql
-- Get 24-hour signup statistics
SELECT * FROM public.get_signup_health_metrics(24);
```

### Detect Current Anomalies

```sql
-- Detect anomalies in the last hour
SELECT * FROM public.detect_blocking_anomalies(1);
```

### Find Potentially Legitimate Blocked Users

```sql
-- Users who appear legitimate but are blocked
SELECT * FROM public.v_potentially_legitimate_blocked_signups
LIMIT 50;
```

### View All Recent Blocked Attempts

```sql
-- Last 24 hours of blocked signups
SELECT * FROM public.v_recent_blocked_signups
ORDER BY last_attempt DESC;
```

### Check for Missing Profiles

```sql
-- Users without profiles (data quality check)
SELECT
  u.id,
  u.email,
  u.created_at,
  EXTRACT(EPOCH FROM (NOW() - u.created_at))/60 AS minutes_since_signup
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
  AND u.created_at > NOW() - INTERVAL '1 hour'
ORDER BY u.created_at DESC;
```

### Backfill Missing Profiles

```sql
-- If users are missing profiles, run backfill
SELECT * FROM public.backfill_missing_profiles();
-- Returns list of users with backfill status
```

---

## Alerting and Monitoring

### Set Up Automated Alerts

#### Option 1: Email Alerts via Cron Job

```bash
#!/bin/bash
# /etc/cron.d/wathaci-signup-monitor
# Run every 15 minutes

*/15 * * * * psql $DATABASE_URL -c "
  SELECT 
    anomaly_type,
    severity,
    recommendation
  FROM public.detect_blocking_anomalies(1)
  WHERE severity IN ('critical', 'warning')
" | mail -s "Wathaci Signup Alert" admin@wathaci.com
```

#### Option 2: Supabase Edge Function

Deploy this as a scheduled edge function (hourly):

```typescript
import { createClient } from '@supabase/supabase-js'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Check for anomalies
  const { data: anomalies } = await supabase.rpc('detect_blocking_anomalies', {
    p_hours: 1
  })

  const criticalAnomalies = anomalies?.filter(a => a.severity === 'critical')

  if (criticalAnomalies && criticalAnomalies.length > 0) {
    // Send alert (email, Slack, etc.)
    await sendAlert(criticalAnomalies)
  }

  return new Response('OK')
})
```

### Alert Thresholds

Configure alerts for:

| Condition | Severity | Action |
|-----------|----------|--------|
| Block rate >50% | Critical | Immediate investigation |
| Block rate >25% | Warning | Review within 1 hour |
| >50 blocks from single IP | Critical | Consider IP blocking |
| Legitimate user blocked | Warning | Review and contact user |
| Users without profiles | Critical | Run backfill immediately |

---

## Common Scenarios

### Scenario: High Block Rate During Marketing Campaign

**Symptoms:**
- Block rate suddenly increases to 30-50%
- Many unique emails being blocked
- Short time window (1-2 hours)

**Cause:**
- Marketing campaign drives many signups simultaneously
- Some users get impatient and retry multiple times
- Rate limits triggered for legitimate users

**Solution:**
1. Monitor the v_potentially_legitimate_blocked_signups view
2. Send proactive email to affected users:
   ```
   Subject: Welcome to Wathaci - Action Required
   
   We noticed you tried to sign up recently but may have been rate-limited.
   You can now complete your signup at: https://wathaci.com/signup
   
   Tips:
   - Submit the form only once
   - Wait for the confirmation email (check spam)
   - Don't refresh or click back during signup
   ```

### Scenario: Suspected Bot Attack

**Symptoms:**
- Block rate >70%
- Many blocks from many IPs (>100 unique IPs)
- Rapid succession (<1 second between attempts)
- Unusual email patterns (random strings, temp emails)

**Detection:**
```sql
SELECT * FROM public.detect_blocking_anomalies(1)
WHERE anomaly_type = 'distributed_attack';
```

**Solution:**
1. Review the anomaly details
2. Consider enabling CAPTCHA on signup form (temporary)
3. Block suspicious IP ranges at firewall level
4. Monitor for 24-48 hours
5. Remove CAPTCHA once attack subsides

### Scenario: User Can't Sign Up After Email Change

**Symptoms:**
- User reports: "I changed my email and now can't sign up"
- Old email appears in blocked list
- New email also gets blocked

**Cause:**
- Same IP/browser fingerprint
- Rate limit applied per IP + email combination

**Solution:**
1. Check both old and new email in blocked list:
   ```sql
   SELECT * FROM public.v_blocked_signups_by_email
   WHERE email IN ('old@email.com', 'new@email.com');
   ```
2. Wait for rate limit expiry (1 hour from last attempt)
3. Advise user to:
   - Clear browser cache and cookies
   - Try from different browser/device
   - Wait the full hour before retrying

---

## Best Practices

### For Administrators

1. **Check dashboard daily**: Review signup health metrics each morning
2. **Investigate spikes**: Any sudden increase in block rate deserves investigation
3. **Monitor trends**: Track week-over-week signup success rates
4. **Proactive communication**: Reach out to legitimate users who appear blocked
5. **Document patterns**: Keep notes on recurring issues and resolutions

### For Preventing Blocks

1. **UX improvements**: Clear messaging that signup is processing
2. **Disable buttons**: Prevent double-clicks during submission
3. **Loading states**: Show clear "Please wait" messages
4. **Email validation**: Validate email format before submission
5. **Rate limit warnings**: Show friendly message if rate limit detected

### For Supporting Users

1. **Response templates**: Have pre-written responses for common scenarios
2. **Quick checks**: Use SQL queries to quickly diagnose issues
3. **Wait times**: Always specify exact retry time (not just "wait a while")
4. **Alternative support**: Provide phone/chat option for urgent cases
5. **Follow-up**: Verify user successfully signed up after assistance

---

## Troubleshooting

### Dashboard Not Loading

**Check:**
1. Database connection healthy
2. User has required permissions (authenticated or service_role)
3. Views and functions exist in database
4. Browser console for JavaScript errors

**Fix:**
```sql
-- Verify views exist
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name LIKE 'v_%blocked%';

-- Verify functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'is_email_rate_limited',
    'get_blocked_attempts_for_email',
    'get_signup_health_metrics',
    'detect_blocking_anomalies'
  );
```

### No Blocked Signups Showing But Users Report Issues

**Check:**
1. Users might be experiencing different errors (not rate limiting)
2. Check auth.audit_log_entries directly:
   ```sql
   SELECT * FROM auth.audit_log_entries
   WHERE payload->>'actor_username' LIKE '%[blocked]%'
   ORDER BY created_at DESC
   LIMIT 20;
   ```
3. Verify migration was applied:
   ```sql
   SELECT version, name FROM supabase_migrations.schema_migrations
   WHERE name LIKE '%blocked%'
   ORDER BY version DESC;
   ```

### Rate Limits Not Expiring

**Note:** Supabase manages rate limits internally. If rate limits persist beyond expected time:

1. Check Supabase Dashboard → Authentication → Rate Limiting settings
2. Verify no custom rate limit rules are configured
3. Contact Supabase support for persistent issues

---

## Support Contact Information

For escalation or assistance:

- **Technical Support**: support@wathaci.com
- **Supabase Dashboard**: https://app.supabase.com/project/[your-project-id]
- **Documentation**: See BLOCKED_SIGNUPS_INVESTIGATION.md

---

**Document Version:** 1.0  
**Last Updated:** 2024-11-24  
**Author:** Wathaci Development Team
