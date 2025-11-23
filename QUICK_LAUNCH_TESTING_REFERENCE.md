# Quick Launch Testing Reference

## One-Line Commands for Launch Day

```bash
# 1. Pre-Launch: Test email/OTP (2 min)
npm run test:email-otp

# 2. Pre-Launch: Test password reset (2 min)
npm run test:password-reset -- --email test@example.com

# 3. Launch: Start continuous monitoring
npm run launch:monitor:continuous
```

---

## Expected Results

### Email/OTP Test
```
✅ Supabase Connection: Connected successfully (150ms)
✅ Email Signup: User created (450ms)
✅ OTP Request: OTP sent successfully (320ms)
✅ Password Reset: Password reset email sent (280ms)
✅ Email Configuration: Configuration appears valid (5ms)

📊 Test Summary
Total Tests: 5
Passed: 5
Failed: 0
Pass Rate: 100%
```

### Password Reset Test
```
✅ PASSED: User exists (210ms)
✅ PASSED: Password reset email sent (280ms)

📊 Test Summary
Automated Tests Passed: 2
Automated Tests Failed: 0
Manual Tests Required: 4
```

### Launch Monitoring
```
[15:30:45] 📊 Health check #1
[15:30:45] ✅ All systems healthy
[15:30:45] ℹ️  Response time: 145ms
[15:30:45] ℹ️  DB response time: 98ms

📊 Monitoring Statistics
Session:
  Uptime: 15m 45s
  Total Checks: 16
  Successful: 16
  Failed: 0
  Success Rate: 100%

Performance:
  Avg Response Time: 152ms
  ✅ Response time is good
```

---

## Manual Verification (After Running Tests)

### Check Email Inbox
1. ✅ Email from: Wathaci <support@wathaci.com>
2. ✅ Delivery time: < 30 seconds
3. ✅ Subject line clear and professional
4. ✅ Wathaci branding present
5. ✅ Email in Inbox (not Spam)

### Check Email Headers
```bash
# In Gmail: ⋮ → Show original
# Look for:
spf=pass
dkim=pass  
dmarc=pass
```

### Test Email Functionality
1. ✅ Confirmation link works
2. ✅ OTP code is 6 digits
3. ✅ Password reset link redirects correctly

---

## Troubleshooting Quick Reference

| Issue | Quick Fix |
|-------|-----------|
| Email not received | Check spam folder, wait 2 minutes |
| Test fails | Check environment variables are set |
| Connection error | Verify VITE_SUPABASE_URL is correct |
| OTP expired | Request new OTP (valid for 5 min) |
| Reset link fails | Use link within 1 hour |
| High response time | Check Supabase dashboard status |

---

## Environment Variables Check

```bash
# Verify these are set:
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# Should output:
# https://your-project.supabase.co
# eyJ... (long key starting with eyJ)
```

---

## Launch Day Timeline

| Time | Action | Expected Duration |
|------|--------|-------------------|
| T-60min | Run email/OTP test | 2 min |
| T-55min | Run password reset test | 2 min |
| T-50min | Verify all emails received | 3 min |
| T-45min | Check email headers (SPF/DKIM/DMARC) | 2 min |
| T-40min | Final review of test results | 5 min |
| T-30min | Team readiness check | 10 min |
| T-15min | Start monitoring script | 1 min |
| T-0 | **LAUNCH** | - |
| T+15min | Check monitoring (first check) | 2 min |
| T+60min | Check monitoring (hourly) | 5 min |

---

## Alert Response Guide

### Critical Alerts
🚨 **Supabase connection failed**
→ Check Supabase status, contact support immediately

🚨 **Database connection failed**  
→ Check RLS policies, verify connection string

### High Priority Alerts
⚠️ **Auth error detected**
→ Review Supabase auth logs, check configuration

⚠️ **Database query error**
→ Check RLS policies, review recent schema changes

### Medium Priority Alerts
⚠️ **High error rate**
→ Review error logs, identify patterns

⚠️ **High webhook failure rate**
→ Check webhook configuration and secrets

---

## Success Indicators

✅ **All systems healthy**: All checks passing  
✅ **Fast response**: < 500ms average  
✅ **Low errors**: < 1 per hour  
✅ **100% uptime**: No failed checks  
✅ **Email delivery**: < 30 seconds  

---

## Emergency Contacts

- **Technical Lead**: Check team roster
- **DevOps**: Check Supabase dashboard first
- **Email Support**: support@wathaci.com
- **Supabase Support**: https://supabase.com/support

---

## Documentation Links

- Full Guide: `PRODUCTION_TESTING_AND_MONITORING_GUIDE.md`
- Email Testing: `EMAIL_TESTING_GUIDE.md`
- Auth Testing: `COMPREHENSIVE_AUTH_TESTING_GUIDE.md`
- Launch Readiness: `PRODUCTION_LAUNCH_READINESS_SUMMARY.md`

---

**Version**: 1.0  
**Last Updated**: 2025-11-23  
**For**: Production Launch Testing
