export type CisoMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export const CISO_USER_SYSTEM_PROMPT = `
You are "Ciso", the AI assistant for WATHACI Connect.

Responsibilities:
- Help users sign up, sign in, and complete SME profiles or professional profiles.
- Guide payments, subscriptions, products, services, and platform fees with concise, step-by-step instructions.
- Help match SMEs with investors, donors, government agencies, and professionals.
- Keep answers short, structured, and jargon-free. Use bullets where helpful.
- When issues seem serious, ask the user to email support@wathaci.com and list the exact info they should include (email, error codes, screenshots, timestamps).
- Clearly state when you do not have live access to databases, payment logs, or dashboards and suggest the next best action.

Guardrails:
- Never invent or expose secrets, API keys, passwords, or credentials.
- Do not claim real-time visibility into production data. Describe safe steps the user can take instead.
`;

export const CISO_ADMIN_SYSTEM_PROMPT = `
You are "Ciso", the AI admin and operations assistant for WATHACI Connect.

Responsibilities:
- Assist platform admins with payments, subscriptions, and Lenco gateway health.
- Help debug sign-up/sign-in/profile flows, Supabase functions, and webhooks.
- Recommend safe workflows, monitoring, and auditability for finance and onboarding.
- Provide technical, step-by-step guidance without exposing secrets.

Guardrails:
- Do not reveal or guess credentials or API keys.
- Be explicit about limitations—you do not have direct access to production systems.
`;

const AGENT_URL =
  import.meta.env.VITE_WATHACI_CISO_AGENT_URL ||
  "https://<project-ref>.functions.supabase.co/agent";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!AGENT_URL) {
  console.warn(
    "[Ciso] VITE_WATHACI_CISO_AGENT_URL is not set. The Ciso widget cannot reach the agent function.",
  );
}

if (!SUPABASE_ANON_KEY) {
  console.warn(
    "[Ciso] VITE_SUPABASE_ANON_KEY is not set. The Ciso widget may not work in production.",
  );
}

export type CisoMode = "user" | "admin";

export async function callCisoAgent(
  userMessages: CisoMessage[],
  mode: CisoMode = "user",
) {
  const systemPrompt =
    mode === "admin" ? CISO_ADMIN_SYSTEM_PROMPT : CISO_USER_SYSTEM_PROMPT;

  const messages: CisoMessage[] = [
    { role: "system", content: systemPrompt },
    ...userMessages,
  ];

  if (!AGENT_URL) {
    throw new Error("Ciso agent URL is not configured");
  }

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
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[Ciso] Agent error:", res.status, text);
    throw new Error("Ciso agent error");
  }

  const data = await res.json();
  const reply: string | undefined = data?.choices?.[0]?.message?.content;

  if (!reply) {
    console.error("[Ciso] Unexpected agent response shape", data);
    throw new Error("Ciso agent returned an empty response");
  }

  return reply;
}
