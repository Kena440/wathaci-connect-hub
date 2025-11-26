import { renderHook, act, waitFor } from '@testing-library/react';
import { useImpactMetrics } from '../useImpactMetrics';

jest.mock('@/config/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
}));

const mockMetrics = {
  user_counts: {
    total_users: 1000,
    professionals: 300,
    smes: 200,
    firms: 50,
    companies: 30,
    students: 100,
    others: 320,
  },
  activity_metrics: {
    projects_posted: 50,
    successful_matches: 25,
    messages_sent: 500,
    active_sessions: 100,
    support_queries_resolved: 20,
    signups_last_30_days: 150,
    returning_users: 200,
    platform_revenue: 50000,
  },
};

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('useImpactMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns default metrics while loading', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useImpactMetrics());

    expect(result.current.status.loading).toBe(true);
    expect(result.current.metrics.user_counts.total_users).toBe(0);
    expect(result.current.metrics.activity_metrics.projects_posted).toBe(0);
  });

  it('fetches and returns metrics on mount', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetrics,
    });

    const { result } = renderHook(() => useImpactMetrics());

    await waitFor(() => {
      expect(result.current.status.loading).toBe(false);
    });

    expect(result.current.metrics.user_counts.total_users).toBe(1000);
    expect(result.current.metrics.activity_metrics.projects_posted).toBe(50);
    expect(result.current.status.hasData).toBe(true);
    expect(result.current.status.error).toBeNull();
  });

  it('handles fetch error with generic message', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useImpactMetrics());

    await waitFor(() => {
      expect(result.current.status.loading).toBe(false);
    });

    expect(result.current.status.error).toBe('Network error');
  });

  it('handles non-ok response and extracts error from payload', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
      json: async () => ({
        error: 'Database unavailable',
        user_counts: mockMetrics.user_counts,
        activity_metrics: mockMetrics.activity_metrics,
      }),
    });

    const { result } = renderHook(() => useImpactMetrics());

    await waitFor(() => {
      expect(result.current.status.loading).toBe(false);
    });

    expect(result.current.status.error).toBe('Database unavailable');
    expect(result.current.metrics.user_counts.total_users).toBe(1000);
  });

  it('handles non-ok response with non-parseable body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });

    const { result } = renderHook(() => useImpactMetrics());

    await waitFor(() => {
      expect(result.current.status.loading).toBe(false);
    });

    expect(result.current.status.error).toBe('Failed to load metrics: Internal Server Error');
    expect(result.current.metrics.user_counts.total_users).toBe(0);
  });

  it('reload function triggers a new fetch', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetrics,
    });

    const { result } = renderHook(() => useImpactMetrics());

    await waitFor(() => {
      expect(result.current.status.loading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);

    const updatedMetrics = {
      ...mockMetrics,
      user_counts: { ...mockMetrics.user_counts, total_users: 1100 },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => updatedMetrics,
    });

    act(() => {
      result.current.reload();
    });

    await waitFor(() => {
      expect(result.current.status.loading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.current.metrics.user_counts.total_users).toBe(1100);
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

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => emptyMetrics,
    });

    const { result } = renderHook(() => useImpactMetrics());

    await waitFor(() => {
      expect(result.current.status.loading).toBe(false);
    });

    expect(result.current.status.hasData).toBe(false);
  });
});
