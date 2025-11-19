// TEMPORARY BYPASS MODE: remove after auth errors are fixed
/**
 * Tests for Auth Bypass Mode Utilities
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  isAuthBypassEnabled,
  createBypassUser,
  createBypassProfile,
  isBypassUser,
  isBypassProfile,
  saveBypassUser,
  loadBypassUser,
  saveBypassProfile,
  loadBypassProfile,
  findBypassUserByEmail,
  clearBypassUser,
  clearBypassProfile,
  clearAllBypassData,
} from '../authBypass';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    // Expose keys so clearAllBypassData can iterate
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

// Make localStorage iterable for Object.keys()
Object.defineProperty(localStorageMock, 'length', {
  get() {
    return Object.keys(localStorageMock).filter(k => k !== 'length' && k !== 'key').length;
  }
});

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

describe('Auth Bypass Utilities', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('isAuthBypassEnabled', () => {
    it('should return false when bypass mode is not enabled', () => {
      expect(isAuthBypassEnabled()).toBe(false);
    });
  });

  describe('createBypassUser', () => {
    it('should create a bypass user with required fields', () => {
      const email = 'test@example.com';
      const user = createBypassUser(email);

      expect(user.email).toBe(email);
      expect(user.isBypassUser).toBe(true);
      expect(user.id).toMatch(/^temp_/);
      expect(user.bypassCreatedAt).toBeDefined();
      expect(user.created_at).toBeDefined();
      expect(user.profile_completed).toBe(false);
    });

    it('should accept additional data', () => {
      const email = 'test@example.com';
      const user = createBypassUser(email, {
        account_type: 'sme',
        full_name: 'Test User',
      });

      expect(user.email).toBe(email);
      expect(user.account_type).toBe('sme');
      expect(user.full_name).toBe('Test User');
    });
  });

  describe('createBypassProfile', () => {
    it('should create a bypass profile with required fields', () => {
      const userId = 'test-user-id';
      const email = 'test@example.com';
      const profile = createBypassProfile(userId, email);

      expect(profile.id).toBe(userId);
      expect(profile.email).toBe(email);
      expect(profile.isBypassProfile).toBe(true);
      expect(profile.bypassCreatedAt).toBeDefined();
      expect(profile.profile_completed).toBe(false);
    });

    it('should accept additional data', () => {
      const userId = 'test-user-id';
      const email = 'test@example.com';
      const profile = createBypassProfile(userId, email, {
        full_name: 'Test User',
        account_type: 'professional',
      });

      expect(profile.full_name).toBe('Test User');
      expect(profile.account_type).toBe('professional');
    });
  });

  describe('isBypassUser', () => {
    it('should return true for bypass users', () => {
      const user = createBypassUser('test@example.com');
      expect(isBypassUser(user)).toBe(true);
    });

    it('should return false for non-bypass users', () => {
      const user = { id: 'test', email: 'test@example.com' };
      expect(isBypassUser(user)).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isBypassUser(null)).toBe(false);
      expect(isBypassUser(undefined)).toBe(false);
    });
  });

  describe('isBypassProfile', () => {
    it('should return true for bypass profiles', () => {
      const profile = createBypassProfile('user-id', 'test@example.com');
      expect(isBypassProfile(profile)).toBe(true);
    });

    it('should return false for non-bypass profiles', () => {
      const profile = { id: 'test', email: 'test@example.com' };
      expect(isBypassProfile(profile)).toBe(false);
    });
  });

  describe('localStorage operations', () => {
    it('should save and load bypass user', () => {
      const user = createBypassUser('test@example.com');
      saveBypassUser(user);

      const loaded = loadBypassUser();
      expect(loaded).not.toBeNull();
      expect(loaded?.email).toBe(user.email);
      expect(loaded?.id).toBe(user.id);
      expect(loaded?.isBypassUser).toBe(true);
    });

    it('should save and load bypass profile', () => {
      const profile = createBypassProfile('user-123', 'test@example.com');
      saveBypassProfile(profile);

      const loaded = loadBypassProfile('user-123');
      expect(loaded).not.toBeNull();
      expect(loaded?.email).toBe(profile.email);
      expect(loaded?.id).toBe(profile.id);
      expect(loaded?.isBypassProfile).toBe(true);
    });

    it('should find bypass user by email', () => {
      const user = createBypassUser('test@example.com');
      saveBypassUser(user);

      const found = findBypassUserByEmail('test@example.com');
      expect(found).not.toBeNull();
      expect(found?.email).toBe(user.email);
    });

    it('should find bypass user with case-insensitive email', () => {
      const user = createBypassUser('test@example.com');
      saveBypassUser(user);

      const found = findBypassUserByEmail('TEST@EXAMPLE.COM');
      expect(found).not.toBeNull();
      expect(found?.email).toBe(user.email);
    });

    it('should return null for non-existent email', () => {
      const user = createBypassUser('test@example.com');
      saveBypassUser(user);

      const found = findBypassUserByEmail('other@example.com');
      expect(found).toBeNull();
    });

    it('should clear bypass user', () => {
      const user = createBypassUser('test@example.com');
      saveBypassUser(user);

      clearBypassUser();
      const loaded = loadBypassUser();
      expect(loaded).toBeNull();
    });

    it('should clear bypass profile', () => {
      const profile = createBypassProfile('user-123', 'test@example.com');
      saveBypassProfile(profile);

      clearBypassProfile('user-123');
      const loaded = loadBypassProfile('user-123');
      expect(loaded).toBeNull();
    });

    it('should clear all bypass data', () => {
      const user = createBypassUser('test@example.com');
      const profile1 = createBypassProfile('user-1', 'test1@example.com');
      const profile2 = createBypassProfile('user-2', 'test2@example.com');

      saveBypassUser(user);
      saveBypassProfile(profile1);
      saveBypassProfile(profile2);

      clearAllBypassData();

      expect(loadBypassUser()).toBeNull();
      expect(loadBypassProfile('user-1')).toBeNull();
      expect(loadBypassProfile('user-2')).toBeNull();
    });
  });
});
