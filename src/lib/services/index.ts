/**
 * Service layer exports for the WATHACI-CONNECT application
 * 
 * This file provides centralized access to all database services and utilities.
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

// Import services for registry
import { 
  userService, 
  profileService 
} from './user-service';

import { 
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

// Utility functions for common patterns
export const createServiceInstance = <T>(ServiceClass: new () => T): T => {
  return new ServiceClass();
};

// Service registry for dependency injection if needed
export const serviceRegistry = {
  user: userService,
  profile: profileService,
  subscription: subscriptionService,
  transaction: transactionService,
} as const;

export type ServiceType = keyof typeof serviceRegistry;

export const getService = <T extends ServiceType>(serviceName: T): typeof serviceRegistry[T] => {
  return serviceRegistry[serviceName];
};