"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Sparkles, MessageCircle, Trash2, Activity, Target, BookOpen, Lightbulb, Flame, Zap, Route, History, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage, TypingIndicator } from "@/components/chat-message";
import { JournalInput, type JournalInputHandle } from "@/components/journal-input";
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

interface EntryContext {
  entry_log: string;
  entry_summary?: string | null;
  entry_insight?: string | null;
  entry_sentiment?: number | null;
  entry_emotion?: string | null;
  entry_mode?: string | null;
  entry_title?: string | null;
}

// ---- Suggested questions for empty state ----
const SUGGESTIONS = [
  {
    label: "Emotional patterns",
    prompt: "What are my emotional patterns this week?",
    icon: Activity,
    color: 'from-rose-500/20 to-rose-600/10',
    borderColor: 'border-rose-400/20 hover:border-rose-400/40',
    textColor: 'text-rose-200/70 hover:text-rose-100',
  },
  {
    label: "Goal alignment",
    prompt: "Am I aligned with my goals based on my recent entries?",
    icon: Target,
    color: 'from-cyan-500/20 to-cyan-600/10',
    borderColor: 'border-cyan-400/20 hover:border-cyan-400/40',
    textColor: 'text-cyan-200/70 hover:text-cyan-100',
  },
  {
    label: "Summarize reflections",
    prompt: "Summarize my recent reflections and draw insights.",
    icon: BookOpen,
    color: 'from-amber-500/20 to-amber-600/10',
    borderColor: 'border-amber-400/20 hover:border-amber-400/40',
    textColor: 'text-amber-200/70 hover:text-amber-100',
  },
  {
    label: "What to focus on?",
    prompt:
      "Based on my journal entries and goals, what should I focus on today?",
    icon: Lightbulb,
    color: 'from-violet-500/20 to-violet-600/10',
    borderColor: 'border-violet-400/20 hover:border-violet-400/40',
    textColor: 'text-violet-200/70 hover:text-violet-100',
  },
  {
    label: "Main villain",
    prompt: "Who is the 'Main Villain' in my logs this month?",
    icon: Flame,
    color: 'from-orange-500/20 to-orange-600/10',
    borderColor: 'border-orange-400/20 hover:border-orange-400/40',
    textColor: 'text-orange-200/70 hover:text-orange-100',
  },
  {
    label: "Emotional triggers",
    prompt: "Identify my top three emotional triggers.",
    icon: Zap,
    color: 'from-pink-500/20 to-pink-600/10',
    borderColor: 'border-pink-400/20 hover:border-pink-400/40',
    textColor: 'text-pink-200/70 hover:text-pink-100',
  },
  {
    label: "Character arc",
    prompt: "Summarize my 'Character Arc' across all my entries.",
    icon: Route,
    color: 'from-emerald-500/20 to-emerald-600/10',
    borderColor: 'border-emerald-400/20 hover:border-emerald-400/40',
    textColor: 'text-emerald-200/70 hover:text-emerald-100',
  },
  {
    label: "Day 1 vs Today",
    prompt: "Compare my 'Day 1' mindset to who I am today.",
    icon: History,
    color: 'from-blue-500/20 to-blue-600/10',
    borderColor: 'border-blue-400/20 hover:border-blue-400/40',
    textColor: 'text-blue-200/70 hover:text-blue-100',
  },
];

// ---- Entry-specific suggested questions ----
const ENTRY_SUGGESTIONS = [
  "What does this entry reveal about my current mindset?",
  "How can I act on the insight from this entry?",
  "What emotions am I not fully acknowledging here?",
  "What patterns do you notice in what I wrote?",
];

function ChatPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [entryContext, setEntryContext] = useState<EntryContext | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const journalInputRef = useRef<JournalInputHandle>(null);
  const entryInitialized = useRef(false);

  // Parse entry context from URL params
  useEffect(() => {
    if (entryInitialized.current) return;
    const entryParam = searchParams.get("entry");
    if (entryParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(entryParam)) as EntryContext;
        setEntryContext(parsed);
        entryInitialized.current = true;
      } catch (e) {
        console.error("Failed to parse entry context:", e);
      }
    }
  }, [searchParams]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    journalInputRef.current?.focus();
  }, []);

  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  const buildHistory = useCallback((): ChatHistoryMessage[] => {
    return messages
      .filter((m) => !m.isStreaming)
      .map((m) => ({ role: m.role, content: m.content }));
  }, [messages]);

  const handleSend = useCallback(
    async (messageText: string, overrideModel?: string) => {
      const text = messageText.trim();
      if (!text || isStreaming) return;

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

        // Choose the appropriate streaming endpoint
        const streamGenerator = entryContext
          ? api.streamEntryChatMessage(text, entryContext, history, overrideModel || undefined)
          : api.streamChatMessage(text, history, overrideModel || undefined);

        for await (const event of streamGenerator) {
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
                        "Something went wrong. Please try again.",
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
                    "Failed to connect to the AI. Is the backend running?",
                  isStreaming: false,
                }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
        journalInputRef.current?.focus();
      }
    },
    [isStreaming, buildHistory, entryContext]
  );

  const clearChat = () => {
    setMessages([]);
    if (entryContext) {
      setEntryContext(null);
      entryInitialized.current = false;
      router.replace("/chat");
    }
    journalInputRef.current?.focus();
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
            {entryContext && (
              <button
                onClick={() => router.back()}
                className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors mr-2"
              >
                <ArrowLeft className="h-3 w-3" />
                Back
              </button>
            )}
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
                  {entryContext ? (
                    <MessageCircle className="h-5 w-5 text-emerald-500/70" />
                  ) : (
                    <Sparkles className="h-5 w-5 text-emerald-500/70" />
                  )}
                </div>
                <h1 className="font-serif text-3xl text-foreground/90 tracking-tight">
                  {entryContext
                    ? `"${entryContext.entry_title || "Untitled Entry"}"`
                    : "Ask your journal"}
                </h1>
                <p className="max-w-sm text-center text-sm text-muted-foreground/60 leading-relaxed">
                  {entryContext
                    ? "Let's talk about this journal entry. Ask me anything — I have full context of what you wrote, the insights, and the emotions detected."
                    : "I have context from your entries, goals, and vision. Ask me anything about your patterns, progress, or reflections."}
                </p>
              </div>

              {entryContext ? (
                /* Entry-specific suggestions */
                <div className="flex flex-wrap justify-center gap-2.5 max-w-2xl mt-4 px-2">
                  {ENTRY_SUGGESTIONS.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => handleSend(prompt)}
                      className="group relative overflow-hidden rounded-lg border transition-all duration-300 px-3 py-2 backdrop-blur-sm border-emerald-400/20 hover:border-emerald-400/40"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 transition-opacity duration-300" />
                      <div className="relative z-10 flex items-center gap-2">
                        <span className="text-xs transition-colors duration-300 text-emerald-200/70 hover:text-emerald-100 font-mono whitespace-nowrap">
                          {prompt}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                /* General suggestions */
                <div className="flex flex-wrap justify-center gap-2.5 max-w-2xl mt-4 px-2">
                  {SUGGESTIONS.map((s, index) => {
                    const IconComponent = s.icon;
                    return (
                      <button
                        key={index}
                        onClick={() => handleSend(s.prompt)}
                        className={`group relative overflow-hidden rounded-lg border transition-all duration-300 px-3 py-2 backdrop-blur-sm ${s.borderColor}`}
                      >
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${s.color} transition-opacity duration-300`}
                        />
                        <div className="relative z-10 flex items-center gap-2">
                          <IconComponent className="h-3.5 w-3.5 shrink-0 transition-transform duration-300 group-hover:scale-110" />
                          <span className={`text-xs transition-colors duration-300 ${s.textColor} font-mono whitespace-nowrap`}>
                            {s.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
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
          {/* Entry context indicator */}
          {entryContext && (
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-emerald-500/10 bg-emerald-500/[0.03] px-3 py-1.5">
              <MessageCircle className="h-3 w-3 text-emerald-400/50" />
              <span className="text-[11px] font-mono text-emerald-400/50 truncate flex-1">
                Discussing: {entryContext.entry_title || "Journal entry"}
              </span>
              <button
                onClick={() => {
                  setEntryContext(null);
                  setMessages([]);
                  entryInitialized.current = false;
                  router.replace("/chat");
                }}
                className="text-[10px] font-mono text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
              >
                Exit
              </button>
            </div>
          )}
          <JournalInput
            ref={journalInputRef}
            onSubmit={(text, model) => handleSend(text, model)}
            placeholder={entryContext ? "Ask about this entry..." : "Ask about your journal..."}
            distractionFree={false}
          />
          <p className="mt-2 text-center text-[10px] text-muted-foreground/30">
            {entryContext
              ? "Responses are focused on this specific journal entry"
              : "Responses are grounded in your journal entries, personality, goals & vision"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500/60 animate-pulse" /></div>}>
      <ChatPageContent />
    </Suspense>
  );
}
