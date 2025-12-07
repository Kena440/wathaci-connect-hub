// supabase/functions/agent/index.ts

// Minimal types for chat messages
type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type AgentContext = {
  role?: string;
  flow?: string;
  step?: string;
  lastError?: string;
  extra?: Record<string, unknown>;
};

type AgentRequestBody = {
  model?: string;
  messages?: ChatMessage[];
  admin?: boolean;
  mode?: string;
  context?: AgentContext;
};

type ToolCallEnvelope = {
  tool: string;
  params: Record<string, unknown>;
};

type ToolResultEnvelope = {
  tool: string;
  ok: boolean;
  result?: unknown;
  error?: string;
};

// Supabase client for Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---- Supabase admin client ----

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "[agent] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.",
  );
}

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
  : null;

// ---- Helper: get last user message content ----

function getLastUserMessageContent(messages: ChatMessage[] | undefined): string {
  if (!messages || messages.length === 0) return "";
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      return messages[i].content || "";
    }
  }
  return messages[messages.length - 1]?.content ?? "";
}

// ---- Helper: build search query for knowledge ----

function buildKnowledgeSearchQuery(lastUserContent: string): string {
  const trimmed = (lastUserContent || "").trim();
  if (!trimmed) return "wathaci general overview";

  const maxLen = 300;
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed;
}

// ---- Knowledge fetcher ----

async function fetchKnowledgeSnippets(
  searchQuery: string,
  context?: AgentContext,
) {
  if (!supabaseAdmin) {
    console.warn(
      "[agent] supabaseAdmin not initialised; skipping knowledge fetch.",
    );
    return [];
  }

  const normalizedRole = (context?.role || "").toLowerCase();

  const audiences =
    normalizedRole && normalizedRole !== "all"
      ? ["all", normalizedRole]
      : ["all"];

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
    return [];
  }

  return data ?? [];
}

function formatKnowledgeAsSystemMessage(snippets: any[]): string {
  if (!snippets || snippets.length === 0) {
    return "";
  }

  const parts = snippets.map((row: any, index: number) => {
    const header = `# Knowledge Snippet ${index + 1}: ${row.title}`;
    const meta =
      `- slug: ${row.slug}\n- category: ${row.category}\n- audience: ${row.audience}\n- tags: ${(row.tags || []).join(", ") || "none"}`;
    const body = row.content ?? "";
    return `${header}\n${meta}\n\n${body}`;
  });

  return `You have access to the following internal WATHACI product knowledge. Use it to answer the user accurately. If anything in your prior assumptions conflicts with this knowledge, prefer this knowledge.

${parts.join("\n\n---\n\n")}`;
}

// ---- Tools wrapping existing Supabase functions ----

async function toolGetProfileByEmail(
  params: Record<string, unknown>,
): Promise<ToolResultEnvelope> {
  if (!supabaseAdmin) {
    return {
      tool: "get_profile_by_email",
      ok: false,
      error: "supabaseAdmin not initialised",
    };
  }

  const email = (params.email ?? params.userEmail ?? "").toString().trim();

  if (!email) {
    return {
      tool: "get_profile_by_email",
      ok: false,
      error: "Missing required param: email",
    };
  }

  // TODO: Adjust body shape to match your get-profile function
  const { data, error } = await supabaseAdmin.functions.invoke("get-profile", {
    body: { email },
  });

  if (error) {
    console.error("[agent/tools] get_profile_by_email error:", error);
    return {
      tool: "get_profile_by_email",
      ok: false,
      error: error.message ?? "Unknown error from get-profile",
    };
  }

  return {
    tool: "get_profile_by_email",
    ok: true,
    result: data,
  };
}

async function toolCheckLencoPaymentByRef(
  params: Record<string, unknown>,
): Promise<ToolResultEnvelope> {
  if (!supabaseAdmin) {
    return {
      tool: "check_lenco_payment_by_ref",
      ok: false,
      error: "supabaseAdmin not initialised",
    };
  }

  const reference = (params.reference ?? params.ref ?? "").toString().trim();

  if (!reference) {
    return {
      tool: "check_lenco_payment_by_ref",
      ok: false,
      error: "Missing required param: reference",
    };
  }

  // TODO: Adjust body to match lenco-payments function contract
  const { data, error } = await supabaseAdmin.functions.invoke(
    "lenco-payments",
    {
      body: {
        mode: "admin-check",
        reference,
      },
    },
  );

  if (error) {
    console.error("[agent/tools] check_lenco_payment_by_ref error:", error);
    return {
      tool: "check_lenco_payment_by_ref",
      ok: false,
      error: error.message ?? "Unknown error from lenco-payments",
    };
  }

  return {
    tool: "check_lenco_payment_by_ref",
    ok: true,
    result: data,
  };
}

async function runTool(call: ToolCallEnvelope): Promise<ToolResultEnvelope> {
  switch (call.tool) {
    case "get_profile_by_email":
      return await toolGetProfileByEmail(call.params);
    case "check_lenco_payment_by_ref":
      return await toolCheckLencoPaymentByRef(call.params);
    default:
      return {
        tool: call.tool,
        ok: false,
        error: `Unknown tool: ${call.tool}`,
      };
  }
}

// ---- Helper: extract TOOL_CALL from admin model text ----

function extractToolCallFromText(text: string): ToolCallEnvelope | null {
  if (!text) return null;

  const marker = "TOOL_CALL:";
  const idx = text.indexOf(marker);
  if (idx === -1) return null;

  const afterMarker = text.slice(idx + marker.length).trim();
  if (!afterMarker) return null;

  try {
    const jsonStart = afterMarker.indexOf("{");
    if (jsonStart === -1) return null;

    const jsonString = afterMarker.slice(jsonStart);
    const parsed = JSON.parse(jsonString);

    if (
      typeof parsed.tool === "string" &&
      parsed.params &&
      typeof parsed.params === "object"
    ) {
      return parsed as ToolCallEnvelope;
    }

    return null;
  } catch (err) {
    console.error("[agent] Failed to parse TOOL_CALL JSON:", err);
    return null;
  }
}

// ---- Helper: single OpenAI call ----

async function callOpenAIChat(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  traceId: string,
  timeoutMs = 25000,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const upstreamRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,
          max_tokens: 512,
        }),
        signal: controller.signal,
      },
    );

    if (!upstreamRes.ok) {
      const text = await upstreamRes.text();
      console.error(
        `[agent][${traceId}] OpenAI upstream error:`,
        upstreamRes.status,
        text,
      );

      const upstreamError = new Error(
        `Upstream OpenAI error ${upstreamRes.status}: ${text}`,
      );
      (upstreamError as any).status = upstreamRes.status;
      (upstreamError as any).body = text;
      throw upstreamError;
    }

    return await upstreamRes.json();
  } catch (error) {
    if ((error as any)?.name === "AbortError") {
      const timeoutError = new Error("Upstream OpenAI request timed out");
      (timeoutError as any).name = "AbortError";
      (timeoutError as any).status = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// ---- Main handler ----

Deno.serve(async (req) => {
  const traceId = crypto.randomUUID();
  const baseHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "x-trace-id": traceId,
  };

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  try {
    const body = (await req.json().catch(() => null)) as
      | AgentRequestBody
      | null;

    if (!body) {
      return new Response(
        JSON.stringify({
          error: true,
          type: "validation_error",
          message: "Invalid JSON payload received.",
          traceId,
        }),
        {
          status: 400,
          headers: baseHeaders,
        },
      );
    }

    const { model, messages, admin, mode, context } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({
          error: true,
          type: "validation_error",
          message: "Missing or empty messages array",
          traceId,
        }),
        {
          status: 400,
          headers: baseHeaders,
        },
      );
    }

    const isAdmin =
      admin === true ||
      (typeof mode === "string" && mode.toLowerCase() === "admin");

    const USER_API_KEY = Deno.env.get("WATHACI_CONNECT_OPENAI");
    const ADMIN_API_KEY =
      Deno.env.get("WATHACI_CONNECT_ADMIN_KEY_OPENAI") ?? USER_API_KEY;

    const OPENAI_API_KEY = isAdmin ? ADMIN_API_KEY : USER_API_KEY;

    if (!OPENAI_API_KEY) {
      console.error(
        `[agent][${traceId}] Missing OpenAI API key env for mode:`,
        isAdmin ? "admin" : "user",
      );
      return new Response(
        JSON.stringify({
          error: true,
          type: "config_error",
          message: "Server misconfigured: missing OpenAI key",
          traceId,
        }),
        {
          status: 500,
          headers: baseHeaders,
        },
      );
    }

    const lastUserContent = getLastUserMessageContent(messages);
    const searchQuery = buildKnowledgeSearchQuery(lastUserContent);

    let roleFromContext = context?.role;
    if (
      !roleFromContext || roleFromContext === "guest" ||
      roleFromContext === "other"
    ) {
      const lower = lastUserContent.toLowerCase();
      if (lower.includes("sme")) roleFromContext = "sme";
      else if (lower.includes("investor")) roleFromContext = "investor";
      else if (lower.includes("donor")) roleFromContext = "donor";
      else if (lower.includes("government")) roleFromContext = "government";
      else if (
        lower.includes("professional") || lower.includes("freelancer")
      ) {
        roleFromContext = "professional";
      }
    }

    const effectiveContext: AgentContext = {
      ...context,
      role: roleFromContext,
    };

    const knowledgeSnippets = await fetchKnowledgeSnippets(
      searchQuery,
      effectiveContext,
    );

    const baseMessages: ChatMessage[] = [...messages];
    if (knowledgeSnippets.length > 0) {
      const knowledgeSystemContent = formatKnowledgeAsSystemMessage(
        knowledgeSnippets,
      );
      baseMessages.unshift({
        role: "system",
        content: knowledgeSystemContent,
      });
    }

    const effectiveModel = model || "gpt-4.1-mini";

    // USER MODE: single call
    if (!isAdmin) {
      const data = await callOpenAIChat(
        OPENAI_API_KEY,
        effectiveModel,
        baseMessages,
        traceId,
      );
      return new Response(JSON.stringify({ traceId, ...data }), {
        status: 200,
        headers: baseHeaders,
      });
    }

    // ADMIN MODE: two-phase with optional TOOL_CALL

    // 1) Planning call
    const planningData = await callOpenAIChat(
      OPENAI_API_KEY,
      effectiveModel,
      baseMessages,
      traceId,
    );

    const firstChoice = planningData?.choices?.[0];
    const firstAssistantMessage: ChatMessage | undefined =
      firstChoice?.message;
    const firstContent = firstAssistantMessage?.content ?? "";

    const toolCall = extractToolCallFromText(firstContent);

    if (!toolCall) {
      // No tool requested
      return new Response(JSON.stringify({ traceId, ...planningData }), {
        status: 200,
        headers: baseHeaders,
      });
    }

    // 2) Run tool
    const toolResult = await runTool(toolCall);

    // 3) Follow-up call with tool result
    const followupMessages: ChatMessage[] = [
      ...baseMessages,
      {
        role: "assistant",
        content: "TOOL RESULT:\n" + JSON.stringify(toolResult, null, 2),
      },
      {
        role: "user",
        content:
          "Using the TOOL RESULT above, explain clearly what you found, highlight any issues or risks, and give specific operational recommendations for WATHACI admins.",
      },
    ];

    const finalData = await callOpenAIChat(
      OPENAI_API_KEY,
      effectiveModel,
      followupMessages,
      traceId,
    );

    return new Response(JSON.stringify({ traceId, ...finalData }), {
      status: 200,
      headers: baseHeaders,
    });
  } catch (err) {
    const error = err as Error & { status?: number; body?: string };
    const status = error.status ?? 500;
    const type =
      error.name === "AbortError"
        ? "timeout"
        : status === 401 || status === 403
          ? "auth_error"
          : status === 429
            ? "rate_limit"
            : "upstream_error";

    console.error(`[agent][${traceId}] Unexpected error:`, {
      message: error.message,
      status,
      body: (error as any).body,
    });

    return new Response(
      JSON.stringify({
        error: true,
        type,
        message:
          type === "timeout"
            ? "The model request timed out."
            : "Internal error in agent function",
        traceId,
      }),
      {
        status,
        headers: baseHeaders,
      },
    );
  }
});
