// supabase/functions/lenco-payments-validator/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Get env vars
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const lencoSecret = Deno.env.get("LENCO_WEBHOOK_SECRET");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase configuration in environment variables");
}

// Supabase client with service role (for inserts)
const supabase = createClient(supabaseUrl, serviceRoleKey);

Deno.serve(async (req) => {
  const incomingSecret = req.headers.get("x-lenco-secret");

  // Basic auth check
  if (!lencoSecret || !incomingSecret || incomingSecret !== lencoSecret) {
    await logWebhook({
      source: "lenco",
      event: null,
      payload: null,
      http_status: 401,
      error: "Invalid or missing x-lenco-secret",
    });

    return json(
      { error: "unauthorized" },
      401,
    );
  }

  let body: unknown = null;

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

    return json(
      { error: "invalid_json" },
      400,
    );
  }

  const event = (body as { event?: string | null } | null)?.event ?? null;

  // Try to log the payload
  try {
    await logWebhook({
      source: "lenco",
      event,
      payload: body,
      http_status: 200,
      error: null,
    });
  } catch (e) {
    console.error("DB insert failed:", e);
    // We still return 200 to Lenco so they don't retry endlessly
  }

  // Here you could add any business logic:
  // - update balances
  // - mark payment as completed
  // - etc.

  return json(
    { ok: true, message: "Webhook accepted" },
    200,
  );
});

// Helper: insert into webhook_logs
async function logWebhook(args: {
  source: string;
  event: string | null;
  payload: unknown;
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

// Helper: JSON response
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
