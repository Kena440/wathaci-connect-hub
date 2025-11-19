# Sign-Up and Sign-In Comprehensive Testing Guide

## Overview
This guide provides step-by-step instructions for testing ALL sign-up, sign-in, and profile creation functionality after applying the database schema fixes.

## Prerequisites
1. Apply all database migrations:
   ```bash
   npm run supabase:push
   ```

2. Verify migrations applied successfully:
   ```bash
   npm run supabase:status
   ```

3. Build and run the application:
   ```bash
   npm run build
   npm run dev
   ```

## Test Suite 1: Sign-Up Flow

### Test 1.1: Sign-Up with Sole Proprietor Account
1. Navigate to `/signup`
2. Select "Sole Proprietor" account type
3. Fill in form:
   - Full Name: "John Smith"
   - Email: "john.smith.sole@test.com"
   - Password: "TestPass123!"
   - Mobile Number: "+260971234567" (optional)
   - Accept Terms: ✓
4. Click "Sign up now"
5. **Expected**: Success message, check email for confirmation

**Verify in Database**:
```sql
SELECT id, email, full_name, first_name, last_name, account_type, phone, msisdn, payment_phone, profile_completed
FROM profiles WHERE email = 'john.smith.sole@test.com';
```
**Expected**:
- `full_name` = "John Smith"
- `first_name` = "John"
- `last_name` = "Smith"
- `account_type` = "sole_proprietor"
- `profile_completed` = false

### Test 1.2: Sign-Up with Professional Account
Repeat Test 1.1 with:
- Account type: "Professional"
- Email: "jane.doe.pro@test.com"
- **Expected**: `account_type` = "professional"

### Test 1.3: Sign-Up with SME Account
Repeat Test 1.1 with:
- Account type: "SME"
- Email: "business.sme@test.com"
- **Expected**: `account_type` = "sme"

### Test 1.4: Sign-Up with Investor Account
Repeat Test 1.1 with:
- Account type: "Investor"
- Email: "investor@test.com"
- **Expected**: `account_type` = "investor"

### Test 1.5: Sign-Up with Donor Account
Repeat Test 1.1 with:
- Account type: "Donor"
- Email: "donor@test.com"
- **Expected**: `account_type` = "donor"

### Test 1.6: Sign-Up with Government Account
Repeat Test 1.1 with:
- Account type: "Government"
- Email: "gov@test.com"
- **Expected**: `account_type` = "government"

### Test 1.7: Sign-Up with Mobile Number and SMS OTP
1. Navigate to `/signup`
2. Select any account type
3. Fill in form with mobile number: "+260971234568"
4. Check "Send verification code via SMS" (if available)
5. Submit form
6. **Expected**: SMS sent to mobile number (if Twilio configured)

### Test 1.8: Sign-Up without Mobile Number
1. Navigate to `/signup`
2. Select any account type
3. Fill in form WITHOUT mobile number
4. Submit form
5. **Expected**: Success, profile created with null phone fields

### Test 1.9: Sign-Up with Existing Email
1. Try to sign up with email from Test 1.1
2. **Expected**: Error message "An account with this email already exists"

### Test 1.10: Sign-Up Form Validation
1. Try to submit with:
   - Empty full name → **Expected**: "Full name is required"
   - Invalid email → **Expected**: "Enter a valid email address"
   - Short password → **Expected**: "Password must be at least 8 characters"
   - Invalid phone format → **Expected**: "Enter a valid phone number"
   - Without accepting terms → **Expected**: "You must accept the Terms & Conditions"

## Test Suite 2: Email Confirmation

### Test 2.1: Confirm Email Link
1. Check inbox for confirmation email from sign-up
2. Click confirmation link
3. **Expected**: Redirect to app with message "Email confirmed"

### Test 2.2: Sign-In Before Email Confirmation
1. Sign up with new email
2. Try to sign in BEFORE confirming email
3. **Expected**: Error message about unconfirmed email

### Test 2.3: Sign-In After Email Confirmation
1. Confirm email from Test 2.1
2. Sign in with credentials
3. **Expected**: Successful sign-in, redirect to profile setup

## Test Suite 3: Sign-In Flow

### Test 3.1: Sign-In with Valid Credentials
1. Navigate to `/signin`
2. Enter email and password from Test 1.1
3. Click "Sign in"
4. **Expected**: Successful sign-in, redirect based on profile completion

### Test 3.2: Sign-In with Invalid Password
1. Navigate to `/signin`
2. Enter valid email, wrong password
3. **Expected**: Error message "Invalid email or password"

### Test 3.3: Sign-In with Non-Existent Email
1. Navigate to `/signin`
2. Enter email that doesn't exist
3. **Expected**: Error message "Invalid email or password"

### Test 3.4: Sign-In Form Validation
1. Try to submit with:
   - Empty email → **Expected**: "Email is required"
   - Invalid email format → **Expected**: "Enter a valid email address"
   - Empty password → **Expected**: "Password is required"

### Test 3.5: Remember Password Feature
1. Sign in with "Remember password" checked
2. Sign out
3. Return to sign-in page
4. **Expected**: Email and password fields pre-filled

## Test Suite 4: Profile Creation and Setup

### Test 4.1: Automatic Profile Creation
After signing up in Test 1.1:
```sql
SELECT * FROM profiles WHERE email = 'john.smith.sole@test.com';
```
**Expected**: Profile row exists with:
- All name fields populated (full_name, first_name, last_name)
- Correct account_type
- Phone fields populated if provided
- accepted_terms = true
- profile_completed = false

### Test 4.2: Profile Setup Page Access
1. Sign in with account from Test 1.1
2. **Expected**: Redirect to `/profile-setup` (if profile_completed = false)

### Test 4.3: Complete Profile Setup - Sole Proprietor
1. On profile setup page
2. Verify account type is pre-selected
3. Fill in required fields:
   - Business Name
   - Phone (if not provided during signup)
   - Country
4. Submit form
5. **Expected**: Profile saved, profile_completed = true

**Verify in Database**:
```sql
SELECT business_name, company_name, first_name, last_name, full_name, phone, msisdn, payment_phone, profile_completed
FROM profiles WHERE email = 'john.smith.sole@test.com';
```
**Expected**:
- `business_name` populated
- `company_name` = `business_name` (synced by trigger)
- All name fields consistent
- `profile_completed` = true

### Test 4.4: Update Profile
1. Sign in
2. Navigate to profile settings/edit
3. Update business_name
4. Save
5. **Expected**: Update successful

**Verify**:
```sql
SELECT business_name, company_name FROM profiles WHERE email = 'john.smith.sole@test.com';
```
**Expected**: Both fields updated and in sync

### Test 4.5: Name Field Consistency
1. Update first_name or last_name
2. Save
3. **Expected**: full_name automatically updated

**Verify**:
```sql
SELECT first_name, last_name, full_name FROM profiles WHERE email = 'john.smith.sole@test.com';
```
**Expected**: full_name = "first_name last_name"

## Test Suite 5: Password Reset

### Test 5.1: Request Password Reset
1. Navigate to `/forgot-password`
2. Enter email from Test 1.1
3. Click "Send reset link"
4. **Expected**: Success message, check email

### Test 5.2: Reset Password with Valid Link
1. Open password reset email
2. Click reset link
3. Enter new password (twice)
4. Submit
5. **Expected**: Success, redirect to sign-in

### Test 5.3: Sign-In with New Password
1. Sign in with email and NEW password
2. **Expected**: Successful sign-in

### Test 5.4: Sign-In with Old Password
1. Try to sign in with OLD password
2. **Expected**: Error "Invalid email or password"

### Test 5.5: Reset Link Expiration
1. Request password reset
2. Wait for link to expire (or use old link)
3. Try to use expired link
4. **Expected**: Error message about invalid/expired link

## Test Suite 6: Data Integrity

### Test 6.1: Field Name Synchronization
After any profile update:
```sql
SELECT 
  full_name,
  first_name,
  last_name,
  business_name,
  company_name,
  phone,
  msisdn,
  payment_phone
FROM profiles
WHERE email = 'john.smith.sole@test.com';
```
**Expected**:
- full_name = first_name + " " + last_name
- company_name = business_name
- phone = msisdn (if phone provided)
- payment_phone = phone (initially)

### Test 6.2: Account Type Enum Values
```sql
SELECT DISTINCT account_type FROM profiles;
```
**Expected**: Only lowercase values:
- sole_proprietor
- professional
- sme
- investor
- donor
- government

### Test 6.3: Profile Completion Flag
```sql
-- New signups
SELECT email, profile_completed FROM profiles WHERE created_at > NOW() - INTERVAL '1 hour';
```
**Expected**: profile_completed = false for new accounts

After completing profile setup:
**Expected**: profile_completed = true

### Test 6.4: Phone Number Formats
All phone numbers in database should be in E.164 format (+[country][number]):
```sql
SELECT phone, msisdn, payment_phone FROM profiles WHERE phone IS NOT NULL;
```
**Expected**: All start with "+" and contain only digits

## Test Suite 7: Edge Cases

### Test 7.1: Single Word Name
1. Sign up with full_name = "Madonna"
2. **Expected**: 
   - first_name = "Madonna"
   - last_name = NULL
   - full_name = "Madonna"

### Test 7.2: Name with Multiple Spaces
1. Sign up with full_name = "Jean Claude Van Damme"
2. **Expected**:
   - first_name = "Jean"
   - last_name = "Claude Van Damme"
   - full_name = "Jean Claude Van Damme"

### Test 7.3: Special Characters in Name
1. Sign up with full_name = "José María O'Brien"
2. **Expected**: All fields correctly stored with special characters

### Test 7.4: Empty Business Name
1. Complete profile for non-business account type without business name
2. **Expected**: Success, business_name and company_name remain NULL

### Test 7.5: Very Long Names
1. Sign up with 120-character name
2. **Expected**: Accepted (max length in schema)

### Test 7.6: International Phone Numbers
Test with various country codes:
- +1 (US): "+12025551234"
- +44 (UK): "+442071234567"
- +260 (Zambia): "+260971234567"
- +234 (Nigeria): "+2348012345678"

**Expected**: All accepted and stored in E.164 format

## Test Suite 8: Account Type Specific Fields

### Test 8.1: SME Specific Fields
1. Complete profile for SME account
2. Fill: business_name, registration_number, industry_sector, employee_count
3. **Expected**: All fields saved correctly

### Test 8.2: Investor Specific Fields
1. Complete profile for Investor account
2. Fill: investment_focus, investment_ticket_min, investment_ticket_max
3. **Expected**: All fields saved correctly

### Test 8.3: Donor Specific Fields
1. Complete profile for Donor account
2. Fill: donor_type, funding_focus, annual_funding_budget
3. **Expected**: All fields saved correctly

### Test 8.4: Professional Specific Fields
1. Complete profile for Professional account
2. Add qualifications (JSON array)
3. Fill: specialization, experience_years
4. **Expected**: Qualifications stored as JSON array

## Test Suite 9: Integration Tests

### Test 9.1: Complete User Journey - Sole Proprietor
1. Sign up → Email confirmation → Sign in → Profile setup → Dashboard
2. **Expected**: Smooth flow, no errors, correct redirects

### Test 9.2: Complete User Journey - Professional
Same as 9.1 with Professional account type

### Test 9.3: Complete User Journey - SME
Same as 9.1 with SME account type

### Test 9.4: Sign Up → Sign Out → Sign In
1. Complete sign-up
2. Sign out
3. Sign in again
4. **Expected**: Session maintained, profile data persists

### Test 9.5: Multiple Browser Sessions
1. Sign in on two different browsers
2. **Expected**: Both sessions work independently

## Test Suite 10: Error Handling

### Test 10.1: Database Connection Error
Simulate by stopping Supabase:
1. Try to sign up
2. **Expected**: User-friendly error message, no crash

### Test 10.2: Invalid JWT Token
1. Manually corrupt auth token in browser
2. Try to access protected page
3. **Expected**: Redirect to sign-in

### Test 10.3: Network Timeout
Simulate slow/failed network:
1. Try to sign in
2. **Expected**: Loading indicator, timeout error message

### Test 10.4: Concurrent Profile Updates
1. Open profile in two tabs
2. Update different fields in each tab
3. Save both
4. **Expected**: Last write wins, no data corruption

## Verification Checklist

After completing all tests, verify:

- [ ] All account types can sign up successfully
- [ ] Email confirmations work
- [ ] Sign-in works with valid credentials
- [ ] Profile auto-creation works correctly
- [ ] All name fields sync properly (first_name, last_name, full_name)
- [ ] Business name fields sync (business_name, company_name)
- [ ] Phone fields initialize correctly (phone, msisdn, payment_phone)
- [ ] Account type enum uses lowercase values
- [ ] Profile completion flag works correctly
- [ ] Password reset flow works
- [ ] Form validation works on all forms
- [ ] Error messages are user-friendly
- [ ] No console errors during normal flows
- [ ] Database constraints prevent invalid data
- [ ] RLS policies allow proper access
- [ ] Triggers maintain data consistency

## Database Queries for Manual Verification

```sql
-- Check all profiles created
SELECT 
  email,
  account_type,
  first_name,
  last_name,
  full_name,
  business_name,
  company_name,
  phone,
  msisdn,
  payment_phone,
  profile_completed,
  accepted_terms,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 20;

-- Verify name field consistency
SELECT 
  email,
  first_name || ' ' || last_name AS computed_full_name,
  full_name AS stored_full_name,
  CASE 
    WHEN first_name || ' ' || last_name = full_name THEN 'CONSISTENT'
    ELSE 'MISMATCH'
  END AS name_status
FROM profiles
WHERE first_name IS NOT NULL OR last_name IS NOT NULL;

-- Verify business name sync
SELECT 
  email,
  business_name,
  company_name,
  CASE 
    WHEN business_name = company_name THEN 'SYNCED'
    WHEN business_name IS NULL AND company_name IS NULL THEN 'BOTH NULL'
    ELSE 'OUT OF SYNC'
  END AS sync_status
FROM profiles;

-- Check account type distribution
SELECT 
  account_type,
  COUNT(*) as count
FROM profiles
GROUP BY account_type
ORDER BY count DESC;

-- Check profile completion status
SELECT 
  profile_completed,
  COUNT(*) as count
FROM profiles
GROUP BY profile_completed;

-- Verify phone field consistency
SELECT 
  email,
  phone,
  msisdn,
  payment_phone,
  CASE
    WHEN phone = msisdn AND msisdn = payment_phone THEN 'CONSISTENT'
    WHEN phone IS NULL AND msisdn IS NULL AND payment_phone IS NULL THEN 'ALL NULL'
    ELSE 'INCONSISTENT'
  END AS phone_status
FROM profiles
WHERE phone IS NOT NULL OR msisdn IS NOT NULL OR payment_phone IS NOT NULL;
```

## Success Criteria

All tests MUST pass with:
- ✅ No database errors
- ✅ No console errors in browser
- ✅ Correct data in database
- ✅ Proper field synchronization
- ✅ User-friendly error messages
- ✅ Correct redirects after auth actions
- ✅ Profile data persists across sessions
- ✅ All account types work correctly
- ✅ Email and SMS flows work (if configured)
- ✅ Data integrity maintained by triggers

## Reporting Issues

If any test fails, document:
1. Test number and description
2. Steps to reproduce
3. Expected result
4. Actual result
5. Error messages (browser console and network)
6. Database state (relevant SQL queries)
7. Screenshots if applicable

## Notes
- Tests assume Supabase is running and accessible
- SMS OTP tests require Twilio configuration
- Email tests require SMTP configuration
- Some tests may need to wait for email delivery
- Clear browser cache between major test suites
- Use different emails for each test to avoid conflicts
