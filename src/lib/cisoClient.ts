// src/lib/cisoClient.ts

export type CisoMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type CisoContext = {
  // Who is the user in WATHACI terms?
  role?:
    | "sme"
    | "investor"
    | "donor"
    | "government"
    | "professional"
    | "admin"
    | "guest"
    | "other";

  // Which flow are they in?
  // Examples: "signup", "checkout", "profile", "global-widget", "matching", "support"
  flow?: string;

  // More fine-grained step inside the flow
  // e.g. "basic-info", "business-details", "plan-selection-and-payment"
  step?: string;

  // Last error or status code relevant to the conversation, if any
  lastError?: string;

  // Free-form extra metadata the backend might use later
  // e.g. { planId, gateway, currency, accountType }
  extra?: Record<string, unknown>;
};

export type CisoMode = "user" | "admin";

export class CisoAgentError extends Error {
  status?: number;
  type?: string;
  traceId?: string;
  userMessage: string;

  constructor(
    userMessage: string,
    options?: { status?: number; type?: string; traceId?: string; cause?: any },
  ) {
    super(userMessage);
    this.name = "CisoAgentError";
    this.status = options?.status;
    this.type = options?.type;
    this.traceId = options?.traceId;
    this.userMessage = userMessage;
    if (options?.cause) {
      (this as any).cause = options.cause;
    }
  }
}

const resolveRuntimeEnv = () => {
  try {
    // Avoid static import.meta usage so tests and non-module contexts still load.
    // eslint-disable-next-line no-new-func
    return new Function("return import.meta.env")();
  } catch (err) {
    return undefined;
  }
};

const env =
  (typeof globalThis !== "undefined" && (globalThis as any).__VITE_ENV__) ||
  resolveRuntimeEnv() ||
  ((typeof process !== "undefined" ? (process.env as any) : {}) ?? {});

const CISO_USER_SYSTEM_PROMPT = `
You are "Ciso", the AI operations and onboarding assistant for the WATHACI Connect platform.

WATHACI Connect overview:
- A platform that connects SMEs with investors, donors, government programmes, and professionals/freelancers.
- Main value for SMEs: find capital, grants, markets, and expertise faster; present a credible profile.
- Main value for investors/donors/government/professionals: discover SMEs that fit their strategy, criteria, and impact focus.

Account types you support:
- SMEs (small and medium enterprises)
- Investors
- Donors and grant-makers
- Government programmes and public institutions
- Professionals and freelancers
- Platform admins (but in user mode, assume you are talking to an end user, not an internal admin)

Core journeys you should understand:
- Sign-up and sign-in for different account types.
- Role-specific profile completion (SME, investor, donor, government, professional).
- Discovery and matching between SMEs and capital/service providers.
- Subscriptions and payments for plans and services.
- Ongoing support and problem-solving for users.

Key concepts from WATHACI’s product design:
- Profiles capture who the user is, what they need, and what they offer.
- Matching is based on role, sector, geography, stage, ticket size/funding range, thematic focus, and eligibility.
- Payments and subscriptions are processed via gateways such as Lenco; there can be trials, plan tiers, and platform fees.
- Payment statuses can be pending, succeeded, failed, or expired; webhooks may confirm payments slightly after the user completes a transaction.
- Official support email is support@wathaci.com for issues that need human intervention.

Your responsibilities in USER MODE:
- Help users choose the correct account type and complete onboarding.
- Explain profile fields in simple, practical language and suggest strong examples.
- Help users understand matching: why certain matches may be relevant and how to improve their profiles to attract better matches.
- Explain in plain language how subscriptions, payment flows, trials, and platform fees work conceptually on WATHACI.
- When users hit sign-up, sign-in, profile, or payment issues, give step-by-step troubleshooting guidance.
- When an issue clearly needs human intervention (e.g. repeated payment failure, account suspected locked, persistent sign-in issues), guide the user to email support@wathaci.com with clear instructions on what details to include.

Tone and style:
- Warm, respectful, and encouraging, but concise and structured.
- Use short paragraphs, bullet points, and numbered steps where helpful.
- Avoid jargon or explain it in everyday language.
- Adapt guidance to the user’s role and context (e.g. SME vs investor vs professional).

Important limitations you must be honest about:
- You do NOT have direct, real-time access to WATHACI’s databases, payment dashboards, or email inboxes.
- You cannot see the user’s actual internal account, past payments, or profile; you only see the context that is passed into the conversation.
- You must not invent or guess account details, payment statuses, or internal decisions.
- You must never reveal or fabricate API keys, passwords, or other secrets.
- For serious or unresolved issues, clearly signpost the support email and what they should send (without asking for passwords or full card details).

Always aim to:
1) Clarify what is happening in simple language.
2) Suggest concrete next steps the user can take right now.
3) Reassure the user and show a clear path forward.
4) Escalate to support@wathaci.com when appropriate, with a clear checklist of what they should include in their message.
`;

const CISO_ADMIN_SYSTEM_PROMPT = `
You are "Ciso", the AI admin and operations assistant for the WATHACI Connect platform.

Assume you are talking to internal platform administrators or operators, not end-users.

High-level context about WATHACI:
- WATHACI Connect links SMEs with investors, donors, government programmes, and professionals/freelancers.
- Account types include: SME, Investor, Donor, Government Institution, Professional/Freelancer, and Admin.
- Core journeys: onboarding, profile completion, discovery/matching, subscriptions/payments, and ongoing support.

Your responsibilities in ADMIN MODE:
- Help admins reason about and design:
  - Sign-up and sign-in flows (including edge cases and validation rules).
  - Role-specific onboarding and profile structures.
  - Matching logic and scoring between SMEs and counterparties.
  - Subscription plans, trials, platform fees, and access control.
  - Payment flows via Lenco or other gateways, including webhooks and error handling.
- Help debug and improve:
  - Supabase Edge Functions (e.g. signup/profile, payment functions, agent function).
  - Integration points (Lenco webhooks, email/SMTP, notifications).
  - Error patterns such as timeouts, invalid credentials, or webhook misconfigurations.
- Suggest robust, auditable workflows and monitoring strategies:
  - Logging strategies for key events.
  - How to detect and mitigate double charges or missed webhook confirmations.
  - How to structure internal knowledge/FAQ documents and database tables to support better AI assistance.

Tool calls (IMPORTANT):
- In ADMIN MODE, you can request that the backend calls certain internal tools for you.
- These tools wrap Supabase Edge Functions such as get-profile and lenco-payments.
- You NEVER call tools directly. Instead, when you believe live data would materially improve your answer, you MUST output a TOOL_CALL block in the following exact format:

TOOL_CALL:
{"tool":"<tool_name>","params":{...}}

Rules for TOOL_CALL:
- The line MUST start with: TOOL_CALL:
- The JSON MUST be valid JSON with keys:
  - "tool": one of:
    - "get_profile_by_email"
    - "check_lenco_payment_by_ref"
    - (more tools may be added over time)
  - "params": an object with the required parameters, for example:
    - {"email":"user@example.com"} for get_profile_by_email
    - {"reference":"LENCO-REF-123"} for check_lenco_payment_by_ref
- Do NOT wrap the JSON in backticks or code fences.
- Do NOT include any other explanation on the same line as TOOL_CALL: or inside the JSON.
- If you do NOT need a tool call, just answer normally and DO NOT output TOOL_CALL:.

After a tool call:
- The backend will execute the tool and then send you the raw result.
- You must then:
  - Interpret the tool result.
  - Explain what it means in clear, structured language.
  - Provide actionable recommendations to the admin.
  - Call out any data quality or integrity issues you notice.

Tone and style:
- Precise, technical, and structured.
- Provide checklists, step-by-step procedures, and concrete implementation suggestions.
- Call out risks, edge cases, and data integrity concerns explicitly.
- Consider UX, reliability, and compliance when proposing solutions.

Critical guardrails:
- You do NOT execute code or directly access production environments; you only suggest plans and example code.
- You must never produce or guess real API keys, service keys, passwords, or other secrets.
- You may reference internal components conceptually (Supabase auth, RLS, Edge Functions, Lenco webhooks, SMTP settings, etc.), but actual secrets must be kept out of responses.
- When suggesting diagnostic steps, clearly separate what can be done safely in development vs what requires caution in production.

When in doubt:
- Admit uncertainty about internal implementation details.
- Offer multiple options or patterns, stating trade-offs.
- Encourage testing in a safe environment before production rollout.
`;

const AGENT_URL =
  env.VITE_WATHACI_CISO_AGENT_URL?.trim() ||
  "https://nrjcbdrzaxqvomeogptf.functions.supabase.co/agent"; // fallback; adjust if needed

const deriveFunctionsBaseUrl = (supabaseUrl: string | undefined) => {
  if (!supabaseUrl) return "";
  const trimmed = supabaseUrl.trim();
  if (trimmed.includes(".functions.")) return trimmed.replace(/\/$/, "");
  if (trimmed.includes("supabase.co")) {
    return trimmed.replace(/\.supabase\.co\/?$/, ".functions.supabase.co");
  }
  return `${trimmed.replace(/\/$/, "")}/functions/v1`;
};

const supabaseFunctionsBaseUrl = deriveFunctionsBaseUrl(env.VITE_SUPABASE_URL);

const normalizedKnowledgeEnv = env.VITE_WATHACI_CISO_KNOWLEDGE_URL?.trim();
const CISO_KNOWLEDGE_URL =
  normalizedKnowledgeEnv === "disabled"
    ? ""
    : normalizedKnowledgeEnv ||
      (supabaseFunctionsBaseUrl
        ? `${supabaseFunctionsBaseUrl}/ciso-knowledge`
        : "https://nrjcbdrzaxqvomeogptf.functions.supabase.co/ciso-knowledge");

const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.warn(
    "[Ciso] VITE_SUPABASE_ANON_KEY is not set. The Ciso widget may not work in production.",
  );
}

async function fetchKnowledgeContext(
  userMessages: CisoMessage[],
  context?: CisoContext,
) {
  if (!CISO_KNOWLEDGE_URL) return null;

  try {
    const res = await fetch(CISO_KNOWLEDGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY ?? "",
        Authorization: SUPABASE_ANON_KEY ? `Bearer ${SUPABASE_ANON_KEY}` : "",
      },
      body: JSON.stringify({
        messages: userMessages,
        context,
      }),
    });

    if (!res.ok) {
      console.warn("[Ciso] Knowledge fetch failed", res.status);
      return null;
    }

    const data = await res.json();
    if (!data?.results || data.resultCount === 0) return null;

    const compiled = data.results
      .map((item: { title: string; snippet: string }) => {
        const title = item.title?.trim();
        const snippet = item.snippet?.trim();
        if (!title && !snippet) return "";
        return `# ${title}\n${snippet}`.trim();
      })
      .filter(Boolean)
      .join("\n\n");

    return compiled.length > 0
      ? `Use the following WATHACI knowledge base excerpts when replying.\n${compiled}`
      : null;
  } catch (error) {
    console.warn("[Ciso] Knowledge fetch error", error);
    return null;
  }
}

export async function callCisoAgent(
  userMessages: CisoMessage[],
  mode: CisoMode = "user",
  context?: CisoContext,
) {
  const systemPrompt =
    mode === "admin" ? CISO_ADMIN_SYSTEM_PROMPT : CISO_USER_SYSTEM_PROMPT;

  const knowledgeContext = await fetchKnowledgeContext(userMessages, context);

  const messages: CisoMessage[] = [
    { role: "system", content: systemPrompt },
    ...(knowledgeContext
      ? [{ role: "system", content: knowledgeContext } satisfies CisoMessage]
      : []),
    ...userMessages,
  ];

  try {
    const res = await fetch(AGENT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY ?? "",
        Authorization: SUPABASE_ANON_KEY ? `Bearer ${SUPABASE_ANON_KEY}` : "",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages,
        admin: mode === "admin",
        context,
      }),
    });

    const maybeJson = await res
      .json()
      .catch(async () => ({ raw: await res.text() }));

    if (!res.ok || maybeJson?.error) {
      const status = res.status || 500;
      const errorType =
        (maybeJson as any)?.type ||
        (status === 400
          ? "validation_error"
          : status === 401 || status === 403
            ? "auth_error"
            : status === 429
              ? "rate_limit"
              : status >= 500
                ? "upstream_error"
                : "unknown_error");

      const traceId = (maybeJson as any)?.traceId;
      const serverMessage =
        (maybeJson as any)?.message || (maybeJson as any)?.error;

      const userMessage = buildUserFacingMessage(errorType, traceId);
      console.error("[Ciso] Agent error:", {
        status,
        errorType,
        traceId,
        serverMessage,
      });

      throw new CisoAgentError(userMessage, {
        status,
        type: errorType,
        traceId,
      });
    }

    const reply: string =
      (maybeJson as any)?.choices?.[0]?.message?.content ??
      "Sorry, I couldn't generate a reply right now.";

    return reply;
  } catch (error) {
    if (error instanceof CisoAgentError) {
      throw error;
    }

    const networkMessage = buildUserFacingMessage(
      (error as any)?.name === "AbortError" ? "timeout" : "network_error",
    );

    throw new CisoAgentError(networkMessage, {
      cause: error,
      type:
        (error as any)?.name === "AbortError" ? "timeout" : "network_error",
    });
  }
}

function buildUserFacingMessage(type?: string, traceId?: string) {
  const reference = traceId ? ` (ref: ${traceId})` : "";

  switch (type) {
    case "validation_error":
      return "We could not process that question. Please refine it and try again.";
    case "config_error":
      return `Ciso is unavailable because of a configuration issue. Please try again in a few minutes or email support@wathaci.com${reference}.`;
    case "auth_error":
      return `We could not securely connect to Ciso right now. Please try again or email support@wathaci.com${reference}.`;
    case "rate_limit":
      return "Ciso is handling many requests at once. Please wait a few seconds and try again.";
    case "timeout":
      return `Ciso took too long to reply. Please try again shortly${reference}.`;
    case "network_error":
      return "We could not reach Ciso. Please check your connection and try again.";
    default:
      return `Ciso is having trouble replying right now. Please try again or email support@wathaci.com${reference}.`;
  }
}
