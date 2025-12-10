import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { AccessGate } from '../AccessGate';

jest.mock('@/lib/supabase-enhanced', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

import { supabase } from '@/lib/supabase-enhanced';
const mockGetUser = supabase.auth.getUser as jest.Mock;
const mockFrom = supabase.from as jest.Mock;

describe('AccessGate', () => {
  const renderGate = () =>
    render(
      <MemoryRouter>
        <AccessGate feature="Test Feature">
          <div>Protected Content</div>
        </AccessGate>
      </MemoryRouter>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user1' } } });
  });

  it('renders children when user has active subscription', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { id: 'sub1' } }),
        } as any;
      }
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null }),
        } as any;
      }
      return {} as any;
    });

    renderGate();

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeTruthy();
    });

    expect(screen.queryByText(/subscribe now/i)).toBeNull();
  });

  it('renders children during active trial', async () => {
    const recent = new Date().toISOString();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null }),
        } as any;
      }
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { created_at: recent } }),
        } as any;
      }
      return {} as any;
    });

    renderGate();

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeTruthy();
    });

    expect(screen.queryByText(/subscribe now/i)).toBeNull();
  });

  it('prompts subscription when no access', async () => {
    const old = new Date();
    old.setDate(old.getDate() - 15);
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null }),
        } as any;
      }
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { created_at: old.toISOString() } }),
        } as any;
      }
      return {} as any;
    });

    renderGate();

    await waitFor(() => {
      expect(screen.getByText(/premium feature/i)).toBeTruthy();
    });

    expect(screen.getByText(/subscribe now/i)).toBeTruthy();
    expect(screen.getByText('Protected Content')).toBeTruthy();
  });
});

