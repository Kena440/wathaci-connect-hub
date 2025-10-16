/**
 * Payment Webhook Handler Edge Function
 * Handles Lenco payment webhooks for real-time payment status updates
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logger } from '../../src/lib/logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-lenco-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface WebhookPayload {
  event: 'payment.success' | 'payment.failed' | 'payment.pending' | 'payment.cancelled';
  data: {
    id: string;
    reference: string;
    amount: number;
    currency: string;
    status: string;
    gateway_response: string;
    paid_at?: string;
    customer: {
      email: string;
      phone?: string;
    };
    metadata?: Record<string, any>;
  };
  created_at: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  let payload: WebhookPayload | undefined;
  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify webhook signature
    const signature = req.headers.get('x-lenco-signature');
    const webhookSecret = Deno.env.get('LENCO_WEBHOOK_SECRET');
    
    if (!signature || !webhookSecret) {
      throw new Error('Missing webhook signature or secret');
    }

    const rawBody = await req.text();

    // Verify signature (simplified - in production, use proper HMAC verification)
    const isSignatureValid = await verifySignature(signature, rawBody, webhookSecret);

    if (!isSignatureValid) {
      throw new Error('Invalid webhook signature');
    }
    
    // Parse webhook payload
    payload = JSON.parse(rawBody) as WebhookPayload;
    
    console.log('Received webhook:', payload.event, payload.data.reference);

    // Update payment record
    const { error: paymentUpdateError } = await supabaseClient
      .from('payments')
      .update({
        status: mapLencoStatusToInternal(payload.data.status),
        lenco_transaction_id: payload.data.id,
        gateway_response: payload.data.gateway_response,
        paid_at: payload.data.paid_at || null,
        updated_at: new Date().toISOString()
      })
      .eq('reference', payload.data.reference);

    if (paymentUpdateError) {
      logger.error('Failed to update payment', paymentUpdateError, {
        paymentReference: payload?.data.reference,
        userId: payload?.data.metadata?.user_id,
      });
    }

    // Handle subscription payments
    if (payload.data.metadata?.subscription_id) {
      await handleSubscriptionPaymentUpdate(
        supabaseClient,
        payload.data.metadata.subscription_id,
        payload.data.status,
        payload.data.reference
      );
    }

    // Handle service payments
    if (payload.data.metadata?.service_id) {
      await handleServicePaymentUpdate(
        supabaseClient,
        payload.data.metadata.service_id,
        payload.data.status,
        payload.data.reference
      );
    }

    // Send real-time notification to user
    if (payload.data.metadata?.user_id) {
      await sendRealTimeNotification(
        supabaseClient,
        payload.data.metadata.user_id,
        payload.event,
        payload.data
      );
    }

    // Log webhook processing
    await supabaseClient.from('webhook_logs').insert({
      event_type: payload.event,
      reference: payload.data.reference,
      status: 'processed',
      payload: payload,
      processed_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    logger.error('Webhook processing error', error, {
      paymentReference: payload?.data.reference,
      userId: payload?.data.metadata?.user_id,
    });

    // Log failed webhook
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      await supabaseClient.from('webhook_logs').insert({
        event_type: 'unknown',
        reference: payload?.data.reference || 'unknown',
        status: 'failed',
        error_message: (error as Error).message,
        processed_at: new Date().toISOString()
      });
    } catch (logError) {
      logger.error('Failed to log webhook error', logError, {
        paymentReference: payload?.data.reference,
        userId: payload?.data.metadata?.user_id,
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

async function handleSubscriptionPaymentUpdate(
  supabaseClient: any,
  subscriptionId: string,
  paymentStatus: string,
  reference: string
) {
  try {
    const newStatus = paymentStatus === 'success' ? 'active' : 'cancelled';
    const paymentStatusMapped = paymentStatus === 'success' ? 'paid' : 'failed';

    const { error } = await supabaseClient
      .from('user_subscriptions')
      .update({
        status: newStatus,
        payment_status: paymentStatusMapped,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId);

    if (error) {
      logger.error('Failed to update subscription', error, {
        paymentReference: reference,
      });
    } else {
      console.log(`Subscription ${subscriptionId} updated to ${newStatus}`);
    }

    // Update transaction record
    await supabaseClient
      .from('transactions')
      .update({
        status: paymentStatus === 'success' ? 'completed' : 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('reference_number', reference);

  } catch (error) {
    logger.error('Error handling subscription payment update', error, {
      paymentReference: reference,
    });
  }
}

async function handleServicePaymentUpdate(
  supabaseClient: any,
  serviceId: string,
  paymentStatus: string,
  reference: string
) {
  try {
    // Update service booking status
    const { error } = await supabaseClient
      .from('service_bookings')
      .update({
        payment_status: paymentStatus === 'success' ? 'paid' : 'failed',
        status: paymentStatus === 'success' ? 'confirmed' : 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', serviceId);

    if (error) {
      logger.error('Failed to update service booking', error, {
        paymentReference: reference,
      });
    } else {
      console.log(`Service booking ${serviceId} payment updated`);
    }

  } catch (error) {
    logger.error('Error handling service payment update', error, {
      paymentReference: reference,
    });
  }
}

async function sendRealTimeNotification(
  supabaseClient: any,
  userId: string,
  event: string,
  paymentData: any
) {
  try {
    const notification = {
      user_id: userId,
      type: 'payment_update',
      title: getNotificationTitle(event),
      message: getNotificationMessage(event, paymentData),
      data: {
        event,
        reference: paymentData.reference,
        amount: paymentData.amount,
        currency: paymentData.currency
      },
      read: false,
      created_at: new Date().toISOString()
    };

    const { error } = await supabaseClient
      .from('notifications')
      .insert(notification);

    if (error) {
      logger.error('Failed to create notification', error, {
        userId,
        paymentReference: paymentData.reference,
      });
    }

    // Send real-time update via Supabase Realtime
    await supabaseClient
      .channel(`user:${userId}`)
      .send({
        type: 'broadcast',
        event: 'payment_update',
        payload: notification
      });

  } catch (error) {
    logger.error('Error sending real-time notification', error, {
      userId,
      paymentReference: paymentData.reference,
    });
  }
}

function mapLencoStatusToInternal(lencoStatus: string): string {
  const statusMap: Record<string, string> = {
    'success': 'completed',
    'failed': 'failed',
    'pending': 'pending',
    'cancelled': 'cancelled',
    'abandoned': 'cancelled'
  };

  return statusMap[lencoStatus.toLowerCase()] || 'failed';
}

function getNotificationTitle(event: string): string {
  const titles: Record<string, string> = {
    'payment.success': 'Payment Successful',
    'payment.failed': 'Payment Failed',
    'payment.pending': 'Payment Pending',
    'payment.cancelled': 'Payment Cancelled'
  };

  return titles[event] || 'Payment Update';
}

function getNotificationMessage(event: string, paymentData: any): string {
  const amount = paymentData.currency === 'ZMK' ? 
    `K${(paymentData.amount / 100).toFixed(2)}` : 
    `${paymentData.amount / 100} ${paymentData.currency}`;

  const messages: Record<string, string> = {
    'payment.success': `Your payment of ${amount} was successful.`,
    'payment.failed': `Your payment of ${amount} failed. Please try again.`,
    'payment.pending': `Your payment of ${amount} is being processed.`,
    'payment.cancelled': `Your payment of ${amount} was cancelled.`
  };

  return messages[event] || `Payment update for ${amount}`;
}

async function verifySignature(signature: string, rawBody: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const digestData = encoder.encode(secret + rawBody);
  const digestBuffer = new Uint8Array(await crypto.subtle.digest('SHA-256', digestData));

  const expectedHex = toHex(digestBuffer);
  if (timingSafeEqual(expectedHex, signature)) {
    return true;
  }

  const expectedBase64 = toBase64(digestBuffer);
  if (timingSafeEqual(expectedBase64, signature)) {
    return true;
  }

  return false;
}

function toHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function toBase64(buffer: Uint8Array): string {
  let binary = '';
  buffer.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
