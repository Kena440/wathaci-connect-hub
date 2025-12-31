/**
 * Database type definitions for WATHACI-CONNECT application
 * 
 * This file contains all the TypeScript interfaces and types for database entities
 * used throughout the application, ensuring type safety and consistency.
 */

// ================================
// User and Authentication Types
// ================================

export interface User {
  id: string;
  email: string;
  profile_completed?: boolean;
  account_type?: AccountType;
  created_at?: string;
  updated_at?: string;
}

export type AccountType = 
  | 'sole_proprietor'
  | 'professional' 
  | 'sme'
  | 'investor'
  | 'donor'
  | 'government';

// ================================
// Profile Types
// ================================

export interface BaseProfile {
  id: string;
  email: string;
  account_type: AccountType;
  profile_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface PersonalInfo {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string;
  country?: string;
  province?: string;
  city?: string;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  profile_image_url?: string;
  avatar_url?: string;
}

export interface ProfessionalInfo {
  title?: string;
  bio?: string;
  description?: string;
  specialization?: string;
  experience_years?: number;
  qualifications?: Array<{
    name: string;
    institution: string;
    year?: number;
  }>;
  certifications?: Array<{
    name: string;
    issuer: string;
    date?: string;
    expiry?: string;
  }>;
  license_number?: string;
  skills?: string[];
  services_offered?: string[];
  hourly_rate?: number;
  currency?: string;
  availability_status?: 'available' | 'busy' | 'unavailable';
  gaps_identified?: string[];
}

export interface BusinessInfo {
  business_name?: string;
  registration_number?: string;
  industry_sector?: string;
  ownership_structure?: 'sole_proprietorship' | 'partnership' | 'limited_company' | 'corporation';
  employee_count?: number;
  annual_revenue?: number;
  funding_stage?: string;
  funding_needed?: number;
  years_in_business?: number;
  business_model?: string;
  sectors?: string[];
  target_market?: string[];
}

export interface SocialInfo {
  website_url?: string;
  linkedin_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  portfolio_url?: string;
}

export interface PaymentInfo {
  payment_method?: 'phone' | 'card';
  payment_phone?: string;
  card_details?: {
    number: string;
    expiry: string;
  };
  use_same_phone?: boolean;
}

export interface MarketplaceInfo {
  rating?: number;
  reviews_count?: number;
  total_jobs_completed?: number;
}

export interface ComplianceInfo {
  compliance_verified?: boolean;
  verification_date?: string;
  documents_submitted?: boolean;
}

export interface InvestorDonorInfo {
  total_invested?: number;
  total_donated?: number;
  investment_portfolio?: Array<{
    company_name: string;
    amount: number;
    date: string;
    status: string;
  }>;
  preferred_sectors?: string[];
}

export interface CommunicationPreferences {
  preferred_contact_method?: 'email' | 'phone' | 'whatsapp';
  notification_preferences?: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
}

// Complete profile interface combining all sections
export interface Profile extends 
  BaseProfile, 
  PersonalInfo, 
  ProfessionalInfo, 
  BusinessInfo, 
  SocialInfo,
  PaymentInfo, 
  MarketplaceInfo,
  ComplianceInfo,
  InvestorDonorInfo,
  CommunicationPreferences {}

// ================================
// Subscription Types
// ================================

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  price_usd?: number;
  price_zmw?: number;
  period: string;
  billing_interval?: string;
  description: string;
  features: string[];
  popular?: boolean;
  lencoAmount?: number;
  userTypes?: AccountType[];
  account_type?: string;
  category?: 'basic' | 'professional' | 'enterprise';
  is_active?: boolean;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'cancelled' | 'expired' | 'past_due' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  trial_end?: string;
  cancel_at_period_end?: boolean;
  cancelled_at?: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

// ================================
// Transaction Types
// ================================

export type TransactionType = 
  | 'service_purchase'
  | 'subscription'
  | 'platform_fee'
  | 'payout'
  | 'refund';

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'successful'
  | 'failed'
  | 'refunded'
  | 'cancelled';

export interface Transaction {
  id: string;
  user_id: string;
  recipient_id?: string;
  subscription_id?: string;
  service_id?: string;
  transaction_type: TransactionType;
  amount: number;
  platform_fee?: number;
  net_amount?: number;
  currency: string;
  status: PaymentStatus;
  description?: string;
  lenco_reference?: string;
  lenco_transaction_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ================================
// Payment Account Types
// ================================

export interface PaymentAccount {
  id: string;
  user_id: string;
  balance_zmw: number;
  balance_usd: number;
  pending_balance_zmw: number;
  pending_balance_usd: number;
  bank_name?: string;
  bank_account_number?: string;
  mobile_money_provider?: string;
  mobile_money_number?: string;
  lenco_account_id?: string;
  created_at: string;
  updated_at: string;
}

// ================================
// Document Types (for due diligence)
// ================================

export interface Document {
  id: string;
  user_id: string;
  type: 'id' | 'business_license' | 'tax_certificate' | 'bank_statement' | 'other';
  file_url: string;
  file_name: string;
  file_size: number;
  verification_status: 'pending' | 'approved' | 'rejected';
  uploaded_at: string;
  verified_at?: string;
}

// ================================
// Marketplace Types
// ================================

export interface Product {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  status: 'draft' | 'published' | 'sold' | 'archived';
  images: string[];
  tags: string[];
  location?: string;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  pricing_type: 'fixed' | 'hourly' | 'project';
  price: number;
  currency: string;
  duration?: string;
  status: 'active' | 'inactive' | 'archived';
  skills: string[];
  portfolio_items: string[];
  created_at: string;
  updated_at: string;
}

// ================================
// Freelancer Types
// ================================

export interface Freelancer {
  id: string;
  name: string;
  title: string;
  bio: string;
  skills: string[];
  hourly_rate: number;
  currency: string;
  location: string;
  country: string;
  rating: number;
  reviews_count: number;
  profile_image_url?: string;
  availability_status: 'available' | 'busy' | 'unavailable';
  years_experience: number;
}

// ================================
// SME Types
// ================================

export interface SME {
  id: string;
  business_name: string;
  business_type: string;
  industry: string;
  location: string;
  description: string;
  employees_count: number;
  annual_revenue: number;
  funding_needed?: number;
  compliance_verified: boolean;
}

// ================================
// Connection and Messaging Types
// ================================

export interface Connection {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  message?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'file' | 'image';
  file_url?: string;
  read: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  last_message?: string;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
}

// ================================
// Database Response Types
// ================================

export interface DatabaseResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

// ================================
// Query Parameters and Filters
// ================================

export interface ProfileFilters {
  account_type?: AccountType;
  country?: string;
  province?: string;
  city?: string;
  industry_sector?: string;
  specialization?: string;
  skills?: string[];
  availability_status?: string;
  compliance_verified?: boolean;
  funding_stage?: string;
  search?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProductFilters extends PaginationParams {
  category?: string;
  priceMin?: number;
  priceMax?: number;
  location?: string;
  search?: string;
}

export interface ServiceFilters extends PaginationParams {
  category?: string;
  pricing_type?: 'fixed' | 'hourly' | 'project';
  skills?: string[];
  search?: string;
}

export interface FreelancerFilters extends PaginationParams {
  skills?: string[];
  location?: string;
  country?: string;
  hourlyRateMin?: number;
  hourlyRateMax?: number;
  availability_status?: string;
  search?: string;
}

export interface SMEFilters extends PaginationParams {
  industry?: string;
  location?: string;
  employeesMin?: number;
  employeesMax?: number;
  revenueMin?: number;
  revenueMax?: number;
  compliance_verified?: boolean;
  search?: string;
}
