import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    : null;

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  if (!supabase) {
    console.error("fetch-sources: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return json({ ok: false, error: "server_not_configured" }, 500);
  }

  const url = new URL(req.url);
  const names = url.searchParams.get("names");
  const targetNames = names
    ?.split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  const query = supabase
    .from("backups.trigger_function_defs")
    .select("name,definition,created_at")
    .order("name");

  if (targetNames && targetNames.length > 0) {
    query.in("name", targetNames);
  }

  const { data, error } = await query;

  if (error) {
    console.error("fetch-sources: failed to read trigger_function_defs", error);
    return json({ ok: false, error: "failed_to_read_sources", hint: error.message }, 500);
  }

  return json({ ok: true, count: data.length, functions: data });
});
