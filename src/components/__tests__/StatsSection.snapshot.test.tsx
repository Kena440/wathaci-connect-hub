import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import StatsSection from '../StatsSection';

// Mock data for successful state
const mockMetricsData = {
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
};

// Mock data for empty state
const emptyMetricsData = {
  user_counts: {
    total_users: 0,
    professionals: 0,
    smes: 0,
    firms: 0,
    companies: 0,
    students: 0,
    others: 0,
  },
  activity_metrics: {
    projects_posted: 0,
    successful_matches: 0,
    messages_sent: 0,
    active_sessions: 0,
    support_queries_resolved: 0,
    signups_last_30_days: 0,
    returning_users: 0,
    platform_revenue: 0,
  },
};

// Create a mock function that can be changed per test
const mockReload = jest.fn();
let mockUseImpactMetrics = jest.fn();

jest.mock('@/hooks/useImpactMetrics', () => ({
  useImpactMetrics: () => mockUseImpactMetrics(),
}));

describe('StatsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('with successful data', () => {
    beforeEach(() => {
      mockUseImpactMetrics.mockReturnValue({
        metrics: mockMetricsData,
        status: { loading: false, error: null, hasData: true },
        reload: mockReload,
      });
    });

    it('matches snapshot', () => {
      const { container } = render(
        <BrowserRouter>
          <StatsSection />
        </BrowserRouter>
      );
      expect(container).toMatchSnapshot();
    });

    it('displays user growth statistics', () => {
      render(
        <BrowserRouter>
          <StatsSection />
        </BrowserRouter>
      );
      expect(screen.getByText('User Growth')).toBeInTheDocument();
      expect(screen.getByText('Total Registered Users')).toBeInTheDocument();
      expect(screen.getByText('Professionals')).toBeInTheDocument();
      expect(screen.getByText('SMEs')).toBeInTheDocument();
    });

    it('displays platform activity section', () => {
      render(
        <BrowserRouter>
          <StatsSection />
        </BrowserRouter>
      );
      expect(screen.getByText('Platform Activity')).toBeInTheDocument();
      expect(screen.getByText('Projects Posted')).toBeInTheDocument();
      expect(screen.getByText('Successful Matches')).toBeInTheDocument();
    });

    it('calls reload when refresh button is clicked', () => {
      render(
        <BrowserRouter>
          <StatsSection />
        </BrowserRouter>
      );
      const refreshButton = screen.getByRole('button', { name: /refresh metrics/i });
      fireEvent.click(refreshButton);
      expect(mockReload).toHaveBeenCalledTimes(1);
    });
  });

  describe('loading state', () => {
    beforeEach(() => {
      mockUseImpactMetrics.mockReturnValue({
        metrics: emptyMetricsData,
        status: { loading: true, error: null, hasData: false },
        reload: mockReload,
      });
    });

    it('matches snapshot during loading', () => {
      const { container } = render(
        <BrowserRouter>
          <StatsSection />
        </BrowserRouter>
      );
      expect(container).toMatchSnapshot();
    });

    it('shows loading indicator on refresh button', () => {
      render(
        <BrowserRouter>
          <StatsSection />
        </BrowserRouter>
      );
      const refreshButton = screen.getByRole('button', { name: /refresh metrics/i });
      // The button should have the animate-spin class on the icon when loading
      const icon = refreshButton.querySelector('svg');
      expect(icon).toHaveClass('animate-spin');
    });
  });

  describe('error state', () => {
    beforeEach(() => {
      mockUseImpactMetrics.mockReturnValue({
        metrics: emptyMetricsData,
        status: { loading: false, error: 'Failed to load metrics', hasData: false },
        reload: mockReload,
      });
    });

    it('matches snapshot with error', () => {
      const { container } = render(
        <BrowserRouter>
          <StatsSection />
        </BrowserRouter>
      );
      expect(container).toMatchSnapshot();
    });

    it('displays error message', () => {
      render(
        <BrowserRouter>
          <StatsSection />
        </BrowserRouter>
      );
      expect(
        screen.getByText(/we could not load the latest metrics automatically/i)
      ).toBeInTheDocument();
    });

    it('allows retrying with refresh button', () => {
      render(
        <BrowserRouter>
          <StatsSection />
        </BrowserRouter>
      );
      const refreshButton = screen.getByRole('button', { name: /refresh metrics/i });
      fireEvent.click(refreshButton);
      expect(mockReload).toHaveBeenCalledTimes(1);
    });
  });

  describe('empty data state', () => {
    beforeEach(() => {
      mockUseImpactMetrics.mockReturnValue({
        metrics: emptyMetricsData,
        status: { loading: false, error: null, hasData: false },
        reload: mockReload,
      });
    });

    it('matches snapshot with empty data', () => {
      const { container } = render(
        <BrowserRouter>
          <StatsSection />
        </BrowserRouter>
      );
      expect(container).toMatchSnapshot();
    });

    it('renders with zero values', () => {
      render(
        <BrowserRouter>
          <StatsSection />
        </BrowserRouter>
      );
      // Should still show the section even with zero values
      expect(screen.getByText('User Growth')).toBeInTheDocument();
      expect(screen.getByText('Platform Activity')).toBeInTheDocument();
      // Zero values are displayed as "0"
      const zeroElements = screen.getAllByText('0');
      expect(zeroElements.length).toBeGreaterThan(0);
    });
  });
});
