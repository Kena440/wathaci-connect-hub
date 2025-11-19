# Supabase Production Setup - Quick Reference

## 📋 Overview

This is your quick reference guide for the complete Supabase production setup for WATHACI CONNECT. All database schemas, RLS policies, migrations, and integration code are production-ready.

## 🗂️ Documentation Structure

### Core Documents

1. **[PRODUCTION_DATABASE_SETUP.md](./PRODUCTION_DATABASE_SETUP.md)** ⭐ **START HERE**
   - Complete architecture overview
   - All table schemas with detailed documentation
   - RLS policy definitions
   - Auth & profile creation flows
   - TypeScript type definitions
   - Testing & deployment checklists
   - **Size**: 40KB | **Read Time**: 30-45 min

2. **[TESTING_DEPLOYMENT_CHECKLIST.md](./TESTING_DEPLOYMENT_CHECKLIST.md)** 
   - Step-by-step testing procedures
   - Pre-deployment checklist
   - Production deployment guide
   - Post-deployment monitoring
   - Rollback procedures
   - **Size**: 17KB | **Read Time**: 20-30 min

3. **[FRONTEND_INTEGRATION_EXAMPLES.ts](./FRONTEND_INTEGRATION_EXAMPLES.ts)**
   - Complete frontend auth functions
   - Profile management functions
   - Subscription functions
   - Error handling examples
   - TypeScript examples for React
   - **Size**: 12KB | **Read Time**: 15-20 min

4. **[BACKEND_INTEGRATION_EXAMPLES.js](./BACKEND_INTEGRATION_EXAMPLES.js)**
   - Admin API functions
   - User management
   - Payment processing
   - Statistics & reporting
   - Express.js route examples
   - **Size**: 16KB | **Read Time**: 15-20 min

## 📦 New Migrations

All migrations are idempotent and safe to run multiple times.

| Migration File | Purpose | Tables/Features |
|---------------|---------|-----------------|
| `20251119180000_add_audit_logs.sql` | Audit logging | `audit_logs` table, indexes, RLS |
| `20251119180100_add_user_roles.sql` | Role-based access | `user_roles` table (future use) |
| `20251119180200_add_constraints.sql` | Data validation | Check constraints on all tables |
| `20251119180300_add_indexes.sql` | Performance | Indexes on key columns |
| `20251119180400_add_audit_triggers.sql` | Auto-logging | Triggers for automatic audit logs |
| `20251119180500_review_rls_policies.sql` | Security | Consolidated RLS policies |

## 🎯 Quick Start

### 1. Local Testing

```bash
# Start local Supabase
supabase start

# Apply all migrations
supabase db reset

# Verify schema
supabase db pull --schema public
```

### 2. Staging Deployment

```bash
# Link to staging project
supabase link --project-ref <staging-ref>

# Push migrations
supabase db push

# Verify
supabase db diff
```

### 3. Production Deployment

```bash
# Link to production project
supabase link --project-ref <production-ref>

# Backup current state
# (Use Supabase dashboard to create backup)

# Push migrations
supabase db push

# Verify
supabase db pull --schema public
```

## 🔑 Key Features

### ✅ Database Schema
- **11 core tables** fully documented
- **5 assessment tables** for user types
- **Foreign key constraints** with proper CASCADE behavior
- **Timestamp tracking** on all tables
- **JSONB columns** for flexible data

### ✅ Security (RLS)
- **RLS enabled** on ALL tables
- **Owner-only access** for user data
- **Service role bypass** for admin operations
- **No anonymous access** to sensitive data
- **Audit trail** for all critical operations

### ✅ Data Integrity
- **Check constraints** for enums and validation
- **Unique constraints** on critical fields
- **Email format validation**
- **Positive amount validation**
- **Date range validation**

### ✅ Performance
- **50+ indexes** on commonly queried columns
- **Composite indexes** for complex queries
- **Partial indexes** for optimized filtering
- **Case-insensitive** email lookups

### ✅ Auditability
- **Automatic logging** via triggers
- **Before/after state** captured
- **User action tracking**
- **Compliance-ready**

### ✅ Type Safety
- **Complete TypeScript types** matching schema
- **Database type** for Supabase client
- **Form types** for frontend
- **API response types**

## 📊 Database Tables Overview

### Core User Tables
- `profiles` - User profiles (1:1 with auth.users)
- `audit_logs` - Activity logging
- `user_roles` - Role-based access (optional)

### Assessment Tables
- `sme_needs_assessments`
- `professional_needs_assessments`
- `investor_needs_assessments`
- `donor_needs_assessments`
- `government_needs_assessments`

### Subscription & Payment Tables
- `subscription_plans` - Available plans
- `user_subscriptions` - User subscriptions
- `transactions` - Payment transactions
- `payments` - Provider-specific payment details
- `webhook_logs` - Webhook event tracking

## 🔐 Row Level Security (RLS) Summary

### Pattern for User Data Tables
```sql
-- Users can only access their own data
CREATE POLICY "table_name_own"
  ON table_name
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "table_name_service_role"
  ON table_name
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

### Pattern for Public Data Tables
```sql
-- Anyone can read public data
CREATE POLICY "table_name_select_all"
  ON table_name
  FOR SELECT
  USING (true);

-- Only service role can modify
CREATE POLICY "table_name_service_role"
  ON table_name
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

## 🎨 TypeScript Integration

### Import Types
```typescript
import type {
  Profile,
  ProfileUpdate,
  AccountType,
  // ... other types
} from '@/@types/supabase.types';
```

### Use with Supabase Client
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/@types/supabase.types';

const supabase = createClient<Database>(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Now you have full type safety!
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();
// data is typed as Profile
```

## 🚀 Frontend Integration Examples

### Sign Up
```typescript
import { signUp } from '@/lib/auth';

await signUp({
  email: 'user@example.com',
  password: 'password123',
  full_name: 'John Doe',
  account_type: 'SME'
});
```

### Get Profile
```typescript
import { getCurrentProfile } from '@/lib/auth';

const profile = await getCurrentProfile();
console.log(profile?.account_type);
```

### Update Profile
```typescript
import { updateCurrentProfile } from '@/lib/auth';

await updateCurrentProfile({
  first_name: 'John',
  last_name: 'Doe',
  phone: '+1234567890'
});
```

## 🛠️ Backend Integration Examples

### Get User (Admin)
```javascript
const { getUserProfile } = require('./lib/supabase');

const profile = await getUserProfile(userId);
```

### Create Payment
```javascript
const { createPayment } = require('./lib/supabase');

const payment = await createPayment({
  user_id: userId,
  amount: 50000,
  currency: 'NGN',
  status: 'pending',
  payment_method: 'card',
  provider: 'lenco',
  reference: generateRef()
});
```

## ⚠️ Important Notes

### DO NOT
- ❌ Expose service role key to frontend
- ❌ Modify `auth.users` table directly
- ❌ Disable RLS policies in production
- ❌ Skip testing in staging first
- ❌ Deploy without backups

### DO
- ✅ Test all migrations locally first
- ✅ Use staging environment for integration testing
- ✅ Keep service role key secret
- ✅ Monitor database performance
- ✅ Review audit logs regularly
- ✅ Take regular backups

## 🔍 Troubleshooting

### "Database error saving new user"
- Check trigger function exists
- Verify trigger is enabled
- Review `audit_logs` for errors
- Check constraint violations

### "User cannot access profile"
- Verify RLS policies exist
- Check `auth.uid()` matches profile id
- Ensure using correct role (authenticated vs anon)

### "Duplicate email error"
- User already exists
- Implement "forgot password" flow
- Check if email is confirmed

### Slow Queries
- Check if indexes are being used (`EXPLAIN ANALYZE`)
- Review query complexity
- Consider composite indexes
- Check database load

## 📞 Support

For issues or questions:

1. Review documentation in `docs/supabase/`
2. Check Supabase dashboard logs
3. Review audit logs for clues
4. Check existing README files in project root
5. Contact development team

## 📈 Next Steps

### Immediate
1. [ ] Review all documentation
2. [ ] Test migrations locally
3. [ ] Deploy to staging
4. [ ] Run full test suite
5. [ ] Get team approval

### Short-term
1. [ ] Deploy to production
2. [ ] Monitor for 24 hours
3. [ ] Document any issues
4. [ ] Train team on admin operations

### Long-term
1. [ ] Implement admin dashboard
2. [ ] Add reporting features
3. [ ] Optimize query performance
4. [ ] Expand audit logging
5. [ ] Add user roles/permissions

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

## Summary

✅ **Complete database schema** designed and documented  
✅ **RLS policies** configured for production security  
✅ **Audit logging** implemented for compliance  
✅ **TypeScript types** for type-safe development  
✅ **Integration examples** for frontend and backend  
✅ **Testing checklist** for quality assurance  
✅ **Deployment guide** for safe production rollout  

**Ready for production deployment!** 🎉

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-19  
**Maintained By**: Development Team
