import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission | 'default';
  isSubscribed: boolean;
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
  });

  useEffect(() => {
    // Check if push notifications are supported
    const isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    
    setState(prev => ({
      ...prev,
      isSupported,
      permission: isSupported ? Notification.permission : 'default',
    }));
  }, []);

  const requestPermission = useCallback(async () => {
    if (!state.isSupported) {
      toast.error('Push notifications are not supported in this browser');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));
      
      if (permission === 'granted') {
        toast.success('Push notifications enabled!');
        return true;
      } else if (permission === 'denied') {
        toast.error('Push notifications were blocked. Please enable them in your browser settings.');
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to request notification permission');
      return false;
    }
  }, [state.isSupported]);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (state.permission !== 'granted') {
      console.log('Notification permission not granted');
      return;
    }

    // Check if service worker is ready
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, {
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          ...options,
        });
      });
    } else {
      // Fallback to regular notification
      new Notification(title, {
        icon: '/pwa-192x192.png',
        ...options,
      });
    }
  }, [state.permission]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user || state.permission !== 'granted') return;

    // Listen for new messages
    const messagesChannel = supabase
      .channel('notification-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'negotiation_messages',
          filter: `sender_id=neq.${user.id}`,
        },
        (payload) => {
          showNotification('New Message', {
            body: 'You have a new message in your negotiation',
            tag: 'message',
            data: { type: 'message', id: payload.new.id },
          });
        }
      )
      .subscribe();

    // Listen for new orders
    const ordersChannel = supabase
      .channel('notification-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `provider_id=eq.${user.id}`,
        },
        (payload) => {
          showNotification('New Order!', {
            body: `You have a new order: ${payload.new.service_title}`,
            tag: 'order',
            data: { type: 'order', id: payload.new.id },
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          const order = payload.new as any;
          if (order.client_id === user.id || order.provider_id === user.id) {
            showNotification('Order Updated', {
              body: `Order "${order.service_title}" status changed to ${order.status}`,
              tag: 'order-update',
              data: { type: 'order', id: order.id },
            });
          }
        }
      )
      .subscribe();

    // Listen for new funding opportunities
    const fundingChannel = supabase
      .channel('notification-funding')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'funding_opportunities',
        },
        (payload) => {
          showNotification('New Funding Opportunity!', {
            body: `${payload.new.title} from ${payload.new.organization}`,
            tag: 'funding',
            data: { type: 'funding', id: payload.new.id },
          });
        }
      )
      .subscribe();

    setState(prev => ({ ...prev, isSubscribed: true }));

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(fundingChannel);
      setState(prev => ({ ...prev, isSubscribed: false }));
    };
  }, [user, state.permission, showNotification]);

  return {
    ...state,
    requestPermission,
    showNotification,
  };
};

export default usePushNotifications;
