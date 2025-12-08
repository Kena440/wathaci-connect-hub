import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { supabaseClient } from "@/lib/supabaseClient";
import type { CisoMessage } from "@/lib/cisoClient";
import { callCisoAgent } from "@/lib/cisoClient";
import { cn } from "@/lib/utils";

interface CisoWidgetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AssistantMessage = ({ message }: { message: CisoMessage }) => {
  return (
    <div
      className={cn(
        "flex",
        message.role === "user" ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm",
          message.role === "user"
            ? "bg-emerald-600 text-white"
            : "bg-white text-slate-800 border border-slate-200",
        )}
      >
        {message.content}
      </div>
    </div>
  );
};

const CisoWidget = ({ open, onOpenChange }: CisoWidgetProps) => {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<CisoMessage[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    supabaseClient.auth
      .getSession()
      .then(({ data }) => setAccessToken(data.session?.access_token ?? null))
      .catch(() => setAccessToken(null));
  }, []);

  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
    return () => clearTimeout(timeout);
  }, [messages, open]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMessage: CisoMessage = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      const reply = await callCisoAgent(nextMessages, "user", undefined, {
        accessToken,
      });
      const assistant: CisoMessage = { role: "assistant", content: reply };
      setMessages((prev) => [...prev, assistant]);
    } catch (err) {
      const fallback: CisoMessage = {
        role: "assistant",
        content:
          "Ciso is experiencing a connection issue. Please try again in a moment.",
      };
      console.error("[CisoWidget] send error", err);
      setMessages((prev) => [...prev, fallback]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (
    event,
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const launcher = useMemo(
    () => (
      <button
        onClick={() => onOpenChange(true)}
        className="fixed left-4 bottom-4 z-50 bg-white shadow-lg border px-4 py-2 rounded-full text-sm font-medium"
      >
        @Ask Ciso for Help
      </button>
    ),
    [onOpenChange],
  );

  return (
    <>
      {launcher}

      {open ? (
        <div className="fixed inset-x-4 sm:left-auto sm:right-4 bottom-20 sm:bottom-24 z-50 w-auto sm:w-[380px] max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-start justify-between px-4 py-3 bg-emerald-600 text-white">
            <div className="flex flex-col">
              <span className="font-semibold">@Ask Ciso for Help</span>
              <span className="text-xs text-white/80">Fast answers from Wathaci</span>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close Ciso chat"
              className="ml-3 rounded-full p-1 text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-600"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto p-4 sm:max-h-[420px] bg-slate-50">
            {messages.length === 0 && (
              <p className="text-xs text-slate-600">
                Hi, I&apos;m Ciso. Ask about Wathaci onboarding, payments, or anything else.
              </p>
            )}

            {messages.map((message, index) => (
              <AssistantMessage key={`${message.role}-${index}`} message={message} />
            ))}

            {isLoading && (
              <p className="text-xs text-gray-500 italic">Ciso is typing…</p>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-slate-200 bg-white px-3 py-2">
            <label className="sr-only" htmlFor="ciso-chat-input">
              Ask Ciso a question
            </label>
            <textarea
              id="ciso-chat-input"
              rows={3}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about onboarding, payments, or how Wathaci works..."
              className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isLoading ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default CisoWidget;
