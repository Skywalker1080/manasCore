"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Sparkles, MessageCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage, TypingIndicator } from "@/components/chat-message";
import {
  api,
  type ChatHistoryMessage,
  type ChatSource,
  type ChatStreamEvent,
} from "@/lib/api";

// ---- Types ----
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  isStreaming?: boolean;
}

// ---- Suggested questions for empty state ----
const SUGGESTIONS = [
  {
    label: "Emotional patterns",
    prompt: "What are my emotional patterns this week?",
    icon: "🌊",
  },
  {
    label: "Goal alignment",
    prompt: "Am I aligned with my goals based on my recent entries?",
    icon: "🎯",
  },
  {
    label: "Summarize reflections",
    prompt: "Summarize my recent reflections and draw insights.",
    icon: "📖",
  },
  {
    label: "What should I focus on?",
    prompt:
      "Based on my journal entries and goals, what should I focus on today?",
    icon: "🔮",
  },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  const buildHistory = useCallback((): ChatHistoryMessage[] => {
    return messages
      .filter((m) => !m.isStreaming)
      .map((m) => ({ role: m.role, content: m.content }));
  }, [messages]);

  const handleSend = useCallback(
    async (messageText?: string) => {
      const text = (messageText || input).trim();
      if (!text || isStreaming) return;

      setInput("");

      // Add user message
      const userMsg: Message = {
        id: generateId(),
        role: "user",
        content: text,
      };

      // Add placeholder AI message
      const aiMsgId = generateId();
      const aiMsg: Message = {
        id: aiMsgId,
        role: "assistant",
        content: "",
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, aiMsg]);
      setIsStreaming(true);

      try {
        const history = buildHistory();

        // Stream tokens from the SSE endpoint
        for await (const event of api.streamChatMessage(text, history)) {
          const e = event as ChatStreamEvent;

          if (e.type === "token") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMsgId
                  ? { ...m, content: m.content + e.content }
                  : m
              )
            );
          } else if (e.type === "sources") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMsgId ? { ...m, sources: e.sources } : m
              )
            );
          } else if (e.type === "done") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMsgId ? { ...m, isStreaming: false } : m
              )
            );
          } else if (e.type === "error") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMsgId
                  ? {
                      ...m,
                      content:
                        m.content ||
                        "⚠️ Something went wrong. Please try again.",
                      isStreaming: false,
                    }
                  : m
              )
            );
          }
        }

        // Ensure streaming flag is cleared
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId ? { ...m, isStreaming: false } : m
          )
        );
      } catch (error) {
        console.error("Chat stream error:", error);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? {
                  ...m,
                  content:
                    m.content ||
                    "⚠️ Failed to connect to the AI. Is the backend running?",
                  isStreaming: false,
                }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
        inputRef.current?.focus();
      }
    },
    [input, isStreaming, buildHistory]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    inputRef.current?.focus();
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-emerald-500/[0.02] blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[400px] w-[400px] rounded-full bg-foreground/[0.015] blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col px-4">
        {/* Header area */}
        <div className="flex items-center justify-between pt-24 pb-4">
          <div className="flex items-center gap-2">
            {!isEmpty && (
              <>
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/60" />
                <span className="text-xs text-muted-foreground/60 tracking-wide">
                  {messages.filter((m) => m.role === "user").length} messages
                </span>
              </>
            )}
          </div>
          {!isEmpty && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              className="text-muted-foreground/40 hover:text-muted-foreground/70 h-8 gap-1.5 text-xs"
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </Button>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-hidden">
          {isEmpty ? (
            /* -------- Empty state -------- */
            <div className="flex flex-col items-center justify-center h-full pt-8 pb-32">
              <div className="mb-8 flex flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/20 bg-card/40">
                  <Sparkles className="h-5 w-5 text-emerald-500/70" />
                </div>
                <h1 className="font-serif text-3xl text-foreground/90 tracking-tight">
                  Ask your journal
                </h1>
                <p className="max-w-sm text-center text-sm text-muted-foreground/60 leading-relaxed">
                  I have context from your entries, goals, and vision. Ask me
                  anything about your patterns, progress, or reflections.
                </p>
              </div>

              <div className="grid w-full max-w-md grid-cols-2 gap-2.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => handleSend(s.prompt)}
                    className="group flex flex-col gap-1.5 rounded-xl border border-border/20 bg-card/30 px-4 py-3 text-left transition-all duration-200 hover:bg-card/60 hover:border-border/40 hover:shadow-lg hover:shadow-emerald-500/[0.03]"
                  >
                    <span className="text-base">{s.icon}</span>
                    <span className="text-xs font-medium text-foreground/70 group-hover:text-foreground/90 transition-colors">
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* -------- Message list -------- */
            <ScrollArea
              className="h-[calc(100vh-220px)]"
              ref={scrollRef}
            >
              <div className="py-4 space-y-1">
                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    role={msg.role}
                    content={msg.content}
                    sources={msg.sources}
                    isStreaming={msg.isStreaming}
                  />
                ))}
                {isStreaming &&
                  messages[messages.length - 1]?.content === "" && (
                    <TypingIndicator />
                  )}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Input bar */}
        <div className="sticky bottom-0 pb-6 pt-2">
          <div className="relative flex items-end gap-2 rounded-2xl border border-border/30 bg-card/40 px-4 py-3 backdrop-blur-md shadow-lg shadow-background/50 focus-within:border-border/50 transition-colors">
            <MessageCircle className="mb-1 h-4 w-4 shrink-0 text-muted-foreground/30" />
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your journal..."
              rows={1}
              disabled={isStreaming}
              className="flex-1 resize-none bg-transparent text-sm text-foreground/90 placeholder:text-muted-foreground/30 focus:outline-none disabled:opacity-50 max-h-32"
              style={{
                height: "auto",
                minHeight: "24px",
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
              }}
            />
            <Button
              size="sm"
              onClick={() => handleSend()}
              disabled={!input.trim() || isStreaming}
              className="h-8 w-8 shrink-0 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-0 transition-all duration-200 disabled:opacity-20"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground/30">
            Responses are grounded in your journal entries, personality, goals & vision
          </p>
        </div>
      </div>
    </div>
  );
}
