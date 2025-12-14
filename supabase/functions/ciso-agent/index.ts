// supabase/functions/ciso-agent/index.ts
// Legacy compatibility wrapper for the Ciso AI agent. This function now proxies requests to the
// canonical agent endpoint at /functions/v1/agent so we only maintain a single implementation.
// Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY. Optional:
// CISO_AGENT_FORWARD_URL to override the proxy target.
// Deno runtime

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const PROXY_TARGET = Deno.env.get("CISO_AGENT_FORWARD_URL")?.trim();

// Optional: name of RPC / table for KB search
const CISO_MATCH_RPC = Deno.env.get("CISO_MATCH_RPC") ?? "match_ciso_documents";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type ChatRequest = {
  query: string;
  user_id?: string;
  context?: Record<string, unknown>;
};

type ChatResponse = {
  answer: string;
  source?: "knowledge_base" | "openai" | "mixed";
  references?: Array<{ id: string; score: number }>;
};

async function callOpenAI(prompt: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    return "Ciso is not fully configured yet (missing OpenAI key). Please contact support@wathaci.com.";
  }

  const body = {
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: `
You are Ciso, the AI assistant for the Wathaci platform.
Be concise, friendly and practical.
Explain things clearly for African SMEs, investors, professionals, donors and government users.
If something relates to Wathaci-specific flows (accounts, onboarding, payments, profiles),
answer as if you are part of the platform and give step-by-step guidance.
Don't mention that you are using OpenAI.
        `.trim(),
      },
      { role: "user", content: prompt },
    ],
  };

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    console.error("OpenAI error:", await resp.text());
    return "I’m having trouble reaching my AI brain right now. Please try again in a moment.";
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? "I could not generate a response.";
}

async function searchKnowledgeBase(query: string) {
  try {
    // 1. Create embedding using OpenAI (or any other embeddings service you prefer)
    const embeddingResp = await fetch(
      "https://api.openai.com/v1/embeddings",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: query,
        }),
      },
    );

    if (!embeddingResp.ok) {
      console.error("Embedding error:", await embeddingResp.text());
      return { matches: [], error: "embedding_failed" as const };
    }

    const embeddingData = await embeddingResp.json();
    const embedding = embeddingData.data?.[0]?.embedding as number[] | undefined;
    if (!embedding) return { matches: [], error: "no_embedding" as const };

    // 2. Call your match RPC (you’ll add this below in SQL)
    const { data, error } = await supabase.rpc(CISO_MATCH_RPC, {
      query_embedding: embedding,
      similarity_threshold: 0.75,
      match_count: 5,
    });

    if (error) {
      console.error("KB search RPC error:", error);
      return { matches: [], error: "rpc_error" as const };
    }

    return { matches: data ?? [], error: null };
  } catch (err) {
    console.error("KB search exception:", err);
    return { matches: [], error: "exception" as const };
  }
}

function buildAnswerFromMatches(matches: any[], query: string): string {
  const contextText = matches
    .map((m) => m.content ?? m.chunk ?? "")
    .filter(Boolean)
    .join("\n\n---\n\n");

  return `
Using Wathaci's internal knowledge base, here is a helpful answer:

Question:
${query}

Relevant information:
${contextText}

Now answer in a concise way (3–7 short paragraphs, plus bullets if useful),
focused on practical steps for the user.
`.trim();
}

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Only POST allowed", { status: 405 });
  }

  try {
    const origin = new URL(req.url).origin;
    const proxyTarget = PROXY_TARGET || `${origin}/agent`;
    const rawBody = await req.text();

    // First try to forward to the canonical agent implementation
    try {
      const proxied = await fetch(proxyTarget, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: req.headers.get("Authorization") ?? "",
          "x-ciso-proxy": "ciso-agent",
        },
        body: rawBody,
      });

      const proxiedBody = await proxied.text();
      return new Response(proxiedBody, {
        status: proxied.status,
        headers: {
          "Content-Type": proxied.headers.get("content-type") ?? "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (proxyError) {
      console.error("[ciso-agent] Proxy to /agent failed, falling back to legacy handler", proxyError);
    }

    const body = rawBody ? ((JSON.parse(rawBody) as ChatRequest | null)) : null;
    const query = body?.query?.trim();

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Missing query" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // 1) Search KB first
    const { matches, error: kbError } = await searchKnowledgeBase(query);
    let answer: string;
    let source: ChatResponse["source"] = "openai";
    let references: ChatResponse["references"] = [];

    if (matches && matches.length > 0 && !kbError) {
      const kbPrompt = buildAnswerFromMatches(matches, query);
      answer = await callOpenAI(kbPrompt);
      source = "knowledge_base";
      references = matches.map((m: any) => ({
        id: m.id ?? m.document_id ?? "",
        score: m.similarity ?? m.score ?? 0,
      }));
    } else {
      // 2) Fallback: general OpenAI answer
      answer = await callOpenAI(query);
      source = "openai";
    }

    const payload: ChatResponse = { answer, source, references };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("Ciso agent fatal error:", err);
    return new Response(
      JSON.stringify({
        error: "ciso_agent_error",
        message: "Ciso failed to answer this question.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
});
