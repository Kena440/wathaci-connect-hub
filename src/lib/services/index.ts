/**
 * Service layer exports for the WATHACI-CONNECT application
 *
 * This file provides centralized access to all database services and utilities.
 */

import { BaseService } from './base-service.ts';
import {
  UserService,
  ProfileService,
  userService,
  profileService
} from './user-service.ts';
import {
  SubscriptionService,
  TransactionService,
  subscriptionService,
  transactionService
} from './subscription-service.ts';
import {
  supabase,
  testConnection,
  healthCheck,
  withErrorHandling,
  withRetry,
  getSupabaseClient
} from '../supabase-enhanced.ts';

export type * from '../../@types/database.ts';

// Re-export classes, instances and utilities
export {
  BaseService,
  UserService,
  ProfileService,
  userService,
  profileService,
  SubscriptionService,
  TransactionService,
  subscriptionService,
  transactionService,
  supabase,
  testConnection,
  healthCheck,
  withErrorHandling,
  withRetry,
  getSupabaseClient
};

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

