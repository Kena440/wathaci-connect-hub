import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import StatsSection from '../StatsSection';

jest.mock('@/hooks/useImpactMetrics', () => ({
  useImpactMetrics: () => ({
    metrics: {
      user_counts: {
        total_users: 823,
        professionals: 312,
        smes: 278,
        firms: 114,
        companies: 79,
        students: 32,
        others: 8,
      },
      activity_metrics: {
        projects_posted: 148,
        successful_matches: 67,
        messages_sent: 12403,
        active_sessions: 534,
        support_queries_resolved: 12,
        signups_last_30_days: 119,
        returning_users: 87,
        platform_revenue: 2850,
      },
    },
    status: { loading: false, error: null, hasData: true },
    reload: jest.fn(),
  }),
}));

describe('StatsSection', () => {
  it('matches snapshot', () => {
    const { container } = render(
      <BrowserRouter>
        <StatsSection />
      </BrowserRouter>
    );
    expect(container).toMatchSnapshot();
  });
});
