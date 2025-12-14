import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { X } from "lucide-react";
import { supabaseClient } from "@/lib/supabaseClient";
import type { CisoMessage } from "@/lib/cisoClient";
import { callCisoAgent } from "@/lib/cisoClient";
import { cn } from "@/lib/utils";

interface CisoWidgetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const AssistantMessage = memo(({ message }: { message: CisoMessage }) => {
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
});
AssistantMessage.displayName = "AssistantMessage";

const MessagesList = memo(
  ({
    messages,
    isLoading,
    endRef,
  }: {
    messages: CisoMessage[];
    isLoading: boolean;
    endRef: RefObject<HTMLDivElement>;
  }) => {
    return (
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

        <div ref={endRef} className="h-px" />
      </div>
    );
  },
);
MessagesList.displayName = "MessagesList";

const LauncherButton = memo(({ onOpen }: { onOpen: () => void }) => (
  <button
    onClick={onOpen}
    className="fixed left-4 bottom-4 z-50 bg-white shadow-lg border px-4 py-2 rounded-full text-sm font-medium"
  >
    @Ask Ciso for Help
  </button>
));
LauncherButton.displayName = "LauncherButton";

/*
 * Performance investigation notes (INP/input delay):
 * - Typing in #ciso-chat-input re-rendered the entire message history because
 *   the textarea state lived alongside the message list in the same component.
 *   Every keystroke forced dozens of message nodes to re-render.
 * - The floating launcher button re-rendered whenever chat state changed,
 *   adding extra render cost (~50ms traces) after interactions.
 * - Send handler recreated large arrays synchronously; we now keep that work
 *   minimal and avoid blocking the click event path.
 */
const CisoWidget = ({ open, onOpenChange }: CisoWidgetProps) => {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<CisoMessage[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const hasFetchedToken = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<CisoMessage[]>([]);
  const perfStatsRef = useRef({
    lastInputDurationMs: 0,
    lastSendHandlerMs: 0,
  });

  const isControlled = typeof open === "boolean";
  const isOpen = isControlled ? open : internalOpen;

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setInternalOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  useEffect(() => {
    if (!isOpen || hasFetchedToken.current) return;

    hasFetchedToken.current = true;
    supabaseClient.auth
      .getSession()
      .then(({ data }) => setAccessToken(data.session?.access_token ?? null))
      .catch(() => setAccessToken(null));
  }, [isOpen]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!isOpen) return;
    const timeout = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
    return () => clearTimeout(timeout);
  }, [messages, isOpen]);

  const recordPerf = useCallback((metric: keyof typeof perfStatsRef.current, value: number) => {
    perfStatsRef.current[metric] = value;
    if (import.meta.env.DEV) {
      console.debug(`[CisoWidget][perf] ${metric}: ${value.toFixed(1)}ms`);
    }
  }, []);

  const handleSend = useCallback(async () => {
    const start = performance.now();
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMessage: CisoMessage = { role: "user", content: trimmed };
    const currentMessages = messagesRef.current;
    const messagesForRequest = [...currentMessages, userMessage];

    setMessages([...messagesForRequest, { role: "assistant", content: "" }]);
    setInput("");
    setIsLoading(true);

    recordPerf("lastSendHandlerMs", performance.now() - start);

    try {
      const reply = await callCisoAgent(messagesForRequest, "user", undefined, {
        accessToken,
        onToken: (token) => {
          setMessages((prev) => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            if (lastIndex >= 0 && updated[lastIndex]?.role === "assistant") {
              updated[lastIndex] = {
                ...updated[lastIndex],
                content: `${updated[lastIndex].content}${token}`,
              };
            }
            return updated;
          });
        },
      });
      setMessages((prev) => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        if (lastIndex >= 0 && updated[lastIndex]?.role === "assistant") {
          updated[lastIndex] = { ...updated[lastIndex], content: reply };
        }
        return updated;
      });
    } catch (err) {
      const fallback: CisoMessage = {
        role: "assistant",
        content:
          "Ciso is experiencing a connection issue. Please try again in a moment.",
      };
      console.error("[CisoWidget] send error", err);
      setMessages((prev) => {
        const updated = [...prev];
        if (updated[updated.length - 1]?.role === "assistant") {
          updated[updated.length - 1] = fallback;
        } else {
          updated.push(fallback);
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, input, recordPerf]);

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = useCallback(
    (event) => {
      const start = performance.now();
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSend();
      }
      recordPerf("lastInputDurationMs", performance.now() - start);
    },
    [handleSend, recordPerf],
  );

  const launcher = useMemo(
    () => <LauncherButton onOpen={() => setOpen(true)} />, [setOpen],
  );

  return (
    <>
      {launcher}

      {isOpen ? (
        <div className="fixed inset-x-4 sm:left-auto sm:right-4 bottom-20 sm:bottom-24 z-50 w-auto sm:w-[380px] max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-start justify-between px-4 py-3 bg-emerald-600 text-white">
            <div className="flex flex-col">
              <span className="font-semibold">@Ask Ciso for Help</span>
              <span className="text-xs text-white/80">Fast answers from Wathaci</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close Ciso chat"
              className="ml-3 rounded-full p-1 text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-600"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <MessagesList
            messages={messages}
            isLoading={isLoading}
            endRef={messagesEndRef}
          />

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
