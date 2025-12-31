/**
 * Service layer exports for the WATHACI-CONNECT application
 */

// Base service class
export { BaseService } from './base-service';

// User and Profile services
export { 
  UserService, 
  ProfileService, 
  userService, 
  profileService 
} from './user-service';

// Subscription services
export { 
  SubscriptionService, 
  TransactionService, 
  subscriptionService, 
  transactionService 
} from './subscription-service';

// Enhanced Supabase client and utilities
export { 
  supabase, 
  testConnection, 
  healthCheck, 
  withErrorHandling, 
  withRetry,
  getSupabaseClient 
} from '../supabase-enhanced';

// Database types
export type * from '../../@types/database';