# Pre-Launch Manual Smoke Tests

## Overview

This document outlines the manual smoke tests that must be executed in the production environment before the official launch of WATHACI CONNECT. These tests validate the end-to-end authentication flow, profile management, payment processing, and session persistence.

**Tester Requirements**: Tests should be performed by at least two team members using different devices/browsers to ensure cross-platform compatibility.

**Prerequisites**:
- Production environment fully deployed with all environment variables configured
- Supabase database schema provisioned (run `npm run supabase:provision`)
- All edge functions deployed
- DNS and SSL certificates configured
- Lenco payment gateway configured with live API keys

---

## Test 1: User Sign-Up Flow

### Objective
Verify that new users can successfully register and create an account.

### Steps
1. Navigate to the production URL: `https://[your-production-domain]`
2. Click "Get Started" or "Sign Up" button
3. Fill in the sign-up form with valid test data:
   - **Email**: Use a real email address you can access
   - **Password**: Use a strong password meeting requirements (min 8 characters)
   - **First Name**: Enter a test first name
   - **Last Name**: Enter a test last name
   - **Account Type**: Select one (e.g., Individual, SME, Professional)
   - **Mobile Number**: Enter a valid Zambian mobile number (optional)
   - **Company Name**: Enter if applicable
4. Accept Terms of Service checkbox
5. Click "Sign Up" button

### Expected Results
- ✅ Form validates inputs correctly
- ✅ No JavaScript errors in browser console
- ✅ User is redirected to `/profile-setup?mode=edit` page
- ✅ Success message or confirmation displayed
- ✅ User profile is created in Supabase database
- ✅ User receives a confirmation email from Supabase

### Failure Actions
- Check Supabase logs for authentication errors
- Verify environment variables are correctly set
- Review browser console for JavaScript errors
- Confirm database trigger `on_auth_user_created` is active

---

## Test 2: Sign-In with OTP Verification

### Objective
Verify that users can sign in using email/password and complete OTP verification.

### Steps
1. Navigate to the production sign-in page: `https://[your-production-domain]/signin`
2. Enter the email and password used in Test 1
3. Click "Sign In" button
4. Wait for OTP to be sent to your email
5. Check your email inbox for the 6-digit OTP code
6. Enter the OTP code in the verification field
7. Click "Verify" button

### Expected Results
- ✅ Initial sign-in form accepts credentials without errors
- ✅ OTP is sent to the user's email within 30 seconds
- ✅ OTP code is valid for at least 5 minutes
- ✅ After OTP verification, user is redirected to dashboard or home page
- ✅ User session is established (check for auth token in browser storage)
- ✅ User can access protected routes (e.g., `/messages`, `/funding-hub`)

### Failure Actions
- Check Supabase authentication settings
- Verify email service is configured correctly
- Review OTP expiration settings
- Check for rate limiting issues

---

## Test 3: Session Persistence Across Page Reloads

### Objective
Verify that user sessions persist across page reloads and browser restarts.

### Steps
1. After completing Test 2, ensure you are signed in
2. Navigate to a protected page (e.g., `/messages` or `/funding-hub`)
3. **Test 3a - Page Reload**:
   - Press F5 or click browser refresh button
   - Verify you remain signed in
4. **Test 3b - New Tab**:
   - Open a new tab and navigate to the production URL
   - Verify you are already signed in
5. **Test 3c - Browser Restart**:
   - Close all browser windows
   - Reopen browser and navigate to the production URL
   - Verify you are still signed in (or redirected to sign-in if session expired)

### Expected Results
- ✅ User remains signed in after page reload
- ✅ User session persists in new tabs
- ✅ Session persists after browser restart (if "Remember Me" was selected)
- ✅ User profile data loads correctly on page load
- ✅ Protected routes remain accessible without re-authentication

### Failure Actions
- Check Supabase session storage settings
- Verify `refreshUser()` function in `AppContext.tsx` is working
- Review browser localStorage for auth tokens
- Check session expiration settings in Supabase

---

## Test 4: Profile Completion Flow

### Objective
Verify that users can complete their profile with all required information.

### Steps
1. Sign in to the application (if not already signed in from previous tests)
2. Navigate to `/profile-setup` or click "Complete Profile" if prompted
3. Fill in all required profile fields:
   - Personal information (if not already provided)
   - Business/professional information (depending on account type)
   - Skills and expertise (for professionals/freelancers)
   - Company details (for businesses)
   - Address and location information
4. Upload profile picture (optional)
5. Click "Save" or "Complete Profile" button

### Expected Results
- ✅ All form fields are rendered correctly
- ✅ Form validation works for required fields
- ✅ Profile data is saved to Supabase database
- ✅ User is redirected to appropriate dashboard after completion
- ✅ Profile completion status is updated in database
- ✅ User sees confirmation message
- ✅ Profile data persists after page reload

### Failure Actions
- Check Supabase RLS (Row Level Security) policies
- Verify profile update functions are working
- Review network requests for API errors
- Check database schema matches expected fields

---

## Test 5: Payment Processing (Lenco Integration)

### Objective
Verify that the Lenco payment gateway is properly integrated and can process payments.

### Prerequisites
- Lenco live API keys configured
- Test subscription plan or donation amount available

### Steps
1. Navigate to a page with payment functionality (e.g., `/subscription-plans` or click "Donate")
2. Select a subscription plan or donation amount
3. Click "Subscribe" or "Donate" button
4. Fill in payment details:
   - **Payment Method**: Select Mobile Money or Card
   - **Provider**: Select provider (MTN, Airtel, Zamtel)
   - **Phone Number**: Enter valid Zambian mobile number
   - **Email**: Confirm email address
   - **Name**: Confirm name
5. Click "Pay" or "Process Payment" button
6. Wait for payment processing (may take up to 60 seconds)
7. Complete any additional verification steps (e.g., mobile money prompt)

### Expected Results
- ✅ Payment form loads without errors
- ✅ All payment providers are available
- ✅ Payment amount is calculated correctly with fees displayed
- ✅ Payment request is sent to Lenco API
- ✅ User receives payment status update
- ✅ Payment record is created in database
- ✅ Webhook receives payment confirmation from Lenco
- ✅ Payment status is updated in database after webhook
- ✅ User receives payment confirmation email/notification

### Failure Actions
- Check Lenco API keys are correct (live keys, not test keys)
- Verify webhook endpoint is accessible
- Review Lenco dashboard for transaction logs
- Check webhook logs in Supabase
- Verify payment service functions are working

---

## Test 6: Sign-Out Flow

### Objective
Verify that users can properly sign out and sessions are terminated.

### Steps
1. While signed in, click on user profile icon/menu
2. Click "Sign Out" button
3. Confirm sign-out if prompted

### Expected Results
- ✅ User is immediately signed out
- ✅ User is redirected to home page or sign-in page
- ✅ Session is cleared from browser storage
- ✅ Attempting to access protected routes redirects to sign-in
- ✅ User can no longer access authenticated API endpoints

### Failure Actions
- Check `signOut()` function in AppContext
- Verify Supabase session is being properly terminated
- Review auth state management

---

## Test 7: Error Handling and Edge Cases

### Objective
Verify that the application handles errors gracefully.

### Test Cases

#### 7a. Invalid Sign-In Credentials
- Enter incorrect email/password
- Expected: Clear error message displayed, no system crash

#### 7b. Expired OTP
- Wait for OTP to expire (>5 minutes)
- Try to use expired OTP
- Expected: "OTP expired" error message, option to resend

#### 7c. Network Error During Payment
- Start payment process
- Disconnect internet mid-process (if testing locally)
- Expected: Appropriate error message, payment not charged

#### 7d. Invalid Payment Amount
- Try to enter payment amount below minimum or above maximum
- Expected: Validation error, payment not processed

### Expected Results
- ✅ All error scenarios show user-friendly error messages
- ✅ No sensitive information exposed in error messages
- ✅ Application remains stable (no crashes)
- ✅ Users can recover from errors without page reload

---

## Test 8: Cross-Browser Compatibility

### Objective
Verify the application works across different browsers.

### Browsers to Test
- ✅ Chrome (latest version)
- ✅ Firefox (latest version)
- ✅ Safari (latest version, macOS/iOS)
- ✅ Edge (latest version)
- ✅ Mobile browsers (Chrome Mobile, Safari Mobile)

### Test Each Browser
1. Complete Test 1 (Sign-Up)
2. Complete Test 2 (Sign-In with OTP)
3. Complete Test 3 (Session Persistence)
4. Navigate through main pages
5. Test responsive design on mobile

### Expected Results
- ✅ All functionality works consistently across browsers
- ✅ UI renders correctly on all browsers
- ✅ No browser-specific JavaScript errors
- ✅ Mobile responsive design works properly

---

## Test 9: Performance and Load Time

### Objective
Verify that the application loads quickly and performs well.

### Metrics to Check
- ✅ Initial page load < 3 seconds
- ✅ Time to Interactive (TTI) < 5 seconds
- ✅ First Contentful Paint (FCP) < 2 seconds
- ✅ No console errors or warnings on page load
- ✅ Images load properly and are optimized
- ✅ Lighthouse score > 90 for Performance

### Tools
- Chrome DevTools Network tab
- Lighthouse audit (Chrome DevTools)
- WebPageTest.org

---

## Test 10: Database and Data Integrity

### Objective
Verify that data is correctly stored and retrieved from the database.

### Steps
1. After completing Tests 1-4, log into Supabase dashboard
2. Navigate to the database tables
3. Verify the following:
   - User record exists in `auth.users` table
   - Profile record exists in `profiles` table
   - Profile completion status is accurate
   - All timestamps (created_at, updated_at) are correct
   - No orphaned or duplicate records

### Expected Results
- ✅ All user data is correctly stored
- ✅ Database relationships are intact
- ✅ No data inconsistencies
- ✅ RLS policies are working (users can only access their own data)

---

## Sign-Off Checklist

Before launch, ensure all tests have been completed and signed off:

| Test | Status | Tester | Date | Notes |
|------|--------|--------|------|-------|
| Test 1: User Sign-Up | ⬜ Pass / ⬜ Fail | | | |
| Test 2: Sign-In with OTP | ⬜ Pass / ⬜ Fail | | | |
| Test 3: Session Persistence | ⬜ Pass / ⬜ Fail | | | |
| Test 4: Profile Completion | ⬜ Pass / ⬜ Fail | | | |
| Test 5: Payment Processing | ⬜ Pass / ⬜ Fail | | | |
| Test 6: Sign-Out Flow | ⬜ Pass / ⬜ Fail | | | |
| Test 7: Error Handling | ⬜ Pass / ⬜ Fail | | | |
| Test 8: Cross-Browser | ⬜ Pass / ⬜ Fail | | | |
| Test 9: Performance | ⬜ Pass / ⬜ Fail | | | |
| Test 10: Database Integrity | ⬜ Pass / ⬜ Fail | | | |

**Final Approval**:
- [ ] All tests passing
- [ ] No critical issues identified
- [ ] Performance meets requirements
- [ ] Security audit completed
- [ ] Backup and recovery plan in place

**Approved By**: ___________________ **Date**: ___________

**Launch Authorization**: ___________________ **Date**: ___________

---

## Emergency Rollback Procedure

If critical issues are discovered during smoke testing:

1. **Immediate Actions**:
   - Do not proceed with launch
   - Document all failing tests with screenshots
   - Notify team lead and stakeholders

2. **Rollback Steps** (if already deployed):
   - Revert to previous stable deployment
   - Restore database backup if necessary
   - Update DNS if needed
   - Notify users of temporary maintenance

3. **Post-Rollback**:
   - Analyze root cause of failures
   - Create detailed bug reports
   - Schedule fix and re-test
   - Plan new launch date

---

## Additional Resources

- [AUTHENTICATION_VERIFICATION.md](../AUTHENTICATION_VERIFICATION.md) - Authentication system details
- [DATABASE_SETUP.md](../DATABASE_SETUP.md) - Database schema and setup
- [WEBHOOK_SETUP_GUIDE.md](./WEBHOOK_SETUP_GUIDE.md) - Webhook configuration
- [PAYMENT_INTEGRATION_GUIDE.md](./PAYMENT_INTEGRATION_GUIDE.md) - Payment processing details
- [PRODUCTION_READINESS_CHECKLIST.md](./PRODUCTION_READINESS_CHECKLIST.md) - Pre-launch checklist
