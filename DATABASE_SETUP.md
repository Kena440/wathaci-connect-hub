# Database Connection and Models Documentation

This document provides comprehensive information about the database connection setup and model structure for the WATHACI-CONNECT application.

## Overview

The application uses Supabase as the backend database with PostgreSQL. We have implemented a robust service layer architecture with TypeScript interfaces for type safety and comprehensive error handling.

## Architecture

### 1. Enhanced Database Client (`src/lib/supabase-enhanced.ts`)

Features:
- **Environment validation**: Validates required environment variables on startup
- **Connection testing**: Built-in health checks and connection validation
- **Error handling**: Comprehensive error wrapping and context
- **Retry logic**: Automatic retry with exponential backoff for failed operations
- **Type safety**: Full TypeScript support for all operations

#### Key Functions:
- `testConnection()`: Test basic database connectivity
- `healthCheck()`: Comprehensive health status including auth
- `withErrorHandling()`: Wrapper for consistent error handling
- `withRetry()`: Retry failed operations with backoff

### 2. Type Definitions (`src/@types/database.ts`)

Comprehensive TypeScript interfaces for all database entities:

#### Core Types:
- `User`: Authentication and user identification
- `Profile`: Complete user profile with personal, business, and professional info
- `AccountType`: Enumeration of user categories
- `SubscriptionPlan`: Subscription plan details and features
- `UserSubscription`: User subscription relationships
- `Transaction`: Payment and transaction records

#### Supporting Types:
- `DatabaseResponse<T>`: Standardized response wrapper
- `PaginatedResponse<T>`: Paginated query results
- `ProfileFilters`: Search and filtering options
- `PaginationParams`: Pagination configuration

### 3. Service Layer (`src/lib/services/`)

#### Base Service (`base-service.ts`)
Abstract base class providing common CRUD operations:
- `findById()`: Get single record by ID
- `findMany()`: Get multiple records with filtering and pagination
- `create()`: Create new record
- `update()`: Update existing record
- `upsert()`: Insert or update record
- `delete()`: Hard delete record
- `softDelete()`: Soft delete with timestamp
- `exists()`: Check if record exists
- `count()`: Count records with filters
- `batchOperation()`: Execute multiple operations

#### User Service (`user-service.ts`)
Handles authentication and user management:
- `getCurrentUser()`: Get current authenticated user
- `signIn()`: Email/password authentication
- `signUp()`: User registration
- `signOut()`: User logout

#### Profile Service (`user-service.ts`)
Manages user profiles and profile data:
- `getByUserId()`: Get profile by user ID
- `createProfile()`: Create new profile
- `updateProfile()`: Update profile data
- `setAccountType()`: Set user account type
- `markProfileCompleted()`: Mark profile as complete
- `searchProfiles()`: Search profiles with filters
- `isProfileComplete()`: Check profile completion status
- `getProfileCompletionPercentage()`: Calculate completion percentage

#### Subscription Service (`subscription-service.ts`)
Handles subscription plans and user subscriptions:
- `getPlansByAccountType()`: Get plans for specific account type
- `getCurrentUserSubscription()`: Get user's active subscription
- `createSubscription()`: Create new subscription
- `activateSubscription()`: Activate subscription after payment
- `cancelSubscription()`: Cancel subscription
- `renewSubscription()`: Renew existing subscription
- `hasActiveSubscription()`: Check if user has active subscription
- `getUserSubscriptionFeatures()`: Get subscription features
- `hasFeatureAccess()`: Check access to specific feature

#### Transaction Service (`subscription-service.ts`)
Manages payment transactions:
- `createTransaction()`: Record new transaction
- `updateTransactionStatus()`: Update transaction status
- `getUserTransactions()`: Get user's transaction history
- `getByReference()`: Find transaction by reference number

## Database Schema

### Core Tables

#### `profiles` Table
```sql
- id: UUID (Primary Key, references auth.users)
- email: TEXT
- account_type: TEXT (sole_proprietor, professional, sme, investor, donor, government)
- profile_completed: BOOLEAN
- first_name: TEXT
- middle_name: TEXT
- last_name: TEXT
- phone: TEXT
- country: TEXT
- address: TEXT
- coordinates: JSONB
- profile_image_url: TEXT
- linkedin_url: TEXT
- business_name: TEXT
- registration_number: TEXT
- industry_sector: TEXT
- description: TEXT
- website_url: TEXT
- employee_count: INTEGER
- annual_revenue: INTEGER
- funding_stage: TEXT
- payment_method: TEXT (phone, card)
- payment_phone: TEXT
- card_details: JSONB
- qualifications: JSONB
- experience_years: INTEGER
- specialization: TEXT
- gaps_identified: TEXT[]
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### `subscription_plans` Table
```sql
- id: UUID (Primary Key)
- name: TEXT
- price: TEXT
- period: TEXT
- description: TEXT
- features: TEXT[]
- popular: BOOLEAN
- lenco_amount: INTEGER
- user_types: TEXT[]
- category: TEXT (basic, professional, enterprise)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### `user_subscriptions` Table
```sql
- id: UUID (Primary Key)
- user_id: UUID (References profiles.id)
- plan_id: UUID (References subscription_plans.id)
- status: TEXT (pending, active, cancelled, expired)
- start_date: TIMESTAMP
- end_date: TIMESTAMP
- payment_status: TEXT (pending, paid, failed)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### `transactions` Table
```sql
- id: UUID (Primary Key)
- user_id: UUID (References profiles.id)
- subscription_id: UUID (References user_subscriptions.id)
- amount: INTEGER
- currency: TEXT
- status: TEXT (pending, completed, failed, refunded)
- payment_method: TEXT (phone, card)
- reference_number: TEXT (Unique)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### `registrations` Table
```sql
- id: UUID (Primary Key)
- first_name: TEXT
- last_name: TEXT
- email: TEXT (Unique, stored in lowercase)
- account_type: TEXT
- company: TEXT
- mobile_number: TEXT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### `frontend_logs` Table
```sql
- id: UUID (Primary Key)
- level: TEXT (info, warn, error, debug)
- message: TEXT
- context: JSONB
- stack: TEXT
- component_stack: TEXT
- received_at: TIMESTAMP
- created_at: TIMESTAMP
```

## Usage Examples

### Basic User Operations

```typescript
import { userService, profileService } from '@/lib/services';

// Sign up new user
const { data: user, error } = await userService.signUp('user@example.com', 'password');

// Create profile
if (user) {
  await profileService.createProfile(user.id, {
    account_type: 'professional',
    first_name: 'John',
    last_name: 'Doe'
  });
}

// Get user profile
const { data: profile } = await profileService.getByUserId(user.id);
```

### Subscription Management

```typescript
import { subscriptionService } from '@/lib/services';

// Get plans for user type
const { data: plans } = await subscriptionService.getPlansByAccountType('professional');

// Create subscription
const { data: subscription } = await subscriptionService.createSubscription(
  userId, 
  planId, 
  3 // 3 months
);

// Check feature access
const { data: hasAccess } = await subscriptionService.hasFeatureAccess(
  userId, 
  'AI-powered matching'
);
```

### Advanced Queries

```typescript
// Search profiles with filters
const { data: profiles } = await profileService.searchProfiles({
  account_type: 'sme',
  country: 'Zambia',
  search: 'technology'
});

// Get paginated results
const { data: result } = await profileService.findMany(
  { account_type: 'investor' },
  { page: 1, limit: 10, sortBy: 'created_at', sortOrder: 'desc' }
);
```

## Error Handling

All service methods return a standardized response format:

```typescript
interface DatabaseResponse<T> {
  data: T | null;
  error: Error | null;
}
```

Always check for errors before using data:

```typescript
const { data: user, error } = await userService.getCurrentUser();

if (error) {
  console.error('Failed to get user:', error.message);
  return;
}

if (user) {
  // Use user data safely
  console.log('User ID:', user.id);
}
```

## Environment Variables

Required environment variables:

```env
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_KEY="your-anon-key"
```

The enhanced client validates these on startup and provides clear error messages if missing or invalid.

## Testing

The service layer is designed for easy testing with built-in mocking capabilities:

```typescript
// Mock service responses for testing
jest.mock('@/lib/services', () => ({
  userService: {
    getCurrentUser: jest.fn(),
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
  },
  profileService: {
    getByUserId: jest.fn(),
    updateProfile: jest.fn(),
  }
}));
```

## Migration from Legacy Code

The enhanced setup maintains backward compatibility with existing code:

1. **Imports**: The original `@/lib/supabase` import still works
2. **API**: All existing Supabase operations continue to work
3. **Gradual Migration**: You can migrate to the service layer incrementally

### Migration Steps:

1. **Replace direct Supabase calls** with service methods
2. **Update TypeScript interfaces** to use the new database types
3. **Add error handling** using the standardized response format
4. **Update tests** to use service mocks

## Performance Considerations

1. **Connection Pooling**: Supabase handles connection pooling automatically
2. **Query Optimization**: Use specific selects and appropriate indexes
3. **Pagination**: Always use pagination for large result sets
4. **Caching**: Consider implementing query result caching for frequently accessed data
5. **Batch Operations**: Use `batchOperation()` for multiple related operations

## Security

1. **Row Level Security (RLS)**: Implement RLS policies in Supabase
2. **Input Validation**: All inputs are validated before database operations
3. **SQL Injection Protection**: Supabase client provides automatic protection
4. **Authentication**: All operations respect Supabase authentication state
5. **Environment Variables**: Sensitive configuration is in environment variables

### Supabase RLS & Profile Provisioning

To guarantee that every authenticated user can manage only their own profile, run the SQL automation in
[`backend/supabase/profiles_policies.sql`](backend/supabase/profiles_policies.sql). The script:

1. Enables RLS on `public.profiles`.
2. Creates policies that allow users to read, insert, and update only the row that matches their `auth.uid()`.
3. Creates (or replaces) a `public.handle_new_auth_user()` trigger function that inserts a fresh profile record when a new
   `auth.users` entry is created, defaulting to the `sole_proprietor` account type and stamping UTC timestamps.
4. Recreates the `on_auth_user_created` trigger so duplicate trigger errors are avoided during re-runs.

> ℹ️ The function performs an `ON CONFLICT` upsert to avoid duplicate-key errors if retries occur. You can safely re-run the
> script whenever policies or trigger logic need to be refreshed.

After executing the script, confirm that:

- Anonymous clients can only select/update the profile whose `id` matches their authenticated user.
- The trigger creates a profile row immediately after a new account is registered (check the Supabase table or the
  `handle_new_auth_user` logs).
- Service-role operations (e.g., via the dashboard or admin scripts) can still manage all rows because RLS bypasses service
  keys by default.

## Monitoring and Health Checks

Use the built-in health check functionality:

```typescript
import { healthCheck } from '@/lib/services';

const health = await healthCheck();
console.log('Database Status:', health.status);
console.log('Connection:', health.details.connection);
console.log('Auth:', health.details.auth);
```

## Best Practices

1. **Always handle errors** from service methods
2. **Use TypeScript types** for all database operations
3. **Implement proper validation** before database operations
4. **Use transactions** for related operations
5. **Keep service methods focused** on single responsibilities
6. **Add comprehensive logging** for debugging
7. **Test database operations** thoroughly
8. **Monitor performance** and optimize queries as needed

## Troubleshooting

### Common Issues:

1. **Connection Errors**: Check environment variables and network connectivity
2. **Type Errors**: Ensure all interfaces match your database schema
3. **Authentication Issues**: Verify Supabase key permissions and user session
4. **Performance Issues**: Check query complexity and add appropriate indexes

### Debug Tools:

1. Use `testConnection()` to verify database connectivity
2. Use `healthCheck()` for comprehensive status
3. Check browser network tab for request details
4. Enable Supabase logging for detailed query information