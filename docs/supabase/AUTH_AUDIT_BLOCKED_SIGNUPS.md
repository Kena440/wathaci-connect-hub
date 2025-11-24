# Understanding "[blocked]" in Supabase Auth Audit Logs

## 🚫 What is "[blocked]"?

When reviewing Supabase `auth.audit_log_entries`, you may see entries where the `actor_username` field contains an email address followed by ` [blocked]`, for example:

```
"user@example.com [blocked]"
```

This document explains what this means, why it happens, and how to handle it properly.

---

## 📋 Quick Summary

| Aspect | Description |
|--------|-------------|
| **What it is** | Rate limiting / abuse protection by Supabase Auth |
| **When it appears** | Multiple signup/confirmation attempts in short time |
| **User created?** | ❌ No - auth.users record is **NOT** created |
| **Profile created?** | ❌ No - profile creation is also blocked |
| **Duration** | Typically 1-60 minutes (automatic, can't override) |
| **How to handle** | Show user-friendly message, ask them to wait |
| **Security concern?** | ✅ This is a security feature, not a bug |

---

## 🔍 Technical Details

### When Does "[blocked]" Appear?

Supabase Auth automatically blocks signup/confirmation attempts when it detects:

1. **Rate Limiting Triggers:**
   - Multiple signup attempts from same email within short period (typically 5-10 attempts in 1 hour)
   - Repeated confirmation requests for same email
   - Multiple failed password reset attempts

2. **Abuse Protection:**
   - Credential stuffing attacks
   - Bot-driven mass signups
   - Denial-of-service attempts on auth endpoints

3. **Security Patterns:**
   - Suspicious patterns like sequential emails (test1@, test2@, test3@)
   - Rapid-fire requests from single IP address
   - Known abusive IP addresses or domains

### What Happens When Blocked?

```
User Action → Supabase Auth → Rate Limit Check → BLOCKED
                                      ↓
                              No auth.users created
                              No email sent
                              No profile created
                              Audit log entry with [blocked]
```

**Key Points:**
- The signup/confirmation request is **rejected before processing**
- No database records are created
- No emails are sent
- The block is temporary and automatic
- Cannot be manually removed (must wait for timeout)

---

## 📊 Identifying Blocked Attempts

### Query: Find All Blocked Attempts

```sql
SELECT
  payload->>'actor_id'        AS actor_id,
  payload->>'actor_username'  AS actor_username_raw,
  regexp_replace(
    payload->>'actor_username',
    ' \\[blocked\\]$',
    ''
  )                           AS email_clean,
  payload->>'action'          AS action,
  payload->>'ip_address'      AS ip_address,
  created_at
FROM auth.audit_log_entries
WHERE payload->>'actor_username' LIKE '%[blocked]%'
ORDER BY created_at DESC
LIMIT 100;
```

### Query: Blocked Attempts by Email

```sql
-- Identify emails with multiple blocked attempts (abuse detection)
SELECT
  regexp_replace(payload->>'actor_username', ' \\[blocked\\]$', '') AS email,
  COUNT(*) AS blocked_count,
  array_agg(DISTINCT payload->>'action') AS actions,
  MIN(created_at) AS first_blocked,
  MAX(created_at) AS last_blocked,
  MAX(created_at) - MIN(created_at) AS time_span
FROM auth.audit_log_entries
WHERE payload->>'actor_username' LIKE '%[blocked]%'
GROUP BY email
ORDER BY blocked_count DESC
LIMIT 50;
```

### Query: Verify No User Was Created

```sql
-- Check if blocked attempts resulted in user creation (should be 0)
WITH blocked_attempts AS (
  SELECT
    payload->>'actor_id' AS actor_id,
    regexp_replace(
      payload->>'actor_username',
      ' \\[blocked\\]$',
      ''
    ) AS email
  FROM auth.audit_log_entries
  WHERE payload->>'actor_username' LIKE '%[blocked]%'
)
SELECT
  b.email,
  b.actor_id,
  u.id AS auth_user_id,
  u.email AS auth_email,
  CASE
    WHEN u.id IS NOT NULL THEN '⚠️  User exists (unexpected!)'
    ELSE '✅ No user (expected)'
  END AS status
FROM blocked_attempts b
LEFT JOIN auth.users u ON u.id::text = b.actor_id OR u.email = b.email
ORDER BY b.email;
```

---

## 🎯 Abuse Pattern Detection

### Pattern 1: Single Email, Multiple Attempts

**Interpretation:**
```
blocked_count | Likely Cause
--------------|--------------------------------------------
2-5           | Legitimate user retrying too quickly
6-10          | User experiencing issues, needs support
11-20         | Possible bot or automated script
>20           | Definite abuse attempt
```

**Action:**
- **2-5 attempts:** Normal, no action needed
- **6-10 attempts:** Consider reaching out to user (they may need help)
- **11-20 attempts:** Monitor for continued abuse
- **>20 attempts:** Consider IP block or permanent email block

### Pattern 2: Multiple Emails, Same Pattern

**Query:**
```sql
-- Detect sequential email patterns (test1@, test2@, etc.)
WITH blocked_emails AS (
  SELECT
    regexp_replace(payload->>'actor_username', ' \\[blocked\\]$', '') AS email,
    payload->>'ip_address' AS ip,
    created_at
  FROM auth.audit_log_entries
  WHERE payload->>'actor_username' LIKE '%[blocked]%'
    AND created_at > NOW() - INTERVAL '24 hours'
)
SELECT
  ip,
  COUNT(*) AS blocked_count,
  array_agg(email) AS emails,
  MIN(created_at) AS first_attempt,
  MAX(created_at) AS last_attempt
FROM blocked_emails
WHERE ip IS NOT NULL
GROUP BY ip
HAVING COUNT(*) > 10
ORDER BY blocked_count DESC;
```

**Interpretation:**
- Multiple similar emails from same IP = Bot attack
- Action: Consider IP-level blocking in firewall/WAF

### Pattern 3: Time-Based Analysis

```sql
-- Blocked attempts by hour
SELECT
  date_trunc('hour', created_at) AS hour,
  COUNT(*) AS blocked_count,
  COUNT(DISTINCT regexp_replace(payload->>'actor_username', ' \\[blocked\\]$', '')) AS unique_emails
FROM auth.audit_log_entries
WHERE payload->>'actor_username' LIKE '%[blocked]%'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY hour
ORDER BY hour DESC;
```

**Interpretation:**
- Sudden spike in specific hour = Coordinated attack
- Sustained high rate = Ongoing abuse campaign

---

## 💻 Application Handling

### Frontend: User-Friendly Messages

**Bad Error Messages:**
```typescript
// ❌ Don't expose technical details
throw new Error("Auth error: rate limit exceeded [blocked]");

// ❌ Don't blame the user
throw new Error("You've made too many attempts");
```

**Good Error Messages:**
```typescript
// ✅ Clear and helpful
if (error.message.includes('rate limit') || 
    error.message.includes('too many')) {
  return {
    error: 'We received your signup request, but please wait a few minutes before trying again. If you already signed up, check your email for a confirmation link.',
    action: 'Try again in 5 minutes',
  };
}

// ✅ With specific guidance
return {
  error: 'Too many signup attempts detected',
  instructions: [
    '1. Wait 5-10 minutes before trying again',
    '2. Check your email (including spam folder) for confirmation',
    '3. If problem persists, contact support',
  ],
  supportEmail: 'support@yourapp.com',
};
```

### Backend: Detecting Blocked Signups

**Edge Function Example:**

```typescript
export async function handleSignupAttempt(email: string) {
  // Check recent blocked attempts for this email
  const { data: blockedAttempts } = await supabaseAdmin
    .from('audit_log_entries')
    .select('created_at')
    .ilike('payload->actor_username', `%${email}%[blocked]%`)
    .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
    .order('created_at', { ascending: false });

  if (blockedAttempts && blockedAttempts.length > 0) {
    const lastBlocked = new Date(blockedAttempts[0].created_at);
    const minutesAgo = (Date.now() - lastBlocked.getTime()) / 60000;

    if (minutesAgo < 5) {
      return {
        allowed: false,
        reason: 'rate_limited',
        retryAfter: Math.ceil(5 - minutesAgo),
        message: `Please wait ${Math.ceil(5 - minutesAgo)} more minutes before trying again.`,
      };
    }
  }

  return { allowed: true };
}
```

### Monitoring: Alert on Abuse Patterns

```typescript
// Daily cron job to detect abuse
export async function detectAbuse() {
  const { data: abusiveEmails } = await supabaseAdmin.rpc('get_blocked_attempts_summary', {
    hours: 24,
    min_attempts: 10,
  });

  if (abusiveEmails && abusiveEmails.length > 0) {
    await sendAlert({
      type: 'auth_abuse_detected',
      severity: 'warning',
      details: {
        count: abusiveEmails.length,
        emails: abusiveEmails.map(e => ({
          email: e.email,
          attempts: e.blocked_count,
        })),
      },
    });
  }
}
```

---

## 🛡️ Best Practices

### 1. User Experience

**Do:**
- ✅ Show clear, friendly error messages
- ✅ Suggest checking email/spam folder
- ✅ Provide alternative contact methods (support email/chat)
- ✅ Log the attempt for your own monitoring

**Don't:**
- ❌ Expose technical details to users
- ❌ Make users feel like they did something wrong
- ❌ Hide that there's a temporary block (be transparent)

### 2. Monitoring

**Do:**
- ✅ Track blocked attempts in your own analytics
- ✅ Set up alerts for unusual patterns
- ✅ Monitor blocked_attempts per email/IP
- ✅ Review patterns weekly for abuse trends

**Don't:**
- ❌ Ignore blocked attempts (they reveal abuse patterns)
- ❌ Alert on every single block (too noisy)
- ❌ Try to automatically unblock users (not possible)

### 3. Support

**Do:**
- ✅ Document this for support team
- ✅ Create FAQ entry about "can't sign up" issues
- ✅ Have support team check for blocked attempts
- ✅ Explain waiting period to users

**Don't:**
- ❌ Tell users to "keep trying" (makes it worse)
- ❌ Manually create accounts for blocked users (bypasses security)
- ❌ Promise to "fix" the block (it's automatic, can't be removed)

### 4. Security

**Do:**
- ✅ Review patterns for coordinated attacks
- ✅ Consider additional rate limiting at app level
- ✅ Use CAPTCHA for repeated failures
- ✅ Block abusive IPs at firewall level for sustained attacks

**Don't:**
- ❌ Disable or bypass Supabase rate limiting
- ❌ Increase limits without understanding impact
- ❌ Ignore sustained high-volume blocks

---

## 🔧 SQL Functions for Monitoring

### Function: Get Blocked Attempts Summary

```sql
CREATE OR REPLACE FUNCTION public.get_blocked_attempts_summary(
  hours integer DEFAULT 24,
  min_attempts integer DEFAULT 5
)
RETURNS TABLE (
  email text,
  blocked_count bigint,
  first_blocked timestamptz,
  last_blocked timestamptz,
  actions text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    regexp_replace(payload->>'actor_username', ' \\[blocked\\]$', '') AS email,
    COUNT(*) AS blocked_count,
    MIN(created_at) AS first_blocked,
    MAX(created_at) AS last_blocked,
    array_agg(DISTINCT payload->>'action') AS actions
  FROM auth.audit_log_entries
  WHERE payload->>'actor_username' LIKE '%[blocked]%'
    AND created_at > NOW() - make_interval(hours => hours)
  GROUP BY email
  HAVING COUNT(*) >= min_attempts
  ORDER BY blocked_count DESC;
$$;

-- Usage:
SELECT * FROM public.get_blocked_attempts_summary(24, 10);
-- Returns emails with 10+ blocks in last 24 hours
```

### Function: Check If Email Is Currently Blocked

```sql
CREATE OR REPLACE FUNCTION public.is_email_likely_blocked(
  p_email text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.audit_log_entries
    WHERE payload->>'actor_username' LIKE '%' || p_email || '%[blocked]%'
      AND created_at > NOW() - INTERVAL '1 hour'
    LIMIT 1
  );
$$;

-- Usage:
SELECT public.is_email_likely_blocked('user@example.com');
-- Returns true if email was blocked in last hour
```

---

## 📈 Monitoring Dashboard Queries

### Dashboard Metric 1: Blocked Attempts (Last 24h)

```sql
SELECT COUNT(*) AS blocked_attempts_24h
FROM auth.audit_log_entries
WHERE payload->>'actor_username' LIKE '%[blocked]%'
  AND created_at > NOW() - INTERVAL '24 hours';
```

### Dashboard Metric 2: Unique Emails Blocked (Last 24h)

```sql
SELECT COUNT(DISTINCT regexp_replace(payload->>'actor_username', ' \\[blocked\\]$', '')) 
AS unique_emails_blocked_24h
FROM auth.audit_log_entries
WHERE payload->>'actor_username' LIKE '%[blocked]%'
  AND created_at > NOW() - INTERVAL '24 hours';
```

### Dashboard Metric 3: Abuse Score

```sql
-- Abuse score: emails with 10+ blocks in last 24h
SELECT COUNT(*) AS high_abuse_emails
FROM (
  SELECT regexp_replace(payload->>'actor_username', ' \\[blocked\\]$', '') AS email
  FROM auth.audit_log_entries
  WHERE payload->>'actor_username' LIKE '%[blocked]%'
    AND created_at > NOW() - INTERVAL '24 hours'
  GROUP BY email
  HAVING COUNT(*) >= 10
) AS abusive;
```

### Dashboard Chart: Blocked Attempts Over Time

```sql
-- Hourly blocked attempts for last 7 days
SELECT
  date_trunc('hour', created_at) AS hour,
  COUNT(*) AS blocked_count
FROM auth.audit_log_entries
WHERE payload->>'actor_username' LIKE '%[blocked]%'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY hour
ORDER BY hour;
```

---

## ❓ FAQ

### Q: Can I manually unblock a user?

**A:** No. Supabase Auth's rate limiting is automatic and cannot be manually overridden. The block will expire automatically after the timeout period (typically 5-60 minutes).

### Q: How long does a block last?

**A:** Typically 5-60 minutes, depending on severity. The exact duration is managed by Supabase and varies based on the abuse pattern detected.

### Q: What if a legitimate user keeps getting blocked?

**A:** 
1. Ask them to wait at least 10 minutes between attempts
2. Check if they already have an account
3. Verify they're not accidentally triggering multiple requests (e.g., clicking "Sign Up" multiple times)
4. Consider creating their account manually via Supabase dashboard (use sparingly)

### Q: Should I alert on every blocked attempt?

**A:** No. Set thresholds:
- Alert if a single email has >10 blocks in 1 hour (possible abuse)
- Alert if total blocks spike suddenly (coordinated attack)
- Don't alert on 1-5 blocks per email (normal behavior)

### Q: Can bots bypass this protection?

**A:** Partially. Sophisticated bots can:
- Rotate IP addresses
- Use different email addresses
- Space out requests to avoid rate limits

For additional protection:
- Add CAPTCHA to signup form
- Implement honeypot fields
- Use email verification
- Monitor for suspicious patterns

### Q: What if I see `[blocked]` but a user exists?

**A:** This could mean:
1. User was created before the block kicked in
2. User was created by admin manually
3. Data inconsistency (investigate)

Run this query to check:
```sql
SELECT * FROM auth.users WHERE email = 'user@example.com';
```

---

## 📚 Additional Resources

- [Supabase Rate Limiting Docs](https://supabase.com/docs/guides/platform/going-into-prod#rate-limiting)
- [Auth Audit Logs](https://supabase.com/docs/guides/platform/logs#auth-logs)
- [Auth Security Best Practices](https://supabase.com/docs/guides/auth/auth-helpers/security)

---

## 🎯 Summary

| What | Description |
|------|-------------|
| **[blocked] means** | Rate limiting kicked in, no user created |
| **Your action** | Show friendly message, ask user to wait |
| **Duration** | 5-60 minutes (automatic, can't override) |
| **Monitoring** | Track patterns for abuse detection |
| **Alert threshold** | >10 attempts per email in 1 hour |
| **Security** | This is a feature, not a bug - keep it enabled |

**Key Takeaway:** `[blocked]` is Supabase Auth protecting your application from abuse. Handle it gracefully in your UI, monitor for patterns, but don't try to disable or bypass it.

---

**Last Updated:** 2025-11-24  
**Version:** 1.0  
**Status:** ✅ Production Ready
