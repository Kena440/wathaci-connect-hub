// supabase/functions/lenco-payments-validator/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-lenco-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase =
  supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const expectedSecret =
    Deno.env.get("LENCO_FUNCTION_SECRET") ?? Deno.env.get("LENCO_WEBHOOK_SECRET") ?? "";

  if (!expectedSecret) {
    console.error("lenco-payments-validator: Missing LENCO_FUNCTION_SECRET/LENCO_WEBHOOK_SECRET");
    return json({ ok: false, error: "server_not_configured" }, 500);
  }

  const providedSecret = req.headers.get("x-lenco-signature");
  if (!providedSecret) {
    await logWebhookEvent(null, 401, "Missing x-lenco-signature header");
    return json({ ok: false, error: "Invalid signature" }, 401);
  }

  if (!timingSafeEqual(expectedSecret, providedSecret)) {
    await logWebhookEvent(null, 401, "Secret mismatch");
    return json({ ok: false, error: "Invalid signature" }, 401);
  }

  const rawBody = await req.text();
  if (!rawBody) {
    await logWebhookEvent(null, 400, "Empty payload");
    return json({ ok: false, error: "Invalid JSON payload" }, 400);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch (error) {
    console.error("lenco-payments-validator: Failed to parse JSON", error);
    await logWebhookEvent(null, 400, "Invalid JSON payload");
    return json({ ok: false, error: "Invalid JSON payload" }, 400);
  }

  await logWebhookEvent(body, 200, null);

  // Process the webhook event
  await processWebhookEvent(body);

  return json({ ok: true, message: "Webhook accepted", body });
});

async function logWebhookEvent(payload: unknown, httpStatus: number, error: string | null) {
  if (!supabase) {
    return;
  }

  try {
    const event = typeof payload === "object" && payload !== null
      ? (payload as { event?: unknown }).event ?? null
      : null;

    await supabase.from("webhook_logs").insert({
      source: "lenco",
      event,
      payload,
      http_status: httpStatus,
      error,
    });
  } catch (insertError) {
    console.error("lenco-payments-validator: Error inserting webhook log", insertError);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Process webhook event and update relevant records
 * Handles both regular payments and donations
 */
async function processWebhookEvent(payload: unknown) {
  if (!supabase) {
    console.error("lenco-payments-validator: Supabase client not initialized");
    return;
  }

  try {
    // Extract webhook data
    const webhookData = payload as {
      event?: string;
      data?: {
        reference?: string;
        status?: string;
        amount?: number;
        currency?: string;
        id?: string;
        gateway_response?: unknown;
        paid_at?: string;
        metadata?: {
          transaction_type?: string;
          donation_id?: string;
        };
      };
    };

    const event = webhookData.event;
    const data = webhookData.data;

    if (!event || !data || !data.reference) {
      console.log("lenco-payments-validator: Missing required webhook data");
      return;
    }

    const reference = data.reference;
    const status = data.status?.toLowerCase();
    const transactionType = data.metadata?.transaction_type;

    console.log(`Processing webhook for reference: ${reference}, status: ${status}, type: ${transactionType}`);

    // Determine if this is a donation or regular payment
    const isDonation = transactionType === "donation" || reference.startsWith("DON-");

    if (isDonation) {
      // Handle donation webhook
      await processDonationWebhook(reference, status, data);
    } else {
      // Handle regular payment webhook (existing logic)
      await processPaymentWebhook(reference, status, data);
    }
  } catch (error) {
    console.error("lenco-payments-validator: Error processing webhook", error);
  }
}

/**
 * Process donation-specific webhook
 */
async function processDonationWebhook(
  reference: string,
  status: string | undefined,
  data: {
    id?: string;
    amount?: number;
    currency?: string;
    gateway_response?: unknown;
    paid_at?: string;
  }
) {
  if (!supabase) return;

  try {
    // Check if donation exists and get current status
    const { data: existingDonation, error: fetchError } = await supabase
      .from("donations")
      .select("id, status")
      .eq("lenco_reference", reference)
      .single();

    if (fetchError || !existingDonation) {
      console.error(`Donation not found for reference: ${reference}`, fetchError);
      return;
    }

    // Idempotency check: don't re-process completed donations
    if (existingDonation.status === "completed") {
      console.log(`Donation ${reference} already completed, skipping`);
      return;
    }

    // Map Lenco status to donation status
    let donationStatus: string;
    if (status === "success" || status === "completed") {
      donationStatus = "completed";
    } else if (status === "failed") {
      donationStatus = "failed";
    } else {
      donationStatus = "pending";
    }

    // Update donation record
    const { error: updateError } = await supabase
      .from("donations")
      .update({
        status: donationStatus,
        lenco_transaction_id: data.id,
        gateway_response: data.gateway_response,
        updated_at: new Date().toISOString(),
      })
      .eq("lenco_reference", reference);

    if (updateError) {
      console.error(`Failed to update donation ${reference}`, updateError);
    } else {
      console.log(`Successfully updated donation ${reference} to status: ${donationStatus}`);
    }
  } catch (error) {
    console.error("Error processing donation webhook", error);
  }
}

/**
 * Process regular payment webhook (existing payments table)
 */
async function processPaymentWebhook(
  reference: string,
  status: string | undefined,
  data: {
    id?: string;
    amount?: number;
    currency?: string;
    gateway_response?: unknown;
    paid_at?: string;
  }
) {
  if (!supabase) return;

  try {
    // Check if payment exists
    const { data: existingPayment, error: fetchError } = await supabase
      .from("payments")
      .select("id, status")
      .eq("reference", reference)
      .single();

    if (fetchError || !existingPayment) {
      console.log(`Payment not found for reference: ${reference}`);
      return;
    }

    // Idempotency check
    if (existingPayment.status === "completed") {
      console.log(`Payment ${reference} already completed, skipping`);
      return;
    }

    // Map status
    const paymentStatus = status === "success" || status === "completed" 
      ? "completed" 
      : status === "failed" 
      ? "failed" 
      : "pending";

    // Update payment record
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        status: paymentStatus,
        lenco_transaction_id: data.id,
        gateway_response: data.gateway_response,
        paid_at: data.paid_at,
        updated_at: new Date().toISOString(),
      })
      .eq("reference", reference);

    if (updateError) {
      console.error(`Failed to update payment ${reference}`, updateError);
    } else {
      console.log(`Successfully updated payment ${reference} to status: ${paymentStatus}`);
    }
  } catch (error) {
    console.error("Error processing payment webhook", error);
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
