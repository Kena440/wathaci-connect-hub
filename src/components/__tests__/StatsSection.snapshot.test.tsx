import { render, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ImpactGrowthSection from '../ImpactGrowthSection';

const sampleMetrics = [
  { id: '1', label: 'SMEs Supported', value: 125, suffix: 'orgs', is_public: true, sort_order: 1 },
  { id: '2', label: 'Professionals', value: 240, suffix: 'people', is_public: true, sort_order: 2 },
  { id: '3', label: 'Investors', value: 35, suffix: null, is_public: true, sort_order: 3 },
];

jest.mock('@/lib/supabaseClient', () => {
  const order = async () => ({ data: sampleMetrics, error: null });
  const eq = () => ({ order });
  const select = () => ({ eq });
  const from = (table: string) => {
    if (table === 'impact_metrics') {
      return { select };
    }
    return { select: () => ({}) };
  };

  return {
    supabase: { from },
    supabaseConfigStatus: {
      hasValidConfig: true,
      resolvedUrl: 'http://example.test',
      resolvedAnonKey: 'anon-key',
    },
  };
});

describe('ImpactGrowthSection', () => {
  it('matches snapshot', async () => {
    const { container, findByText } = render(
      <BrowserRouter>
        <ImpactGrowthSection />
      </BrowserRouter>,
    );
    await findByText('SMEs Supported');
    await waitFor(() => expect(container).toMatchSnapshot());
  });
});
