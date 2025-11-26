import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '@/config/api';

export interface UserCounts {
  total_users: number;
  professionals: number;
  smes: number;
  firms: number;
  companies: number;
  students: number;
  others: number;
}

export interface ActivityMetrics {
  projects_posted: number;
  successful_matches: number;
  messages_sent: number;
  active_sessions: number;
  support_queries_resolved: number;
  signups_last_30_days: number;
  returning_users: number;
}

export interface ImpactMetricsResponse {
  user_counts: UserCounts;
  activity_metrics: ActivityMetrics;
  error?: string;
}

const DEFAULT_METRICS: ImpactMetricsResponse = {
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
  },
};

export const useImpactMetrics = () => {
  const [metrics, setMetrics] = useState<ImpactMetricsResponse>(DEFAULT_METRICS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/metrics/impact-growth`);
      if (!response.ok) {
        let errorMessage = `Failed to load metrics: ${response.statusText}`;
        let fallbackMetrics = {};
        try {
          const errorPayload = await response.json();
          if (errorPayload && typeof errorPayload === 'object') {
            if (errorPayload.error) {
              errorMessage = errorPayload.error;
            }
            fallbackMetrics = {
              user_counts: errorPayload.user_counts ?? DEFAULT_METRICS.user_counts,
              activity_metrics: errorPayload.activity_metrics ?? DEFAULT_METRICS.activity_metrics,
            };
          }
        } catch (e) {
          // Ignore JSON parse errors, use default error message and metrics
          fallbackMetrics = {
            user_counts: DEFAULT_METRICS.user_counts,
            activity_metrics: DEFAULT_METRICS.activity_metrics,
          };
        }
        setMetrics({ ...DEFAULT_METRICS, ...fallbackMetrics });
        setError(errorMessage);
        return;
      }

      const payload = (await response.json()) as ImpactMetricsResponse;
      setMetrics({ ...DEFAULT_METRICS, ...payload });
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load metrics';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const status = useMemo(
    () => ({
      loading,
      error,
      hasData:
        metrics.user_counts.total_users > 0 ||
        Object.values(metrics.activity_metrics).some((value) => value > 0),
    }),
    [loading, error, metrics],
  );

  return {
    metrics,
    status,
    reload: loadMetrics,
  };
};

export default useImpactMetrics;
