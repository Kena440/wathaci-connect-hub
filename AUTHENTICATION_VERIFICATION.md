# Authentication System Verification Guide

## Overview

This guide helps verify that the authentication system (sign-up, sign-in, profile creation, and session persistence) is working correctly in the WATHACI CONNECT application.

## System Components

### 1. User Sign-Up ✅
**Location:** `src/pages/SignUp.tsx`

**Features:**
- Email and password registration
- First name, last name, and account type selection
- Optional company name and mobile number
- Password confirmation and validation
- Terms of service acceptance
- Automatic profile creation via database trigger
- Redirect to profile setup after successful registration

**Flow:**
1. User fills out the sign-up form
2. Frontend validates all inputs using Zod schema
3. System calls `registerUser()` to record registration in `registrations` table
4. System calls `signUp()` from AppContext which:
   - Creates auth user in Supabase
   - Database trigger automatically creates profile entry
   - Session is established automatically
5. User is redirected to `/profile-setup?mode=edit` to complete their profile

### 2. User Sign-In ✅
**Location:** `src/pages/SignIn.tsx`

**Features:**
- Email and password authentication
- Two-step OTP verification for security
- Automatic session establishment
- Remember me functionality (via Supabase localStorage)
- Password recovery link
- Offline account support for testing

**Flow:**
1. User enters email and password
2. System validates credentials
3. System sends 6-digit OTP to user's email
4. User enters OTP code
5. System verifies OTP and establishes session
6. User is redirected to dashboard

**Security Features:**
- OTP expires after 5 minutes
- Resend OTP capability with countdown
- Rate limiting on OTP requests
- Offline mode for demo accounts

### 3. Session Persistence ✅
**Location:** `src/contexts/AppContext.tsx`

**Features:**
- Automatic session persistence via Supabase
- Session stored in browser localStorage
- Automatic session refresh on page load
- Auth state change listeners
- Profile data caching

**Implementation:**
- Supabase handles session storage automatically
- `refreshUser()` function loads session on app start
- `useEffect` in AppProvider listens for auth changes
- Offline session fallback for demo mode

**Session Data:**
```typescript
interface AuthState {
  user: User | null;
  profile: Profile | null;
}
```

### 4. Profile Creation ✅
**Locations:**
- Database trigger: `backend/supabase/profiles_policies.sql`
- Profile service: `src/lib/services/user-service.ts`
- Profile setup page: `src/pages/ProfileSetup.tsx`

**Features:**
- Automatic profile creation via database trigger when user signs up
- Profile completion flow for new users
- Account type-specific profile fields
- Profile validation and progress tracking

**Database Trigger:**
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
```

### 5. Database Schema ✅
**Location:** `backend/supabase/`

**Files:**
- `core_schema.sql` - Core tables (profiles, subscriptions, transactions)
- `profiles_schema.sql` - Profile table enhancements
- `profiles_policies.sql` - Row Level Security and triggers
- `registrations.sql` - Registration tracking table
- `frontend_logs.sql` - Frontend logging table

## Verification Steps

### Step 1: Verify Database Schema is Applied

**Important:** The database schemas must be applied to your Supabase instance for the system to work.

Run the provisioning script:
```bash
export SUPABASE_DB_URL="postgres://postgres:[password]@[host]:5432/postgres"
npm run supabase:provision
```

Or apply manually via Supabase SQL Editor:
1. Go to Supabase Dashboard → SQL Editor
2. Execute each SQL file in this order:
   - `core_schema.sql`
   - `profiles_schema.sql`
   - `registrations.sql`
   - `frontend_logs.sql`
   - `profiles_policies.sql`

**Verify Tables Exist:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'registrations', 'subscription_plans', 'user_subscriptions', 'transactions', 'frontend_logs');
```

**Verify Trigger Exists:**
```sql
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

### Step 2: Test Sign-Up Flow

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to sign-up page:**
   - Open http://localhost:5173/signup

3. **Fill out the form:**
   - Enter valid email and password
   - Select an account type
   - Accept terms of service
   - Click "Create account"

4. **Expected behavior:**
   - Form validates all fields
   - Success message appears
   - Email confirmation sent (if enabled in Supabase)
   - Redirect to `/profile-setup?mode=edit`
   - User is automatically signed in
   - Profile entry created in database

5. **Verify in Supabase:**
   - Check `auth.users` table for new user
   - Check `public.profiles` table for corresponding profile
   - Check `public.registrations` table for registration record

### Step 3: Test Session Persistence

1. **After signing up/in:**
   - Close browser tab
   - Reopen http://localhost:5173
   - User should still be signed in

2. **Verify session data:**
   - Open browser DevTools → Application → Local Storage
   - Look for keys starting with `sb-` (Supabase session)
   - Check for `wathaci_offline_session` (offline mode fallback)

3. **Test auto-refresh:**
   - Wait for session to refresh (automatic)
   - Profile data should remain available
   - No additional sign-in required

### Step 4: Test Sign-In Flow

1. **Sign out first:**
   - Click profile menu → Sign Out
   - Verify redirect to home page

2. **Navigate to sign-in page:**
   - Open http://localhost:5173/signin

3. **Enter credentials:**
   - Email: your registered email
   - Password: your password
   - Click "Sign In"

4. **Verify OTP step:**
   - Check email for 6-digit code
   - Enter code in OTP form
   - Click "Verify and Continue"

5. **Expected behavior:**
   - OTP sent to email
   - Countdown timer appears
   - After verification, redirect to dashboard
   - Session established
   - Profile data loaded

### Step 5: Test Profile Creation

1. **New user flow:**
   - Sign up creates initial profile automatically
   - Navigate to `/profile-setup?mode=edit`

2. **Complete profile:**
   - Fill out account-specific fields
   - Upload profile image (optional)
   - Click "Save Profile"

3. **Verify updates:**
   - Profile should update in database
   - `profile_completed` flag set to true
   - Redirect to appropriate dashboard

### Step 6: Test Offline Accounts (Demo Mode)

The system includes pre-configured offline accounts for testing without a Supabase connection:

**Admin Account:**
- Email: `admin@wathaci.test`
- Password: `AdminPass123!`
- Account Type: admin

**User Account:**
- Email: `user@wathaci.test`
- Password: `UserPass123!`
- Account Type: sme

These accounts work even without database connectivity.

## Configuration Checklist

- [ ] `.env` file exists with Supabase credentials
- [ ] `VITE_SUPABASE_URL` is set correctly
- [ ] `VITE_SUPABASE_KEY` (anon key) is set correctly
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set for backend operations
- [ ] Database schemas are applied via provisioning script
- [ ] Email confirmation is configured in Supabase (optional)
- [ ] Email templates are customized in Supabase (optional)

## Common Issues and Solutions

### Issue: "No session after sign-up"
**Cause:** Email confirmation is enabled in Supabase
**Solution:** 
- Check email for confirmation link
- OR disable email confirmation in Supabase → Authentication → Settings

### Issue: "Profile not created automatically"
**Cause:** Database trigger not applied
**Solution:** 
- Run `npm run supabase:provision`
- Verify trigger exists in database

### Issue: "Session lost on page refresh"
**Cause:** Browser blocking localStorage
**Solution:**
- Check browser privacy settings
- Allow localStorage for localhost
- Test in incognito mode

### Issue: "OTP not received"
**Cause:** Email provider settings
**Solution:**
- Check Supabase → Authentication → Email Templates
- Verify SMTP settings in Supabase
- Check spam folder

### Issue: "Cannot connect to Supabase"
**Cause:** Invalid credentials or network issue
**Solution:**
- Verify `.env` file has correct values
- Check Supabase project status
- Test connection with `npm run dev`

## Testing Checklist

Use this checklist to verify all features:

### Sign-Up
- [ ] Form validation works (required fields, email format, password length)
- [ ] Password confirmation matches
- [ ] Account type selection required
- [ ] Terms acceptance required
- [ ] Error messages display correctly
- [ ] Success message appears
- [ ] Registration recorded in database
- [ ] Profile created automatically
- [ ] User redirected to profile setup
- [ ] Session established

### Sign-In
- [ ] Email/password validation works
- [ ] Invalid credentials show error
- [ ] OTP sent to email
- [ ] OTP countdown timer works
- [ ] Resend OTP works
- [ ] OTP verification succeeds
- [ ] Session established
- [ ] User redirected to dashboard
- [ ] Profile data loaded

### Session Persistence
- [ ] Session persists after page refresh
- [ ] Session persists after browser restart
- [ ] Session expires correctly (if configured)
- [ ] Auto-refresh works
- [ ] Sign-out clears session
- [ ] Multiple tabs sync session state

### Profile Creation
- [ ] Profile created on sign-up
- [ ] Profile setup page accessible
- [ ] All account types supported
- [ ] Profile updates save correctly
- [ ] Profile completion status tracked
- [ ] Profile image upload works (if enabled)

### Database
- [ ] `profiles` table exists
- [ ] `registrations` table exists
- [ ] `subscription_plans` table exists
- [ ] `user_subscriptions` table exists
- [ ] `transactions` table exists
- [ ] Triggers work correctly
- [ ] RLS policies applied
- [ ] Indexes created

## API Endpoints

The authentication system uses these Supabase Auth endpoints:

- `POST /auth/v1/signup` - Create new user
- `POST /auth/v1/token?grant_type=password` - Sign in with password
- `POST /auth/v1/otp` - Send OTP
- `POST /auth/v1/verify` - Verify OTP
- `GET /auth/v1/user` - Get current user
- `POST /auth/v1/logout` - Sign out

## Security Features

1. **Password Security:**
   - Minimum 8 characters
   - Maximum 72 characters
   - Bcrypt hashing by Supabase

2. **OTP Security:**
   - 6-digit codes
   - 5-minute expiry
   - Rate limiting
   - One-time use

3. **Session Security:**
   - JWT tokens
   - Automatic refresh
   - Secure httpOnly cookies (if configured)
   - CSRF protection

4. **Database Security:**
   - Row Level Security (RLS) enabled
   - Users can only access their own data
   - Service role bypasses RLS for admin operations

## Monitoring and Debugging

### Enable Debug Logging:
```typescript
// In src/lib/supabase-enhanced.ts
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event, session);
});
```

### Check Session State:
```typescript
const { data: { session } } = await supabase.auth.getSession();
console.log('Current session:', session);
```

### Monitor Profile Creation:
```sql
-- Check recent profiles
SELECT id, email, account_type, profile_completed, created_at 
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 10;
```

## Support

For issues or questions:
1. Check this verification guide
2. Review `DATABASE_SETUP.md`
3. Check `TROUBLESHOOTING.md`
4. Review Supabase documentation
5. Check application logs in browser DevTools

## Conclusion

The WATHACI CONNECT authentication system is fully implemented with:
- ✅ User sign-up with validation
- ✅ User sign-in with OTP verification
- ✅ Automatic session persistence
- ✅ Profile creation and management
- ✅ Database schemas and triggers
- ✅ Security features (RLS, JWT, OTP)
- ✅ Error handling and user feedback
- ✅ Offline mode for testing

All components are production-ready and follow best practices for security and user experience.
