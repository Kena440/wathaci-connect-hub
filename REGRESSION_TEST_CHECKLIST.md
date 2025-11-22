# Manual Regression Test Checklist

## Testing Information

**Platform URLs:**
- Frontend: https://wathaci-connect-platform-git-v3-amukenas-projects.vercel.app
- Backend API: https://wathaci-connect-platform2-bayxdeseg-amukenas-projects.vercel.app

**Test Date:** _________________
**Tester Name:** _________________
**Environment:** Production

---

## 1. Authentication Flows

### 1.1 Sign Up - New User Registration

- [ ] **Test Case:** New user can sign up with valid data
  - **Steps:**
    1. Navigate to `/signup`
    2. Select an account type (e.g., "SME")
    3. Fill in all required fields with valid data
    4. Accept Terms & Conditions
    5. Click "Sign up now"
  - **Expected:** Account created successfully, confirmation message shown
  - **Actual:** _________________
  - **Status:** ☐ PASS ☐ FAIL
  - **Notes:** _________________

- [ ] **Test Case:** Sign-up with existing email returns clear error
  - **Steps:**
    1. Navigate to `/signup`
    2. Use an email that's already registered
    3. Fill in other required fields
    4. Submit the form
  - **Expected:** Error message: "User already registered" or similar
  - **Actual:** _________________
  - **Status:** ☐ PASS ☐ FAIL
  - **Notes:** _________________

- [ ] **Test Case:** Sign-up with weak password shows validation error
  - **Steps:**
    1. Navigate to `/signup`
    2. Enter a password shorter than 8 characters or without required complexity
    3. Try to submit
  - **Expected:** Clear validation error about password requirements
  - **Actual:** _________________
  - **Status:** ☐ PASS ☐ FAIL
  - **Notes:** _________________

- [ ] **Test Case:** Sign-up without accepting terms shows validation error
  - **Steps:**
    1. Navigate to `/signup`
    2. Fill in all fields correctly
    3. Leave Terms & Conditions unchecked
    4. Try to submit
  - **Expected:** Error: "You must accept the Terms & Conditions"
  - **Actual:** _________________
  - **Status:** ☐ PASS ☐ FAIL
  - **Notes:** _________________

### 1.2 Sign In - Existing User Login

- [ ] **Test Case:** Existing user can sign in with correct credentials
  - **Steps:**
    1. Navigate to `/signin`
    2. Enter valid email and password
    3. Click "Sign in"
  - **Expected:** Successfully logged in, redirected to home or profile setup
  - **Actual:** _________________
  - **Status:** ☐ PASS ☐ FAIL
  - **Notes:** _________________

- [ ] **Test Case:** Invalid password shows friendly error
  - **Steps:**
    1. Navigate to `/signin`
    2. Enter valid email but wrong password
    3. Try to sign in
  - **Expected:** Error message: "Invalid credentials" or similar (NOT a blank page)
  - **Actual:** _________________
  - **Status:** ☐ PASS ☐ FAIL
  - **Notes:** _________________

- [ ] **Test Case:** Invalid email shows friendly error
  - **Steps:**
    1. Navigate to `/signin`
    2. Enter non-existent email and any password
    3. Try to sign in
  - **Expected:** Error message: "Invalid credentials" or similar (NOT a blank page)
  - **Actual:** _________________
  - **Status:** ☐ PASS ☐ FAIL
  - **Notes:** _________________

- [ ] **Test Case:** Rate limiting works for repeated failed login attempts
  - **Steps:**
    1. Navigate to `/signin`
    2. Try to sign in with wrong credentials 10+ times rapidly
  - **Expected:** After 10 attempts, error: "Too many authentication attempts, please try again later."
  - **Actual:** _________________
  - **Status:** ☐ PASS ☐ FAIL
  - **Notes:** _________________

### 1.3 Session Persistence

- [ ] **Test Case:** Auth state persists on page refresh
  - **Steps:**
    1. Sign in successfully
    2. Refresh the page (F5 or Ctrl+R)
  - **Expected:** User remains logged in, no need to sign in again
  - **Actual:** _________________
  - **Status:** ☐ PASS ☐ FAIL
  - **Notes:** _________________

- [ ] **Test Case:** Auth state persists in new tab
  - **Steps:**
    1. Sign in successfully in one tab
    2. Open a new tab and navigate to the platform
  - **Expected:** User is already logged in in the new tab
  - **Actual:** _________________
  - **Status:** ☐ PASS ☐ FAIL
  - **Notes:** _________________

### 1.4 Logout

- [ ] **Test Case:** Logout works and clears session
  - **Steps:**
    1. Sign in successfully
    2. Click logout button (if available in menu)
    3. Try to access a protected page (e.g., `/funding-hub`)
  - **Expected:** Logged out, redirected to login page when accessing protected pages
  - **Actual:** _________________
  - **Status:** ☐ PASS ☐ FAIL
  - **Notes:** _________________

- [ ] **Test Case:** Protected pages are not accessible after logout
  - **Steps:**
    1. Logout completely
    2. Try to manually navigate to `/funding-hub` or `/messages`
  - **Expected:** Redirected to sign-in page or shown access denied message
  - **Actual:** _________________
  - **Status:** ☐ PASS ☐ FAIL
  - **Notes:** _________________

---

## 2. Network & Error Handling

### 2.1 CORS & Network

- [ ] **Test Case:** No CORS errors in browser console
  - **Steps:**
    1. Open browser DevTools (F12)
    2. Navigate through the app (signup, signin, various pages)
    3. Check Console tab for CORS errors
  - **Expected:** No CORS-related errors
  - **Actual:** _________________
  - **Status:** ☐ PASS ☐ FAIL
  - **Notes:** _________________

- [ ] **Test Case:** No uncaught JavaScript errors during normal flows
  - **Steps:**
    1. Open browser DevTools Console
    2. Navigate through signup, signin, and main pages
    3. Fill forms, click buttons, etc.
  - **Expected:** No uncaught errors in console (warnings are OK)
  - **Actual:** _________________
  - **Status:** ☐ PASS ☐ FAIL
  - **Notes:** _________________

### 2.2 API Error Responses

- [ ] **Test Case:** API error responses use standard format
  - **Steps:**
    1. Open browser DevTools Network tab
    2. Trigger an API error (e.g., submit invalid form)
    3. Check the response body of failed requests
  - **Expected:** Response format: `{ "success": false, "error": "message" }`
  - **Actual:** _________________
  - **Status:** ☐ PASS ☐ FAIL
  - **Notes:** _________________

- [ ] **Test Case:** Backend health endpoint is accessible
  - **Steps:**
    1. Navigate to: https://wathaci-connect-platform2-bayxdeseg-amukenas-projects.vercel.app/health
    2. Or use curl: `curl https://wathaci-connect-platform2-bayxdeseg-amukenas-projects.vercel.app/health`
  - **Expected:** JSON response with `"status": "ok"` and system information
  - **Actual:** _________________
  - **Status:** ☐ PASS ☐ FAIL
  - **Notes:** _________________

### 2.3 Frontend Error Handling

- [ ] **Test Case:** Frontend surfaces errors nicely (no crashes)
  - **Steps:**
    1. Trigger various errors (invalid form data, network issues)
    2. Check that UI shows error messages instead of breaking
  - **Expected:** Errors shown as toasts, alerts, or inline text (NOT blank page)
  - **Actual:** _________________
  - **Status:** ☐ PASS ☐ FAIL
  - **Notes:** _________________

- [ ] **Test Case:** Error Boundary catches React errors
  - **Steps:**
    1. If `/test-error` page exists, navigate to it
    2. Or trigger any React error
  - **Expected:** User-friendly error page with "Something went wrong" message and reload button
  - **Actual:** _________________
  - **Status:** ☐ PASS ☐ FAIL
  - **Notes:** _________________

---

## 3. General Navigation & UI

### 3.1 Main Navigation

- [ ] **Test Case:** Home page loads without errors
  - **Steps:**
    1. Navigate to `/` (home page)
  - **Expected:** Page loads successfully, no white screen or errors
  - **Actual:** _________________
  - **Status:** ☐ PASS ☐ FAIL
  - **Notes:** _________________

- [ ] **Test Case:** Marketplace page loads without errors
  - **Steps:**
    1. Navigate to `/marketplace`
  - **Expected:** Page loads successfully
  - **Actual:** _________________
  - **Status:** ☐ PASS ☐ FAIL
  - **Notes:** _________________

- [ ] **Test Case:** Resources page loads without errors
  - **Steps:**
    1. Navigate to `/resources`
  - **Expected:** Page loads successfully
  - **Actual:** _________________
  - **Status:** ☐ PASS ☐ FAIL
  - **Notes:** _________________

- [ ] **Test Case:** All main menu sections load without runtime errors
  - **Steps:**
    1. Navigate through all main menu items
    2. Check browser console for errors
  - **Expected:** All pages load successfully, no console errors
  - **Actual:** _________________
  - **Status:** ☐ PASS ☐ FAIL
  - **Notes:** _________________

### 3.2 Protected Routes

- [ ] **Test Case:** Funding Hub requires authentication
  - **Steps:**
    1. Logout (if logged in)
    2. Try to navigate to `/funding-hub`
  - **Expected:** Redirected to sign-in page or shown "Access denied"
  - **Actual:** _________________
  - **Status:** ☐ PASS ☐ FAIL
  - **Notes:** _________________

- [ ] **Test Case:** Messages page requires authentication
  - **Steps:**
    1. Logout (if logged in)
    2. Try to navigate to `/messages`
  - **Expected:** Redirected to sign-in page or shown "Access denied"
  - **Actual:** _________________
  - **Status:** ☐ PASS ☐ FAIL
  - **Notes:** _________________

### 3.3 404 Handling

- [ ] **Test Case:** Invalid routes show proper 404 page
  - **Steps:**
    1. Navigate to a non-existent route: `/this-page-does-not-exist-123`
  - **Expected:** 404 Not Found page or message (NOT a blank white screen)
  - **Actual:** _________________
  - **Status:** ☐ PASS ☐ FAIL
  - **Notes:** _________________

---

## 4. Core Features (Quick Smoke Tests)

### 4.1 Profile Setup

- [ ] **Test Case:** New user can access profile setup
  - **Steps:**
    1. Sign up as a new user
    2. Check if redirected to `/profile-setup`
  - **Expected:** Profile setup page loads successfully
  - **Actual:** _________________
  - **Status:** ☐ PASS ☐ FAIL
  - **Notes:** _________________

### 4.2 Account Types

- [ ] **Test Case:** Different account types are selectable during signup
  - **Steps:**
    1. Navigate to `/signup`
    2. Verify all account type options are visible and clickable
  - **Expected:** At least: SME, Professional, Investor, Donor, Government options visible
  - **Actual:** _________________
  - **Status:** ☐ PASS ☐ FAIL
  - **Notes:** _________________

---

## 5. Performance & Loading

### 5.1 Initial Load

- [ ] **Test Case:** Pages load within reasonable time
  - **Steps:**
    1. Hard refresh home page (Ctrl+Shift+R)
    2. Measure load time
  - **Expected:** Page loads in under 5 seconds (on decent connection)
  - **Actual:** _________________
  - **Status:** ☐ PASS ☐ FAIL
  - **Notes:** _________________

### 5.2 Loading States

- [ ] **Test Case:** Loading states are shown during async operations
  - **Steps:**
    1. Submit a form (signup/signin)
    2. Check if button shows "Loading..." or similar
  - **Expected:** Clear loading indicator while request is in progress
  - **Actual:** _________________
  - **Status:** ☐ PASS ☐ FAIL
  - **Notes:** _________________

---

## 6. Security Checks

### 6.1 Rate Limiting

- [ ] **Test Case:** Rate limiting prevents abuse
  - **Steps:**
    1. Try to make 100+ rapid requests to any endpoint
    2. (Use browser console or curl)
  - **Expected:** After limit, receive: `{ "success": false, "error": "Too many requests..." }`
  - **Actual:** _________________
  - **Status:** ☐ PASS ☐ FAIL
  - **Notes:** _________________

### 6.2 Secure Headers

- [ ] **Test Case:** Security headers are present
  - **Steps:**
    1. Open DevTools Network tab
    2. Inspect response headers of any API request
  - **Expected:** Headers like `X-Content-Type-Options`, `X-Frame-Options`, etc. are present
  - **Actual:** _________________
  - **Status:** ☐ PASS ☐ FAIL
  - **Notes:** _________________

---

## Summary

**Total Tests:** 35
**Passed:** _____
**Failed:** _____
**Pass Rate:** _____%

### Critical Issues Found

1. _________________
2. _________________
3. _________________

### Medium Issues Found

1. _________________
2. _________________
3. _________________

### Minor Issues Found

1. _________________
2. _________________
3. _________________

### Recommendations

1. _________________
2. _________________
3. _________________

---

## Sign-Off

**Tested By:** _________________
**Date:** _________________
**Signature:** _________________

**Status:**
- ☐ All tests passed - Ready for production
- ☐ Minor issues found - Can deploy with follow-up fixes
- ☐ Critical issues found - Must fix before production
