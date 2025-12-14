import { render, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import StatsSection from '../StatsSection';

jest.mock('@/lib/supabase-enhanced', () => {
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
  it('matches snapshot', async () => {
    const { container } = render(
      <BrowserRouter>
        <StatsSection />
      </BrowserRouter>
    );
    await waitFor(() => expect(container).toMatchSnapshot());
  });
});
