import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StatsSection from '../StatsSection';

vi.mock('@/integrations/supabase/client', () => {
  const from = () => {
    return {
      select: () => ({
        eq: () => ({
          not: () => Promise.resolve({ data: [], count: 0 }),
        }),
        not: () => Promise.resolve({ data: [] }),
      }),
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
