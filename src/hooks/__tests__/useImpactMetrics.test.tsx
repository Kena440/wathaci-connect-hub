import { renderHook, act, waitFor } from '@testing-library/react';
import { useImpactMetrics } from '../useImpactMetrics';

const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock('@/config/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
}));

const MOCK_METRICS = {
  user_counts: {
    total_users: 100,
    professionals: 40,
    smes: 30,
    firms: 10,
    companies: 10,
    students: 5,
    others: 5,
  },
  activity_metrics: {
    projects_posted: 50,
    successful_matches: 20,
    messages_sent: 200,
    active_sessions: 15,
    support_queries_resolved: 10,
    signups_last_30_days: 25,
    returning_users: 60,
    platform_revenue: 50000,
  },
};

describe('useImpactMetrics', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    const { result } = renderHook(() => useImpactMetrics());

    expect(result.current.status.loading).toBe(true);
    expect(result.current.status.error).toBeNull();
    expect(result.current.status.hasData).toBe(false);
  });

  it('fetches and returns metrics successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_METRICS,
    });

    const { result } = renderHook(() => useImpactMetrics());

    await waitFor(() => {
      expect(result.current.status.loading).toBe(false);
    });

    expect(result.current.metrics.user_counts.total_users).toBe(100);
    expect(result.current.metrics.activity_metrics.projects_posted).toBe(50);
    expect(result.current.status.hasData).toBe(true);
    expect(result.current.status.error).toBeNull();
  });

  it('handles non-2xx response with error payload', async () => {
    const errorPayload = {
      error: 'Database connection failed',
      user_counts: {
        total_users: 10,
        professionals: 5,
        smes: 3,
        firms: 1,
        companies: 1,
        students: 0,
        others: 0,
      },
      activity_metrics: {
        projects_posted: 5,
        successful_matches: 2,
        messages_sent: 10,
        active_sessions: 1,
        support_queries_resolved: 0,
        signups_last_30_days: 3,
        returning_users: 5,
        platform_revenue: 1000,
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
      json: async () => errorPayload,
    });

    const { result } = renderHook(() => useImpactMetrics());

    await waitFor(() => {
      expect(result.current.status.loading).toBe(false);
    });

    expect(result.current.status.error).toBe('Database connection failed');
    expect(result.current.metrics.user_counts.total_users).toBe(10);
  });

  it('handles non-2xx response with invalid JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Gateway',
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });

    const { result } = renderHook(() => useImpactMetrics());

    await waitFor(() => {
      expect(result.current.status.loading).toBe(false);
    });

    expect(result.current.status.error).toBe('Failed to load metrics: Bad Gateway');
    expect(result.current.metrics.user_counts.total_users).toBe(0);
  });

  it('handles network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useImpactMetrics());

    await waitFor(() => {
      expect(result.current.status.loading).toBe(false);
    });

    expect(result.current.status.error).toBe('Network error');
  });

  it('reload function fetches metrics again', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_METRICS,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...MOCK_METRICS,
          user_counts: { ...MOCK_METRICS.user_counts, total_users: 200 },
        }),
      });

    const { result } = renderHook(() => useImpactMetrics());

    await waitFor(() => {
      expect(result.current.status.loading).toBe(false);
    });

    expect(result.current.metrics.user_counts.total_users).toBe(100);

    await act(async () => {
      result.current.reload();
    });

    await waitFor(() => {
      expect(result.current.status.loading).toBe(false);
    });

    expect(result.current.metrics.user_counts.total_users).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('hasData is true when total_users > 0', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user_counts: { ...MOCK_METRICS.user_counts, total_users: 1 },
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
      }),
    });

    const { result } = renderHook(() => useImpactMetrics());

    await waitFor(() => {
      expect(result.current.status.loading).toBe(false);
    });

    expect(result.current.status.hasData).toBe(true);
  });

  it('hasData is true when any activity metric > 0', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
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
      }),
    });

    const { result } = renderHook(() => useImpactMetrics());

    await waitFor(() => {
      expect(result.current.status.loading).toBe(false);
    });

    expect(result.current.status.hasData).toBe(true);
  });

  it('hasData is false when all metrics are 0', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
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
      }),
    });

    const { result } = renderHook(() => useImpactMetrics());

    await waitFor(() => {
      expect(result.current.status.loading).toBe(false);
    });

    expect(result.current.status.hasData).toBe(false);
  });
});
