import { API_BASE_URL, getApiEndpoint } from '@/config/api';

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

const buildEndpoint = () => {
  // Use centralized API config
  return getApiEndpoint('/users');
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
  const endpoint = buildEndpoint();

  let response: Response;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, API_TIMEOUT_MS);

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    if ((error as DOMException)?.name === 'AbortError') {
      throw new Error('Registration service timed out. Please try again later.');
    }

    throw new Error('Unable to reach registration service. Please try again later.');
  } finally {
    clearTimeout(timeoutId);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    if (!response.ok) {
      throw new Error('Failed to register user with backend');
    }
    throw error;
  }

  if (!response.ok) {
    const errorMessage = extractErrorMessage(data) || 'Failed to register user with backend';
    throw new Error(errorMessage);
  }

  return data as RegisterUserResponse;
};
