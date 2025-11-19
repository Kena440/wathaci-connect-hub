/**
 * Email Confirmation and Redirect Tests
 * 
 * Tests for email redirect URL construction and configuration
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { 
  getEmailConfirmationRedirectUrl,
  getPasswordResetRedirectUrl,
  getEmailRedirectUrl
} from '../emailRedirect';

describe('Email Redirect URL Helper', () => {
  const originalEnv = { ...import.meta.env };

  beforeEach(() => {
    // Reset environment variables before each test
    Object.keys(import.meta.env).forEach(key => {
      if (key.startsWith('VITE_')) {
        delete (import.meta.env as any)[key];
      }
    });
  });

  afterEach(() => {
    // Restore original environment
    Object.assign(import.meta.env, originalEnv);
  });

  describe('getEmailConfirmationRedirectUrl', () => {
    test('should use VITE_EMAIL_CONFIRMATION_REDIRECT_URL when set', () => {
      (import.meta.env as any).VITE_EMAIL_CONFIRMATION_REDIRECT_URL = 'https://app.example.com/confirm';
      
      const url = getEmailConfirmationRedirectUrl();
      
      expect(url).toBe('https://app.example.com/confirm');
    });

    test('should combine VITE_EMAIL_CONFIRMATION_REDIRECT_PATH with base URL', () => {
      (import.meta.env as any).VITE_APP_BASE_URL = 'https://app.example.com';
      (import.meta.env as any).VITE_EMAIL_CONFIRMATION_REDIRECT_PATH = '/signin';
      
      const url = getEmailConfirmationRedirectUrl();
      
      expect(url).toBe('https://app.example.com/signin');
    });

    test('should use fallback path with base URL', () => {
      (import.meta.env as any).VITE_APP_BASE_URL = 'https://app.example.com';
      
      const url = getEmailConfirmationRedirectUrl('/signin');
      
      expect(url).toBe('https://app.example.com/signin');
    });

    test('should return undefined when no base URL is available', () => {
      const url = getEmailConfirmationRedirectUrl();
      
      expect(url).toBeUndefined();
    });

    test('should ignore invalid environment values', () => {
      (import.meta.env as any).VITE_EMAIL_CONFIRMATION_REDIRECT_URL = 'undefined';
      (import.meta.env as any).VITE_APP_BASE_URL = 'https://app.example.com';
      
      const url = getEmailConfirmationRedirectUrl('/signin');
      
      expect(url).toBe('https://app.example.com/signin');
    });

    test('should handle paths without leading slash', () => {
      (import.meta.env as any).VITE_APP_BASE_URL = 'https://app.example.com';
      (import.meta.env as any).VITE_EMAIL_CONFIRMATION_REDIRECT_PATH = 'signin';
      
      const url = getEmailConfirmationRedirectUrl();
      
      expect(url).toBe('https://app.example.com/signin');
    });

    test('should handle base URLs with trailing slash', () => {
      (import.meta.env as any).VITE_APP_BASE_URL = 'https://app.example.com/';
      
      const url = getEmailConfirmationRedirectUrl('/signin');
      
      expect(url).toBe('https://app.example.com/signin');
    });
  });

  describe('getPasswordResetRedirectUrl', () => {
    test('should use VITE_PASSWORD_RESET_REDIRECT_URL when set', () => {
      (import.meta.env as any).VITE_PASSWORD_RESET_REDIRECT_URL = 'https://app.example.com/reset';
      
      const url = getPasswordResetRedirectUrl();
      
      expect(url).toBe('https://app.example.com/reset');
    });

    test('should combine VITE_PASSWORD_RESET_REDIRECT_PATH with base URL', () => {
      (import.meta.env as any).VITE_APP_BASE_URL = 'https://app.example.com';
      (import.meta.env as any).VITE_PASSWORD_RESET_REDIRECT_PATH = '/reset-password';
      
      const url = getPasswordResetRedirectUrl();
      
      expect(url).toBe('https://app.example.com/reset-password');
    });

    test('should use fallback path', () => {
      (import.meta.env as any).VITE_APP_BASE_URL = 'https://app.example.com';
      
      const url = getPasswordResetRedirectUrl('/reset-password');
      
      expect(url).toBe('https://app.example.com/reset-password');
    });

    test('should use default fallback path', () => {
      (import.meta.env as any).VITE_APP_BASE_URL = 'https://app.example.com';
      
      const url = getPasswordResetRedirectUrl();
      
      expect(url).toBe('https://app.example.com/reset-password');
    });
  });

  describe('getEmailRedirectUrl', () => {
    test('should combine path with base URL', () => {
      (import.meta.env as any).VITE_APP_BASE_URL = 'https://app.example.com';
      
      const url = getEmailRedirectUrl('/custom-path');
      
      expect(url).toBe('https://app.example.com/custom-path');
    });

    test('should return undefined when no base URL is available', () => {
      const url = getEmailRedirectUrl('/custom-path');
      
      expect(url).toBeUndefined();
    });
  });

  describe('Environment variable priority', () => {
    test('should prioritize VITE_APP_BASE_URL over other base URL keys', () => {
      (import.meta.env as any).VITE_APP_BASE_URL = 'https://priority.example.com';
      (import.meta.env as any).VITE_SITE_URL = 'https://fallback.example.com';
      
      const url = getEmailConfirmationRedirectUrl('/signin');
      
      expect(url).toBe('https://priority.example.com/signin');
    });

    test('should fall back to VITE_SITE_URL when VITE_APP_BASE_URL is not set', () => {
      (import.meta.env as any).VITE_SITE_URL = 'https://fallback.example.com';
      
      const url = getEmailConfirmationRedirectUrl('/signin');
      
      expect(url).toBe('https://fallback.example.com/signin');
    });
  });
});
