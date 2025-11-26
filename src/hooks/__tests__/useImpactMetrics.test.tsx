import { renderHook, act, waitFor } from '@testing-library/react';
import { useImpactMetrics } from '../useImpactMetrics';

// Mock the API config to avoid import.meta issues
jest.mock('@/config/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
}));

const mockMetrics = {
  user_counts: {
    total_users: 100,
    professionals: 40,
    smes: 30,
    firms: 10,
    companies: 5,
    students: 10,
    others: 5,
  },
  activity_metrics: {
    projects_posted: 50,
    successful_matches: 25,
    messages_sent: 200,
    active_sessions: 15,
    support_queries_resolved: 10,
    signups_last_30_days: 20,
    returning_users: 60,
    platform_revenue: 50000,
  },
};

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('useImpactMetrics', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns default metrics initially with loading state', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetrics,
    });

    const { result } = renderHook(() => useImpactMetrics());

    expect(result.current.status.loading).toBe(true);
    expect(result.current.metrics.user_counts.total_users).toBe(0);
  });

  it('fetches and sets metrics on mount', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetrics,
    });

    const { result } = renderHook(() => useImpactMetrics());

    await waitFor(() => {
      expect(result.current.status.loading).toBe(false);
    });

    expect(result.current.metrics.user_counts.total_users).toBe(100);
    expect(result.current.metrics.activity_metrics.successful_matches).toBe(25);
    expect(result.current.status.hasData).toBe(true);
    expect(result.current.status.error).toBeNull();
  });

  it('handles non-2xx response and sets error', async () => {
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
    expect(result.current.metrics.user_counts.total_users).toBe(100);
  });

  it('handles non-2xx response with no JSON body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Gateway',
      json: async () => {
        throw new Error('No JSON');
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

  it('reload fetches metrics again', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetrics,
    });

    const { result } = renderHook(() => useImpactMetrics());

    await waitFor(() => {
      expect(result.current.status.loading).toBe(false);
    });

    const updatedMetrics = {
      ...mockMetrics,
      user_counts: { ...mockMetrics.user_counts, total_users: 150 },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => updatedMetrics,
    });

    await act(async () => {
      result.current.reload();
    });

    await waitFor(() => {
      expect(result.current.status.loading).toBe(false);
    });

    expect(result.current.metrics.user_counts.total_users).toBe(150);
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
