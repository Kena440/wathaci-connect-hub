import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logger } from '../../../src/lib/logger.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' } as const;

const LENCO_ENDPOINT = 'https://api.lenco.co/access/v2/transfer-recipients/lenco-money';

interface TransferRecipientRequestBody {
  walletNumber?: string;
}

const sanitizeWalletNumber = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replace(/\s+/g, '');
};

const maskWalletNumber = (walletNumber: string): string => {
  if (!walletNumber) {
    return '';
  }

  const lastFour = walletNumber.slice(-4);
  return lastFour.padStart(Math.min(walletNumber.length, 4), '*');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  let requestUserId: string | null = null;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const lencoSecretKey = Deno.env.get('LENCO_SECRET_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      logger.error('Supabase environment variables are not configured for transfer recipient creation');
      return new Response(
        JSON.stringify({ status: false, message: 'Server configuration incomplete' }),
        { status: 500, headers: jsonHeaders },
      );
    }

    if (!lencoSecretKey) {
      logger.error('Missing Lenco secret key for transfer recipient creation');
      return new Response(
        JSON.stringify({ status: false, message: 'Payment gateway not configured' }),
        { status: 500, headers: jsonHeaders },
      );
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get('Authorization');
    const serviceRoleHeader = req.headers.get('x-service-role-key');
    const apiKeyHeader = req.headers.get('apikey') ?? serviceRoleHeader;
    const bearerToken = authHeader?.replace(/^Bearer\s+/i, '').trim() ?? '';
    const normalizedServiceRoleKey = serviceRoleKey.trim();

    const serviceRoleCandidates = [
      bearerToken,
      apiKeyHeader?.trim() ?? '',
      serviceRoleHeader?.trim() ?? '',
    ].filter((value) => value.length > 0);

    const isServiceRoleRequest = serviceRoleCandidates.some(
      (candidate) => candidate === normalizedServiceRoleKey,
    );

    if (!isServiceRoleRequest) {
      if (!bearerToken) {
        return new Response(
          JSON.stringify({ status: false, message: 'Missing authorization header' }),
          { status: 401, headers: jsonHeaders },
        );
      }

      const { data: authData, error: authError } = await supabaseClient.auth.getUser(bearerToken);

      if (authError || !authData?.user) {
        logger.warn('Unauthorized transfer recipient attempt', { authError: authError?.message });
        return new Response(
          JSON.stringify({ status: false, message: 'Unauthorized' }),
          { status: 401, headers: jsonHeaders },
        );
      }

      requestUserId = authData.user.id;
    } else {
      requestUserId = req.headers.get('x-client-user-id')?.trim() || null;
    }

    const body: TransferRecipientRequestBody = await req.json().catch(() => ({}));
    const walletNumber = sanitizeWalletNumber(body.walletNumber);

    if (!walletNumber) {
      return new Response(
        JSON.stringify({ status: false, message: 'walletNumber is required' }),
        { status: 400, headers: jsonHeaders },
      );
    }

    const maskedWallet = maskWalletNumber(walletNumber);

    logger.info('Creating Lenco transfer recipient', {
      userId: requestUserId ?? 'service-role',
      walletIdentifier: maskedWallet,
    });

    const lencoResponse = await fetch(LENCO_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lencoSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ walletNumber }),
    });

    const responseBody = await lencoResponse.json().catch(() => undefined);

    if (!lencoResponse.ok || !responseBody) {
      logger.error('Lenco transfer recipient creation failed', responseBody, {
        userId: requestUserId ?? 'service-role',
        walletIdentifier: maskedWallet,
        status: lencoResponse.status,
      });

      return new Response(
        JSON.stringify({
          status: false,
          message: responseBody?.message || 'Failed to create transfer recipient',
        }),
        { status: lencoResponse.status || 502, headers: jsonHeaders },
      );
    }

    const { status, message, data } = responseBody;

    return new Response(
      JSON.stringify({
        status: Boolean(status),
        message: message || 'Transfer recipient created successfully',
        data,
      }),
      { status: 200, headers: jsonHeaders },
    );
  } catch (error) {
    logger.error('Unexpected error while creating transfer recipient', error, {
      userId: requestUserId ?? 'service-role',
    });
    return new Response(
      JSON.stringify({ status: false, message: 'Unexpected error creating transfer recipient' }),
      { status: 500, headers: jsonHeaders },
    );
  }
});

export const config = {
  verifyJWT: false,
};
