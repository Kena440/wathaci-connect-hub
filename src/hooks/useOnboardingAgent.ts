import { useCallback, useState } from 'react';
import {
  agentGetProfile,
  agentInitiateCheckout,
  agentSignin,
  agentSignup,
  agentUpdateProfile,
} from '@/lib/agent/client';
import type {
  AgentCheckoutRequest,
  AgentCheckoutResponse,
  AgentProfileResponse,
  AgentProfileUpdateRequest,
  AgentSigninRequest,
  AgentSigninResponse,
  AgentSignupRequest,
  AgentSignupResponse,
} from '@/lib/agent/types';

const buildFriendlyError = (error: unknown): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    return (error as { message?: string }).message || 'Request failed';
  }
  return 'Request failed';
};

export function useAgentSignup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signup = useCallback(async (payload: AgentSignupRequest): Promise<AgentSignupResponse> => {
    setLoading(true);
    setError(null);
    try {
      return await agentSignup(payload);
    } catch (err) {
      const message = buildFriendlyError(err);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { signup, loading, error };
}

export function useAgentSignin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signin = useCallback(async (payload: AgentSigninRequest): Promise<AgentSigninResponse> => {
    setLoading(true);
    setError(null);
    try {
      return await agentSignin(payload);
    } catch (err) {
      const message = buildFriendlyError(err);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { signin, loading, error };
}

export function useAgentProfile() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<AgentProfileResponse | null>(null);

  const fetchProfile = useCallback(async (userId: string): Promise<AgentProfileResponse> => {
    setLoading(true);
    setError(null);
    try {
      const result = await agentGetProfile(userId);
      setProfile(result);
      return result;
    } catch (err) {
      const message = buildFriendlyError(err);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (payload: AgentProfileUpdateRequest): Promise<AgentProfileResponse> => {
    setLoading(true);
    setError(null);
    try {
      const result = await agentUpdateProfile(payload);
      setProfile(result);
      return result;
    } catch (err) {
      const message = buildFriendlyError(err);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { profile, loading, error, fetchProfile, updateProfile };
}

export function useAgentCheckout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiateCheckout = useCallback(async (payload: AgentCheckoutRequest): Promise<AgentCheckoutResponse> => {
    setLoading(true);
    setError(null);
    try {
      return await agentInitiateCheckout(payload);
    } catch (err) {
      const message = buildFriendlyError(err);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { initiateCheckout, loading, error };
}
