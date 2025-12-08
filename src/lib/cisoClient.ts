import { supabaseClient } from "./supabaseClient";

export type CisoMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type CisoContext = {
  role?:
    | "sme"
    | "investor"
    | "donor"
    | "government"
    | "professional"
    | "admin"
    | "guest"
    | "other";
  flow?: string;
  step?: string;
  lastError?: string;
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

const AGENT_URL =
  env.VITE_CISO_AGENT_URL?.trim() ||
  env.VITE_WATHACI_CISO_AGENT_URL?.trim() ||
  "https://nrjcbdrzaxqvomeogptf.functions.supabase.co/ciso-agent";

const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

const deriveUserQuery = (messages: CisoMessage[]): string => {
  if (!messages || messages.length === 0) return "";
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === "user") {
      return messages[i].content.trim();
    }
  }
  return messages[messages.length - 1]?.content?.trim() ?? "";
};

const buildUserFacingMessage = (type?: string, traceId?: string) => {
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
};

export async function callCisoAgent(
  userMessages: CisoMessage[],
  mode: CisoMode = "user",
  context?: CisoContext,
  options?: { accessToken?: string | null },
) {
  const session = await supabaseClient.auth.getSession().catch(() => null);
  const authToken = options?.accessToken ?? session?.data.session?.access_token;
  const userId = session?.data.session?.user.id ?? "anonymous";
  const query = deriveUserQuery(userMessages);

  try {
    const res = await fetch(AGENT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          authToken?.trim()
            ? `Bearer ${authToken}`
            : SUPABASE_ANON_KEY
              ? `Bearer ${SUPABASE_ANON_KEY}`
              : "",
      },
      body: JSON.stringify({
        query,
        messages: userMessages,
        user_id: userId,
        mode,
        context,
      }),
    });

    const payload = await res.json().catch(async () => ({ raw: await res.text() }));

    if (!res.ok || payload?.error) {
      const status = res.status || 500;
      const errorType =
        (payload as any)?.type ||
        (status === 400
          ? "validation_error"
          : status === 401 || status === 403
            ? "auth_error"
            : status === 429
              ? "rate_limit"
              : status >= 500
                ? "upstream_error"
                : "unknown_error");

      const traceId = (payload as any)?.traceId;
      const userMessage = buildUserFacingMessage(errorType, traceId);

      throw new CisoAgentError(userMessage, {
        status,
        type: errorType,
        traceId,
      });
    }

    const answer =
      (payload as any)?.answer ??
      (payload as any)?.choices?.[0]?.message?.content ??
      (payload as any)?.message;

    if (!answer || typeof answer !== "string") {
      return "Ciso is experiencing a connection issue. Please try again.";
    }

    return answer;
  } catch (error) {
    if (error instanceof CisoAgentError) {
      throw error;
    }

    const networkMessage = buildUserFacingMessage(
      (error as any)?.name === "AbortError" ? "timeout" : "network_error",
    );

    throw new CisoAgentError(networkMessage, {
      cause: error,
      type: (error as any)?.name === "AbortError" ? "timeout" : "network_error",
    });
  }
}
