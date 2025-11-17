# ZAQA-Style Sign-Up Flow Implementation Guide

This document describes the new ZAQA-style sign-up flow implemented for Wathaci Connect, modeled after the ZAQA QMIS sign-up page.

## Overview

The new sign-up flow provides a polished, production-ready user registration experience with:
- Account type selection
- Terms & Conditions acceptance (required)
- Newsletter opt-in (optional)
- Email confirmation support
- Comprehensive error handling

## What Was Changed

### 1. Database Schema Extensions

**File**: `backend/supabase/add_signup_fields.sql`

Two new fields were added to the `profiles` table:
- `accepted_terms` (boolean, NOT NULL, default false) - Tracks whether user accepted T&Cs
- `newsletter_opt_in` (boolean, NOT NULL, default false) - Tracks newsletter subscription preference

The migration script is safe to run multiple times (idempotent) and will only add fields if they don't exist.

**To Apply the Migration**:

```bash
# Option 1: Via Supabase SQL Editor
# Copy contents of backend/supabase/add_signup_fields.sql and paste into SQL editor

# Option 2: Via Supabase CLI
supabase db query < backend/supabase/add_signup_fields.sql
```

### 2. TypeScript Type Updates

**File**: `src/@types/database.ts`

Updated the `BaseProfile` interface to include:
```typescript
export interface BaseProfile {
  id: string;
  email: string;
  account_type: AccountType;
  profile_completed: boolean;
  accepted_terms: boolean;        // NEW
  newsletter_opt_in: boolean;     // NEW
  created_at: string;
  updated_at: string;
}
```

### 3. New Sign-Up Page Component

**File**: `src/pages/ZaqaSignup.tsx`

A complete new sign-up page with three steps:

**Step 1: Account Type Selection**
- Visual card-based selection of account types
- Uses existing 6 Wathaci account types (no changes to types)
- Each card shows icon, description, and "Ideal for" examples

**Step 2: Registration Form**
- Full name field
- Email address
- Password (min 8 characters)
- Confirm password
- **Required**: Terms & Conditions checkbox with link to `/terms-of-service`
- **Optional**: Newsletter opt-in checkbox

**Step 3: Success Screen**
- Shows success message
- Handles email confirmation requirement
- Provides links to login or home page

### 4. Route Addition

**File**: `src/App.tsx`

Added new route:
```typescript
<Route path="/signup-zaqa" element={<ZaqaSignup />} />
```

The existing `/signup` route remains unchanged for backward compatibility.

## Existing Account Types (Preserved)

**IMPORTANT**: No changes were made to existing account types. The following 6 types remain exactly as they were:

1. **sole_proprietor** - Sole Proprietor
   - For individual entrepreneurs and micro businesses
   
2. **professional** - Professional
   - For specialists offering professional services
   
3. **sme** - SME (Small & Medium Enterprise)
   - For established businesses preparing to scale
   
4. **investor** - Investor
   - For funds and angels sourcing deals
   
5. **donor** - Donor
   - For grant makers and development partners
   
6. **government** - Government Institution
   - For public sector agencies

These types are defined in `src/data/accountTypes.ts` and are used throughout the application.

## Using the New Sign-Up Flow

### For Users

1. Navigate to `/signup-zaqa`
2. Select your account type from the cards
3. Fill in registration details
4. Check the Terms & Conditions box (required)
5. Optionally check the newsletter box
6. Click "Sign up now"
7. Check email for confirmation link (if email confirmation is enabled)

### For Developers

#### Accessing New Fields

```typescript
// In components or pages
import { supabaseClient } from '@/lib/wathaciSupabaseClient';

// Fetch profile with new fields
const { data: profile } = await supabaseClient
  .from('profiles')
  .select('*, accepted_terms, newsletter_opt_in')
  .eq('id', userId)
  .single();

if (profile?.accepted_terms) {
  console.log('User accepted terms on:', profile.created_at);
}

if (profile?.newsletter_opt_in) {
  console.log('User opted into newsletter');
}
```

#### Updating Profile

```typescript
// Update newsletter preference
await supabaseClient
  .from('profiles')
  .update({ newsletter_opt_in: true })
  .eq('id', userId);
```

## Row Level Security (RLS)

The existing RLS policies on the `profiles` table already cover the new fields:

- **SELECT**: Users can read their own `accepted_terms` and `newsletter_opt_in`
- **INSERT**: Users can set these fields when creating their profile
- **UPDATE**: Users can update their own `newsletter_opt_in` preference

No new RLS policies are required.

## Email Confirmation Flow

The sign-up page handles both email confirmation scenarios:

### Email Confirmation ENABLED (default for most Supabase projects)
- User signs up
- Supabase sends confirmation email
- User sees: "Please check your email to confirm your account"
- User clicks link in email
- User can then log in

### Email Confirmation DISABLED
- User signs up
- Session is created immediately
- User sees success message and can log in right away

## Integration with Existing Auth Flow

The ZAQA signup integrates seamlessly with existing authentication:

1. Uses `supabaseClient.auth.signUp()` for user creation
2. Stores `account_type` in user metadata
3. The `handle_new_auth_user()` trigger creates basic profile
4. Sign-up page updates profile with additional fields via upsert
5. Existing `AuthProvider` and `useAuth` hook work unchanged

## Testing the Implementation

### Manual Testing Checklist

1. **Account Type Selection**
   - [ ] All 6 account types display correctly
   - [ ] Can select each type
   - [ ] Selection is visually indicated
   - [ ] Can't proceed without selecting a type

2. **Form Validation**
   - [ ] Email validation works
   - [ ] Password minimum length enforced
   - [ ] Passwords must match
   - [ ] Full name is required
   - [ ] Terms checkbox is required
   - [ ] Newsletter checkbox is optional

3. **Sign-Up Process**
   - [ ] Sign-up succeeds with valid data
   - [ ] Profile created with correct account type
   - [ ] `accepted_terms` set to true
   - [ ] `newsletter_opt_in` reflects checkbox state
   - [ ] Error messages display for invalid data

4. **Email Confirmation**
   - [ ] Success message appropriate for confirmation setting
   - [ ] Email received (if confirmation enabled)
   - [ ] Confirmation link works
   - [ ] Can log in after confirmation

5. **All Account Types**
   - [ ] Test signup for `sole_proprietor`
   - [ ] Test signup for `professional`
   - [ ] Test signup for `sme`
   - [ ] Test signup for `investor`
   - [ ] Test signup for `donor`
   - [ ] Test signup for `government`

### Automated Testing

Add tests for the ZaqaSignup component:

```typescript
// Example test structure
describe('ZaqaSignup', () => {
  it('should require account type selection', () => {
    // Test implementation
  });

  it('should validate Terms & Conditions acceptance', () => {
    // Test implementation
  });

  it('should create profile with correct fields', async () => {
    // Test implementation
  });
});
```

## Switching to ZAQA Sign-Up as Default

If you want to make the ZAQA sign-up the default instead of the old one:

### Option 1: Update Route (Recommended)

In `src/App.tsx`, swap the routes:
```typescript
// Make ZAQA the default signup
<Route path="/signup" element={<ZaqaSignup />} />
// Keep old one for backward compatibility
<Route path="/signup-legacy" element={<SignUp />} />
```

### Option 2: Update Links Throughout App

Search for links to `/signup` and decide which to keep:
```bash
grep -r "to=\"/signup\"" src/
```

Update links in:
- Navigation components
- Sign-in page ("Don't have an account?" link)
- Landing page CTAs

## Rollback Instructions

If you need to rollback the changes:

### 1. Remove Database Columns (Optional)

```sql
BEGIN;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS accepted_terms;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS newsletter_opt_in;
COMMIT;
```

**Note**: Only do this if no users have signed up with the new flow.

### 2. Revert Code Changes

```bash
git revert <commit-hash>
```

### 3. Remove Route

Remove the `/signup-zaqa` route from `src/App.tsx`.

## Newsletter Integration

To actually send newsletters to opted-in users:

```sql
-- Get all users who opted into newsletter
SELECT email, first_name, last_name, account_type
FROM profiles
WHERE newsletter_opt_in = true
  AND email IS NOT NULL;
```

You can integrate this with:
- Mailchimp
- SendGrid
- AWS SES
- Any email marketing platform

## Security Considerations

✅ **Implemented**:
- Terms acceptance is required before signup
- Passwords validated (min 8 characters)
- Email format validated
- RLS policies protect profile data
- HTTPS enforced by Supabase

⚠️ **Additional Recommendations**:
- Enable Supabase email confirmation (if not already)
- Set up rate limiting on sign-up endpoint
- Monitor for abuse patterns
- Consider adding CAPTCHA for production

## Support and Troubleshooting

### Issue: Migration fails

**Solution**: Check if columns already exist:
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('accepted_terms', 'newsletter_opt_in');
```

### Issue: Users can sign up without accepting terms

**Solution**: Check the frontend validation and ensure the checkbox is required:
```typescript
if (!acceptedTerms) {
  setError('You must accept the Terms & Conditions to sign up.');
  return;
}
```

### Issue: Email confirmation not working

**Solution**: Check Supabase settings:
1. Go to Authentication > Settings
2. Check "Enable email confirmations"
3. Configure email templates if needed

## Related Files

- `backend/supabase/add_signup_fields.sql` - Database migration
- `backend/supabase/core_schema.sql` - Original profiles table schema
- `backend/supabase/profiles_policies.sql` - RLS policies
- `src/pages/ZaqaSignup.tsx` - New sign-up page component
- `src/pages/SignIn.tsx` - Login page (existing)
- `src/data/accountTypes.ts` - Account type definitions
- `src/@types/database.ts` - TypeScript type definitions
- `src/App.tsx` - Route configuration

## Future Enhancements

Potential improvements for the sign-up flow:

1. **Multi-step validation**: Validate each field as user types
2. **Password strength meter**: Visual feedback on password strength
3. **Social login**: Add Google/LinkedIn OAuth options
4. **Phone verification**: Optional SMS verification for certain account types
5. **Profile picture upload**: Allow users to upload photo during signup
6. **Onboarding tour**: Guide users through first steps after signup
7. **A/B testing**: Track conversion rates vs old signup flow
8. **Analytics**: Track which account types are most popular

## Conclusion

The ZAQA-style sign-up flow is now ready for production use. It provides:
- Better UX with visual account type selection
- Proper Terms & Conditions acceptance tracking
- Newsletter opt-in functionality
- Production-grade error handling
- Full backward compatibility

The implementation preserves all existing account types and integrates seamlessly with the current authentication system.
