import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[bootstrap-profile] missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment");
  throw new Error("bootstrap-profile: missing env");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type Body = {
  userId: string;
  email?: string | null;
  full_name?: string | null;
  msisdn?: string | null;
  profile_type?: string | null;
};

type JsonRecord = Record<string, unknown> | null;

const json = (obj: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const logUserEvent = async (
  userId: string,
  eventType: string,
  email: string | null | undefined,
  metadata: JsonRecord = null
) => {
  const emailValue = email ?? `missing-email-${userId}@example.invalid`;

  const { error } = await supabaseAdmin.from("user_events").insert({
    user_id: userId,
    event_type: eventType,
    email: emailValue,
    metadata,
    // Maintain legacy columns for backward compatibility with existing analytics.
    kind: eventType,
    payload: metadata,
  });

  if (error) {
    console.error(`[bootstrap-profile] failed to log user_event ${eventType}`, error);
  }
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "Only POST" }, 405);
  }

  let body: Body | null = null;

  try {
    body = (await req.json()) as Body;
  } catch (error) {
    console.error("[bootstrap-profile] invalid JSON", error);
    return json({ error: "invalid json" }, 400);
  }

  if (!body || typeof body !== "object") {
    return json({ error: "invalid body" }, 400);
  }

  const { userId, email, full_name, msisdn, profile_type } = body;

  if (!userId) {
    return json({ error: "userId required" }, 400);
  }

  await logUserEvent(
    userId,
    "bootstrap_profile_start",
    email,
    {
      email,
      msisdn,
      profile_type,
    }
  );

  if (!msisdn || msisdn.trim() === "") {
    await logUserEvent(
      userId,
      "bootstrap_profile_missing_msisdn",
      email,
      {
        email,
        full_name,
        msisdn,
      }
    );
  }

  try {
    const ensureResult = await supabaseAdmin.rpc("ensure_profile_exists", {
      p_user_id: userId,
      p_email: email ?? null,
      p_full_name: full_name ?? null,
      p_msisdn: msisdn,
      p_profile_type: profile_type ?? "customer",
    });

    if (ensureResult.error) {
      console.error("[bootstrap-profile] ensure_profile_exists error", ensureResult.error);
      await logUserEvent(userId, "bootstrap_profile_error", email, {
        error: ensureResult.error.message,
        hint: ensureResult.error.hint,
        code: ensureResult.error.code,
      });

      return json({ error: "failed to ensure profile" }, 500);
    }

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("[bootstrap-profile] profile select error", error);
      await logUserEvent(userId, "bootstrap_profile_error", email, { error: error.message, code: error.code });

      return json({ error: "failed to read profile" }, 500);
    }

    await logUserEvent(userId, "bootstrap_profile_ok", email, {
      profile_id: profile.id,
    });

    return json({ ok: true, profile }, 200);
  } catch (error) {
    console.error("[bootstrap-profile] unexpected error", error);
    await logUserEvent(userId, "bootstrap_profile_error", email, { error: String(error) });

    return json({ error: "internal error" }, 500);
  }
});
