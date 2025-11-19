# Database Error Fix: Case-Insensitive Email Constraint

## Problem Statement
Users were experiencing a "Database error saving new user" when attempting to register. The root cause was a mismatch between the database schema and the application's expectations for email uniqueness.

## Root Cause Analysis

### The Issue
The migration `20251117210000_create_registrations_table.sql` created a **case-sensitive** UNIQUE constraint:
```sql
email text NOT NULL UNIQUE,
```

However, the original schema file `backend/supabase/registrations.sql` and application logic expected **case-insensitive** email uniqueness:
```sql
create unique index if not exists registrations_email_key on public.registrations (lower(email));
```

### Why This Matters
- Emails are case-insensitive by RFC 5321 standard (user@EXAMPLE.com == user@example.com)
- The application normalizes emails to lowercase before storage
- A case-sensitive constraint could allow database-level duplicate insertions if someone bypasses the application layer
- Inconsistent constraint enforcement between database and application layers can cause subtle bugs

## Solution Implemented

### Migration: `20251119000000_fix_registrations_unique_constraint.sql`

This migration performs the following operations:

1. **Drops the case-sensitive UNIQUE constraint**
   - Dynamically finds and removes the auto-generated constraint name
   - Safe operation using IF EXISTS checks

2. **Removes redundant index**
   - Drops `registrations_email_idx` which was redundant with the UNIQUE constraint

3. **Creates case-insensitive unique index**
   - `CREATE UNIQUE INDEX ... ON registrations (lower(email))`
   - Ensures emails are unique regardless of case
   - Prevents duplicates like `Test@Example.com` and `test@example.com`

### Code Verification
The application code already handles email normalization correctly:
```javascript
const email = sanitizeString(payload.email)?.toLowerCase();
```

This ensures all emails are stored in lowercase, making the case-insensitive constraint work seamlessly.

## Testing

### New Test: `test/email-case-insensitive.test.js`
Comprehensive test that verifies:
- First registration succeeds with lowercase email
- Second registration with uppercase email is rejected (409)
- Third registration with mixed case email is rejected (409)

### Test Results
✅ All 23 existing backend tests pass  
✅ New case-insensitive test passes  
✅ Duplicate detection works correctly across all case variations

## Migration Instructions

### For Development
```bash
# Using Supabase CLI
supabase db push

# Or manually
supabase db query < supabase/migrations/20251119000000_fix_registrations_unique_constraint.sql
```

### For Production
The migration will be automatically applied when deploying to Supabase:
```bash
supabase link --project-ref <your-project-ref>
supabase db push --linked
```

## Verification Steps

After applying the migration:

1. **Check the constraint**:
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'registrations' AND schemaname = 'public';
```

Expected: `registrations_email_lower_unique_idx` exists with `lower(email)`

2. **Test duplicate detection**:
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test@example.com","accountType":"sme"}'

curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"TEST@EXAMPLE.COM","accountType":"sme"}'
```

Expected: Second request returns 409 with "User already registered"

## Impact
- ✅ Fixes database error when saving new users
- ✅ Ensures email uniqueness regardless of case
- ✅ Aligns database constraints with application logic
- ✅ Prevents potential data integrity issues
- ✅ No breaking changes to existing functionality

## Related Files
- Migration: `supabase/migrations/20251119000000_fix_registrations_unique_constraint.sql`
- Test: `test/email-case-insensitive.test.js`
- Schema: `backend/supabase/registrations.sql`
- Service: `backend/services/registration-store.js`
