"use client";

import type { ChatSource } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  isStreaming?: boolean;
}

export function ChatMessage({
  role,
  content,
  sources,
  isStreaming,
}: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-4`}
    >
      <div
        className={`relative max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-foreground/[0.08] text-foreground/90 border border-border/30"
            : "bg-card/60 text-foreground/85 border border-border/20"
        }`}
      >
        {/* Avatar indicator */}
        <div
          className={`absolute top-3 ${
            isUser ? "-right-2" : "-left-2"
          } h-1.5 w-1.5 rounded-full ${
            isUser ? "bg-foreground/30" : "bg-emerald-500/60"
          }`}
        />

        {/* Message content */}
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-muted/50 prose-a:text-emerald-400">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        )}

        {/* Streaming cursor */}
        {isStreaming && (
          <span className="inline-block ml-0.5 w-[2px] h-4 bg-emerald-400/80 animate-pulse align-middle" />
        )}

        {/* Source citations */}
        {sources && sources.length > 0 && !isStreaming && (
          <div className="mt-3 pt-2 border-t border-border/15">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mb-1.5">
              Referenced entries
            </p>
            <div className="flex flex-wrap gap-1.5">
              {sources.map((s) => (
                <span
                  key={s.entry_id}
                  className="inline-flex items-center gap-1 rounded-md bg-foreground/[0.04] border border-border/15 px-2 py-0.5 text-[11px] text-muted-foreground/70"
                  title={s.summary || "Journal entry"}
                >
                  <span className="h-1 w-1 rounded-full bg-emerald-500/50" />
                  {s.date ? new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : `#${s.entry_id}`}
                  {s.emotion && (
                    <span className="text-muted-foreground/40 ml-0.5">
                      · {s.emotion}
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Animated typing indicator shown while waiting for AI response to start.
 */
export function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4">
      <div className="flex items-center gap-1.5 rounded-2xl bg-card/60 border border-border/20 px-4 py-3">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/60 animate-bounce [animation-delay:0ms]" />
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/60 animate-bounce [animation-delay:150ms]" />
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/60 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}
