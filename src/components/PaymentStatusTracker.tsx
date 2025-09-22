/**
 * Payment Status Tracker Component
 * Real-time payment status tracking with visual feedback
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  CreditCard,
  Smartphone,
  Eye,
  EyeOff
} from 'lucide-react';
import { usePaymentStatus } from '@/hooks/use-payment-status';
import { formatAmount } from '@/lib/payment-config';

interface PaymentStatusTrackerProps {
  reference: string;
  onComplete?: (status: any) => void;
  onFailed?: (status: any) => void;
  showDetails?: boolean;
  autoHide?: boolean;
  maxTrackingTime?: number; // in milliseconds
}

export const PaymentStatusTracker = ({
  reference,
  onComplete,
  onFailed,
  showDetails = true,
  autoHide = false,
  maxTrackingTime = 300000 // 5 minutes default
}: PaymentStatusTrackerProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [showDetailedView, setShowDetailedView] = useState(showDetails);
  const [localTrackingStartTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  const {
    paymentStatus,
    loading,
    error,
    startTracking,
    stopTracking,
    refresh,
    trackingStartTime,
    pollingStartTime,
    lastUpdated,
    isTracking
  } = usePaymentStatus(true, (status) => {
    if (status.status === 'completed' && onComplete) {
      onComplete(status);
    } else if (['failed', 'cancelled'].includes(status.status) && onFailed) {
      onFailed(status);
    }
  });

  // Update elapsed time
  useEffect(() => {
    // Use the tracking start time from hook if available, otherwise use local
    const startTime = trackingStartTime || localTrackingStartTime;
    
    if (!startTime) {
      setElapsedTime(0);
      return;
    }

    // Set immediately so UI updates without waiting for interval tick
    setElapsedTime(Date.now() - startTime);

    if (!isTracking) {
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [isTracking, trackingStartTime, localTrackingStartTime]);

  // Auto-hide after completion
  useEffect(() => {
    if (autoHide && paymentStatus && ['completed', 'failed', 'cancelled'].includes(paymentStatus.status)) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [autoHide, paymentStatus]);

  // Start tracking when component mounts
  useEffect(() => {
    if (reference) {
      startTracking(reference);
    }

    return () => {
      stopTracking();
    };
  }, [reference, startTracking, stopTracking]);

  // Stop tracking after max time
  useEffect(() => {
    if (!isTracking) {
      return;
    }

    if (maxTrackingTime && elapsedTime > maxTrackingTime) {
      stopTracking();
    }
  }, [elapsedTime, isTracking, maxTrackingTime, stopTracking]);

  const getStatusIcon = () => {
    if (loading) {
      return <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />;
    }

    switch (paymentStatus?.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-gray-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    const status = paymentStatus?.status || 'unknown';
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: 'default',
      pending: 'secondary',
      failed: 'destructive',
      cancelled: 'outline'
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getProgressValue = () => {
    switch (paymentStatus?.status) {
      case 'pending':
        return 50;
      case 'completed':
        return 100;
      case 'failed':
      case 'cancelled':
        return 0;
      default:
        return 0;
    }
  };

  const getPaymentMethodIcon = () => {
    if (!paymentStatus) return null;
    
    // This would typically come from payment metadata
    const isCard = paymentStatus.gateway_response?.includes('card') || 
                   paymentStatus.transaction_id?.includes('card');
    
    return isCard ? (
      <CreditCard className="h-4 w-4" />
    ) : (
      <Smartphone className="h-4 w-4" />
    );
  };

  const formatElapsedTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {getStatusIcon()}
            Payment Status
          </CardTitle>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetailedView(!showDetailedView)}
            >
              {showDetailedView ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{formatElapsedTime(elapsedTime)}</span>
          </div>
          <Progress value={getProgressValue()} className="h-2" />
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Payment Info */}
        {paymentStatus && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Amount:</span>
                <div className="font-medium">
                  {formatAmount(paymentStatus.amount, paymentStatus.currency)}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Reference:</span>
                <div className="font-mono text-xs">
                  {paymentStatus.reference.slice(-8)}...
                </div>
              </div>
            </div>

            {showDetailedView && (
              <div className="space-y-2 text-sm border-t pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Payment Method:</span>
                  <div className="flex items-center gap-1">
                    {getPaymentMethodIcon()}
                    <span>
                      {paymentStatus.gateway_response?.includes('card') ? 'Card' : 'Mobile Money'}
                    </span>
                  </div>
                </div>
                
                {paymentStatus.transaction_id && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Transaction ID:</span>
                    <span className="font-mono text-xs">
                      {paymentStatus.transaction_id}
                    </span>
                  </div>
                )}
                
                {paymentStatus.paid_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Paid At:</span>
                    <span>{new Date(paymentStatus.paid_at).toLocaleString()}</span>
                  </div>
                )}
                
                {paymentStatus.gateway_response && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Gateway:</span>
                    <span>{paymentStatus.gateway_response}</span>
                  </div>
                )}

                {(trackingStartTime || pollingStartTime || lastUpdated) && (
                  <div className="space-y-1 text-xs text-gray-500">
                    {trackingStartTime && (
                      <div className="flex justify-between">
                        <span>Tracking started:</span>
                        <span>{new Date(trackingStartTime).toLocaleTimeString()}</span>
                      </div>
                    )}
                    {pollingStartTime && (
                      <div className="flex justify-between">
                        <span>Polling since:</span>
                        <span>{new Date(pollingStartTime).toLocaleTimeString()}</span>
                      </div>
                    )}
                    {lastUpdated && (
                      <div className="flex justify-between">
                        <span>Last updated:</span>
                        <span>{new Date(lastUpdated).toLocaleTimeString()}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Status Messages */}
        {paymentStatus?.status === 'pending' && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Your payment is being processed. Please wait...
            </AlertDescription>
          </Alert>
        )}

        {paymentStatus?.status === 'completed' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              Payment completed successfully!
            </AlertDescription>
          </Alert>
        )}

        {['failed', 'cancelled'].includes(paymentStatus?.status || '') && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Payment {paymentStatus?.status}. 
              {paymentStatus?.status === 'failed' && ' Please try again or contact support.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        {paymentStatus && ['failed', 'cancelled'].includes(paymentStatus.status) && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        )}

        {/* Timeout Warning */}
        {elapsedTime > maxTrackingTime * 0.8 && paymentStatus?.status === 'pending' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Payment tracking will timeout soon. Please contact support if your payment was deducted.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentStatusTracker;