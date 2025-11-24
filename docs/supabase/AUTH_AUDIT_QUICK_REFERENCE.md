# 🚀 Supabase Auth Audit - Quick Reference

## 📌 Most Important Queries

### 1. Health Check (Run Daily)
```sql
SELECT * FROM public.get_signup_statistics(24);
```
Expected: `users_without_profiles = 0`, `profile_creation_errors = 0`

### 2. Recent Issues (Run Every 5 Minutes)
```sql
-- Alert if returns any rows
SELECT * FROM public.check_recent_signup_issues(10);
```

### 3. Backfill Missing Profiles (Run Once)
```sql
SELECT * FROM public.backfill_missing_profiles();
```

---

## 🔍 Common Queries

### Find Specific User's Signup Timeline
```sql
-- Replace USER_ID_HERE with actual UUID
SELECT * FROM public.v_signup_correlation_status
WHERE user_id = 'USER_ID_HERE'::uuid;
```

### Check Email for Blocked Attempts
```sql
-- Replace EMAIL_HERE with actual email
SELECT * FROM auth.audit_log_entries
WHERE payload->>'actor_username' ILIKE '%EMAIL_HERE%'
ORDER BY created_at DESC;
```

### Recent Signups with Status
```sql
SELECT
  u.email,
  u.created_at,
  p.id IS NOT NULL AS has_profile,
  CASE
    WHEN p.id IS NULL THEN '⚠️  Missing profile'
    ELSE '✅ OK'
  END AS status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY u.created_at DESC
LIMIT 20;
```

---

## ⚠️ Alert Thresholds

| Metric | Threshold | Severity |
|--------|-----------|----------|
| Users without profiles | > 0 | 🔴 CRITICAL |
| Profile creation errors | > 0 | 🔴 CRITICAL |
| Missing signup events | > 5 | 🟡 WARNING |
| Blocked attempts per email | > 10/hour | 🟡 WARNING |

---

## 🎯 Understanding Audit Logs

### ❌ Don't Use (NULL for signups)
```sql
payload->'traits'->>'user_id'     -- NULL
payload->'traits'->>'user_email'  -- NULL
```

### ✅ Use Instead
```sql
payload->>'actor_id'              -- Has user UUID
regexp_replace(
  payload->>'actor_username',
  ' \\[blocked\\]$',
  ''
)                                  -- Has email (cleaned)
```

---

## 🚫 [blocked] Quick Facts

- **Meaning:** Rate limiting by Supabase
- **Duration:** 5-60 minutes (automatic)
- **User created?** NO
- **Profile created?** NO
- **Can unblock?** NO (must wait)
- **User message:** "Too many attempts. Please wait 5 minutes."

### Check if Email is Blocked
```sql
SELECT public.is_email_likely_blocked('user@example.com');
-- Returns true if blocked in last hour
```

---

## 📊 Monitoring Dashboard

### Main Dashboard Query
```sql
WITH stats AS (
  SELECT
    (SELECT COUNT(*) FROM auth.users) AS total_users,
    (SELECT COUNT(*) FROM public.profiles) AS total_profiles,
    (SELECT COUNT(*) FROM auth.users u 
     LEFT JOIN public.profiles p ON p.id = u.id 
     WHERE p.id IS NULL) AS missing_profiles,
    (SELECT COUNT(*) FROM public.user_events 
     WHERE event_type = 'profile_creation_error'
       AND created_at > NOW() - INTERVAL '1 hour') AS recent_errors
)
SELECT
  total_users,
  total_profiles,
  missing_profiles,
  recent_errors,
  CASE
    WHEN missing_profiles = 0 AND recent_errors = 0 THEN '🟢 HEALTHY'
    WHEN missing_profiles <= 2 AND recent_errors = 0 THEN '🟡 DEGRADED'
    ELSE '🔴 CRITICAL'
  END AS status
FROM stats;
```

---

## 🛠️ Troubleshooting

### Issue: User Missing Profile

**Diagnosis:**
```sql
-- Check if user exists
SELECT * FROM auth.users WHERE id = 'USER_ID';

-- Check for profile creation errors
SELECT * FROM public.user_events
WHERE user_id = 'USER_ID'
  AND event_type = 'profile_creation_error';

-- Check trigger is active
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

**Fix:**
```sql
-- Run backfill
SELECT * FROM public.backfill_missing_profiles();
```

### Issue: Events Not Logging

**Diagnosis:**
```sql
-- Check function exists
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'log_user_event';

-- Check permissions
SELECT has_function_privilege(
  'authenticated',
  'public.log_user_event(uuid,text,text,jsonb)',
  'EXECUTE'
);
```

**Fix:**
```sql
-- Grant permissions
GRANT EXECUTE ON FUNCTION public.log_user_event(uuid, text, text, jsonb)
TO authenticated, service_role;
```

### Issue: Blocked Signups

**User Action:**
- Wait 5-10 minutes
- Check spam folder
- Don't retry immediately

**Your Action:**
```sql
-- Check blocked patterns
SELECT * FROM public.get_blocked_attempts_summary(24, 10);
-- If >20 attempts from one email: possible abuse
```

---

## 📱 Application Integration

### TypeScript: Signup Example
```typescript
import { supabase } from '@/lib/supabaseClient';

async function handleSignup(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          account_type: 'SME',
          full_name: 'John Doe',
        },
      },
    });

    if (error) {
      if (error.message.includes('rate limit') || 
          error.message.includes('too many')) {
        throw new Error(
          'Too many signup attempts. Please wait a few minutes.'
        );
      }
      throw error;
    }

    // Profile should be auto-created by trigger
    return { success: true, user: data.user };
    
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
}
```

### SQL: Log Custom Event
```sql
SELECT public.log_user_event(
  'user-uuid-here'::uuid,
  'profile_completed',
  'user@example.com',
  jsonb_build_object('source', 'web', 'completion', 100)
);
```

---

## 📅 Maintenance Schedule

| Task | Frequency | Command |
|------|-----------|---------|
| Health check | Daily | `SELECT * FROM public.get_signup_statistics(24);` |
| Review blocked attempts | Weekly | `SELECT * FROM public.get_blocked_attempts_summary(168, 5);` |
| Verify trigger active | Monthly | Check in troubleshooting section |
| Review event coverage | Monthly | `SELECT * FROM v_signup_correlation_status;` |

---

## 🔗 Full Documentation

- [**Comprehensive SQL Guide**](../backend/supabase/auth_audit_comprehensive_guide.sql) - All queries
- [**Monitoring Dashboard**](../backend/supabase/auth_audit_monitoring_dashboard.sql) - Alerts
- [**Integration Guide**](./AUTH_AUDIT_INTEGRATION_GUIDE.md) - Code examples
- [**Blocked Signups**](./AUTH_AUDIT_BLOCKED_SIGNUPS.md) - Deep dive
- [**Complete Summary**](./AUTH_AUDIT_COMPLETE_SUMMARY.md) - Overview

---

## ✅ Production Checklist

- [ ] Run: `SELECT * FROM public.backfill_missing_profiles();`
- [ ] Verify: `SELECT COUNT(*) FROM v_users_without_profiles;` → 0
- [ ] Test: Create test user and verify profile auto-created
- [ ] Monitor: Set up alerts from monitoring dashboard
- [ ] Document: Share this guide with team

---

**Status:** ✅ Production Ready  
**Last Updated:** 2025-11-24  
**Quick Support:** See troubleshooting section above
