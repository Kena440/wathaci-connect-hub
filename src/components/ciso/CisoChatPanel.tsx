import type { React } from "react";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, X } from "lucide-react";
import { askCiso } from "@/lib/cisoClient";

type Message = {
  from: "user" | "ciso";
  text: string;
};

type CisoChatPanelProps = {
  open: boolean;
  onClose: () => void;
  userId?: string | null;
};

export function CisoChatPanel({ open, onClose, userId }: CisoChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      from: "ciso",
      text: "Hi, I’m Ciso 👋. How can I help you with Wathaci today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!open) return null;

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setMessages((prev) => [...prev, { from: "user", text: trimmed }]);
    setInput("");
    setIsLoading(true);

    try {
      const answer = await askCiso(trimmed, userId ?? null);
      setMessages((prev) => [...prev, { from: "ciso", text: answer }]);
    } catch (err) {
      console.error("Ciso error:", err);
      let errorMessage: string;
      // Try to extract structured error info (duck-typing for CisoAgentError)
      if (
        err &&
        typeof err === "object" &&
        "message" in err &&
        typeof (err as any).message === "string"
      ) {
        errorMessage = (err as any).message;
        if ("traceId" in err && typeof (err as any).traceId === "string") {
          errorMessage += ` (Trace ID: ${(err as any).traceId})`;
        }
      } else if (typeof err === "string") {
        errorMessage = err;
      } else {
        errorMessage =
          "I’m having trouble reaching my knowledge base right now. Please try again in a moment or contact support@wathaci.com.";
      }
      setMessages((prev) => [
        ...prev,
        {
          from: "ciso",
          text: errorMessage,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-20 left-4 z-50 w-[340px] max-w-[90vw]">
      <Card className="shadow-2xl border border-muted bg-background">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">
            Ciso – Wathaci Assistant
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="pt-2 pb-2">
          <ScrollArea className="h-64 pr-2">
            <div className="flex flex-col gap-3" role="log" aria-live="polite" aria-label="Chat messages">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    m.from === "user" ? "justify-end" : "justify-start"
                  }`}
                  role="article"
                  aria-label={`${m.from === "user" ? "You" : "Ciso"} said`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      m.from === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Ciso is thinking...</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>

        <CardFooter className="pt-2">
          <div className="flex w-full gap-2">
            <Input
              placeholder="Ask Ciso anything about Wathaci..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
              Send
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
