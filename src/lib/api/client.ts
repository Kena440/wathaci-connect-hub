import { API_BASE_URL, getApiEndpoint } from '@/config/api';

export type ApiFetchOptions = RequestInit & { parseJson?: boolean };

const normalizePath = (path: string) => (path.startsWith('/') ? path : `/${path}`);

const ensureApiBaseUrl = () => {
  if (!API_BASE_URL) {
    // Surface configuration issues early while still allowing tests to stub fetch
    console.error('VITE_API_BASE_URL is not defined');
    throw new Error('API base URL is not configured. Please set VITE_API_BASE_URL.');
  }
};

export async function apiFetch<T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  ensureApiBaseUrl();

  const url = getApiEndpoint(normalizePath(path));
  const { headers, parseJson, ...rest } = options;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(headers || {}),
  };

  const response = await fetch(url, {
    credentials: 'include',
    ...rest,
    headers: defaultHeaders,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const shouldParseJson = parseJson ?? contentType.includes('application/json');

  let data: unknown;
  if (shouldParseJson) {
    try {
      data = await response.json();
    } catch {
      // If JSON parsing fails, treat as text
      data = await response.text();
    }
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMessage =
      typeof data === 'object' && data && 'error' in data && typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error
        : response.statusText || 'Request failed';

    // Provide detailed logging to aid debugging of onboarding/auth issues
    try {
      console.error('API Error:', response.status, data);
    } catch (logError) {
      console.error('API Error (unable to stringify response)', response.status, logError);
    }

    const error = new Error(errorMessage);
    (error as Error & { status?: number; data?: unknown }).status = response.status;
    (error as Error & { status?: number; data?: unknown }).data = data;
    throw error;
  }

  return data as T;
}

export async function apiGet<T = unknown>(path: string, options: Omit<ApiFetchOptions, 'method' | 'body'> = {}): Promise<T> {
  return apiFetch<T>(path, { ...options, method: 'GET' });
}

/**
 * Helper function for making POST requests with JSON bodies.
 * 
 * Note: This function is specifically designed for JSON payloads and will
 * automatically stringify the body. For other content types (FormData, 
 * pre-stringified JSON, etc.), use the apiFetch function directly.
 * 
 * @param path - The API path
 * @param body - The request body (will be JSON stringified)
 * @param options - Additional fetch options
 * @returns Promise resolving to the response data
 */
export async function apiPost<T = unknown>(
  path: string, 
  body?: Record<string, unknown> | unknown[] | null, 
  options: Omit<ApiFetchOptions, 'method' | 'body'> = {}
): Promise<T> {
  return apiFetch<T>(path, { 
    ...options, 
    method: 'POST', 
    body: body !== null && body !== undefined ? JSON.stringify(body) : undefined 
  });
}
