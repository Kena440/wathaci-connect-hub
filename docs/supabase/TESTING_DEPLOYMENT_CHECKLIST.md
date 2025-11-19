# Supabase Production Testing & Deployment Checklist

## Overview

This checklist ensures all Supabase database components are tested and ready for production deployment. Complete all items before going live.

**Project**: WATHACI CONNECT  
**Date**: _________________  
**Completed By**: _________________

---

## Pre-Testing Setup

### Local Environment Setup

- [ ] Supabase CLI installed (`supabase --version`)
- [ ] Local Supabase instance started (`supabase start`)
- [ ] Environment variables configured:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` (backend only)
  - [ ] `SMTP_PASSWORD`
  - [ ] `TWILIO_ACCOUNT_SID`
  - [ ] `TWILIO_AUTH_TOKEN`
  - [ ] `TWILIO_MESSAGE_SERVICE_SID`

### Migration Application

- [ ] All migrations applied locally
  ```bash
  supabase db reset  # Fresh start
  # OR
  supabase db push   # Apply new migrations
  ```
- [ ] No migration errors
- [ ] Migration logs reviewed
- [ ] Database schema matches expected state

---

## 1. Database Schema Testing

### Core Tables Verification

- [ ] **profiles** table exists
  - [ ] All columns present
  - [ ] Primary key is UUID
  - [ ] Foreign key to `auth.users(id)` with `ON DELETE CASCADE`
  - [ ] Default values set correctly
  
- [ ] **audit_logs** table exists
  - [ ] All columns present
  - [ ] Indexes created
  - [ ] Foreign key to `profiles(id)` with `ON DELETE SET NULL`

- [ ] **user_roles** table exists
  - [ ] Unique constraint on `(user_id, role_name)`
  - [ ] Indexes created

- [ ] **subscription_plans** table exists
  - [ ] Unique constraint on `name` (case-insensitive)
  - [ ] All required fields present

- [ ] **user_subscriptions** table exists
  - [ ] Foreign keys to `profiles` and `subscription_plans`
  - [ ] Check constraint on `status`

- [ ] **transactions** table exists
  - [ ] Unique constraint on `reference_number`
  - [ ] Check constraints on `amount` and `status`

- [ ] **payments** table exists
  - [ ] Unique constraints on `reference` and `provider_reference`
  - [ ] Check constraints validated

- [ ] **webhook_logs** table exists
  - [ ] Indexes on `reference`, `status`, and timestamps

- [ ] **Assessment tables** exist (5 tables):
  - [ ] `sme_needs_assessments`
  - [ ] `professional_needs_assessments`
  - [ ] `investor_needs_assessments`
  - [ ] `donor_needs_assessments`
  - [ ] `government_needs_assessments`

### Constraints Verification

```sql
-- Run this query to verify all constraints exist
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  conrelid::regclass AS table_name
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
ORDER BY table_name, constraint_name;
```

- [ ] All expected constraints present
- [ ] No conflicting constraints
- [ ] Check constraints validated with test data

### Indexes Verification

```sql
-- Run this query to verify all indexes exist
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

- [ ] All expected indexes present
- [ ] No missing indexes on foreign keys
- [ ] Performance-critical columns indexed

---

## 2. Auth & Profile Creation Testing

### New User Sign-Up Flow

- [ ] **Test Case 1: Basic Sign-Up**
  - [ ] Create new user via Supabase Auth
  - [ ] Verify `auth.users` row created
  - [ ] Verify `profiles` row automatically created
  - [ ] Verify profile fields populated from metadata
  - [ ] Verify default values set correctly (`profile_completed: false`, etc.)
  - [ ] Verify timestamps set correctly

- [ ] **Test Case 2: Sign-Up with Metadata**
  - [ ] Sign up with `full_name` and `account_type` in metadata
  - [ ] Verify metadata transferred to profile
  - [ ] Verify `account_type` set correctly

- [ ] **Test Case 3: Email Confirmation**
  - [ ] User receives confirmation email
  - [ ] Email contains correct link
  - [ ] User can confirm email
  - [ ] `email_confirmed_at` updated

- [ ] **Test Case 4: Duplicate Email**
  - [ ] Attempt to create user with existing email
  - [ ] Verify appropriate error returned
  - [ ] No duplicate profiles created

### Trigger Function Testing

```sql
-- Test the trigger function directly
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Insert a test user
  INSERT INTO auth.users (id, email, raw_user_meta_data)
  VALUES (
    gen_random_uuid(),
    'test@example.com',
    '{"full_name": "Test User", "account_type": "SME"}'::jsonb
  )
  RETURNING id INTO test_user_id;
  
  -- Check if profile was created
  ASSERT (SELECT COUNT(*) FROM public.profiles WHERE id = test_user_id) = 1,
    'Profile not created automatically';
  
  -- Cleanup
  DELETE FROM auth.users WHERE id = test_user_id;
  
  RAISE NOTICE 'Trigger test passed';
END $$;
```

- [ ] Trigger function test passed
- [ ] No errors in function execution
- [ ] Error handling works correctly

---

## 3. Row Level Security (RLS) Testing

### RLS Policy Verification

```sql
-- List all RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

- [ ] All tables have RLS enabled
- [ ] All expected policies exist
- [ ] Policy logic reviewed and correct

### Test with Authenticated User (Anon Key)

Create a test user and test these scenarios:

- [ ] **Profiles Table**
  - [ ] User can SELECT their own profile
  - [ ] User CANNOT SELECT other users' profiles
  - [ ] User can UPDATE their own profile
  - [ ] User CANNOT UPDATE other users' profiles
  - [ ] User can INSERT their own profile (if trigger fails)
  - [ ] User CANNOT INSERT profiles for other users

- [ ] **Assessment Tables**
  - [ ] User can manage (SELECT/INSERT/UPDATE) their own assessments
  - [ ] User CANNOT access other users' assessments

- [ ] **Subscriptions & Payments**
  - [ ] User can view their own subscriptions
  - [ ] User can view their own payments
  - [ ] User CANNOT view other users' transactions

- [ ] **Subscription Plans**
  - [ ] Any user can SELECT subscription plans
  - [ ] User CANNOT INSERT/UPDATE/DELETE plans (service role only)

- [ ] **Audit Logs**
  - [ ] User can view their own audit logs
  - [ ] User CANNOT view other users' audit logs

### Test with Service Role

- [ ] Service role can access ALL data in ALL tables
- [ ] Service role can bypass ALL RLS policies
- [ ] Backend operations work with service role key

### Test with Anonymous User

- [ ] Anonymous users CANNOT access any user data
- [ ] Anonymous users CAN view subscription plans
- [ ] Anonymous users CANNOT insert/update/delete anything

---

## 4. Audit Logging Testing

### Trigger Testing

- [ ] **Profile Changes**
  - [ ] Update a profile
  - [ ] Verify audit log created with correct data
  - [ ] `old_data` and `new_data` populated
  
- [ ] **Subscription Changes**
  - [ ] Create a subscription
  - [ ] Verify audit log created
  - [ ] Update subscription status
  - [ ] Verify audit log created

- [ ] **Payment Changes**
  - [ ] Create a payment
  - [ ] Verify audit log created
  - [ ] Update payment status
  - [ ] Verify audit log created

### Audit Log Query Testing

```sql
-- Query audit logs for a specific user
SELECT * FROM audit_logs
WHERE user_id = 'test-user-uuid'
ORDER BY created_at DESC
LIMIT 10;
```

- [ ] Audit logs query successfully
- [ ] Correct data in `old_data` and `new_data` fields
- [ ] Timestamps accurate

---

## 5. Data Validation & Constraints Testing

### Constraint Testing

- [ ] **Email Format Validation**
  ```sql
  -- Should fail
  INSERT INTO profiles (id, email, account_type)
  VALUES (gen_random_uuid(), 'invalid-email', 'SME');
  ```
  - [ ] Invalid email rejected

- [ ] **Account Type Validation**
  ```sql
  -- Should fail
  INSERT INTO profiles (id, email, account_type)
  VALUES (gen_random_uuid(), 'test@example.com', 'invalid_type');
  ```
  - [ ] Invalid account type rejected

- [ ] **Positive Amount Validation**
  ```sql
  -- Should fail
  INSERT INTO transactions (id, user_id, amount, currency, status, payment_method, reference_number)
  VALUES (gen_random_uuid(), 'user-uuid', -100, 'NGN', 'pending', 'card', 'ref-123');
  ```
  - [ ] Negative amount rejected

- [ ] **Status Enum Validation**
  - [ ] Invalid transaction status rejected
  - [ ] Invalid payment status rejected
  - [ ] Invalid subscription status rejected

### Unique Constraint Testing

- [ ] Duplicate email rejected
- [ ] Duplicate reference_number rejected
- [ ] Duplicate provider_reference rejected
- [ ] Duplicate subscription plan name rejected

---

## 6. Performance Testing

### Index Usage Verification

```sql
-- Check if indexes are being used
EXPLAIN ANALYZE
SELECT * FROM profiles WHERE email = 'test@example.com';

EXPLAIN ANALYZE
SELECT * FROM profiles WHERE account_type = 'SME';

EXPLAIN ANALYZE
SELECT * FROM transactions WHERE user_id = 'user-uuid';
```

- [ ] Email lookups use index (no Seq Scan)
- [ ] Account type filtering uses index
- [ ] User ID lookups use index
- [ ] No full table scans on large queries

### Query Performance

- [ ] Profile fetch < 100ms
- [ ] Subscription list < 100ms
- [ ] Transaction list < 200ms
- [ ] Audit log query < 200ms

---

## 7. Frontend Integration Testing

### Authentication Flow

- [ ] **Sign Up**
  - [ ] Sign up form submits correctly
  - [ ] Loading states work
  - [ ] Success message displayed
  - [ ] Redirect to expected page
  - [ ] Errors handled gracefully

- [ ] **Sign In**
  - [ ] Sign in form submits correctly
  - [ ] Session created and stored
  - [ ] User redirected to dashboard
  - [ ] Remember me works

- [ ] **Sign Out**
  - [ ] Sign out clears session
  - [ ] User redirected to login
  - [ ] Protected routes inaccessible after logout

- [ ] **Password Reset**
  - [ ] Request password reset works
  - [ ] Email received with reset link
  - [ ] Reset link works
  - [ ] Password updated successfully

### Profile Management

- [ ] **Fetch Profile**
  - [ ] Profile loads on page mount
  - [ ] Loading states work
  - [ ] Profile data displays correctly
  - [ ] Errors handled gracefully

- [ ] **Update Profile**
  - [ ] Form pre-fills with current data
  - [ ] Updates submit correctly
  - [ ] Optimistic UI updates work
  - [ ] Success message displayed
  - [ ] Errors handled gracefully

### Error Handling

- [ ] Session expiry detected and handled
- [ ] Network errors displayed to user
- [ ] Validation errors displayed inline
- [ ] Supabase errors parsed correctly
- [ ] User-friendly error messages

---

## 8. Backend Integration Testing

### Admin Operations

- [ ] **Get User Profile**
  - [ ] Backend can fetch any user profile
  - [ ] Service role key works
  - [ ] Response format correct

- [ ] **Update User Profile**
  - [ ] Backend can update any user profile
  - [ ] Updates saved correctly
  - [ ] Audit log created

- [ ] **Get All Users**
  - [ ] Pagination works
  - [ ] Filtering works (account type)
  - [ ] Response includes correct metadata

### Payment Operations

- [ ] **Create Payment**
  - [ ] Payment record created
  - [ ] All fields saved correctly
  - [ ] Audit log created

- [ ] **Update Payment Status**
  - [ ] Status updated
  - [ ] Webhook processed
  - [ ] Subscription activated if applicable

### Statistics

- [ ] **User Statistics**
  - [ ] Total users count correct
  - [ ] Account type breakdown correct
  - [ ] Recently registered count correct

- [ ] **Payment Statistics**
  - [ ] Total payments count correct
  - [ ] Success/pending/failed breakdown correct
  - [ ] Amount calculations correct

---

## 9. Staging Environment Testing

### Environment Setup

- [ ] Staging Supabase project created
- [ ] Environment variables set:
  - [ ] `VITE_SUPABASE_URL` (staging)
  - [ ] `VITE_SUPABASE_ANON_KEY` (staging)
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` (staging)
- [ ] Email provider configured (staging)
- [ ] SMS provider configured (staging)

### Migration Deployment

```bash
# Link to staging project
supabase link --project-ref <staging-ref>

# Push migrations
supabase db push

# Verify migrations
supabase db diff
```

- [ ] Migrations applied successfully
- [ ] No errors in staging database
- [ ] Schema matches expected state

### End-to-End Testing in Staging

- [ ] Sign up works
- [ ] Email confirmation works
- [ ] Sign in works
- [ ] Profile management works
- [ ] Subscription purchase works
- [ ] Payment processing works
- [ ] Admin operations work

---

## 10. Production Deployment

### Pre-Deployment Checklist

- [ ] All tests passed in staging
- [ ] No critical issues identified
- [ ] Team approval received
- [ ] Rollback plan documented
- [ ] Monitoring configured
- [ ] Backup taken

### Environment Setup

- [ ] Production Supabase project created or updated
- [ ] Environment variables set:
  - [ ] `VITE_SUPABASE_URL` (production)
  - [ ] `VITE_SUPABASE_ANON_KEY` (production)
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` (production - KEEP SECRET!)
- [ ] Email provider configured (production)
- [ ] SMS provider configured (production)
- [ ] Domain configured
- [ ] SSL certificates configured

### Supabase Dashboard Configuration

- [ ] **Auth Settings**
  - [ ] Email confirmations enabled
  - [ ] Site URL configured
  - [ ] Redirect URLs configured
  - [ ] JWT expiry set (3600s)
  - [ ] Password requirements set (min 6 characters)

- [ ] **Email Settings**
  - [ ] SMTP configured (mail.privateemail.com)
  - [ ] Email templates uploaded
  - [ ] Test email sent and received

- [ ] **SMS Settings**
  - [ ] Twilio configured
  - [ ] Message template set
  - [ ] Test SMS sent and received

- [ ] **Rate Limiting**
  - [ ] Email rate limit: 2/hour
  - [ ] SMS rate limit: 30/hour
  - [ ] Sign-in rate limit: 30/5min
  - [ ] Token refresh rate limit: 150/5min

### Migration Deployment

```bash
# Link to production project
supabase link --project-ref <production-ref>

# Verify current state
supabase db diff

# Push migrations
supabase db push

# Verify deployment
supabase db pull --schema public
```

- [ ] Migrations applied successfully
- [ ] No errors in production logs
- [ ] Schema verified
- [ ] RLS policies active

### Post-Deployment Verification

- [ ] **Smoke Tests**
  - [ ] Sign up a test user
  - [ ] Verify profile created
  - [ ] Sign in works
  - [ ] Profile update works
  - [ ] Sign out works

- [ ] **Monitoring**
  - [ ] Database metrics monitored
  - [ ] Error rates normal
  - [ ] Response times acceptable
  - [ ] No authentication issues

---

## 11. Post-Deployment Monitoring

### First 24 Hours

- [ ] Monitor error logs hourly
- [ ] Check new user sign-ups
- [ ] Verify profile creation rate
- [ ] Monitor database performance
- [ ] Check email delivery rate
- [ ] Check SMS delivery rate (if enabled)

### First Week

- [ ] Daily error log review
- [ ] Monitor database size growth
- [ ] Check slow query logs
- [ ] Review RLS policy performance
- [ ] Analyze user behavior patterns

### Ongoing

- [ ] Weekly error log review
- [ ] Monthly performance review
- [ ] Quarterly security audit
- [ ] Regular backup verification

---

## 12. Rollback Plan

### If Issues Detected

1. **Immediate Actions**
   - [ ] Stop new deployments
   - [ ] Assess impact
   - [ ] Communicate to team

2. **Rollback Database** (if necessary)
   ```bash
   # Revert to previous migration
   supabase db reset --db-url <production-url>
   ```
   - [ ] Backup current state first
   - [ ] Apply previous migrations
   - [ ] Verify rollback successful

3. **Rollback Application**
   - [ ] Revert frontend deployment
   - [ ] Revert backend deployment
   - [ ] Verify application works with old schema

4. **Post-Rollback**
   - [ ] Investigate root cause
   - [ ] Document lessons learned
   - [ ] Fix issues in staging
   - [ ] Re-test before next deployment

---

## 13. Documentation

### Required Documentation

- [ ] Database schema documented
- [ ] RLS policies documented
- [ ] Migration history documented
- [ ] API endpoints documented
- [ ] Error codes documented
- [ ] Rollback procedures documented

### Team Knowledge Transfer

- [ ] Team trained on new features
- [ ] Admin procedures documented
- [ ] Troubleshooting guide created
- [ ] On-call procedures updated

---

## Sign-Off

### Testing Completed By

- **Name**: _________________
- **Date**: _________________
- **Signature**: _________________

### Approved for Production By

- **Name**: _________________
- **Date**: _________________
- **Signature**: _________________

---

## Notes & Issues

Record any issues encountered during testing and their resolutions:

```
Issue #1: [Description]
Resolution: [How it was fixed]

Issue #2: [Description]
Resolution: [How it was fixed]
```

---

**End of Checklist**

For questions or issues, refer to:
- [PRODUCTION_DATABASE_SETUP.md](./PRODUCTION_DATABASE_SETUP.md)
- [FRONTEND_INTEGRATION_EXAMPLES.ts](./FRONTEND_INTEGRATION_EXAMPLES.ts)
- [BACKEND_INTEGRATION_EXAMPLES.js](./BACKEND_INTEGRATION_EXAMPLES.js)
