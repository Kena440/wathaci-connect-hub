// supabase/functions/lenco-payments-validator/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 🔑 One hard-coded secret for now (DEV ONLY)
const EXPECTED_SECRET = "MY-DEV-LENCO-SECRET-123";

// If you still want DB logging, keep these two:
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

Deno.serve(async (req) => {
  const incomingSecret = req.headers.get("x-lenco-secret");

  // Simple auth check
  if (incomingSecret !== EXPECTED_SECRET) {
    return json(
      {
        ok: false,
        error: "unauthorized",
        reason: "x-lenco-secret header is missing or incorrect",
      },
      401,
    );
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  // OPTIONAL: log webhook payload to DB (comment out if you don’t want it)
  try {
    await supabase.from("webhook_logs").insert({
      source: "lenco",
      event: body?.event ?? null,
      payload: body,
      http_status: 200,
      error: null,
    });
  } catch (e) {
    console.error("Error inserting webhook_logs:", e);
  }

  // Respond OK
  return json(
    {
      ok: true,
      message: "Webhook accepted (dev hard-coded secret)",
      body,
    },
    200,
  );
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
