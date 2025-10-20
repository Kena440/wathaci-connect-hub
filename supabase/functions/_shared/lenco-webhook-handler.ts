import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logger } from '../../../src/lib/logger.ts';
import {
  getNotificationMessage,
  getNotificationTitle,
  isCollectionEventPayload,
  isPaymentEventPayload,
  isTransactionEventPayload,
  isTransferEventPayload,
  mapLencoStatusToInternal,
  verifyLencoSignature,
  LencoPaymentWebhookPayload,
  LencoWebhookPayload,
} from '../../../src/lib/server/lenco-webhook-utils.ts';

const MAX_BODY_BYTES = 32 * 1024; // 32KB upper bound for webhook payloads
const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-lenco-signature, x-lenco-timestamp',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type WaitUntil = (promise: Promise<unknown>) => void;

interface WebhookContext {
  requestId: string;
  providerEventId: string;
  paymentReference?: string;
  userId?: string;
}

export async function handleLencoWebhookRequest(
  req: Request,
  waitUntil?: WaitUntil,
): Promise<Response> {
  const fallbackSideEffects: Promise<unknown>[] = [];
  const enqueueSideEffect = (promise: Promise<unknown>) => {
    if (waitUntil) {
      waitUntil(promise);
    } else {
      fallbackSideEffects.push(promise);
    }
  };
  const finalizeResponse = async (response: Response): Promise<Response> => {
    if (!waitUntil && fallbackSideEffects.length > 0) {
      await Promise.allSettled(fallbackSideEffects);
    }
    return response;
  };
  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' as const };

  const requestId = crypto.randomUUID();

  if (req.method === 'OPTIONS') {
    return finalizeResponse(new Response('ok', { headers: corsHeaders }));
  }

  if (req.method !== 'POST') {
    return finalizeResponse(new Response('Method not allowed', { status: 405, headers: corsHeaders }));
  }

  const signature = req.headers.get('x-lenco-signature');
  const webhookSecret = Deno.env.get('LENCO_WEBHOOK_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!signature || !webhookSecret) {
    logger.warn('Missing Lenco webhook signature or secret', { requestId });
    return finalizeResponse(
      new Response(JSON.stringify({ success: false, error: 'Missing webhook authentication' }), {
        status: 401,
        headers: jsonHeaders,
      }),
    );
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    logger.error('Supabase environment variables are not configured for webhook processing', undefined, {
      requestId,
    });
    return finalizeResponse(
      new Response(JSON.stringify({ success: false, error: 'Server configuration incomplete' }), {
        status: 500,
        headers: jsonHeaders,
      }),
    );
  }

  const contentLengthHeader = req.headers.get('content-length');
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (!Number.isFinite(contentLength) || contentLength > MAX_BODY_BYTES) {
      logger.warn('Webhook payload rejected due to content-length limit', { requestId, contentLength });
      return finalizeResponse(
        new Response(JSON.stringify({ success: false, error: 'Payload too large' }), {
          status: 413,
          headers: jsonHeaders,
        }),
      );
    }
  }

  const rawBody = await req.text();
  const payloadSize = new TextEncoder().encode(rawBody).byteLength;
  if (payloadSize > MAX_BODY_BYTES) {
    logger.warn('Webhook payload exceeded size limit', { requestId, payloadSize });
    return finalizeResponse(
      new Response(JSON.stringify({ success: false, error: 'Payload too large' }), {
        status: 413,
        headers: jsonHeaders,
      }),
    );
  }

  let payload: LencoWebhookPayload;

  try {
    const isSignatureValid = await verifyLencoSignature(signature, rawBody, webhookSecret);
    if (!isSignatureValid) {
      logger.warn('Lenco webhook signature validation failed', { requestId });
      return finalizeResponse(
        new Response(JSON.stringify({ success: false, error: 'Invalid webhook signature' }), {
          status: 401,
          headers: jsonHeaders,
        }),
      );
    }

    payload = JSON.parse(rawBody) as LencoWebhookPayload;
  } catch (error) {
    logger.error('Failed to parse or validate webhook payload', error, { requestId });
    return finalizeResponse(
      new Response(JSON.stringify({ success: false, error: 'Invalid payload' }), {
        status: 400,
        headers: jsonHeaders,
      }),
    );
  }

  const validationErrors = validatePayload(payload);
  if (validationErrors.length > 0) {
    logger.warn('Rejected Lenco webhook due to validation errors', { requestId, validationErrors });
    return finalizeResponse(
      new Response(JSON.stringify({ success: false, error: 'Invalid payload structure' }), {
        status: 400,
        headers: jsonHeaders,
      }),
    );
  }

  const eventTimestamp = Date.parse(payload.created_at);
  if (Number.isNaN(eventTimestamp) || Math.abs(Date.now() - eventTimestamp) > TIMESTAMP_TOLERANCE_MS) {
    logger.warn('Lenco webhook timestamp outside accepted window', {
      requestId,
      createdAt: payload.created_at,
    });
    return finalizeResponse(
      new Response(JSON.stringify({ success: false, error: 'Stale webhook event' }), {
        status: 400,
        headers: jsonHeaders,
      }),
    );
  }

  const providerEventId = payload.data.id;
  const paymentReference = isPaymentEventPayload(payload)
    ? payload.data.reference
    : typeof (payload.data as { reference?: unknown }).reference === 'string'
      ? ((payload.data as { reference: string }).reference)
      : undefined;
  const userId = isPaymentEventPayload(payload) ? payload.data.metadata?.user_id : undefined;
  const context: WebhookContext = {
    requestId,
    providerEventId,
    paymentReference: paymentReference ?? resolveEventReference(payload),
    userId,
  };

  const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

  logger.info('Processing Lenco webhook event', {
    requestId,
    providerEventId,
    event: payload.event,
    paymentReference: context.paymentReference,
  });

  if (!isPaymentEventPayload(payload)) {
    logger.info('Received non-payment Lenco event', {
      requestId,
      event: payload.event,
      providerEventId,
    });

    enqueueSideEffect(
      logWebhookEvent(supabaseClient, payload, 'processed', undefined, context).catch((error) => {
        logger.error('Failed to log non-payment webhook event', error, context);
      }),
    );

    return finalizeResponse(
      new Response(JSON.stringify({ success: true, processed: true }), {
        status: 200,
        headers: jsonHeaders,
      }),
    );
  }

  const receivedAt = new Date().toISOString();
  const { error: recordEventError } = await supabaseClient.from('payment_events').insert({
    provider_event_id: providerEventId,
    payment_reference: payload.data.reference,
    event_type: payload.event,
    provider_status: payload.data.status,
    payload,
    received_at: receivedAt,
  });

  if (recordEventError) {
    if (
      recordEventError.code === '23505' ||
      (typeof recordEventError.message === 'string' &&
        recordEventError.message.toLowerCase().includes('duplicate key'))
    ) {
      logger.info('Duplicate Lenco payment event received', { requestId, providerEventId, paymentReference: payload.data.reference });

      enqueueSideEffect(
        logWebhookEvent(supabaseClient, payload, 'duplicate', undefined, context).catch((error) => {
          logger.error('Failed to record duplicate webhook event log', error, context);
        }),
      );

      return finalizeResponse(
        new Response(JSON.stringify({ success: true, duplicate: true }), {
          status: 200,
          headers: jsonHeaders,
        }),
      );
    }

    logger.error('Failed to persist payment event', recordEventError, context);
    return finalizeResponse(
      new Response(JSON.stringify({ success: false, error: 'Unable to persist payment event' }), {
        status: 500,
        headers: jsonHeaders,
      }),
    );
  }

  try {
    await updatePaymentRecord(supabaseClient, payload, context);
    await handleSubscriptionPaymentUpdate(supabaseClient, payload, context);
    await handleServicePaymentUpdate(supabaseClient, payload, context);

    enqueueSideEffect(
      sendRealTimeNotification(supabaseClient, payload, context).catch((error) => {
        logger.error('Error sending payment realtime notification', error, context);
      }),
    );

    enqueueSideEffect(
      logWebhookEvent(supabaseClient, payload, 'processed', undefined, context).catch((error) => {
        logger.error('Failed to log processed webhook event', error, context);
      }),
    );

    return finalizeResponse(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: jsonHeaders,
      }),
    );
  } catch (error) {
    logger.error('Webhook processing error', error, context);

    enqueueSideEffect(
      logWebhookEvent(supabaseClient, payload, 'failed', (error as Error).message, context).catch((logError) => {
        logger.error('Failed to log webhook error', logError, context);
      }),
    );

    return finalizeResponse(
      new Response(JSON.stringify({ success: false, error: 'Webhook processing failed' }), {
        status: 500,
        headers: jsonHeaders,
      }),
    );
  }
}

function validatePayload(payload: LencoWebhookPayload): string[] {
  const errors: string[] = [];

  const allowedEvents: Array<LencoWebhookPayload['event']> = [
    'payment.success',
    'payment.failed',
    'payment.pending',
    'payment.cancelled',
    'transfer.successful',
    'transfer.failed',
    'collection.successful',
    'collection.failed',
    'collection.settled',
    'transaction.credit',
    'transaction.debit',
  ];

  if (!allowedEvents.includes(payload.event)) {
    errors.push('event');
  }

  if (!payload.data || typeof payload.data !== 'object') {
    errors.push('data');
    return errors;
  }

  if (!payload.created_at || Number.isNaN(Date.parse(payload.created_at))) {
    errors.push('created_at');
  }

  const data = payload.data as Record<string, unknown>;

  if (typeof data.id !== 'string' || data.id.trim().length === 0) {
    errors.push('data.id');
  }

  if (isPaymentEventPayload(payload)) {
    if (typeof data.reference !== 'string' || data.reference.trim().length === 0) {
      errors.push('data.reference');
    }

    const amount = typeof data.amount === 'number' ? data.amount : Number.NaN;
    if (!Number.isFinite(amount) || amount < 0) {
      errors.push('data.amount');
    }

    if (typeof data.currency !== 'string' || data.currency.trim().length === 0) {
      errors.push('data.currency');
    }

    if (typeof data.status !== 'string' || data.status.trim().length === 0) {
      errors.push('data.status');
    }
  } else if (isTransferEventPayload(payload)) {
    if (typeof data.amount !== 'string' || (data.amount as string).trim().length === 0) {
      errors.push('data.amount');
    }

    if (typeof data.currency !== 'string' || (data.currency as string).trim().length === 0) {
      errors.push('data.currency');
    }

    if (typeof data.accountId !== 'string' || (data.accountId as string).trim().length === 0) {
      errors.push('data.accountId');
    }

    const status = String(data.status ?? '').toLowerCase();
    if (!['pending', 'successful', 'failed'].includes(status)) {
      errors.push('data.status');
    }

    if (typeof data.lencoReference !== 'string' || (data.lencoReference as string).trim().length === 0) {
      errors.push('data.lencoReference');
    }
  } else if (isCollectionEventPayload(payload)) {
    if (typeof data.amount !== 'string' || (data.amount as string).trim().length === 0) {
      errors.push('data.amount');
    }

    if (typeof data.currency !== 'string' || (data.currency as string).trim().length === 0) {
      errors.push('data.currency');
    }

    if (typeof data.lencoReference !== 'string' || (data.lencoReference as string).trim().length === 0) {
      errors.push('data.lencoReference');
    }

    const status = String(data.status ?? '').toLowerCase();
    const allowedStatuses = ['pending', 'successful', 'failed', 'otp-required', 'pay-offline'];
    if (!allowedStatuses.includes(status)) {
      errors.push('data.status');
    }
  } else if (isTransactionEventPayload(payload)) {
    if (typeof data.amount !== 'string' || (data.amount as string).trim().length === 0) {
      errors.push('data.amount');
    }

    if (typeof data.currency !== 'string' || (data.currency as string).trim().length === 0) {
      errors.push('data.currency');
    }

    if (typeof data.accountId !== 'string' || (data.accountId as string).trim().length === 0) {
      errors.push('data.accountId');
    }

    const type = String(data.type ?? '').toLowerCase();
    if (!['credit', 'debit'].includes(type)) {
      errors.push('data.type');
    }

    if (typeof data.datetime !== 'string' || Number.isNaN(Date.parse(data.datetime as string))) {
      errors.push('data.datetime');
    }
  }

  return errors;
}

async function updatePaymentRecord(
  supabaseClient: any,
  payload: LencoPaymentWebhookPayload,
  context: WebhookContext,
) {
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
    logger.error('Failed to update payment record', error, context);
    throw new Error(error.message || 'Failed to update payment record');
  }
}

async function handleSubscriptionPaymentUpdate(
  supabaseClient: any,
  payload: LencoPaymentWebhookPayload,
  context: WebhookContext,
) {
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
      logger.error('Failed to update subscription payment state', error, {
        ...context,
        subscriptionId,
      });
    }

    const { error: transactionError } = await supabaseClient
      .from('transactions')
      .update({
        status: payload.data.status === 'success' ? 'completed' : 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('reference_number', payload.data.reference);

    if (transactionError) {
      logger.error('Failed to update related transaction status', transactionError, {
        ...context,
        subscriptionId,
      });
    }
  } catch (error) {
    logger.error('Error handling subscription payment update', error, {
      ...context,
      subscriptionId,
    });
  }
}

async function handleServicePaymentUpdate(
  supabaseClient: any,
  payload: LencoPaymentWebhookPayload,
  context: WebhookContext,
) {
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
      logger.error('Failed to update service booking payment state', error, {
        ...context,
        serviceId,
      });
    }
  } catch (error) {
    logger.error('Error handling service payment update', error, {
      ...context,
      serviceId,
    });
  }
}

async function sendRealTimeNotification(
  supabaseClient: any,
  payload: LencoPaymentWebhookPayload,
  context: WebhookContext,
) {
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

    const { error } = await supabaseClient.from('notifications').insert(notification);

    if (error) {
      logger.error('Failed to create payment notification', error, {
        ...context,
        userId,
      });
      return;
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
      ...context,
      userId,
    });
  }
}

async function logWebhookEvent(
  supabaseClient: any,
  payload: LencoWebhookPayload | undefined,
  status: 'processed' | 'failed' | 'duplicate',
  errorMessage: string | undefined,
  context: WebhookContext,
) {
  const logEntry = {
    event_type: payload?.event ?? 'unknown',
    reference: resolveEventReference(payload) ?? context.paymentReference ?? 'unknown',
    status,
    error_message: errorMessage ?? null,
    payload,
    processed_at: new Date().toISOString(),
  };

  await supabaseClient.from('webhook_logs').insert(logEntry);
}

function resolveEventReference(payload: LencoWebhookPayload | undefined): string | undefined {
  const data = payload?.data as Record<string, unknown> | undefined;
  if (!data || typeof data !== 'object') {
    return undefined;
  }

  const reference = data.reference;
  if (typeof reference === 'string' && reference.trim().length > 0) {
    return reference;
  }

  const lencoReference = data.lencoReference;
  if (typeof lencoReference === 'string' && lencoReference.trim().length > 0) {
    return lencoReference;
  }

  const id = data.id;
  if (typeof id === 'string' && id.trim().length > 0) {
    return id;
  }

  return undefined;
}
