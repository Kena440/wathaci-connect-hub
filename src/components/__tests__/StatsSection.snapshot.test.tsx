import { render, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import StatsSection from '../StatsSection';

jest.mock('@/lib/supabase-enhanced', () => {
  const sampleStats = [
    { metric_key: 'total_funding_zmw', label: 'Total Funding Processed', value: 78000, unit: 'ZMW' },
    { metric_key: 'smes_supported', label: 'SMEs Supported', value: 125, unit: 'organizations' },
    { metric_key: 'professionals', label: 'Business Professionals', value: 240, unit: 'people' },
    { metric_key: 'freelancers_active', label: 'Independent Freelancers', value: 310, unit: 'people' }
  ];
  const from = (table: string) => {
    if (table === 'business_stats') {
      return {
        select: () => ({
          eq: () => ({
            order: async () => ({ data: sampleStats, error: null }),
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
    const { container, findByText } = render(
      <BrowserRouter>
        <StatsSection />
      </BrowserRouter>
    );
    await findByText('SMEs Supported');
    await waitFor(() => expect(container).toMatchSnapshot());
  });
});
