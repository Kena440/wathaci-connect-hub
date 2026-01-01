import { supabase } from '@/integrations/supabase/client';

interface NotificationData {
  type: 'order' | 'message' | 'funding';
  userId: string;
  title: string;
  message: string;
  relatedId?: string;
  data?: Record<string, any>;
}

export const sendEmailNotification = async (notification: NotificationData) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: notification
    });

    if (error) {
      console.error('Error sending notification:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in sendEmailNotification:', error);
    return { success: false, error };
  }
};

export const notifyNewOrder = async (
  userId: string, 
  orderDetails: { service: string; amount: number; currency: string; status: string },
  orderId?: string
) => {
  return sendEmailNotification({
    type: 'order',
    userId,
    title: 'New Order Received!',
    message: `You have received a new order for "${orderDetails.service}". The client is ready to proceed.`,
    relatedId: orderId,
    data: { orderDetails }
  });
};

export const notifyOrderStatusChange = async (
  userId: string,
  orderDetails: { service: string; amount: number; currency: string; status: string },
  orderId?: string
) => {
  const statusMessages: Record<string, string> = {
    confirmed: 'Your order has been confirmed and work will begin soon.',
    in_progress: 'Work on your order has started.',
    completed: 'Great news! Your order has been completed.',
    cancelled: 'Your order has been cancelled.'
  };

  return sendEmailNotification({
    type: 'order',
    userId,
    title: `Order ${orderDetails.status.charAt(0).toUpperCase() + orderDetails.status.slice(1)}`,
    message: statusMessages[orderDetails.status] || `Your order status has been updated to ${orderDetails.status}.`,
    relatedId: orderId,
    data: { orderDetails }
  });
};

export const notifyNewMessage = async (
  userId: string,
  senderName: string,
  preview: string,
  messageId?: string
) => {
  return sendEmailNotification({
    type: 'message',
    userId,
    title: 'New Message Received',
    message: `${senderName} sent you a new message on WATHACI Connect.`,
    relatedId: messageId,
    data: { senderName, preview: preview.substring(0, 100) }
  });
};

export const notifyFundingOpportunity = async (
  userId: string,
  opportunityDetails: { organization: string; amount: string; deadline: string; title: string },
  opportunityId?: string
) => {
  return sendEmailNotification({
    type: 'funding',
    userId,
    title: `New Funding Opportunity: ${opportunityDetails.title}`,
    message: `A new funding opportunity matching your profile is now available from ${opportunityDetails.organization}.`,
    relatedId: opportunityId,
    data: { opportunityDetails }
  });
};
