// supabase/functions/create-donation/index.ts
// Edge Function that creates a donation record and initiates a Lenco payment session.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type DonationPayload = {
  amount?: number;
  currency?: string;
  campaignId?: string | null;
  donorName?: string | null;
  donateAnonymously?: boolean;
  message?: string | null;
  source?: string | null;
  donorUserId?: string | null;
};

type LencoPaymentSession = {
  checkoutUrl?: string;
  paymentInstructions?: Record<string, unknown>;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-lenco-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");

const supabase =
  supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

const minAmount = parseNumber(
  Deno.env.get("MIN_PAYMENT_AMOUNT") ?? Deno.env.get("VITE_MIN_PAYMENT_AMOUNT"),
  20
);
const maxAmount = parseNumber(
  Deno.env.get("MAX_PAYMENT_AMOUNT") ?? Deno.env.get("VITE_MAX_PAYMENT_AMOUNT"),
  5000
);
const platformFeePercentage = parseNumber(
  Deno.env.get("PLATFORM_FEE_PERCENTAGE") ??
    Deno.env.get("VITE_PLATFORM_FEE_PERCENTAGE"),
  5
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: { message: "method_not_allowed" } }, 405);
  }

  if (!supabase) {
    console.error("create-donation: Supabase client is not configured");
    return json({ ok: false, error: { message: "server_not_configured" } }, 500);
  }

  let body: DonationPayload;
  try {
    body = (await req.json()) as DonationPayload;
  } catch (error) {
    console.error("create-donation: invalid JSON", error);
    return json({ ok: false, error: { message: "invalid_json" } }, 400);
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return json(
      { ok: false, error: { message: "Amount must be a positive number." } },
      400
    );
  }

  if (amount < minAmount) {
    return json(
      {
        ok: false,
        error: {
          message: `Minimum donation is ${formatCurrency(minAmount)}.`,
          code: "amount_below_minimum",
        },
      },
      400
    );
  }

  if (amount > maxAmount) {
    return json(
      {
        ok: false,
        error: {
          message: `Maximum donation per transaction is ${formatCurrency(maxAmount)}.`,
          code: "amount_above_maximum",
        },
      },
      400
    );
  }

  const currency = typeof body.currency === "string" && body.currency.trim()
    ? body.currency.trim().toUpperCase()
    : "ZMW";

  const lencoReference = generateReference();
  const platformFeeAmount = Math.round((platformFeePercentage / 100) * amount);
  const netAmount = amount - platformFeeAmount;

  try {
    const { data, error } = await supabase
      .from("donations")
      .insert({
        campaign_id: body.campaignId ?? null,
        donor_user_id: body.donorUserId ?? null,
        donor_name: body.donateAnonymously ? null : body.donorName ?? null,
        is_anonymous: Boolean(body.donateAnonymously),
        amount,
        currency,
        status: "pending",
        lenco_reference: lencoReference,
        platform_fee_amount: platformFeeAmount,
        net_amount: netAmount,
        message: body.message ?? null,
        source: body.source ?? "web",
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("create-donation: failed to insert donation", error);
      return json(
        { ok: false, error: { message: "Failed to create donation record." } },
        500
      );
    }

    const lencoSession = await createLencoPaymentSession({
      amount,
      currency,
      lencoReference,
      donorName: body.donorName ?? undefined,
      webhookUrl: Deno.env.get("LENCO_WEBHOOK_URL"),
    });

    return json({
      ok: true,
      data: {
        donationId: data.id,
        lencoReference,
        checkoutUrl: lencoSession.checkoutUrl ?? null,
        paymentInstructions: lencoSession.paymentInstructions ?? null,
      },
    });
  } catch (error) {
    console.error("create-donation: unexpected error", error);
    return json({ ok: false, error: { message: "unexpected_error" } }, 500);
  }
});

async function createLencoPaymentSession({
  amount,
  currency,
  lencoReference,
  webhookUrl,
  donorName,
}: {
  amount: number;
  currency: string;
  lencoReference: string;
  webhookUrl: string | null | undefined;
  donorName?: string;
}): Promise<LencoPaymentSession> {
  const lencoApiUrl = Deno.env.get("LENCO_API_URL") ?? Deno.env.get("VITE_LENCO_API_URL");
  const lencoApiSecret = Deno.env.get("LENCO_API_SECRET") ?? Deno.env.get("LENCO_SECRET");

  if (!lencoApiUrl || !lencoApiSecret) {
    console.warn("create-donation: Lenco API credentials are not configured");
    return {
      paymentInstructions: {
        note:
          "Lenco API credentials are missing. Configure LENCO_API_URL and LENCO_API_SECRET to enable live payments.",
      },
    };
  }

  const payload = {
    amount,
    currency,
    reference: lencoReference,
    metadata: {
      donorName: donorName ?? null,
      platform: "wathaci-connect",
    },
    callback_url: webhookUrl ?? Deno.env.get("LENCO_WEBHOOK_URL"),
    // TODO: Replace `redirect_url` with the actual front-end confirmation page URL when available.
    redirect_url: Deno.env.get("PAYMENT_MONITORING_ENDPOINT") ?? null,
  };

  try {
    // This is where the live Lenco payment session should be created.
    // Replace the endpoint/payload with the production Lenco API contract when available.
    const response = await fetch(`${lencoApiUrl.replace(/\/$/, "")}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lencoApiSecret}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("create-donation: Lenco API responded with", response.status, text);
      return {
        paymentInstructions: {
          note: "Donation recorded but Lenco session could not be created. Retry from the dashboard.",
          status: response.status,
          response: text,
        },
      };
    }

    const json = (await response.json()) as {
      data?: { checkout_url?: string };
    };

    return {
      checkoutUrl: json.data?.checkout_url,
      paymentInstructions: json.data ?? undefined,
    };
  } catch (error) {
    console.error("create-donation: Error calling Lenco API", error);
    return {
      paymentInstructions: {
        note: "Donation recorded but Lenco API call failed. Investigate network connectivity.",
      },
    };
  }
}

function parseNumber(value: string | undefined | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatCurrency(amount: number): string {
  return `K${amount.toLocaleString("en-ZM", { minimumFractionDigits: 0 })}`;
}

function generateReference(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `DON-${timestamp}-${random}`;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
