"use client";
// R26 dark-theme component styling

import { useEffect, useRef, useState } from "react";
import { ApiError, sendChatMessage } from "@/crowd/api";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const SESSION_KEY = "tankbot_session_id";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored =
      typeof window !== "undefined" ? localStorage.getItem(SESSION_KEY) : null;
    if (stored) setSessionId(stored);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await sendChatMessage(text, sessionId);
      setSessionId(res.session_id);
      if (typeof window !== "undefined") {
        localStorage.setItem(SESSION_KEY, res.session_id);
      }
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "TankBot is unreachable right now.";
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 font-sans">
      {open && (
        <div className="flex h-[520px] w-[360px] max-w-[92vw] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/60">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">TankBot</p>
              <p className="font-mono text-[10px] uppercase tracking-wide text-slate-500">
                Sri Lanka tanks &amp; reservoirs guide
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              ✕
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <p className="text-sm text-slate-500">
                Ask me about safety, history, or visiting Sri Lanka&apos;s ancient tanks
                and reservoirs. 🌊
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto bg-cyan-500 text-slate-950"
                    : "mr-auto border border-slate-200 bg-slate-100 text-slate-800"
                }`}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="mr-auto flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500">
                <span className="h-1.5 w-1.5 animate-blink rounded-full bg-cyan-500" />
                <span className="h-1.5 w-1.5 animate-blink rounded-full bg-cyan-500 [animation-delay:0.2s]" />
                <span className="h-1.5 w-1.5 animate-blink rounded-full bg-cyan-500 [animation-delay:0.4s]" />
              </div>
            )}
          </div>

          <div className="flex items-end gap-2 border-t border-slate-200 bg-slate-50 p-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask about a tank or reservoir…"
              className="max-h-24 flex-1 resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="rounded-md bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950 transition-opacity disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close TankBot chat" : "Open TankBot chat"}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500 text-2xl text-slate-950 shadow-lg shadow-slate-300/60 transition-transform hover:scale-105"
      >
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}