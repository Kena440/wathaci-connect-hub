// supabase/functions/agent/index.ts
// Primary Ciso entrypoint: accepts chat payloads from the frontend, enriches with knowledge
// base matches, calls OpenAI, and returns an answer. Frontend calls this via
// https://<project>.functions.supabase.co/agent with Authorization: Bearer <user or anon token>.
// Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY.
import OpenAI from "https://esm.sh/openai@4.67.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type AgentContext = {
  role?: string;
  flow?: string;
  step?: string;
  lastError?: string;
  extra?: Record<string, unknown>;
};

type AgentRequestBody = {
  query?: string;
  messages?: ChatMessage[];
  mode?: string;
  context?: AgentContext;
  user_id?: string;
  model?: string;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SIMILARITY_THRESHOLD = Number(Deno.env.get("CISO_KB_THRESHOLD")) || 0.75;
const MATCH_COUNT = Number(Deno.env.get("CISO_KB_MATCH_COUNT")) || 5;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY ?? "" });

const encoder = new TextEncoder();

const baseSystemPrompt = `
You are Ciso, the AI assistant for Wathaci. Use the Wathaci tone: helpful, smart, simple, professional.
Provide short but accurate answers. When the user asks about Wathaci-specific topics, prefer the knowledge base context if provided.
`;

const getLastUserMessageContent = (messages?: ChatMessage[]) => {
  if (!messages || messages.length === 0) return "";
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content || "";
  }
  return messages[messages.length - 1]?.content ?? "";
};

const embedQuery = async (query: string, traceId: string) => {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });
  const embedding = response.data?.[0]?.embedding;
  if (!embedding) {
    throw new Error(`[agent][${traceId}] Failed to generate embedding`);
  }
  return embedding;
};

const searchKnowledge = async (
  queryEmbedding: number[],
  traceId: string,
) => {
  if (!supabaseAdmin) {
    console.warn(`[agent][${traceId}] supabaseAdmin not initialised; skipping knowledge search.`);
    return [] as any[];
  }

  const { data, error } = await supabaseAdmin.rpc("match_documents", {
    query_embedding: queryEmbedding,
    similarity_threshold: SIMILARITY_THRESHOLD,
    match_count: MATCH_COUNT,
  });

  if (error) {
    console.error(`[agent][${traceId}] Knowledge search error`, error);
    return [] as any[];
  }

  return (data as any[]) || [];
};

const buildKnowledgeContext = (matches: any[]) => {
  if (!matches || matches.length === 0) return "";
  const snippets = matches
    .map((match: any, index: number) => {
      const title = match.metadata?.title || match.title || `Snippet ${index + 1}`;
      const content = match.content || match.chunk || match.snippet || "";
      const score = match.similarity ?? match.score ?? 0;
      return `# ${title}\n(similarity: ${score.toFixed(3)})\n${content}`;
    })
    .join("\n\n---\n\n");

  return `Use the following Wathaci knowledge base excerpts when replying. Keep answers concise and grounded in this context when it is relevant.\n${snippets}`;
};

const buildHeaders = (traceId: string) => ({
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "x-trace-id": traceId,
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const callOpenAIWithRetry = async (
  request: Parameters<typeof openai.chat.completions.create>[0],
  traceId: string,
  attempts = 2,
) => {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await openai.chat.completions.create(request);
    } catch (error) {
      lastError = error;
      const delay = 250 * (i + 1);
      console.warn(`[agent][${traceId}] OpenAI call failed (attempt ${i + 1}/${attempts})`, error);
      await sleep(delay);
    }
  }
  throw lastError ?? new Error(`[agent][${traceId}] OpenAI call failed`);
};

const streamOpenAIWithRetry = async (
  request: Parameters<typeof openai.chat.completions.create>[0],
  traceId: string,
  attempts = 2,
) => {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await openai.chat.completions.create({ ...request, stream: true });
    } catch (error) {
      lastError = error;
      const delay = 250 * (i + 1);
      console.warn(`[agent][${traceId}] OpenAI stream failed (attempt ${i + 1}/${attempts})`, error);
      await sleep(delay);
    }
  }
  throw lastError ?? new Error(`[agent][${traceId}] OpenAI stream failed`);
};

const callOpenAI = async (
  query: string,
  messages: ChatMessage[] | undefined,
  knowledgeContext: string | null,
  model: string,
  traceId: string,
) => {
  const finalMessages: ChatMessage[] = [
    { role: "system", content: baseSystemPrompt },
    ...(knowledgeContext ? [{ role: "system", content: knowledgeContext }] : []),
    ...(messages ?? []),
    { role: "user", content: query },
  ];

  const completion = await callOpenAIWithRetry({
    model,
    messages: finalMessages,
    temperature: 0.3,
  }, traceId);

  return completion.choices?.[0]?.message?.content ?? "";
};

const buildRequestContext = async (
  body: AgentRequestBody,
  traceId: string,
) => {
  const query = (body.query ?? getLastUserMessageContent(body.messages))?.trim();
  if (!query) {
    return { error: { status: 400, type: "validation_error", message: "Missing query" as const } };
  }

  if (!OPENAI_API_KEY) {
    return {
      error: { status: 500, type: "config_error", message: "Server misconfigured: missing OpenAI key" as const },
    };
  }

  if (body.messages && body.messages.length > 40) {
    return {
      error: {
        status: 400,
        type: "validation_error",
        message: "Too many messages in history. Please trim and try again." as const,
      },
    };
  }

  if (query && query.length > 4000) {
    return {
      error: { status: 400, type: "validation_error", message: "Query too long. Please shorten your question." as const },
    };
  }

  let knowledgeMatches: any[] = [];
  let knowledgeContext: string | null = null;

  try {
    const embedding = await embedQuery(query, traceId);
    knowledgeMatches = await searchKnowledge(embedding, traceId);
    const usefulMatches = knowledgeMatches.filter((match) => {
      const score = match.similarity ?? match.score ?? 0;
      return score >= SIMILARITY_THRESHOLD;
    });

    if (usefulMatches.length > 0) {
      knowledgeContext = buildKnowledgeContext(usefulMatches);
    }
  } catch (error) {
    console.error(`[agent][${traceId}] Knowledge lookup failed`, error);
  }

  return {
    query,
    knowledgeContext,
    knowledgeMatches,
  };
};

const streamResponse = async (
  body: AgentRequestBody,
  traceId: string,
  headers: Record<string, string>,
) => {
  const context = await buildRequestContext(body, traceId);

  if ("error" in context && context.error) {
    return new Response(
      JSON.stringify({ ...context.error, traceId, error: true }),
      { status: context.error.status, headers },
    );
  }

  const model = body.model || "gpt-4.1-mini";
  const stream = await streamOpenAIWithRetry({
    model,
    messages: [
      { role: "system", content: baseSystemPrompt },
      ...(context.knowledgeContext ? [{ role: "system", content: context.knowledgeContext }] : []),
      ...(body.messages ?? []),
      { role: "user", content: context.query ?? "" },
    ],
    temperature: 0.3,
  }, traceId);

  const readable = new ReadableStream({
    async start(controller) {
      let answer = "";
      const source = context.knowledgeContext ? "knowledge_base" : "openai";
      controller.enqueue(encoder.encode(`event: meta\ndata: ${JSON.stringify({ traceId, source })}\n\n`));

      try {
        for await (const chunk of stream) {
          const token = chunk.choices?.[0]?.delta?.content ?? "";
          if (token) {
            answer += token;
            controller.enqueue(encoder.encode(`event: token\ndata: ${JSON.stringify({ token })}\n\n`));
          }
        }

        controller.enqueue(
          encoder.encode(
            `event: done\ndata: ${JSON.stringify({ answer, traceId, source, knowledgeMatches: context.knowledgeMatches })}\n\n`,
          ),
        );
      } catch (error) {
        console.error(`[agent][${traceId}] Streaming failure`, error);
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ message: "Streaming failed", traceId })}\n\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    status: 200,
    headers: {
      ...headers,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
};

Deno.serve(async (req) => {
  const traceId = crypto.randomUUID();
  const baseHeaders = buildHeaders(traceId);
  const url = new URL(req.url);

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (url.pathname.endsWith("/health")) {
    return new Response(
      JSON.stringify({
        status: OPENAI_API_KEY && SUPABASE_URL && SERVICE_ROLE_KEY ? "ok" : "degraded",
        openaiConfigured: Boolean(OPENAI_API_KEY),
        supabaseConfigured: Boolean(SUPABASE_URL && SERVICE_ROLE_KEY),
        traceId,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: baseHeaders },
    );
  }

  try {
    const authHeader = req.headers.get("Authorization")?.trim();
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error: true,
          type: "auth_error",
          message: "Authorization header missing. Include your Supabase access token or anon key.",
          traceId,
        }),
        { status: 401, headers: baseHeaders },
      );
    }

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: true, type: "validation_error", message: "Only POST allowed", traceId }),
        { status: 405, headers: baseHeaders },
      );
    }

    const body = (await req.json().catch(() => ({}))) as AgentRequestBody;
    const wantsStream =
      req.headers.get("accept")?.includes("text/event-stream") || url.searchParams.get("stream") === "1";

    if (wantsStream) {
      return await streamResponse(body, traceId, baseHeaders as Record<string, string>);
    }

    const context = await buildRequestContext(body, traceId);

    if ("error" in context && context.error) {
      return new Response(
        JSON.stringify({ ...context.error, traceId, error: true }),
        { status: context.error.status, headers: baseHeaders },
      );
    }

    const model = body.model || "gpt-4.1-mini";
    const answer = await callOpenAI(
      context.query ?? "",
      body.messages,
      context.knowledgeContext,
      model,
      traceId,
    );

    if (!answer) {
      return new Response(
        JSON.stringify({
          error: true,
          type: "upstream_error",
          message: "Empty response from OpenAI",
          traceId,
        }),
        { status: 502, headers: baseHeaders },
      );
    }

    return new Response(
      JSON.stringify({
        answer,
        traceId,
        source: context.knowledgeContext ? "knowledge_base" : "openai",
        knowledgeMatches: context.knowledgeContext ? context.knowledgeMatches : [],
      }),
      { status: 200, headers: baseHeaders },
    );
  } catch (err) {
    const error = err as Error & { status?: number };
    const status = error.status ?? 500;
    console.error(`[agent][${traceId}] Unexpected error`, error);
    return new Response(
      JSON.stringify({
        error: true,
        type: "upstream_error",
        message: "Internal error in agent function",
        traceId,
      }),
      { status, headers: baseHeaders },
    );
  }
});
