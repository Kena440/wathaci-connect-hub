const normalizeBaseUrl = (baseUrl: string | undefined) => {
  if (!baseUrl) return '';
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
};

const API_TIMEOUT_MS = 15000;

// Safe accessor for import.meta to avoid Jest parse errors
const getImportMetaEnv = () => {
  try {
    return new Function('return typeof import.meta !== "undefined" ? import.meta.env : {}')();
  } catch {
    return {};
  }
};

const importMetaEnv = getImportMetaEnv();
const DEFAULT_DEV_API_BASE_URL = importMetaEnv.DEV ? 'http://localhost:3000' : undefined;

const API_BASE_URL = normalizeBaseUrl(
  importMetaEnv.VITE_API_BASE_URL ?? DEFAULT_DEV_API_BASE_URL,
);

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
  if (API_BASE_URL) {
    return `${API_BASE_URL}/users`;
  }

  if (importMetaEnv.PROD) {
    throw new Error(
      'Registration service URL is not configured. Set VITE_API_BASE_URL to your backend API base.',
    );
  }

  return '/users';
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

  const contentType = response.headers.get('content-type') ?? '';
  const contentLength = response.headers.get('content-length');
  const isEmptyBody =
    response.status === 204 ||
    response.status === 205 ||
    (contentLength !== null && Number(contentLength) === 0);

  let data: unknown = null;

  if (!isEmptyBody) {
    const isJson = contentType.includes('application/json');
    try {
      if (isJson) {
        data = await response.json();
      } else {
        const raw = await response.text();
        if (raw) {
          try {
            data = JSON.parse(raw);
          } catch {
            data = raw;
          }
        }
      }
    } catch (error) {
      if (!response.ok) {
        throw new Error('Failed to register user with backend');
      }

      console.warn('[register-user] Unable to parse registration response:', error);
    }
  }

  if (!response.ok) {
    const errorMessage = extractErrorMessage(data) || 'Failed to register user with backend';
    throw new Error(errorMessage);
  }

  if (!data || typeof data !== 'object') {
    return {
      user: {
        id: 'pending-registration',
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        accountType: payload.accountType,
        company: payload.company ?? null,
        mobileNumber: payload.mobileNumber ?? null,
        registeredAt: new Date().toISOString(),
      },
    } satisfies RegisterUserResponse;
  }

  return data as RegisterUserResponse;
};
