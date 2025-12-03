import React, { useState } from "react";
import { callCisoAgent, type CisoMessage } from "@/lib/cisoClient";

const AdminCisoConsole: React.FC = () => {
  const [messages, setMessages] = useState<CisoMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: CisoMessage = { role: "user", content: input.trim() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const reply = await callCisoAgent(nextMessages, "admin");
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error("[admin-ciso] error", err);
      setError(
        "Ciso could not reply right now. Please retry or contact the platform team with the error details.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <div>
          <p className="text-xs font-semibold text-emerald-700">Admin only</p>
          <h1 className="text-2xl font-bold text-gray-900">Ciso admin console</h1>
          <p className="text-sm text-gray-700">
            Use this console for internal investigations (payments, Lenco gateway health, Supabase functions, webhooks).
            Do not paste secrets or credentials.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
              C
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">@Ask Ciso (admin mode)</p>
              <p className="text-xs text-gray-600">Include context like error codes, plan IDs, and webhook timestamps.</p>
            </div>
          </div>

          <div className="border rounded-lg border-gray-200 bg-gray-50 max-h-96 overflow-y-auto p-3 space-y-2 text-sm">
            {messages.length === 0 ? (
              <p className="text-xs text-gray-500">
                Start the conversation with a short brief, e.g., "Investigating Lenco webhook timeouts for plan enterprise".
              </p>
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                      message.role === "user"
                        ? "bg-emerald-600 text-white"
                        : "bg-white text-gray-900 border border-gray-200"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))
            )}

            {isLoading && <p className="text-xs text-gray-500 italic">Ciso is typing…</p>}
          </div>

          <textarea
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Example: Lenco card payments returning 504 for investor plan premium. How to triage safely?"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <div className="flex items-center justify-between gap-3">
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex-1" />
            <button
              type="button"
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="px-4 py-2 text-sm font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isLoading ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCisoConsole;
