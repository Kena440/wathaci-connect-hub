// supabase/functions/create-donation/index.ts
// Edge Function: records a donation intent and boots a Lenco payment session.
// The live Lenco API call is intentionally encapsulated inside `initiateLencoPayment`
// so the integration team can swap in the production contract without touching
// validation or persistence logic.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type PaymentMethod = "mobile_money" | "card";

type CreateDonationRequest = {
  amount?: number;
  currency?: string;
  paymentMethod?: PaymentMethod;
  donorName?: string | null;
  donorEmail?: string | null;
  msisdn?: string | null;
  donorPhone?: string | null;
  donorUserId?: string | null;
  campaignId?: string | null;
  donateAnonymously?: boolean;
  message?: string | null;
  source?: string | null;
};

type LencoInitiationResponse = {
  checkoutUrl?: string | null;
  paymentInstructions?: Record<string, unknown> | null;
  raw?: unknown;
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

const MSISDN_REGEX = /^\+?[0-9]{9,15}$/;

const normalizeMsisdn = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("+")) {
    return trimmed.replace(/\s+/g, "");
  }

  const digits = trimmed.replace(/[^0-9]/g, "");
  if (!digits) return null;
  return `+${digits.replace(/^0+/, "")}`;
};

const isValidMsisdn = (value: string | null | undefined): value is string => {
  if (!value) return false;
  return MSISDN_REGEX.test(value);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: { message: "method_not_allowed" } }, 405);
  }

  if (!supabase) {
    console.error("create-donation: Supabase client not configured");
    return json({ ok: false, error: { message: "server_not_configured" } }, 500);
  }

  let payload: CreateDonationRequest;
  try {
    payload = (await req.json()) as CreateDonationRequest;
  } catch (error) {
    console.error("create-donation: invalid JSON", error);
    return json({ ok: false, error: { message: "invalid_json" } }, 400);
  }

  const amount = Number(payload.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return json(
      {
        ok: false,
        error: { message: "Amount must be a positive number.", code: "invalid_amount" },
      },
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

  const paymentMethod = normalizePaymentMethod(payload.paymentMethod);
  if (!paymentMethod) {
    return json(
      {
        ok: false,
        error: {
          message: "Payment method must be either mobile_money or card.",
          code: "invalid_payment_method",
        },
      },
      400
    );
  }

  const msisdn = normalizeMsisdn(payload.msisdn ?? payload.donorPhone ?? null);
  if (!isValidMsisdn(msisdn)) {
    return json(
      {
        ok: false,
        error: {
          message: "A valid MSISDN (mobile number with country code) is required to initiate payment.",
          code: "invalid_msisdn",
        },
      },
      400
    );
  }

  const currency =
    typeof payload.currency === "string" && payload.currency.trim()
      ? payload.currency.trim().toUpperCase()
      : "ZMW";

  const lencoReference = generateReference();
  const platformFeeAmount = roundCurrency((platformFeePercentage / 100) * amount);
  const netAmount = roundCurrency(amount - platformFeeAmount);

  let donorUserId = payload.donorUserId ?? null;
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ") && supabase) {
    const token = authHeader.slice(7);
    try {
      const { data: authUser, error: authError } = await supabase.auth.getUser(token);
      if (!authError && authUser?.user?.id) {
        donorUserId = authUser.user.id;
      }
    } catch (authError) {
      console.error("create-donation: failed to resolve authenticated user", authError);
    }
  }

  try {
    const { data: inserted, error: insertError } = await supabase
      .from("donations")
      .insert({
        campaign_id: payload.campaignId ?? null,
        msisdn,
        donor_user_id: donorUserId,
        donor_name: payload.donateAnonymously ? null : payload.donorName ?? null,
        is_anonymous: Boolean(payload.donateAnonymously),
        amount,
        currency,
        payment_method: paymentMethod,
        status: "pending",
        lenco_reference: lencoReference,
        platform_fee_amount: platformFeeAmount,
        net_amount: netAmount,
        message: payload.message ?? null,
        source: payload.source ?? "web",
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("create-donation: failed to insert donation", insertError);
      return json(
        { ok: false, error: { message: "Failed to create donation record." } },
        500
      );
    }

    const lencoResponse = await initiateLencoPayment({
      amount,
      currency,
      paymentMethod,
      reference: lencoReference,
      webhookUrl: Deno.env.get("LENCO_WEBHOOK_URL") ?? Deno.env.get("VITE_LENCO_WEBHOOK_URL"),
      donor: {
        name: payload.donorName ?? undefined,
        email: payload.donorEmail ?? undefined,
        phone: msisdn ?? undefined,
      },
      metadata: {
        source: payload.source ?? "web",
        campaignId: payload.campaignId ?? undefined,
        msisdn,
      },
    });

    return json({
      ok: true,
      data: {
        donationId: inserted.id,
        lencoReference,
        checkoutUrl: lencoResponse.checkoutUrl ?? null,
        paymentInstructions: lencoResponse.paymentInstructions ?? null,
        status: "pending",
      },
    });
  } catch (error) {
    console.error("create-donation: unexpected error", error);
    return json(
      {
        ok: false,
        error: { message: "unexpected_error", details: "An unexpected error occurred." },
      },
      500
    );
  }
});

async function initiateLencoPayment({
  amount,
  currency,
  paymentMethod,
  reference,
  webhookUrl,
  donor,
  metadata,
}: {
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  reference: string;
  webhookUrl: string | null | undefined;
  donor: { name?: string; email?: string; phone?: string };
  metadata?: Record<string, unknown>;
}): Promise<LencoInitiationResponse> {
  const lencoApiBase =
    Deno.env.get("LENCO_API_URL") ??
    Deno.env.get("VITE_LENCO_API_URL") ??
    "https://api.lenco.co/access/v2";
  const lencoSecret = Deno.env.get("LENCO_API_SECRET") ?? Deno.env.get("LENCO_SECRET");

  if (!lencoSecret) {
    console.warn("create-donation: Lenco API secret missing – returning instructions only");
    return {
      paymentInstructions: {
        note:
          "Lenco API credentials are missing. Configure LENCO_API_SECRET/LENCO_SECRET to enable live payments.",
        reference,
      },
    };
  }

  // Base payload that aligns with Lenco's payment initiation contract. Update this
  // structure as soon as the production schema is finalised.
  const payload: Record<string, unknown> = {
    amount,
    currency,
    reference,
    payment_method: paymentMethod,
    callback_url: webhookUrl ?? null,
    customer: {
      name: donor.name ?? "Wathaci Connect Donor",
      email: donor.email ?? null,
      phone: donor.phone ?? null,
    },
    metadata: {
      platform: "wathaci-connect",
      environment: Deno.env.get("DENO_DEPLOYMENT_ID") ? "production" : "local", // helpful for support
      ...(metadata ?? {}),
    },
  };

  if (paymentMethod === "mobile_money") {
    payload.mobile_money = {
      phone: donor.phone,
      // provider: "MTN" // Optional: supply explicit provider once decided.
    };
  }

  // NOTE: Card payments typically require a redirect to Lenco's hosted checkout.
  // When the card gateway exposes additional options (3DS, saved cards, etc.),
  // extend this payload accordingly.

  const endpointUrl = buildLencoUrl(lencoApiBase, "/payments/initiate");

  try {
    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lencoSecret}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("create-donation: Lenco API error", response.status, errorText);
      return {
        paymentInstructions: {
          note: "Donation recorded but Lenco payment session could not be created.",
          reference,
          status: response.status,
          response: errorText,
        },
      };
    }

    const body = (await response.json()) as {
      data?: { checkout_url?: string | null; [key: string]: unknown };
      checkout_url?: string;
    };

    const checkoutUrl =
      body.data?.checkout_url ??
      (typeof body.checkout_url === "string" ? body.checkout_url : null);

    const instructions =
      paymentMethod === "mobile_money"
        ? {
            note: "Check your phone and approve the Mobile Money prompt to finish the donation.",
            reference,
            ...(body.data ?? {}),
          }
        : (body.data ?? null);

    return {
      checkoutUrl,
      paymentInstructions: instructions,
      raw: body,
    };
  } catch (error) {
    console.error("create-donation: Error calling Lenco API", error);
    return {
      paymentInstructions: {
        note: "Donation recorded but Lenco API call failed. Please retry the payment from the donor dashboard.",
        reference,
      },
    };
  }
}

function parseNumber(value: string | undefined | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundCurrency(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function formatCurrency(amount: number): string {
  return `K${amount.toLocaleString("en-ZM", { minimumFractionDigits: 0 })}`;
}

function generateReference(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `DON-${timestamp}-${random}`;
}

function normalizePaymentMethod(
  method: string | undefined | null
): PaymentMethod | null {
  if (!method) return null;
  const normalized = method.toLowerCase();
  if (normalized === "mobile_money" || normalized === "mobile-money") {
    return "mobile_money";
  }
  if (normalized === "card") return "card";
  return null;
}

function buildLencoUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
