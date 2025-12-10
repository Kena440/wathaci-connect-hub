import { API_BASE_URL } from '@/config/api';

const FALLBACK_PROD_API = 'https://wathaci-connect-platform2.vercel.app';
const FALLBACK_DEV_API = 'http://localhost:4000';

export const API_BASE =
  API_BASE_URL && API_BASE_URL.trim().length > 0
    ? API_BASE_URL.trim()
    : import.meta.env.DEV
    ? FALLBACK_DEV_API
    : FALLBACK_PROD_API;

if (!API_BASE && !import.meta.env.DEV) {
  throw new Error(
    'API base URL is required in production mode. Please set VITE_API_BASE_URL to your backend URL.'
  );
}

export async function apiGet<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    credentials: 'include',
    ...init
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${path} failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<T>;
}
