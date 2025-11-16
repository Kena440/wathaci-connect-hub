# Authentication Flow - Manual Test Plan

## Overview
This document provides a comprehensive manual testing guide for the authentication flow improvements in WATHACI CONNECT. The fixes ensure users can successfully complete sign-up/sign-in and reach the appropriate destination without crashes or redirect loops.

## Changes Summary
1. **Smart Redirect System**: AuthForm now waits for profile data to load before redirecting
2. **Profile-Based Routing**: Users with incomplete profiles are sent to `/profile-setup`
3. **Loading States**: Shows "Redirecting..." while determining destination
4. **No Redirect Loops**: Uses `replace: true` and proper loading checks

---

## Test Environment Setup

### Prerequisites
- [ ] Latest code deployed
- [ ] Supabase configured with valid credentials
- [ ] Browser DevTools console open
- [ ] Network tab in DevTools ready

### Test Accounts Needed
1. **New User**: A fresh email address for sign-up tests
2. **Existing User (Incomplete Profile)**: test-incomplete@example.com
3. **Existing User (Complete Profile)**: test-complete@example.com
4. **Invalid Credentials**: for error handling tests

---

## Test Scenarios

### 1. Sign-Up Flow (New User)

#### 1.1 Successful Sign-Up with Profile Redirect
**Steps:**
1. Navigate to `/signup`
2. Fill in the form:
   - Email: `newuser_$(date +%s)@example.com` (unique)
   - Password: `TestPassword123!`
   - Confirm Password: `TestPassword123!`
   - Full Name: `Test User`
   - Mobile Money Number: `+260971234567`
3. Click "Create account"
4. Observe the button text changes

**Expected Results:**
- ✅ Button shows "Processing…" during submission
- ✅ Button shows "Redirecting…" after auth completes
- ✅ User is redirected to `/profile-setup` (since profile is new/incomplete)
- ✅ No console errors
- ✅ No ErrorBoundary message
- ✅ Toast notification: "Account created!" or "Please check your email to verify your account."

**Console Logs to Verify:**
```
[auth-state] SIGNED_IN
[profile] creating-profile-for-new-user
[profile] signup-profile-created
```

#### 1.2 Sign-Up with Email Already Exists
**Steps:**
1. Navigate to `/signup`
2. Use an email that already exists
3. Submit the form

**Expected Results:**
- ✅ Error message: "An account with this email already exists. Please sign in instead or use a different email."
- ✅ User stays on sign-up page
- ✅ No navigation occurs
- ✅ No console errors or crashes

#### 1.3 Sign-Up with Invalid Phone Number
**Steps:**
1. Navigate to `/signup`
2. Fill form with invalid phone: `123` (too short)
3. Try to submit

**Expected Results:**
- ✅ Validation error shown: "Enter a valid phone number with country code"
- ✅ Form does not submit
- ✅ Button remains enabled after error

#### 1.4 Sign-Up with Supabase Down/Network Error
**Steps:**
1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Navigate to `/signup`
4. Fill in valid form data
5. Submit

**Expected Results:**
- ✅ Error message shown (network-related)
- ✅ No crash or ErrorBoundary
- ✅ User can retry after going back online

---

### 2. Sign-In Flow (Existing Users)

#### 2.1 Sign-In with Incomplete Profile
**Steps:**
1. Create a test user with incomplete profile OR use existing test account
2. Navigate to `/signin`
3. Enter credentials:
   - Email: `test-incomplete@example.com`
   - Password: `TestPassword123!`
4. Click "Sign in"

**Expected Results:**
- ✅ Button shows "Processing…" then "Redirecting…"
- ✅ User redirected to `/profile-setup`
- ✅ Console shows: `[auth-state] SIGNED_IN`
- ✅ Toast: "Welcome back!"
- ✅ No ErrorBoundary

**How to Verify Profile Incomplete:**
```sql
-- Run in Supabase SQL Editor
SELECT id, email, profile_completed 
FROM profiles 
WHERE email = 'test-incomplete@example.com';
```
Should show `profile_completed = false` or `NULL`

#### 2.2 Sign-In with Complete Profile
**Steps:**
1. Ensure test account has `profile_completed = true`
2. Navigate to `/signin`
3. Enter credentials for complete profile user
4. Click "Sign in"

**Expected Results:**
- ✅ Button shows "Processing…" then "Redirecting…"
- ✅ User redirected to `/` (home page, since redirectTo="/" by default)
- ✅ User can access protected routes without being redirected back
- ✅ Header shows user menu/profile
- ✅ No redirect loops

**How to Set Profile Complete:**
```sql
-- Run in Supabase SQL Editor
UPDATE profiles 
SET profile_completed = true 
WHERE email = 'test-complete@example.com';
```

#### 2.3 Sign-In with Invalid Credentials
**Steps:**
1. Navigate to `/signin`
2. Enter:
   - Email: `test@example.com`
   - Password: `WrongPassword123`
3. Submit

**Expected Results:**
- ✅ Error shown: "Invalid email or password. Please check your credentials and try again."
- ✅ User stays on sign-in page
- ✅ No navigation
- ✅ No crash

#### 2.4 Sign-In with Whitespace in Credentials
**Steps:**
1. Navigate to `/signin`
2. Enter credentials with leading/trailing spaces:
   - Email: `  test@example.com  `
   - Password: `  password123  `
3. Submit

**Expected Results:**
- ✅ Credentials are trimmed automatically
- ✅ Sign-in succeeds if credentials are valid
- ✅ OR: Shows proper error if invalid

---

### 3. Profile Setup Flow

#### 3.1 New User Completes Profile
**Steps:**
1. Sign up as new user (should land on `/profile-setup`)
2. Select account type (e.g., "SME")
3. Fill in profile details
4. Submit profile form

**Expected Results:**
- ✅ Profile saved successfully
- ✅ `profile_completed` set to `true` in database
- ✅ User redirected to appropriate next step
- ✅ No crashes during save

#### 3.2 Existing User Updates Profile
**Steps:**
1. Sign in as user with complete profile
2. Navigate to `/profile-setup` manually
3. Update profile information
4. Save changes

**Expected Results:**
- ✅ Changes saved successfully
- ✅ User can navigate away without issues
- ✅ Profile remains complete

---

### 4. Protected Routes

#### 4.1 Accessing Protected Route While Logged Out
**Steps:**
1. Ensure logged out (clear local storage if needed)
2. Navigate directly to `/funding-hub` (protected route)

**Expected Results:**
- ✅ Shows loading screen briefly
- ✅ Redirected to `/signin`
- ✅ No infinite redirect loops
- ✅ No console errors

#### 4.2 Accessing Protected Route While Logged In
**Steps:**
1. Sign in with complete profile
2. Navigate to `/funding-hub`

**Expected Results:**
- ✅ Page loads successfully
- ✅ User can interact with page
- ✅ Refresh page → stays on page (no redirect)
- ✅ Session persists

#### 4.3 Accessing Protected Route with Incomplete Profile
**Steps:**
1. Sign in with incomplete profile
2. Try to navigate to `/messages` (protected)

**Expected Results:**
- ✅ Can access the route (PrivateRoute only checks auth, not profile completion)
- ✅ OR: If additional logic exists, should handle gracefully
- ✅ No crashes

---

### 5. Edge Cases & Error Scenarios

#### 5.1 Browser Refresh During Sign-In
**Steps:**
1. Fill in sign-in form
2. Click "Sign in"
3. Immediately refresh the page (F5) before redirect

**Expected Results:**
- ✅ Sign-in operation may be interrupted
- ✅ No crash or ErrorBoundary
- ✅ User can try again
- ✅ No corrupt session state

#### 5.2 Network Failure During Profile Load
**Steps:**
1. Sign in successfully
2. While "Redirecting…" is shown, go offline (DevTools Network → Offline)
3. Wait

**Expected Results:**
- ✅ Redirect may fail or timeout
- ✅ User sees appropriate error
- ✅ No ErrorBoundary crash
- ✅ Can retry when back online

#### 5.3 Back Button After Sign-In
**Steps:**
1. Sign in successfully (redirected to profile-setup or home)
2. Click browser back button

**Expected Results:**
- ✅ Should NOT go back to sign-in page (we use `replace: true`)
- ✅ Goes to previous page before sign-in
- ✅ OR: Does nothing if history is empty
- ✅ User remains authenticated

#### 5.4 Multiple Rapid Sign-In Attempts
**Steps:**
1. Fill sign-in form
2. Click "Sign in" multiple times rapidly

**Expected Results:**
- ✅ Only one request is sent (button disabled during submission)
- ✅ No duplicate redirects
- ✅ No console errors about multiple navigation

#### 5.5 Session Expires While on Page
**Steps:**
1. Sign in successfully
2. Wait for session to expire (or manually clear Supabase session in local storage)
3. Try to access protected route

**Expected Results:**
- ✅ Redirected to sign-in
- ✅ No crash
- ✅ Clear message about session expiry (if applicable)

---

### 6. Loading States

#### 6.1 Loading Screen on App Mount
**Steps:**
1. Clear all browser data
2. Navigate to `/`

**Expected Results:**
- ✅ Shows loading screen while checking auth
- ✅ Loads home page after auth check complete
- ✅ No "flash" of wrong content

#### 6.2 Loading Screen on Protected Route
**Steps:**
1. Clear browser data
2. Navigate directly to `/funding-hub`

**Expected Results:**
- ✅ Shows loading screen
- ✅ Redirects to `/signin` after determining no auth
- ✅ No flash of protected content

---

### 7. Console & Network Validation

#### 7.1 Console Logs During Sign-Up
**Expected Console Output:**
```
[auth-state] signUp:start
[profile] creating-profile-for-new-user
[profile] signup-profile-creation-attempt { userId: ..., attempt: 1 }
[profile] signup-profile-created { userId: ..., attempt: 1 }
[auth-state] signUp:success
```

#### 7.2 Console Logs During Sign-In
**Expected Console Output:**
```
[auth-state] signIn:start
[auth-state] auth:refresh:start
[auth-state] auth:refresh:user-loaded
[auth-state] auth:refresh:profile-loaded
[auth-state] signIn:success
```

#### 7.3 Network Requests
**Expected Requests:**
1. `POST /auth/v1/token?grant_type=password` (sign-in)
2. `GET /rest/v1/profiles?id=eq.{userId}` (profile fetch)
3. No 500 errors
4. No failed requests (unless testing error scenarios)

---

## Pass/Fail Criteria

### Must Pass
- [ ] Sign-up redirects to `/profile-setup` for new users
- [ ] Sign-in with incomplete profile redirects to `/profile-setup`
- [ ] Sign-in with complete profile redirects to specified destination
- [ ] No ErrorBoundary triggered during auth flow
- [ ] No infinite redirect loops
- [ ] Back button works correctly (doesn't go back to sign-in)
- [ ] Protected routes properly check auth
- [ ] Loading states show appropriately

### Should Pass
- [ ] Error messages are clear and actionable
- [ ] Network failures handled gracefully
- [ ] Console logs provide debugging info
- [ ] Button states update correctly (Processing → Redirecting)

### Nice to Have
- [ ] Smooth transitions between pages
- [ ] Toast notifications are user-friendly
- [ ] Accessibility (can navigate with keyboard)

---

## Rollback Triggers

If ANY of these occur during testing, consider rolling back:
- ❌ ErrorBoundary appears during normal auth flow
- ❌ Users cannot sign in at all
- ❌ Infinite redirect loops
- ❌ Sessions don't persist after refresh
- ❌ Profile data corrupted or lost

---

## Testing Checklist

### Pre-Test
- [ ] Code deployed to test environment
- [ ] Supabase connection verified
- [ ] Test accounts prepared
- [ ] Browser cache cleared

### During Test
- [ ] Record any unexpected behaviors
- [ ] Screenshot any errors
- [ ] Save console logs for issues
- [ ] Note performance concerns

### Post-Test
- [ ] All scenarios executed
- [ ] Results documented
- [ ] Issues filed (if any)
- [ ] Stakeholders notified

---

## Test Results Template

```
Test Date: ____________________
Tester: ______________________
Environment: [ ] Staging [ ] Production
Browser: ____________________

Scenario 1.1: [ ] Pass [ ] Fail - Notes: ___________________
Scenario 1.2: [ ] Pass [ ] Fail - Notes: ___________________
Scenario 1.3: [ ] Pass [ ] Fail - Notes: ___________________
...

Overall Status: [ ] All Pass [ ] Some Failures [ ] Critical Failures

Critical Issues Found:
1. _____________________
2. _____________________

Recommendations:
[ ] Deploy to production
[ ] Fix issues and retest
[ ] Rollback changes
```

---

## Support Information

**Questions or Issues?**
- Support: support@wathaci.com
- Developer: Check GitHub issues
- Documentation: See AUTH_FIXES_SUMMARY.md

**Common Issues:**
- "Stuck on sign-in page": Check console for errors, verify Supabase config
- "Profile not loading": Check RLS policies, verify profile table
- "Redirect loop": Clear browser cache, check for conflicting redirects
