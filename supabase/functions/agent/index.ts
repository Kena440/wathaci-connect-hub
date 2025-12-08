// supabase/functions/agent/index.ts
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

const callOpenAI = async (
  query: string,
  messages: ChatMessage[] | undefined,
  knowledgeContext: string | null,
  model: string,
) => {
  const finalMessages: ChatMessage[] = [
    { role: "system", content: baseSystemPrompt },
    ...(knowledgeContext ? [{ role: "system", content: knowledgeContext }] : []),
    ...(messages ?? []),
    { role: "user", content: query },
  ];

  const completion = await openai.chat.completions.create({
    model,
    messages: finalMessages,
    temperature: 0.3,
  });

  return completion.choices?.[0]?.message?.content ?? "";
};

Deno.serve(async (req) => {
  const traceId = crypto.randomUUID();
  const baseHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "x-trace-id": traceId,
  } as const;

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

  try {
    const body = (await req.json().catch(() => ({}))) as AgentRequestBody;
    const query = (body.query ?? getLastUserMessageContent(body.messages))?.trim();

    if (!query) {
      return new Response(
        JSON.stringify({
          error: true,
          type: "validation_error",
          message: "Missing query",
          traceId,
        }),
        { status: 400, headers: baseHeaders },
      );
    }

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: true,
          type: "config_error",
          message: "Server misconfigured: missing OpenAI key",
          traceId,
        }),
        { status: 500, headers: baseHeaders },
      );
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

    const model = body.model || "gpt-4.1";
    const answer = await callOpenAI(query, body.messages, knowledgeContext, model);

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
        source: knowledgeContext ? "knowledge_base" : "openai",
        knowledgeMatches: knowledgeContext ? knowledgeMatches : [],
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
