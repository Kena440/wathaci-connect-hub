import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "[agent] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.",
  );
}

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
    },
  })
  : null;

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type AgentRequestBody = {
  model?: string;
  messages?: ChatMessage[];
  admin?: boolean;
  mode?: string;
  context?: {
    role?: string;
    flow?: string;
    step?: string;
    lastError?: string;
    extra?: Record<string, unknown>;
  };
};

function getLastUserMessageContent(messages: ChatMessage[] | undefined): string {
  if (!messages || messages.length === 0) return "";
  // scan from end to find the last "user" message
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      return messages[i].content || "";
    }
  }
  // fallback: just return last message content
  return messages[messages.length - 1]?.content ?? "";
}

/**
 * A simple heuristic to build a search query for wathaci_knowledge.
 * For now: we just use the last user message content, trimmed and truncated.
 * Later you can parse structured "CONTEXT (JSON)" if you want more precision.
 */
function buildKnowledgeSearchQuery(lastUserContent: string): string {
  const trimmed = (lastUserContent || "").trim();

  if (!trimmed) return "wathaci general overview";

  // Limit length to avoid very long full-text queries
  const maxLen = 300;
  const shortened = trimmed.length > maxLen
    ? trimmed.slice(0, maxLen)
    : trimmed;

  return shortened;
}

/**
 * Fetch relevant WATHACI knowledge base entries from public.wathaci_knowledge.
 * We use full-text search on search_document and filter to active rows.
 */
async function fetchKnowledgeSnippets(
  searchQuery: string,
  context?: {
    role?: string;
    flow?: string;
    step?: string;
  },
) {
  if (!supabaseAdmin) {
    console.warn(
      "[agent] supabaseAdmin not initialised; skipping knowledge fetch.",
    );
    return [] as any[];
  }

  const normalizedRole = (context?.role || "").toLowerCase();

  // Build an audience filter: entries for "all" or this specific role.
  const audiences =
    normalizedRole && normalizedRole !== "all"
      ? ["all", normalizedRole]
      : ["all"];

  // Map flow -> category hint
  const flow = (context?.flow || "").toLowerCase();
  let categoryHint: string | null = null;

  if (flow === "signup" || flow === "onboarding") {
    categoryHint = "signup";
  } else if (flow === "checkout" || flow === "payments" || flow === "billing") {
    categoryHint = "payments";
  } else if (flow === "matching") {
    categoryHint = "matching";
  } else if (flow === "support") {
    categoryHint = "support";
  } else {
    categoryHint = null;
  }

  // We use textSearch on the generated search_document column.
  // If searchQuery is empty, we just fetch a generic overview.
  let query = supabaseAdmin
    .from("wathaci_knowledge")
    .select("slug, title, category, audience, content, tags")
    .eq("is_active", true)
    .in("audience", audiences)
    .limit(5);

  if (categoryHint) {
    query = query.eq("category", categoryHint);
  }

  if (searchQuery && searchQuery.trim().length > 0) {
    query = query.textSearch("search_document", searchQuery, {
      type: "websearch",
    });
  }

  const { data, error } = await query;

  if (error) {
    console.error("[agent] Error fetching knowledge:", error);
    return [] as any[];
  }

  return data ?? [];
}

/**
 * Format knowledge rows into a single system message string.
 */
function formatKnowledgeAsSystemMessage(snippets: any[]): string {
  if (!snippets || snippets.length === 0) {
    return "";
  }

  const parts = snippets.map((row: any, index: number) => {
    const header = `# Knowledge Snippet ${index + 1}: ${row.title}`;
    const meta = `- slug: ${row.slug}\n- category: ${row.category}\n- audience: ${row.audience}\n- tags: ${(row.tags || []).join(", ") || "none"}`;
    const body = row.content ?? "";
    return `${header}\n${meta}\n\n${body}`;
  });

  return `You have access to the following internal WATHACI product knowledge. Use it to answer the user accurately. If anything in your prior assumptions conflicts with this knowledge, prefer this knowledge.

${parts.join("\n\n---\n\n")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }

  try {
    const body = (await req.json()) as AgentRequestBody;
    const { model, messages, admin, mode, context } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing or empty messages array" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const isAdmin =
      admin === true ||
      (typeof mode === "string" && mode.toLowerCase() === "admin");

    // Decide which OpenAI key to use
    const USER_API_KEY = Deno.env.get("WATHACI_CONNECT_OPENAI");
    const ADMIN_API_KEY =
      Deno.env.get("WATHACI_CONNECT_ADMIN_KEY_OPENAI") ?? USER_API_KEY;

    const OPENAI_API_KEY = isAdmin ? ADMIN_API_KEY : USER_API_KEY;

    if (!OPENAI_API_KEY) {
      console.error(
        "[agent] Missing OpenAI API key env for mode:",
        isAdmin ? "admin" : "user",
      );
      return new Response(
        JSON.stringify({ error: "Server misconfigured: missing OpenAI key" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    // 1) Extract last user message content
    const lastUserContent = getLastUserMessageContent(messages);

    // 2) Optional: detect user role from the message content
    // Prefer context.role if provided; otherwise, infer from text
    let roleFromContext = context?.role;
    if (!roleFromContext || roleFromContext === "guest" || roleFromContext === "other") {
      const lower = lastUserContent.toLowerCase();
      if (lower.includes("sme")) roleFromContext = "sme";
      else if (lower.includes("investor")) roleFromContext = "investor";
      else if (lower.includes("donor")) roleFromContext = "donor";
      else if (lower.includes("government")) roleFromContext = "government";
      else if (lower.includes("professional") || lower.includes("freelancer")) {
        roleFromContext = "professional";
      }
    }

    // Merge role back into context object to keep everything together
    const effectiveContext = {
      ...context,
      role: roleFromContext,
    };

    // 3) Build a search query and fetch knowledge snippets
    const searchQuery = buildKnowledgeSearchQuery(lastUserContent);
    const knowledgeSnippets = await fetchKnowledgeSnippets(
      searchQuery,
      effectiveContext,
    );

    // 4) Build final messages array to send to OpenAI
    const openAiMessages: ChatMessage[] = [...messages];

    // If we found any knowledge, prepend it as a system message BEFORE the existing system prompt
    if (knowledgeSnippets.length > 0) {
      const knowledgeSystemContent = formatKnowledgeAsSystemMessage(
        knowledgeSnippets,
      );

      // Insert at the start, but after any existing system messages if needed
      // Simplest approach: just unshift a new system message.
      openAiMessages.unshift({
        role: "system",
        content: knowledgeSystemContent,
      });
    }

    // 5) Call OpenAI /chat/completions
    const upstreamRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: model || "gpt-4.1-mini",
          messages: openAiMessages,
          temperature: 0.2,
          max_tokens: 512,
        }),
      },
    );

    if (!upstreamRes.ok) {
      const text = await upstreamRes.text();
      console.error("[agent] OpenAI upstream error:", upstreamRes.status, text);
      return new Response(
        JSON.stringify({
          error: "Upstream OpenAI error",
          status: upstreamRes.status,
          details: text,
        }),
        {
          status: 502,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const data = await upstreamRes.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (err) {
    console.error("[agent] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error in agent function" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});
