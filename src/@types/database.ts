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
  user_metadata?: Record<string, any>;
}

export type AccountType =
  | 'sole_proprietor'
  | 'professional'
  | 'sme'
  | 'investor'
  | 'donor'
  | 'government'
  | 'admin';

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
  phone: string;
  country: string;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  profile_image_url?: string;
  linkedin_url?: string;
}

export interface BusinessInfo {
  business_name?: string;
  registration_number?: string;
  industry_sector?: string;
  description?: string;
  website_url?: string;
  employee_count?: number;
  annual_revenue?: number;
  funding_stage?: string;
}

export interface PaymentInfo {
  payment_method: 'phone' | 'card';
  payment_phone?: string | null;
  card_details?: {
    provider: 'lenco';
    status?: 'external_gateway' | 'tokenized' | 'pending_verification';
    setup_required?: boolean;
    last4?: string;
    exp_month?: string;
    exp_year?: string;
    expiry?: string;
  } | null;
  use_same_phone?: boolean;
}

export interface ProfessionalInfo {
  qualifications: Array<{
    name: string;
    institution: string;
    year: number;
  }>;
  experience_years?: number;
  specialization?: string;
  gaps_identified?: string[];
}

// Complete profile interface combining all sections
export interface Profile extends BaseProfile, PersonalInfo, BusinessInfo, PaymentInfo, ProfessionalInfo {}

// ================================
// Subscription Types
// ================================

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
  lencoAmount: number;
  userTypes: AccountType[];
  category: 'basic' | 'professional' | 'enterprise';
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  start_date: string;
  end_date: string;
  payment_status: 'paid' | 'pending' | 'failed';
  payment_reference?: string | null;
  created_at: string;
  updated_at: string;
}

// ================================
// Transaction Types
// ================================

export interface Transaction {
  id: string;
  user_id: string;
  subscription_id?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method: 'phone' | 'card';
  reference_number: string;
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
// SME Needs Assessment Types
// ================================

export interface SMENeedsAssessment {
  id: string;
  user_id: string;
  
  // Financial Health
  monthly_revenue: number;
  monthly_expenses: number;
  cash_flow_positive: boolean;
  debt_obligations: number;
  financial_records_organized: boolean;
  
  // Operations & Technology
  key_operational_challenges: string[];
  technology_gaps: string[];
  automation_level: 'manual' | 'partially_automated' | 'fully_automated';
  
  // Market & Customers
  target_market_clarity: 1 | 2 | 3 | 4 | 5; // 1-5 scale
  customer_acquisition_challenges: string[];
  competitive_position: 'weak' | 'average' | 'strong';
  
  // Compliance & Legal  
  regulatory_compliance_status: 'non_compliant' | 'partially_compliant' | 'fully_compliant';
  legal_structure_optimized: boolean;
  intellectual_property_protected: boolean;
  
  // Strategic Planning
  growth_strategy_defined: boolean;
  funding_requirements: {
    amount: number;
    purpose: string;
    timeline: string;
  };
  key_performance_metrics_tracked: boolean;
  
  // Professional Support Needs
  immediate_support_areas: string[];
  budget_for_professional_services: number;
  
  // Assessment Results
  overall_score: number;
  identified_gaps: string[];
  priority_areas: string[];
  
  completed_at: string;
  created_at: string;
  updated_at: string;
}

export interface AssessmentRecommendation {
  id: string;
  assessment_id: string;
  professional_id: string;
  match_score: number;
  recommended_for: string[];
  ai_reasoning: string;
  created_at: string;
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
// Resource Purchase Types
// ================================

export interface ResourcePurchase {
  id: string;
  user_id: string;
  resource_id: number;
  created_at: string;
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
  industry_sector?: string;
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