import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Env vars
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const lencoSecret = Deno.env.get("LENCO_WEBHOOK_SECRET");

const supabase = createClient(supabaseUrl, serviceRoleKey);

Deno.serve(async (req) => {
  const incomingSecret = req.headers.get("x-lenco-secret");

  if (!lencoSecret || !incomingSecret || incomingSecret !== lencoSecret) {
    await logWebhook({
      source: "lenco",
      event: null,
      payload: null,
      http_status: 401,
      error: "Invalid or missing x-lenco-secret",
    });

    return json({ error: "unauthorized" }, 401);
  }

  let body: any = null;

  try {
    body = await req.json();
  } catch (_e) {
    await logWebhook({
      source: "lenco",
      event: null,
      payload: null,
      http_status: 400,
      error: "Invalid JSON body",
    });

    return json({ error: "invalid_json" }, 400);
  }

  const event = body?.event ?? null;

  // Always log the raw webhook
  await logWebhook({
    source: "lenco",
    event,
    payload: body,
    http_status: 200,
    error: null,
  }).catch((e) => console.error("logWebhook failed:", e));

  // ---- Per-event handling ----
  if (event === "payment.completed") {
    await handlePaymentCompleted(body).catch((e) =>
      console.error("handlePaymentCompleted failed:", e)
    );
  } else {
    console.log("Unhandled event type:", event);
  }

  return json({ ok: true, message: "Webhook accepted" }, 200);
});

// Handle payment.completed event with idempotency
async function handlePaymentCompleted(body: any) {
  const data = body?.data ?? {};

  const reference: string | undefined = data.reference;
  const amountRaw = data.amount;
  const currency: string | undefined = data.currency;
  const status: string | undefined = data.status;

  if (!reference) {
    console.warn("payment.completed without reference – skipping");
    return;
  }

  // Idempotency: if this reference already exists, don't insert again
  const { data: existing, error: existingErr } = await supabase
    .from("lenco_payments")
    .select("id, status")
    .eq("reference", reference)
    .maybeSingle();

  if (existingErr) {
    console.error("Error checking existing payment:", existingErr);
  }

  if (existing) {
    console.log("Payment already processed, reference:", reference);
    return;
  }

  // Normalise amount
  let amount: number | null = null;
  if (typeof amountRaw === "number") {
    amount = amountRaw;
  } else if (typeof amountRaw === "string") {
    const parsed = Number(amountRaw);
    amount = isNaN(parsed) ? null : parsed;
  }

  const { error: insertErr } = await supabase.from("lenco_payments").insert({
    reference,
    amount,
    currency,
    status,
    raw_payload: body,
  });

  if (insertErr) {
    console.error("Error inserting lenco_payments:", insertErr);
    throw insertErr;
  }

  console.log("Stored new payment with reference:", reference);
}

// Log all webhooks
async function logWebhook(args: {
  source: string;
  event: string | null;
  payload: any;
  http_status: number;
  error: string | null;
}) {
  const { source, event, payload, http_status, error } = args;

  const { error: dbError } = await supabase.from("webhook_logs").insert({
    source,
    event,
    payload,
    http_status,
    error,
  });

  if (dbError) {
    console.error("Error inserting webhook log:", dbError);
    throw dbError;
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
