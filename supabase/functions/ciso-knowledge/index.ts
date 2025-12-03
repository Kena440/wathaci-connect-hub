import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const knowledgeBaseText = await Deno.readTextFile(
  new URL("./wathaci-knowledge-base.md", import.meta.url),
);

const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

type KnowledgeSection = {
  title: string;
  body: string;
  normalized: string;
};

const knowledgeSections: KnowledgeSection[] = (() => {
  const lines = knowledgeBaseText.split("\n");
  const sections: KnowledgeSection[] = [];
  let currentTitle = "Overview";
  let currentBody: string[] = [];

  const pushSection = () => {
    if (currentBody.length === 0) return;
    const body = currentBody.join("\n").trim();
    sections.push({
      title: currentTitle,
      body,
      normalized: normalize(`${currentTitle} ${body}`),
    });
    currentBody = [];
  };

  for (const line of lines) {
    const headingMatch = /^##\s+(.+)$/.exec(line.trim());
    if (headingMatch) {
      pushSection();
      currentTitle = headingMatch[1].trim();
      continue;
    }
    currentBody.push(line);
  }

  pushSection();
  return sections;
})();

const scoreSection = (section: KnowledgeSection, terms: string[]) => {
  if (terms.length === 0) return 1;
  let score = 0;
  for (const term of terms) {
    if (term.length < 3) continue;
    if (section.normalized.includes(term)) {
      score += section.title.toLowerCase().includes(term) ? 3 : 1;
    }
  }
  return score;
};

const summarize = (text: string, limit = 1200) => {
  if (text.length <= limit) return text.trim();
  return `${text.slice(0, limit - 3).trim()}...`;
};

type RequestBody = {
  query?: string;
  messages?: { role: string; content: string }[];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(
      JSON.stringify({ ok: false, error: "method_not_allowed" }),
      { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }

  let queryText = "";
  let messages: RequestBody["messages"] | undefined;

  if (req.method === "POST") {
    try {
      const body = (await req.json()) as RequestBody;
      queryText = body.query ?? "";
      messages = body.messages;
    } catch (error) {
      console.error("ciso-knowledge: invalid JSON body", error);
      return new Response(
        JSON.stringify({ ok: false, error: "invalid_json" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }
  } else {
    const url = new URL(req.url);
    queryText = url.searchParams.get("query") ?? "";
  }

  if (!queryText && messages) {
    const reversed = [...messages].reverse();
    const latestUserMessage = reversed.find((m) => m.role === "user");
    queryText = latestUserMessage?.content ?? messages[messages.length - 1]?.content ?? "";
  }

  const normalizedQuery = normalize(queryText);
  const terms = normalizedQuery.split(" ").filter(Boolean);

  const scored = knowledgeSections
    .map((section) => ({ ...section, score: scoreSection(section, terms) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .filter((section, index) => section.score > 0 || index === 0);

  const results = scored.map((section) => ({
    title: section.title,
    snippet: summarize(section.body),
    score: section.score,
  }));

  return new Response(
    JSON.stringify({
      ok: true,
      query: queryText,
      resultCount: results.length,
      results,
      source: "docs/wathaci-knowledge-base.md",
    }),
    { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
  );
});
