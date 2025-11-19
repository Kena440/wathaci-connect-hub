# Auth Bypass Mode - Temporary Onboarding Fallback

## ⚠️ IMPORTANT: THIS IS A TEMPORARY DEVELOPMENT FEATURE

This bypass/fallback onboarding mode is **STRICTLY for development and debugging purposes**. It should be **REMOVED** once authentication and database errors are fixed.

## Overview

The Auth Bypass Mode allows users to sign up, sign in, and create profiles even when backend/auth/database errors occur. This enables continued development and testing when the real authentication infrastructure is temporarily unavailable or experiencing issues.

### What It Does

When bypass mode is **ENABLED** and an authentication operation fails:

1. **Sign-up failures** → Creates a temporary local user account
2. **Sign-in failures** → Logs in using existing bypass account or creates new one  
3. **Profile save failures** → Saves profile data to localStorage instead of database
4. **Database errors** → Falls back to client-side storage

When bypass mode is **DISABLED** (default):
- All authentication flows work normally
- Errors are shown to users and block operations
- No bypass or fallback behavior occurs

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Enable bypass mode (set to "true" to enable, "false" or omit to disable)
VITE_AUTH_BYPASS_MODE_ENABLED="false"
AUTH_BYPASS_MODE_ENABLED="false"
```

### Enabling Bypass Mode

**Development only:**
```env
VITE_AUTH_BYPASS_MODE_ENABLED="true"
AUTH_BYPASS_MODE_ENABLED="true"
```

**Production (NEVER enable):**
```env
VITE_AUTH_BYPASS_MODE_ENABLED="false"
AUTH_BYPASS_MODE_ENABLED="false"
```

## How It Works

### 1. Sign-Up Flow

**Normal behavior (bypass OFF):**
```
User submits email + password
  → Call Supabase signUp
  → If error: show error, block sign-up ❌
  → If success: create profile, redirect ✅
```

**Bypass behavior (bypass ON):**
```
User submits email + password
  → Call Supabase signUp
  → If error:
      • Log error with [AUTH_BYPASS_SIGNUP_ERROR]
      • Create temporary bypass user locally
      • Save to localStorage
      • Show "Temporary Mode" banner
      • Allow user to continue ✅
  → If success: work normally ✅
```

### 2. Sign-In Flow

**Normal behavior (bypass OFF):**
```
User submits email + password
  → Call Supabase signIn
  → If error: show error, block login ❌
  → If success: load profile, redirect ✅
```

**Bypass behavior (bypass ON):**
```
User submits email + password
  → Call Supabase signIn
  → If error:
      • Log error with [AUTH_BYPASS_SIGNIN_ERROR]
      • Check localStorage for existing bypass user
      • If found: use it, log in ✅
      • If not: create new bypass user, save, log in ✅
      • Show "Temporary Mode" notice
  → If success: work normally ✅
```

### 3. Profile Creation/Update

**Normal behavior (bypass OFF):**
```
User submits profile data
  → Call Supabase to save to database
  → If error: show error, don't save ❌
  → If success: show success ✅
```

**Bypass behavior (bypass ON):**
```
User submits profile data
  → Call Supabase to save to database
  → If error:
      • Log error with [AUTH_BYPASS_PROFILE_SAVE_ERROR]
      • Save profile to localStorage
      • Show "Temporary Mode" toast
      • Allow user to continue ✅
  → If success: work normally ✅
```

## User Interface

### Visual Indicators

When bypass mode is **ENABLED**, users see:

1. **Banner on auth pages** (SignUp, SignIn, ProfileSetup):
   ```
   ⚠️ Temporary Onboarding Mode Active
   You are using a temporary onboarding mode while we finalize our systems.
   You can still sign up, sign in, and create your profile. Some features may be limited.
   ```

2. **Badge on user menu** (Header):
   ```
   👤 John  🔧 Temporary Mode
   ```

3. **Toast notifications**:
   - "Signed in (Temporary Mode)" - when signed in via bypass
   - "Account created (Temporary Mode)" - when account created via bypass
   - "Profile saved (Temporary Mode)" - when profile saved via bypass

### No Visual Changes When Disabled

When bypass mode is **DISABLED** (default):
- No banners shown
- No badges shown
- Normal auth flow messages
- Standard error messages on failures

## Technical Implementation

### Files Modified

1. **`src/lib/authBypass.ts`** - Core utilities
   - `isAuthBypassEnabled()` - Check if bypass mode is on
   - `createBypassUser()` - Create temporary user
   - `createBypassProfile()` - Create temporary profile
   - localStorage helpers
   - Logging utilities

2. **`src/components/BypassModeBanner.tsx`** - UI components
   - `BypassModeBanner` - Warning banner
   - `BypassUserBadge` - User badge indicator

3. **`src/contexts/AppContext.tsx`** - Auth context
   - Updated `signIn()` with bypass fallback
   - Updated `signUp()` with bypass fallback

4. **`src/pages/ProfileSetup.tsx`** - Profile page
   - Updated profile save logic with bypass fallback

5. **`src/pages/SignUp.tsx`** - Sign-up page
   - Added BypassModeBanner

6. **`src/pages/SignIn.tsx`** - Sign-in page
   - Added BypassModeBanner

7. **`src/components/Header.tsx`** - Navigation header
   - Added BypassUserBadge to user menu

### TypeScript Types

```typescript
// Extended user type with bypass indicator
interface BypassUser extends User {
  isBypassUser: true;
  bypassCreatedAt: string;
}

// Extended profile type with bypass indicator
interface BypassProfile extends Profile {
  isBypassProfile: true;
  bypassCreatedAt: string;
}
```

### LocalStorage Keys

- `auth_bypass_current_user` - Current bypass user
- `auth_bypass_profile_{userId}` - Bypass profile for user

### Logging

All bypass operations log to console with clear tags:

- `[AUTH_BYPASS_SIGNUP_ERROR]` - Sign-up failed, using bypass
- `[AUTH_BYPASS_SIGNIN_ERROR]` - Sign-in failed, using bypass
- `[AUTH_BYPASS_PROFILE_SAVE_ERROR]` - Profile save failed, using bypass
- `[AUTH_BYPASS_STORAGE]` - localStorage operations
- `[AUTH_BYPASS_SIGNUP]` - Sign-up bypass operation
- `[AUTH_BYPASS_SIGNIN]` - Sign-in bypass operation

## Testing

### Unit Tests

Run the test suite:
```bash
npm run test:jest -- --testPathPatterns="authBypass"
```

**Test Coverage:**
- 18 unit tests
- 100% pass rate
- Tests for all utility functions
- Tests for localStorage operations
- Tests for type guards

### Manual Testing

**Test Sign-Up with Bypass Mode:**

1. Set `VITE_AUTH_BYPASS_MODE_ENABLED="true"` in `.env`
2. Restart dev server
3. Go to `/signup`
4. See warning banner ⚠️
5. Enter valid email/password
6. Simulate auth error (disconnect network, wrong credentials, etc.)
7. User should be logged in anyway ✅
8. Check console for `[AUTH_BYPASS_SIGNUP_ERROR]` log
9. Check localStorage for `auth_bypass_current_user`
10. See "Temporary Mode" badge on user menu

**Test Sign-In with Bypass Mode:**

1. Same setup as above
2. Go to `/signin`
3. See warning banner ⚠️
4. Enter email/password
5. Simulate auth error
6. User should be logged in ✅
7. Check console for `[AUTH_BYPASS_SIGNIN_ERROR]` log
8. See "Temporary Mode" badge

**Test Profile Save with Bypass Mode:**

1. Same setup as above
2. Log in (real or bypass)
3. Go to `/profile-setup`
4. Fill out profile form
5. Simulate database error (disconnect network, etc.)
6. Form should save anyway ✅
7. Check console for `[AUTH_BYPASS_PROFILE_SAVE_ERROR]` log
8. Check localStorage for `auth_bypass_profile_{userId}`
9. See "Profile saved (Temporary Mode)" toast

**Test Normal Mode (Bypass OFF):**

1. Set `VITE_AUTH_BYPASS_MODE_ENABLED="false"` or remove it
2. Restart dev server
3. Go to `/signup` or `/signin`
4. **No warning banner** should appear ✅
5. Try to sign up/sign in with wrong credentials
6. Should see error message ❌
7. Should NOT be logged in
8. No bypass logs in console
9. No bypass data in localStorage

## Security Considerations

### Why This Is Temporary

1. **No real authentication** - Users can access without valid credentials
2. **Client-side storage only** - Data not persisted to database
3. **No server verification** - Backend doesn't know about bypass users
4. **Vulnerable to tampering** - localStorage can be edited by user
5. **Session hijacking risk** - No secure session tokens

### Safeguards in Place

✅ **Environment flag required** - Must explicitly enable  
✅ **Clear visual indicators** - Users know it's temporary  
✅ **Extensive logging** - Easy to debug and trace  
✅ **Commented code** - All bypass code marked "TEMPORARY BYPASS MODE"  
✅ **Separate from production logic** - Easy to remove entirely

### Production Checklist

Before deploying to production:

- [ ] Verify `VITE_AUTH_BYPASS_MODE_ENABLED="false"` in production `.env`
- [ ] Verify no bypass banners appear on production site
- [ ] Check console logs - no `[AUTH_BYPASS_*]` messages
- [ ] Verify real auth errors block users (don't allow bypass)
- [ ] Test sign-up/sign-in with real credentials works
- [ ] Test profile save with real database works

## Removal Instructions

When ready to remove this feature entirely:

### 1. Delete Files
```bash
rm src/lib/authBypass.ts
rm src/lib/__tests__/authBypass.test.ts
rm src/components/BypassModeBanner.tsx
```

### 2. Remove Code

Search for `TEMPORARY BYPASS MODE` and remove:

- Import statements in:
  - `src/contexts/AppContext.tsx`
  - `src/pages/ProfileSetup.tsx`
  - `src/pages/SignUp.tsx`
  - `src/pages/SignIn.tsx`
  - `src/components/Header.tsx`

- Bypass logic in:
  - `AppContext.signIn()` method
  - `AppContext.signUp()` method
  - `ProfileSetup.handleProfileSubmit()` method

- UI components:
  - `<BypassModeBanner>` components
  - `<BypassUserBadge>` component

### 3. Remove Environment Variables

Delete from `.env.example`:
```env
VITE_AUTH_BYPASS_MODE_ENABLED="false"
AUTH_BYPASS_MODE_ENABLED="false"
```

### 4. Verify Removal

```bash
# Should return no results:
grep -r "AUTH_BYPASS" src/
grep -r "BypassModeBanner" src/
grep -r "authBypass" src/
```

### 5. Test

- Verify build succeeds: `npm run build`
- Verify tests pass: `npm run test:jest`
- Manually test auth flows work normally

## FAQ

**Q: Can I use this in production?**  
A: **NO.** This is STRICTLY for development/debugging only.

**Q: Will my bypass data sync to the database later?**  
A: No. Bypass data stays in localStorage only. When you fix auth and disable bypass mode, users will need to create real accounts.

**Q: What if I forget to disable this in production?**  
A: Users will be able to bypass authentication, which is a MAJOR security risk. Always double-check your production environment variables.

**Q: Can I test with bypass mode and real auth together?**  
A: Yes. Bypass mode only activates when the real auth fails. If auth succeeds, bypass is never used.

**Q: How do I clear bypass data?**  
A: Clear browser localStorage or call `clearAllBypassData()` from console.

## Support

This is a temporary development feature. For questions:

1. Check this README
2. Search code for `TEMPORARY BYPASS MODE` comments
3. Review unit tests in `src/lib/__tests__/authBypass.test.ts`
4. Check console logs for `[AUTH_BYPASS_*]` messages

## Changelog

### 2025-11-19 - Initial Implementation
- Created bypass utilities and types
- Added bypass logic to sign-up/sign-in/profile flows
- Created UI components (banner, badge)
- Added comprehensive test suite (18 tests)
- Documented feature extensively

---

**Remember**: This feature is temporary and should be removed once auth issues are resolved! 🚫🔧
