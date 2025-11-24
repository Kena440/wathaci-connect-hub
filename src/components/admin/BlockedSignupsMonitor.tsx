/**
 * Admin Monitoring Component for Blocked Signups
 * 
 * Provides a dashboard view for administrators to monitor and investigate
 * blocked signup attempts.
 */

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, RefreshCw, TrendingUp, Users, Shield } from 'lucide-react';

interface BlockedSignup {
  email: string;
  total_blocked_attempts: number;
  first_blocked_at: string;
  last_blocked_at: string;
  has_auth_user: boolean;
  has_profile: boolean;
  estimated_rate_limit_status?: string;
}

interface SignupMetrics {
  period_hours: number;
  total_signup_attempts: number;
  successful_signups: number;
  blocked_attempts: number;
  success_rate_percent: number;
  block_rate_percent: number;
}

interface Anomaly {
  anomaly_type: string;
  severity: string;
  details: any;
  recommendation: string;
}

export function BlockedSignupsMonitor() {
  const [recentBlocked, setRecentBlocked] = useState<BlockedSignup[]>([]);
  const [metrics, setMetrics] = useState<SignupMetrics | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load recent blocked signups
      const { data: blockedData, error: blockedError } = await supabaseClient
        .from('v_recent_blocked_signups')
        .select('*')
        .limit(20);

      if (blockedError) throw blockedError;
      setRecentBlocked(blockedData || []);

      // Load signup metrics
      const { data: metricsData, error: metricsError } = await supabaseClient.rpc(
        'get_signup_health_metrics',
        { p_hours: 24 }
      );

      if (metricsError) throw metricsError;
      setMetrics(metricsData?.[0] || null);

      // Load anomalies
      const { data: anomaliesData, error: anomaliesError } = await supabaseClient.rpc(
        'detect_blocking_anomalies',
        { p_hours: 1 }
      );

      if (anomaliesError) throw anomaliesError;
      setAnomalies(anomaliesData || []);

      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error loading blocked signup data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 5 minutes, but pause when page is hidden
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadData();
      }
    };
    
    const interval = setInterval(() => {
      // Only refresh if page is visible
      if (!document.hidden) {
        loadData();
      }
    }, 5 * 60 * 1000);
    
    // Also refresh when page becomes visible again
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'warning';
      case 'info':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'likely_expired':
        return 'default';
      case 'expiring_soon':
        return 'warning';
      case 'still_active':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Blocked Signup Monitor</h1>
          <p className="text-sm text-gray-600 mt-1">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <Button
          onClick={loadData}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.total_signup_attempts}</div>
              <p className="text-xs text-muted-foreground">Last 24 hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Successful</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.successful_signups}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.success_rate_percent}% success rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Blocked</CardTitle>
              <Shield className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.blocked_attempts}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.block_rate_percent}% block rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Health Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.success_rate_percent > 80 ? 'Good' : metrics.success_rate_percent > 50 ? 'Fair' : 'Poor'}
              </div>
              <p className="text-xs text-muted-foreground">
                Based on success rate
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Detected Anomalies</h2>
          {anomalies.map((anomaly, index) => (
            <Alert
              key={index}
              variant={
                anomaly.severity === 'critical' ? 'destructive' : 
                anomaly.severity === 'warning' ? 'default' : 
                'default'
              }
            >
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="flex items-center gap-2">
                {anomaly.anomaly_type.replace(/_/g, ' ').toUpperCase()}
                <Badge variant={getSeverityColor(anomaly.severity)}>
                  {anomaly.severity}
                </Badge>
              </AlertTitle>
              <AlertDescription>
                <p className="mb-2">{anomaly.recommendation}</p>
                {anomaly.details && (
                  <details className="text-xs">
                    <summary className="cursor-pointer">View Details</summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                      {JSON.stringify(anomaly.details, null, 2)}
                    </pre>
                  </details>
                )}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Recent Blocked Signups */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Blocked Signups (Last 24 Hours)</CardTitle>
          <CardDescription>
            Emails that have been blocked by rate limiting or abuse protection
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : recentBlocked.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No blocked signups in the last 24 hours
            </div>
          ) : (
            <div className="space-y-4">
              {recentBlocked.map((blocked, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{blocked.email}</span>
                      {blocked.has_auth_user && (
                        <Badge variant="default">Has Account</Badge>
                      )}
                      {blocked.estimated_rate_limit_status && (
                        <Badge variant={getStatusColor(blocked.estimated_rate_limit_status)}>
                          {blocked.estimated_rate_limit_status.replace(/_/g, ' ')}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-gray-600 space-y-1">
                      <div>
                        Attempts: <strong>{blocked.total_blocked_attempts}</strong>
                      </div>
                      <div>
                        First blocked:{' '}
                        {new Date(blocked.first_blocked_at).toLocaleString()}
                      </div>
                      <div>
                        Last blocked:{' '}
                        {new Date(blocked.last_blocked_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>What do these numbers mean?</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <ul>
            <li>
              <strong>Blocked signups</strong> are signup attempts that were rejected by
              Supabase's abuse protection due to rate limiting or suspicious patterns.
            </li>
            <li>
              <strong>Rate limits automatically expire</strong> after 1-2 hours. Users can
              retry after waiting.
            </li>
            <li>
              <strong>High block rates</strong> may indicate UX issues causing users to
              retry, or potential bot attacks.
            </li>
            <li>
              <strong>"Has Account" badge</strong> means the user eventually succeeded in
              signing up after being initially blocked.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

export default BlockedSignupsMonitor;
