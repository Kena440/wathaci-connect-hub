import { apiFetch, apiGet, apiPost } from '@/lib/api/client';
import {
  AgentCheckoutRequest,
  AgentCheckoutResponse,
  AgentProfileResponse,
  AgentProfileUpdateRequest,
  AgentSigninRequest,
  AgentSigninResponse,
  AgentSignupRequest,
  AgentSignupResponse,
} from './types';

const basePath = '/api/agent';

export async function agentSignup(payload: AgentSignupRequest): Promise<AgentSignupResponse> {
  return apiPost(`${basePath}/signup`, payload);
}

export async function agentSignin(payload: AgentSigninRequest): Promise<AgentSigninResponse> {
  return apiPost(`${basePath}/signin`, payload);
}

export async function agentGetProfile(userId: string): Promise<AgentProfileResponse> {
  return apiGet(`${basePath}/profile?userId=${encodeURIComponent(userId)}`);
}

export async function agentUpdateProfile(payload: AgentProfileUpdateRequest): Promise<AgentProfileResponse> {
  return apiFetch(`${basePath}/profile`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function agentInitiateCheckout(payload: AgentCheckoutRequest): Promise<AgentCheckoutResponse> {
  return apiPost(`${basePath}/payments/checkout`, payload);
}
