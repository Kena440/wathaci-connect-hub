import { apiFetch } from '@/lib/api/client';

const API_TIMEOUT_MS = 15000;

export type RegisterUserPayload = {
  firstName: string;
  lastName: string;
  email: string;
  accountType: string;
  company?: string | null;
  mobileNumber?: string | null;
};

export type RegisterUserResponse = {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    accountType: string;
    company: string | null;
    mobileNumber: string | null;
    registeredAt: string;
  };
};

const extractErrorMessage = (data: unknown) => {
  if (typeof data === 'object' && data && 'error' in data) {
    const errorValue = (data as { error?: unknown }).error;
    if (typeof errorValue === 'string' && errorValue.trim().length > 0) {
      return errorValue;
    }
  }
  return null;
};

export const registerUser = async (
  payload: RegisterUserPayload,
): Promise<RegisterUserResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, API_TIMEOUT_MS);

  try {
    const data = await apiFetch<RegisterUserResponse>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    return data;
  } catch (error) {
    if ((error as DOMException)?.name === 'AbortError') {
      throw new Error('Registration service timed out. Please try again later.');
    }

    const errorMessage =
      extractErrorMessage((error as { data?: unknown })?.data) ||
      (error as Error)?.message ||
      'Failed to register user with backend';

    throw new Error(errorMessage);
  } finally {
    clearTimeout(timeoutId);
  }
};
