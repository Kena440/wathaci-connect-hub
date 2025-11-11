// supabase/functions/lenco-payments-validator/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-lenco-secret",
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

  const providedSecret = req.headers.get("x-lenco-secret");
  if (!providedSecret) {
    await logWebhookEvent(null, 401, "Missing x-lenco-secret header");
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
