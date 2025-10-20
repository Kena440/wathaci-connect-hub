import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logger } from '../../../src/lib/logger.ts';

const DEFAULT_LENCO_API_BASE = 'https://api.lenco.co/access/v2';
const FALLBACK_APP_ORIGIN = 'https://localhost.test';

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type WaitUntil = (promise: Promise<unknown>) => void;

interface PaymentInitializationRequest {
  amount: number | string;
  currency?: string;
  email?: string;
  name: string;
  description: string;
  phone?: string;
  phoneNumber?: string;
  reference?: string;
  paymentMethod?: 'mobile_money' | 'card';
  provider?: 'mtn' | 'airtel' | 'zamtel';
  metadata?: Record<string, unknown>;
  bearer?: 'merchant' | 'customer';
  channels?: ('card' | 'mobile-money')[];
  customer?: Record<string, unknown>;
  billing?: Record<string, unknown>;
  label?: string;
  callback_url?: string;
}

interface PaymentVerificationRequest {
  reference?: string;
}

interface LencoApiSuccessResponse<T = Record<string, unknown>> {
  success: true;
  data: T;
  message?: string;
}

interface LencoApiErrorResponse {
  success: false;
  message?: string;
  error?: string;
  data?: unknown;
}

type LencoApiResponse<T = Record<string, unknown>> =
  | LencoApiSuccessResponse<T>
  | LencoApiErrorResponse;

interface HandlerContext {
  requestId: string;
  userId?: string;
  paymentReference?: string;
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const parseAmount = (amount: number | string | undefined): number => {
  if (typeof amount === 'number') {
    return Number.isFinite(amount) ? Number(amount.toFixed(2)) : NaN;
  }

  if (typeof amount === 'string') {
    const parsed = Number.parseFloat(amount.replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : NaN;
  }

  return NaN;
};

const normaliseCurrency = (currency?: string): string => {
  if (!currency) return 'ZMW';
  return currency.trim().toUpperCase() || 'ZMW';
};

const sanitiseDescription = (description: string): string => {
  const cleaned = description.replace(/<[^>]*>/g, '').trim();
  if (!cleaned) {
    return 'Payment via WATHACI CONNECT';
  }
  return cleaned.slice(0, 200);
};

const buildLabel = (label: string | undefined, fallback: string): string => {
  const value = (label || fallback).trim();
  return value.slice(0, 64) || 'WATHACI CONNECT Payment';
};

const resolveLencoApiBase = () =>
  Deno.env.get('LENCO_API_URL')?.replace(/\/$/, '') || DEFAULT_LENCO_API_BASE;

const resolveAppOrigin = (req: Request): string => {
  const origin = req.headers.get('origin');
  if (origin && /^https?:\/\//i.test(origin)) {
    return origin;
  }
  return FALLBACK_APP_ORIGIN;
};

const mapCollectionStatus = (status: unknown): string => {
  const value = typeof status === 'string' ? status.toLowerCase() : '';
  if (value.includes('success')) {
    return 'successful';
  }
  if (['pending', 'processing', 'initiated'].includes(value)) {
    return 'pending';
  }
  if (['failed', 'declined', 'rejected'].includes(value)) {
    return 'failed';
  }
  if (['cancelled', 'canceled', 'abandoned'].includes(value)) {
    return 'cancelled';
  }
  return value || 'failed';
};

const extractFirstAndLastName = (fullName: string | undefined) => {
  if (!fullName) {
    return { firstName: undefined, lastName: undefined };
  }

  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) {
    return { firstName: undefined, lastName: undefined };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: undefined };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
};

export async function handleLencoPaymentRequest(
  req: Request,
  waitUntil?: WaitUntil,
): Promise<Response> {
  const requestId = crypto.randomUUID();
  const context: HandlerContext = { requestId };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const lencoSecretKey = Deno.env.get('LENCO_SECRET_KEY');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    logger.error('Supabase environment variables missing for payment handler', undefined, context);
    return jsonResponse({ success: false, error: 'Server configuration incomplete' }, 500);
  }

  if (!lencoSecretKey) {
    logger.error('Lenco secret key is not configured', undefined, context);
    return jsonResponse({ success: false, error: 'Payment gateway not configured' }, 500);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch (error) {
    logger.warn('Invalid JSON payload received by payment handler', { error, ...context });
    return jsonResponse({ success: false, error: 'Invalid JSON payload' }, 400);
  }

  const action = typeof payload.action === 'string'
    ? payload.action.toLowerCase()
    : 'initialize';

  const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
  }

  const accessToken = authHeader.replace(/^Bearer\s+/i, '');
  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser(accessToken);

  if (authError || !user) {
    logger.warn('Unauthorized payment function access attempt', { authError, ...context });
    return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
  }

  context.userId = user.id;

  try {
    if (action === 'verify') {
      return await handleVerifyRequest(
        payload as PaymentVerificationRequest,
        supabaseClient,
        lencoSecretKey,
        context,
      );
    }

    return await handleInitializationRequest(
      req,
      payload as PaymentInitializationRequest,
      supabaseClient,
      lencoSecretKey,
      user.id,
      context,
      waitUntil,
    );
  } catch (error) {
    logger.error('Unhandled error in lenco-payment handler', error, context);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Unauthorized' ? 401 : 500;
    return jsonResponse({ success: false, error: message }, status);
  }
}

async function handleInitializationRequest(
  req: Request,
  body: PaymentInitializationRequest,
  supabaseClient: SupabaseClient,
  lencoSecretKey: string,
  userId: string,
  context: HandlerContext,
  waitUntil?: WaitUntil,
): Promise<Response> {
  const amount = parseAmount(body.amount);
  if (!Number.isFinite(amount) || amount < 5) {
    throw new Error('Invalid payment amount');
  }

  const description = sanitiseDescription(body.description || '');
  const currency = normaliseCurrency(body.currency);
  const paymentMethod = body.paymentMethod === 'card' ? 'card' : 'mobile_money';

  const phone = typeof body.phone === 'string' && body.phone.trim()
    ? body.phone.trim()
    : typeof body.phoneNumber === 'string' && body.phoneNumber.trim()
      ? body.phoneNumber.trim()
      : undefined;

  if (paymentMethod === 'mobile_money') {
    if (!phone) {
      throw new Error('Mobile money payments require phone number');
    }
    if (!body.provider) {
      throw new Error('Mobile money payments require a provider');
    }
  }

  const reference = typeof body.reference === 'string' && body.reference.trim()
    ? body.reference.trim()
    : `WC_${Date.now()}_${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  context.paymentReference = reference;

  const metadata = {
    ...body.metadata,
    payment_method: paymentMethod,
    provider: body.provider ?? null,
    user_id: userId,
  } as Record<string, unknown>;

  const { firstName, lastName } = extractFirstAndLastName(body.name);

  const lencoRequest = {
    amount: amount.toFixed(2),
    currency,
    email: body.email,
    name: body.name,
    phone: phone ?? '',
    reference,
    description,
    callback_url: body.callback_url || `${resolveAppOrigin(req)}/payment/callback`,
    metadata,
    label: buildLabel(body.label, description),
    bearer: body.bearer || 'merchant',
    channels: body.channels && body.channels.length
      ? body.channels
      : paymentMethod === 'card'
        ? ['card']
        : ['mobile-money'],
    customer: body.customer || {
      firstName,
      lastName,
      phone,
    },
    billing: body.billing,
  };

  const lencoApiBase = resolveLencoApiBase();
  const response = await fetch(`${lencoApiBase}/payments/initialize`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lencoSecretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(lencoRequest),
  });

  const data = (await response.json()) as LencoApiResponse;

  if (!response.ok || !data.success) {
    logger.error('Lenco initialization API call failed', data, context);
    throw new Error(data.message || data.error || 'Payment gateway error');
  }

  const paymentData = data.data || {};
  const paymentUrl =
    (paymentData as Record<string, unknown>).authorization_url as string |
    (paymentData as Record<string, unknown>).payment_url as string |
    (paymentData as Record<string, unknown>).checkout_url as string |
    '';
  const accessCode = (paymentData as Record<string, unknown>).access_code as string | undefined;

  const insertPromise = supabaseClient
    .from('payments')
    .insert({
      reference,
      user_id: userId,
      amount,
      currency,
      status: 'pending',
      payment_method: paymentMethod,
      provider: body.provider ?? null,
      description,
      email: body.email ?? null,
      name: body.name ?? null,
      phone: phone ?? null,
      lenco_access_code: accessCode ?? null,
      lenco_authorization_url: paymentUrl || null,
      metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  const insertTask = insertPromise.then(({ error }) => {
    if (error) {
      logger.error('Failed to persist payment initialization record', error, context);
    }
  });

  if (waitUntil) {
    waitUntil(insertTask);
  } else {
    insertTask.catch((error) => {
      logger.error('Unhandled error while storing payment record', error, context);
    });
  }

  return jsonResponse({
    success: true,
    data: {
      reference,
      payment_url: paymentUrl,
      access_code: accessCode,
      amount,
      currency,
    },
  });
}

async function handleVerifyRequest(
  body: PaymentVerificationRequest,
  supabaseClient: SupabaseClient,
  lencoSecretKey: string,
  context: HandlerContext,
): Promise<Response> {
  const reference = typeof body.reference === 'string' && body.reference.trim()
    ? body.reference.trim()
    : undefined;

  if (!reference) {
    throw new Error('Payment reference is required');
  }

  context.paymentReference = reference;

  const lencoApiBase = resolveLencoApiBase();
  const statusUrl = `${lencoApiBase}/collections/status/${encodeURIComponent(reference)}`;

  let verifyResponse = await fetch(statusUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${lencoSecretKey}`,
      'Content-Type': 'application/json',
    },
  });

  let verifyData = (await verifyResponse.json().catch(() => ({}))) as LencoApiResponse;

  if (!verifyResponse.ok || !verifyData.success) {
    // Fall back to the legacy payments verify endpoint for backward compatibility
    const fallbackUrl = `${lencoApiBase}/payments/verify/${encodeURIComponent(reference)}`;
    verifyResponse = await fetch(fallbackUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${lencoSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    verifyData = (await verifyResponse.json().catch(() => ({}))) as LencoApiResponse;

    if (!verifyResponse.ok || !verifyData.success) {
      logger.error('Lenco verification API call failed', verifyData, context);
      throw new Error(verifyData.message || verifyData.error || 'Payment verification failed');
    }
  }

  const paymentData = verifyData.data as Record<string, unknown>;
  const status = mapCollectionStatus(paymentData?.status);
  const rawAmount = paymentData?.amount;
  const amount = parseAmount(rawAmount);
  const currency = normaliseCurrency(
    typeof paymentData?.currency === 'string' ? paymentData.currency : undefined,
  );

  const transactionId =
    typeof paymentData?.id === 'string'
      ? paymentData.id
      : typeof paymentData?.lencoReference === 'string'
        ? paymentData.lencoReference
        : undefined;

  const gatewayResponse =
    typeof paymentData?.gateway_response === 'string'
      ? paymentData.gateway_response
      : typeof paymentData?.reasonForFailure === 'string'
        ? paymentData.reasonForFailure
        : undefined;

  const paidAt =
    typeof paymentData?.paid_at === 'string' && paymentData.paid_at
      ? paymentData.paid_at
      : typeof paymentData?.completedAt === 'string'
        ? paymentData.completedAt
        : undefined;

  const updateResult = await supabaseClient
    .from('payments')
    .update({
      status: status === 'successful' ? 'completed' : status,
      lenco_transaction_id: transactionId ?? null,
      gateway_response: gatewayResponse ?? null,
      paid_at: paidAt ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('reference', reference);

  if (updateResult.error) {
    logger.error('Failed to update payment record during verification', updateResult.error, context);
  }

  return jsonResponse({
    success: true,
    data: {
      reference,
      status,
      amount,
      currency,
      id: transactionId,
      gateway_response: gatewayResponse,
      paid_at: paidAt,
      metadata: paymentData,
    },
  });
}
