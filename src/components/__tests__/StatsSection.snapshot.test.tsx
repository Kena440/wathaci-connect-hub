import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StatsSection from '../StatsSection';

vi.mock('@/lib/supabase-enhanced', () => {
  const from = (table: string) => {
    if (table === 'business_stats') {
      return {
        select: () => ({
          eq: () => ({
            order: async () => ({ data: [], error: null }),
          }),
        }),
      };
    }
    if (table === 'freelancers') {
      return {
        select: () => Promise.resolve({ count: 0 }),
      };
    }
    if (table === 'profiles') {
      return {
        select: () => ({
          eq: () => Promise.resolve({ count: 0 }),
        }),
      };
    }
    return {
      select: () => Promise.resolve({ data: [], error: null }),
    };
  };
  return { supabase: { from } };
});

describe('StatsSection', () => {
  it('matches snapshot', () => {
    const { container } = render(<StatsSection />);
    expect(container).toMatchSnapshot();
  });
});
