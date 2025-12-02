export type ProfileStatus = 'incomplete' | 'pending_verification' | 'active';

export interface AgentSignupRequest {
  email: string;
  password: string;
  account_type: string;
  profile?: Record<string, unknown>;
}

export interface AgentSigninRequest {
  email: string;
  password: string;
}

export interface AgentProfileUpdateRequest {
  userId: string;
  updates: Record<string, unknown>;
}

export interface AgentCheckoutRequest {
  userId: string;
  plan_code?: string;
  amount: number;
  currency?: string;
  type?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentSignupResponse {
  userId: string;
  profileId: string;
  subscription?: unknown;
  nextStep: string;
}

export interface AgentSigninResponse {
  session: unknown;
  user: unknown;
}

export interface AgentProfileResponse {
  id?: string;
  user_id?: string;
  status?: ProfileStatus;
  [key: string]: unknown;
}

export interface AgentCheckoutResponse {
  paymentId: string;
  providerPaymentId: string;
  checkoutUrl: string;
  reference: string;
}
