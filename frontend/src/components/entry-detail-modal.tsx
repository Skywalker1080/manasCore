"use client"

import { useEffect, useRef } from "react"
import { format } from "date-fns"
import {
  X,
  Sun,
  Cloud,
  CloudRain,
  Clock,
  Sparkles,
  Tag,
  Brain,
  FileText,
  Calendar,
  RefreshCw,
  Lightbulb,
} from "lucide-react"
import type { JournalEntry } from "@/lib/api"

type Sentiment = "positive" | "neutral" | "negative"

function deriveSentimentFromScore(score: number | null): Sentiment {
  if (score === null) return "neutral"
  if (score > 0.2) return "positive"
  if (score < -0.2) return "negative"
  return "neutral"
}

const sentimentConfig: Record<
  Sentiment,
  {
    icon: React.ElementType
    label: string
    color: string
    bg: string
    border: string
    gradient: string
    barColor: string
  }
> = {
  positive: {
    icon: Sun,
    label: "Positive",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    gradient: "from-amber-500/20 to-transparent",
    barColor: "bg-amber-400",
  },
  neutral: {
    icon: Cloud,
    label: "Neutral",
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/20",
    gradient: "from-slate-500/20 to-transparent",
    barColor: "bg-slate-400",
  },
  negative: {
    icon: CloudRain,
    label: "Negative",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    gradient: "from-rose-500/20 to-transparent",
    barColor: "bg-rose-400",
  },
}

interface EntryDetailModalProps {
  entry: JournalEntry | null
  onClose: () => void
}

export function EntryDetailModal({ entry, onClose }: EntryDetailModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    if (entry) {
      document.addEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [entry, onClose])

  if (!entry) return null

  // Inject keyframes if not already present
  if (typeof document !== "undefined" && !document.getElementById("entry-modal-keyframes")) {
    const style = document.createElement("style")
    style.id = "entry-modal-keyframes"
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(16px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `
    document.head.appendChild(style)
  }

  const sentiment = deriveSentimentFromScore(entry.sentiment)
  const cfg = sentimentConfig[sentiment]
  const SentimentIcon = cfg.icon
  const timestamp = new Date(entry.date)
  const updatedAt = new Date(entry.updated_at)

  // Sentiment score as a percentage (mapped from -1..1 → 0..100)
  const sentimentPercent =
    entry.sentiment !== null ? Math.round(((entry.sentiment + 1) / 2) * 100) : null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/80"
        onClick={onClose}
        style={{ animation: "fadeIn 200ms ease-out forwards" }}
      />

      {/* Scrollable Overlay containing the Modal */}
      <div
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto pointer-events-none"
      >
        <div
          className="relative z-10 my-8 w-full max-w-2xl mx-4 pointer-events-auto"
          style={{ animation: "slideUp 300ms ease-out forwards" }}
        >
          <div className="rounded-2xl border border-border bg-[#0D0D0D] shadow-2xl shadow-black/50">


          {/* Header */}
          <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-system-serif text-white leading-snug">
                {entry.title || "Untitled Entry"}
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground/40">
                  <Calendar className="h-3 w-3" />
                  {format(timestamp, "EEEE, MMMM d, yyyy")}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground/30">
                  {format(timestamp, "h:mm a")}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onClose()
              }}
              className="relative z-50 shrink-0 cursor-pointer rounded-lg p-2.5 -mr-2 -mt-1 text-muted-foreground/60 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Pending banner */}
          {entry.pending && (
            <div className="mx-6 mb-4 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3.5 py-2.5">
              <span className="font-mono text-xs text-amber-400/70">
                This entry is pending AI analysis. Insights will appear once processed.
              </span>
            </div>
          )}

          {/* Emotion + Sentiment + Mode row */}
          {!entry.pending && (
            <div className="mx-6 mb-4 flex flex-wrap gap-2">
              {/* Emotion chip */}
              {entry.emotion && (
                <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5">
                  <span className="font-mono text-[11px] tracking-wide text-foreground/60">
                    {entry.emotion}
                  </span>
                </div>
              )}

              {/* Sentiment chip */}
              <div
                className={`flex items-center gap-1.5 rounded-lg border ${cfg.border} ${cfg.bg} px-3 py-1.5`}
              >
                <span className={`font-mono text-[11px] tracking-wide ${cfg.color}`}>
                  {cfg.label}
                  {entry.sentiment !== null && (
                    <span className="ml-1 opacity-80 font-medium font-sans">
                      ({entry.sentiment > 0 ? "+" : ""}{entry.sentiment.toFixed(2)})
                    </span>
                  )}
                </span>
              </div>

              {/* Mode chip */}
              {entry.mode && (
                <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5">
                  <span className="font-mono text-[11px] tracking-wide text-foreground/60">
                    {entry.mode}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Full journal content */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground/80">
                Journal Entry
              </span>
            </div>
            <p className="font-mono text-sm leading-relaxed text-foreground/70 whitespace-pre-wrap">
              {entry.user_log}
            </p>
          </div>

          {/* Summary */}
          {entry.summary && (
            <>
              <div className="px-6 py-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground/80">
                    Summary
                  </span>
                </div>
                <p className="font-mono text-sm leading-relaxed text-foreground/60 whitespace-pre-wrap">
                  {entry.summary}
                </p>
              </div>
            </>
          )}

          {/* Actionable Insight */}
          {entry.actionable_insight && (
            <>
              <div className="px-6 py-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground/80">
                    Actionable Insight
                  </span>
                </div>
                <div className="rounded-xl border border-violet-500/10 bg-violet-500/[0.04] px-4 py-3">
                  <p className="font-mono text-sm leading-relaxed text-violet-300/70 whitespace-pre-wrap">
                    {entry.actionable_insight}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Tags */}
          {entry.tags && entry.tags.length > 0 && (
            <>
              <div className="px-6 py-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground/80">
                    Tags
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {entry.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 font-mono text-[11px] text-foreground/50 transition-colors hover:bg-white/[0.06] hover:text-foreground/70"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
    </>
  )
}
