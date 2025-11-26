import { renderHook, waitFor, act } from '@testing-library/react';
import { useImpactMetrics } from '../useImpactMetrics';

jest.mock('@/config/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

const MOCK_METRICS = {
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

describe('useImpactMetrics', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns initial loading state', () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // Never resolves
    const { result } = renderHook(() => useImpactMetrics());

    expect(result.current.status.loading).toBe(true);
    expect(result.current.status.error).toBeNull();
    expect(result.current.status.hasData).toBe(false);
  });

  it('successfully fetches and returns metrics', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_METRICS),
    });

    const { result } = renderHook(() => useImpactMetrics());

    await waitFor(() => {
      expect(result.current.status.loading).toBe(false);
    });

    expect(result.current.status.error).toBeNull();
    expect(result.current.status.hasData).toBe(true);
    expect(result.current.metrics.user_counts.total_users).toBe(823);
    expect(result.current.metrics.activity_metrics.projects_posted).toBe(148);
  });

  it('handles non-2xx response with error payload', async () => {
    const errorPayload = {
      error: 'Database unavailable',
      user_counts: MOCK_METRICS.user_counts,
      activity_metrics: MOCK_METRICS.activity_metrics,
    };

    mockFetch.mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve(errorPayload),
    });

    const { result } = renderHook(() => useImpactMetrics());

    await waitFor(() => {
      expect(result.current.status.loading).toBe(false);
    });

    expect(result.current.status.error).toBe('Database unavailable');
    expect(result.current.metrics.user_counts.total_users).toBe(823);
  });

  it('handles non-2xx response without JSON body', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      statusText: 'Service Unavailable',
      json: () => Promise.reject(new Error('Invalid JSON')),
    });

    const { result } = renderHook(() => useImpactMetrics());

    await waitFor(() => {
      expect(result.current.status.loading).toBe(false);
    });

    expect(result.current.status.error).toBe('Failed to load metrics: Service Unavailable');
    expect(result.current.metrics.user_counts.total_users).toBe(0);
  });

  it('handles network failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));

    const { result } = renderHook(() => useImpactMetrics());

    await waitFor(() => {
      expect(result.current.status.loading).toBe(false);
    });

    expect(result.current.status.error).toBe('Network failure');
    expect(result.current.metrics.user_counts.total_users).toBe(0);
  });

  it('reload function fetches fresh metrics', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_METRICS),
    });

    const { result } = renderHook(() => useImpactMetrics());

    await waitFor(() => {
      expect(result.current.status.loading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Call reload
    await act(async () => {
      await result.current.reload();
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('hasData is false when all metrics are zero', async () => {
    const emptyMetrics = {
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

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(emptyMetrics),
    });

    const { result } = renderHook(() => useImpactMetrics());

    await waitFor(() => {
      expect(result.current.status.loading).toBe(false);
    });

    expect(result.current.status.hasData).toBe(false);
  });

  it('hasData is true when only activity metrics have data', async () => {
    const partialMetrics = {
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
        projects_posted: 1,
        successful_matches: 0,
        messages_sent: 0,
        active_sessions: 0,
        support_queries_resolved: 0,
        signups_last_30_days: 0,
        returning_users: 0,
        platform_revenue: 0,
      },
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(partialMetrics),
    });

    const { result } = renderHook(() => useImpactMetrics());

    await waitFor(() => {
      expect(result.current.status.loading).toBe(false);
    });

    expect(result.current.status.hasData).toBe(true);
  });
});
