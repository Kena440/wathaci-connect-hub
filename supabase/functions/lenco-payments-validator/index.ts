// supabase/functions/lenco-payments-validator/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const MSISDN_REGEX = /^\+?[0-9]{9,15}$/;

const isValidMsisdn = (value: unknown): value is string =>
  typeof value === "string" && MSISDN_REGEX.test(value.trim());

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

  // TODO: Swap this shared-secret check for the official Lenco HMAC validation once
  // the signing algorithm is confirmed in production.
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

  const { event, reference, status } = extractEventDetails(body);

  if (!event || !reference) {
    await logWebhookEvent(body, 400, "Missing event or reference");
    return json({ ok: false, error: "missing_reference" }, 400);
  }

  if (!supabase) {
    console.error("lenco-payments-validator: Supabase client not configured");
    await logWebhookEvent(body, 500, "Supabase not configured");
    return json({ ok: false, error: "server_not_configured" }, 500);
  }

  try {
    const { data: donation, error: donationError } = await supabase
      .from("donations")
      .select("id, status, msisdn")
      .eq("lenco_reference", reference)
      .maybeSingle();

    if (donationError) {
      console.error("lenco-payments-validator: error fetching donation", donationError);
      await logWebhookEvent(body, 500, "Database error fetching donation");
      return json({ ok: false, error: "database_error" }, 500);
    }

    if (!donation) {
      await logWebhookEvent(body, 404, "Donation not found");
      return json({ ok: false, error: "donation_not_found" }, 404);
    }

    const normalizedStatus = normalizeLencoStatus(event, status);

    if (!normalizedStatus) {
      await logWebhookEvent(body, 202, "Ignored event");
      return json({ ok: true, message: "Event ignored" });
    }

    if (donation.status === normalizedStatus) {
      await logWebhookEvent(body, 200, null);
      return json({ ok: true, message: "Donation already in desired state" });
    }

    const webhookMsisdn = extractMsisdn(body);
    const updatePayload: Record<string, unknown> = {
      status: normalizedStatus,
      updated_at: new Date().toISOString(),
    };

    if (webhookMsisdn && webhookMsisdn !== donation.msisdn) {
      updatePayload.msisdn = webhookMsisdn;
    }

    const { error: updateError } = await supabase
      .from("donations")
      .update(updatePayload)
      .eq("id", donation.id);

    if (updateError) {
      console.error("lenco-payments-validator: failed to update donation", updateError);
      await logWebhookEvent(body, 500, "Failed to update donation status");
      return json({ ok: false, error: "update_failed" }, 500);
    }

    await logWebhookEvent(body, 200, null);
    return json({ ok: true, message: "Donation status updated", status: normalizedStatus });
  } catch (error) {
    console.error("lenco-payments-validator: unexpected error", error);
    await logWebhookEvent(body, 500, "Unexpected error");
    return json({ ok: false, error: "unexpected_error" }, 500);
  }
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

type LencoWebhook = {
  event?: string;
  data?: {
    reference?: string;
    status?: string;
  } & Record<string, unknown>;
  reference?: string;
  status?: string;
};

function extractEventDetails(payload: unknown): {
  event: string | null;
  reference: string | null;
  status: string | null;
} {
  if (!payload || typeof payload !== "object") {
    return { event: null, reference: null, status: null };
  }

  const body = payload as LencoWebhook;
  const event = typeof body.event === "string" ? body.event : null;
  const reference =
    typeof body.reference === "string"
      ? body.reference
      : typeof body.data?.reference === "string"
      ? body.data.reference
      : null;
  const status =
    typeof body.status === "string"
      ? body.status
      : typeof body.data?.status === "string"
      ? body.data.status
      : null;

  return { event, reference, status };
}

function extractMsisdn(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate =
    (payload as { data?: Record<string, unknown> }).data?.msisdn ??
    (payload as { data?: { customer?: { phone?: unknown } } }).data?.customer?.phone ??
    (payload as { msisdn?: unknown }).msisdn ??
    (payload as { customer?: { phone?: unknown } }).customer?.phone ??
    null;

  if (isValidMsisdn(candidate)) {
    return candidate.trim();
  }

  return null;
}

function normalizeLencoStatus(event: string | null, rawStatus: string | null):
  | "pending"
  | "completed"
  | "failed"
  | "cancelled"
  | null {
  const status = (rawStatus ?? event ?? "").toLowerCase();

  if (
    [
      "payment.completed",
      "payment.successful",
      "mobile_money.payment.successful",
      "successful",
      "completed",
      "success",
    ].includes(status)
  ) {
    return "completed";
  }

  if (
    [
      "payment.failed",
      "mobile_money.payment.failed",
      "failed",
      "declined",
      "error",
      "timeout",
    ].includes(status)
  ) {
    return "failed";
  }

  if (["payment.cancelled", "cancelled"].includes(status)) {
    return "cancelled";
  }

  if (
    [
      "payment.pending",
      "payment.initiated",
      "mobile_money.pending",
      "pending",
      "in_progress",
      "processing",
    ].includes(status)
  ) {
    return "pending";
  }

  return null;
}
