import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const BASE_URL = "https://api.openai.com/v1";

const USER_API_KEY = Deno.env.get("WATHACI_CONNECT_OPENAI");
const ADMIN_API_KEY =
  Deno.env.get("WATHACI_CONNECT_ADMIN_KEY_OPENAI") ?? USER_API_KEY;

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch (error) {
      console.error("Invalid JSON payload", error);
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const isAdmin =
      body?.admin === true ||
      (typeof body?.mode === "string" && body.mode.toLowerCase() === "admin");

    const apiKeyToUse = isAdmin ? ADMIN_API_KEY ?? USER_API_KEY : USER_API_KEY;

    if (!Array.isArray(body?.messages)) {
      return new Response(
        JSON.stringify({ error: "Request must include an array of messages" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (!apiKeyToUse) {
      console.error("Missing OpenAI API key");
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const upstreamRes = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKeyToUse}`,
      },
      body: JSON.stringify({
        model: body?.model || "gpt-4.1-mini",
        messages: body?.messages,
        temperature: body?.temperature ?? 0.2,
        max_tokens: body?.max_tokens ?? 512,
      }),
    });

    if (!upstreamRes.ok) {
      const text = await upstreamRes.text();
      console.error("OpenAI upstream error:", upstreamRes.status, text);
      return new Response(
        JSON.stringify({
          error: "Upstream OpenAI error",
          status: upstreamRes.status,
        }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const data = await upstreamRes.json();

    return new Response(JSON.stringify(data), {
      status: upstreamRes.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Agent function internal error", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

export const config = {
  verifyJWT: false,
};
