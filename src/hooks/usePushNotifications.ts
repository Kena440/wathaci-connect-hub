import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { notifyNewOrder, notifyOrderStatusChange, notifyNewMessage, notifyFundingOpportunity } from './useEmailNotification';

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
    if (!user) return;

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
        async (payload) => {
          // Show push notification if permission granted
          if (state.permission === 'granted') {
            showNotification('New Message', {
              body: 'You have a new message in your negotiation',
              tag: 'message',
              data: { type: 'message', id: payload.new.id },
            });
          }
          
          // Also try to send email notification
          try {
            // Get the negotiation to find the recipient
            const message = payload.new as any;
            const { data: negotiation } = await supabase
              .from('negotiations')
              .select('client_id, provider_id')
              .eq('id', message.negotiation_id)
              .single();
            
            if (negotiation) {
              const recipientId = message.sender_id === negotiation.client_id 
                ? negotiation.provider_id 
                : negotiation.client_id;
              
              // Get sender name
              const { data: sender } = await supabase
                .from('profiles')
                .select('full_name, business_name')
                .eq('id', message.sender_id)
                .single();
              
              const senderName = sender?.full_name || sender?.business_name || 'Someone';
              
              await notifyNewMessage(
                recipientId,
                senderName,
                message.message || '',
                message.id
              );
            }
          } catch (error) {
            console.error('Error sending email notification:', error);
          }
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
        },
        async (payload) => {
          const order = payload.new as any;
          
          // Only notify the provider
          if (order.provider_id === user.id) {
            if (state.permission === 'granted') {
              showNotification('New Order!', {
                body: `You have a new order: ${order.service_title}`,
                tag: 'order',
                data: { type: 'order', id: order.id },
              });
            }
          }
          
          // Send email notification to provider
          try {
            await notifyNewOrder(
              order.provider_id,
              {
                service: order.service_title,
                amount: order.total_amount,
                currency: order.currency,
                status: order.status
              },
              order.id
            );
          } catch (error) {
            console.error('Error sending order email:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        async (payload) => {
          const order = payload.new as any;
          const isParticipant = order.client_id === user.id || order.provider_id === user.id;
          
          if (isParticipant) {
            if (state.permission === 'granted') {
              showNotification('Order Updated', {
                body: `Order "${order.service_title}" status changed to ${order.status}`,
                tag: 'order-update',
                data: { type: 'order', id: order.id },
              });
            }
            
            // Notify the other party via email
            try {
              const notifyUserId = order.client_id === user.id 
                ? order.provider_id 
                : order.client_id;
              
              await notifyOrderStatusChange(
                notifyUserId,
                {
                  service: order.service_title,
                  amount: order.total_amount,
                  currency: order.currency,
                  status: order.status
                },
                order.id
              );
            } catch (error) {
              console.error('Error sending order update email:', error);
            }
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
        async (payload) => {
          const opportunity = payload.new as any;
          
          if (state.permission === 'granted') {
            showNotification('New Funding Opportunity!', {
              body: `${opportunity.title} from ${opportunity.organization}`,
              tag: 'funding',
              data: { type: 'funding', id: opportunity.id },
            });
          }
          
          // Send email to users who match the opportunity criteria
          // This is handled in a separate scheduled function for efficiency
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
