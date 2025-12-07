import React, { useState } from "react";
import {
  callCisoAgent,
  CisoAgentError,
  CisoMessage,
} from "../lib/cisoClient";

const CisoWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<CisoMessage[]>([]);

  const toggleOpen = () => setIsOpen((prev) => !prev);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: CisoMessage = {
      role: "user",
      content: input.trim(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const reply = await callCisoAgent(newMessages, "user", {
        role: "guest",
        flow: "inline-widget",
        step: "chat",
      });
      const assistantMessage: CisoMessage = {
        role: "assistant",
        content: reply,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const derivedMessage =
        err instanceof CisoAgentError
          ? err.userMessage
          : "Ciso is having trouble replying right now. Please try again or email support@wathaci.com.";

      const errorMessage: CisoMessage = {
        role: "assistant",
        content: derivedMessage,
      };
      console.error("[CisoWidget] send error", err);
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (
    e,
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={toggleOpen}
        className="
          fixed
          bottom-4
          right-4
          z-50
          flex
          items-center
          justify-center
          h-14
          w-14
          rounded-full
          bg-emerald-600
          text-white
          shadow-lg
          hover:bg-emerald-700
          focus:outline-none
        "
        aria-label="Ask Ciso for help"
      >
        <span className="text-lg font-bold">C</span>
      </button>

      {isOpen && (
        <div
          className="
            fixed
            bottom-20
            right-4
            z-50
            w-80
            max-w-full
            bg-white
            shadow-2xl
            rounded-xl
            border
            border-gray-200
            flex
            flex-col
            overflow-hidden
          "
        >
          <div className="flex items-center justify-between px-3 py-2 bg-emerald-600 text-white">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                C
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">@Ask Ciso for help</span>
                <span className="text-[11px] text-emerald-100">
                  Onboarding • Payments • Profiles
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleOpen}
              className="text-xs hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 px-3 py-2 space-y-2 overflow-y-auto text-sm bg-gray-50">
            {messages.length === 0 && (
              <p className="text-xs text-gray-500">
                Hi, I&apos;m Ciso. Ask me about sign-ups, profiles, payments, or how
                WATHACI Connect works.
              </p>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`
                    max-w-[80%] rounded-lg px-2.5 py-1.5 text-xs
                    ${
                      msg.role === "user"
                        ? "bg-emerald-600 text-white"
                        : "bg-white text-gray-800 border border-gray-200"
                    }
                  `}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <p className="text-xs text-gray-400 italic">Ciso is typing…</p>
            )}
          </div>

          <div className="border-t border-gray-200 bg-white px-3 py-2">
            <textarea
              rows={2}
              className="
                w-full
                resize-none
                text-xs
                border
                border-gray-300
                rounded-md
                px-2
                py-1
                focus:outline-none
                focus:ring-1
                focus:ring-emerald-500
                focus:border-emerald-500
              "
              placeholder="Type your question here…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <div className="flex justify-end mt-1">
              <button
                type="button"
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="
                  text-xs
                  px-3
                  py-1
                  rounded
                  bg-emerald-600
                  text-white
                  hover:bg-emerald-700
                  disabled:bg-gray-300
                  disabled:cursor-not-allowed
                "
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CisoWidget;
