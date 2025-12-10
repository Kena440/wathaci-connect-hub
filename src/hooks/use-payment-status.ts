/**
 * Real-time Payment Status Hook
 * React hook for tracking payment status in real-time
 */

import { useState, useEffect, useCallback } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { withSupportContact } from '@/lib/supportEmail';

export interface PaymentStatus {
  reference: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  transaction_id?: string;
  gateway_response?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentStatusHookReturn {
  paymentStatus: PaymentStatus | null;
  loading: boolean;
  error: string | null;
  startTracking: (reference: string) => void;
  stopTracking: () => void;
  refresh: () => Promise<void>;
  trackingStartTime: number | null;
  pollingStartTime: number | null;
  lastUpdated: number | null;
  isTracking: boolean;
}

export const usePaymentStatus = (
  autoToast: boolean = true,
  onStatusChange?: (status: PaymentStatus) => void
): PaymentStatusHookReturn => {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentReference, setCurrentReference] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [realtimeChannel, setRealtimeChannel] = useState<any>(null);
  const [trackingStartTime, setTrackingStartTime] = useState<number | null>(null);
  const [pollingStartTime, setPollingStartTime] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchPaymentStatus = useCallback(async (reference: string): Promise<PaymentStatus | null> => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('reference', reference)
        .single();

      if (error) {
        console.error('Error fetching payment status:', error);
        return null;
      }

      return data as PaymentStatus;
    } catch (error) {
      console.error('Error in fetchPaymentStatus:', error);
      return null;
    }
  }, []);

  const updateStatus = useCallback((newStatus: PaymentStatus) => {
    const previousStatus = paymentStatus?.status;
    setPaymentStatus(newStatus);
    setLastUpdated(Date.now());

    if (onStatusChange) {
      onStatusChange(newStatus);
    }

    if (['completed', 'failed', 'cancelled'].includes(newStatus.status)) {
      stopTracking();
    }

    // Show toast notifications for status changes
    if (autoToast && previousStatus && previousStatus !== newStatus.status) {
      const amount = `K${newStatus.amount.toFixed(2)}`;
      
      switch (newStatus.status) {
        case 'completed':
          toast({
            title: "Payment Successful",
            description: `Your payment of ${amount} was processed successfully.`,
          });
          break;
        case 'failed':
          toast({
            title: "Payment Failed",
            description: withSupportContact(
              `Your payment of ${amount} failed. Please try again`
            ),
            variant: "destructive",
          });
          break;
        case 'cancelled':
          toast({
            title: "Payment Cancelled",
            description: `Your payment of ${amount} was cancelled.`,
            variant: "destructive",
          });
          break;
        case 'pending':
          toast({
            title: "Payment Processing",
            description: `Your payment of ${amount} is being processed.`,
          });
          break;
      }
    }
  }, [autoToast, onStatusChange, paymentStatus, stopTracking, toast]);

  const stopTracking = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }

    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      setRealtimeChannel(null);
    }

    setCurrentReference(null);
    setLoading(false);
    setPollingStartTime(null);
  }, [pollingInterval, realtimeChannel]);

  const setupRealtimeSubscription = useCallback((reference: string) => {
    const channel = supabase
      .channel(`payment:${reference}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
          filter: `reference=eq.${reference}`
        },
        (payload) => {
          console.log('Real-time payment update:', payload);
          const updatedPayment = payload.new as PaymentStatus;
          updateStatus(updatedPayment);
          
          // Stop tracking if payment is complete or failed
          if (['completed', 'failed', 'cancelled'].includes(updatedPayment.status)) {
            stopTracking();
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    setRealtimeChannel(channel);
  }, [updateStatus, stopTracking]);

  const startPolling = useCallback((reference: string) => {
    setPollingStartTime(Date.now());
    const interval = setInterval(async () => {
      const status = await fetchPaymentStatus(reference);
      if (status) {
        updateStatus(status);

        // Stop polling if payment is complete or failed
        if (['completed', 'failed', 'cancelled'].includes(status.status)) {
          stopTracking();
        }
      }
    }, 5000); // Poll every 5 seconds

    setPollingInterval(interval);
  }, [fetchPaymentStatus, updateStatus, stopTracking]);

  const startTracking = useCallback((reference: string) => {
    if (currentReference === reference) {
      return; // Already tracking this payment
    }

    // Stop any existing tracking
    stopTracking();

    setTrackingStartTime(Date.now());
    setCurrentReference(reference);
    setLoading(true);
    setError(null);

    // Initial fetch
    fetchPaymentStatus(reference).then((status) => {
      if (status) {
        updateStatus(status);
        
        // Only start real-time tracking if payment is still pending
        if (status.status === 'pending') {
          setupRealtimeSubscription(reference);
          startPolling(reference);
        }
      } else {
        setError(withSupportContact('Payment not found'));
      }
      setLoading(false);
    }).catch((err) => {
      setError(withSupportContact(err.message || 'Failed to fetch payment status'));
      setLoading(false);
    });
  }, [currentReference, fetchPaymentStatus, setupRealtimeSubscription, startPolling, stopTracking, updateStatus]);

  const refresh = useCallback(async () => {
    if (!currentReference) return;

    setLoading(true);
    try {
      const status = await fetchPaymentStatus(currentReference);
      if (status) {
        updateStatus(status);
        setLastUpdated(Date.now());
      }
    } catch (err: any) {
      setError(withSupportContact(err.message || 'Failed to refresh payment status'));
    } finally {
      setLoading(false);
    }
  }, [currentReference, fetchPaymentStatus, updateStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    paymentStatus,
    loading,
    error,
    startTracking,
    stopTracking,
    refresh,
    trackingStartTime,
    pollingStartTime,
    lastUpdated,
    isTracking: Boolean(currentReference)
  };
};

/**
 * Hook for tracking multiple payments
 */
export const useMultiplePaymentStatus = () => {
  const [payments, setPayments] = useState<Map<string, PaymentStatus>>(new Map());
  const [loading, setLoading] = useState(false);

  const addPayment = useCallback((reference: string) => {
    // Create individual tracker for this payment
    // This is a simplified version - in practice, you'd want to optimize this
    return new Promise<void>((resolve) => {
      const fetchAndUpdate = async () => {
        try {
          const { data } = await supabase
            .from('payments')
            .select('*')
            .eq('reference', reference)
            .single();

          if (data) {
            setPayments(prev => new Map(prev.set(reference, data as PaymentStatus)));
          }
        } catch (error) {
          console.error('Error fetching payment:', error);
        }
        resolve();
      };

      fetchAndUpdate();
    });
  }, []);

  const removePayment = useCallback((reference: string) => {
    setPayments(prev => {
      const newMap = new Map(prev);
      newMap.delete(reference);
      return newMap;
    });
  }, []);

  const getPayment = useCallback((reference: string): PaymentStatus | undefined => {
    return payments.get(reference);
  }, [payments]);

  return {
    payments: Array.from(payments.values()),
    addPayment,
    removePayment,
    getPayment,
    loading
  };
};