import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logger } from '../../../src/lib/logger.ts';
import {
  getNotificationMessage,
  getNotificationTitle,
  mapLencoStatusToInternal,
  verifyLencoSignature,
  LencoWebhookPayload,
} from '../../../src/lib/server/lenco-webhook-utils.ts';

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-lenco-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export async function handleLencoWebhookRequest(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const signature = req.headers.get('x-lenco-signature');
  const webhookSecret = Deno.env.get('LENCO_WEBHOOK_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!signature || !webhookSecret) {
    logger.error('Missing Lenco webhook signature or secret');
    return new Response(JSON.stringify({ success: false, error: 'Missing webhook authentication' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    logger.error('Supabase environment variables are not configured for webhook processing');
    return new Response(JSON.stringify({ success: false, error: 'Server configuration incomplete' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const rawBody = await req.text();
  let payload: LencoWebhookPayload | undefined;

  try {
    const isSignatureValid = await verifyLencoSignature(signature, rawBody, webhookSecret);
    if (!isSignatureValid) {
      logger.warn('Lenco webhook signature validation failed');
      return new Response(JSON.stringify({ success: false, error: 'Invalid webhook signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    payload = JSON.parse(rawBody) as LencoWebhookPayload;
  } catch (error) {
    logger.error('Failed to parse or validate webhook payload', error);
    return new Response(JSON.stringify({ success: false, error: 'Invalid payload' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    await updatePaymentRecord(supabaseClient, payload);
    await handleSubscriptionPaymentUpdate(supabaseClient, payload);
    await handleServicePaymentUpdate(supabaseClient, payload);
    await sendRealTimeNotification(supabaseClient, payload);
    await logWebhookEvent(supabaseClient, payload, 'processed');

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Webhook processing error', error, {
      paymentReference: payload?.data?.reference,
      userId: payload?.data?.metadata?.user_id,
    });

    try {
      await logWebhookEvent(supabaseClient, payload, 'failed', (error as Error).message);
    } catch (logError) {
      logger.error('Failed to log webhook error', logError);
    }

    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message ?? 'Webhook processing failed',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function updatePaymentRecord(supabaseClient: any, payload: LencoWebhookPayload) {
  const { data } = payload;

  const { error } = await supabaseClient
    .from('payments')
    .update({
      status: mapLencoStatusToInternal(data.status),
      lenco_transaction_id: data.id,
      gateway_response: data.gateway_response,
      paid_at: data.paid_at ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('reference', data.reference);

  if (error) {
    logger.error('Failed to update payment record', error, { paymentReference: data.reference });
  }
}

async function handleSubscriptionPaymentUpdate(supabaseClient: any, payload: LencoWebhookPayload) {
  const subscriptionId = payload.data.metadata?.subscription_id;
  if (!subscriptionId) {
    return;
  }

  try {
    const newStatus = payload.data.status === 'success' ? 'active' : 'cancelled';
    const paymentStatusMapped = payload.data.status === 'success' ? 'paid' : 'failed';

    const { error } = await supabaseClient
      .from('user_subscriptions')
      .update({
        status: newStatus,
        payment_status: paymentStatusMapped,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);

    if (error) {
      logger.error('Failed to update subscription payment state', error, { paymentReference: payload.data.reference });
    }

    await supabaseClient
      .from('transactions')
      .update({
        status: payload.data.status === 'success' ? 'completed' : 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('reference_number', payload.data.reference);
  } catch (error) {
    logger.error('Error handling subscription payment update', error, { paymentReference: payload.data.reference });
  }
}

async function handleServicePaymentUpdate(supabaseClient: any, payload: LencoWebhookPayload) {
  const serviceId = payload.data.metadata?.service_id;
  if (!serviceId) {
    return;
  }

  try {
    const { error } = await supabaseClient
      .from('service_bookings')
      .update({
        payment_status: payload.data.status === 'success' ? 'paid' : 'failed',
        status: payload.data.status === 'success' ? 'confirmed' : 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', serviceId);

    if (error) {
      logger.error('Failed to update service booking payment state', error, { paymentReference: payload.data.reference });
    }
  } catch (error) {
    logger.error('Error handling service payment update', error, { paymentReference: payload.data.reference });
  }
}

async function sendRealTimeNotification(supabaseClient: any, payload: LencoWebhookPayload) {
  const userId = payload.data.metadata?.user_id;
  if (!userId) {
    return;
  }

  try {
    const notification = {
      user_id: userId,
      type: 'payment_update',
      title: getNotificationTitle(payload.event),
      message: getNotificationMessage(payload.event, payload.data),
      data: {
        event: payload.event,
        reference: payload.data.reference,
        amount: payload.data.amount,
        currency: payload.data.currency,
      },
      read: false,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabaseClient
      .from('notifications')
      .insert(notification);

    if (error) {
      logger.error('Failed to create payment notification', error, {
        userId,
        paymentReference: payload.data.reference,
      });
    }

    await supabaseClient
      .channel(`user:${userId}`)
      .send({
        type: 'broadcast',
        event: 'payment_update',
        payload: notification,
      });
  } catch (error) {
    logger.error('Error sending payment realtime notification', error, {
      userId,
      paymentReference: payload.data.reference,
    });
  }
}

async function logWebhookEvent(
  supabaseClient: any,
  payload: LencoWebhookPayload | undefined,
  status: 'processed' | 'failed',
  errorMessage?: string,
) {
  const logEntry = {
    event_type: payload?.event ?? 'unknown',
    reference: payload?.data?.reference ?? 'unknown',
    status,
    error_message: errorMessage ?? null,
    payload,
    processed_at: new Date().toISOString(),
  };

  await supabaseClient.from('webhook_logs').insert(logEntry);
}
