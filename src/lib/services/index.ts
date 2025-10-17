/**
 * Service layer exports for the WATHACI-CONNECT application
 * 
 * This file provides centralized access to all database services and utilities.
 */

// Base service class
export { BaseService } from './base-service';

// User and Profile services
import {
  UserService,
  ProfileService,
  userService,
  profileService,
  OFFLINE_ACCOUNT_METADATA_KEY,
  OFFLINE_PROFILE_METADATA_KEY,
} from './user-service';

export {
  UserService,
  ProfileService,
  userService,
  profileService,
  OFFLINE_ACCOUNT_METADATA_KEY,
  OFFLINE_PROFILE_METADATA_KEY,
};

// Subscription services
import {
  SubscriptionService,
  TransactionService,
  subscriptionService,
  transactionService,
} from './subscription-service';

export {
  SubscriptionService,
  TransactionService,
  subscriptionService,
  transactionService,
};

// Resource purchase services
import {
  ResourcePurchaseService,
  resourcePurchaseService,
} from './resource-purchase-service';

export {
  ResourcePurchaseService,
  resourcePurchaseService,
};

// Enhanced Supabase client and utilities
export {
  supabase,
  withErrorHandling,
  testConnection,
  healthCheck
} from '../supabase-enhanced';

export type {
  HealthCheckResult,
  HealthCheckStatus
} from '../supabase-enhanced';

// Database types
export type * from '../../@types/database';

// Utility functions for common patterns
export const createServiceInstance = <T>(ServiceClass: new () => T): T => {
  return new ServiceClass();
};

// Service registry for dependency injection if needed
export const getServiceRegistry = () => ({
  user: userService,
  profile: profileService,
  subscription: subscriptionService,
  transaction: transactionService,
} as const);

export type ServiceType = keyof ReturnType<typeof getServiceRegistry>;

export const getService = <T extends ServiceType>(serviceName: T): ReturnType<typeof getServiceRegistry>[T] => {
  return getServiceRegistry()[serviceName];
};

// AI-powered services
export { getCollaborationSuggestions } from './collaboration-service';