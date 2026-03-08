"use client"

import { useState } from "react"
import { format } from "date-fns"
import { MoreHorizontal, Pencil, Trash2, Check, X, Sun, Cloud, CloudRain, Clock, Loader2 } from "lucide-react"
import type { JournalEntry } from "@/lib/api"
import { EntryDetailModal } from "@/components/entry-detail-modal"

type Sentiment = "positive" | "neutral" | "negative"

function deriveSentimentFromScore(score: number | null): Sentiment {
  if (score === null) return "neutral"
  if (score > 0.2) return "positive"
  if (score < -0.2) return "negative"
  return "neutral"
}

function deriveTitle(content: string): string {
  const sentences = content.split(/[.!?]/g).filter(Boolean)
  const first = sentences[0]?.trim() ?? content
  const words = first.split(" ").slice(0, 5).join(" ")
  return words.length > 0 ? words : "Untitled"
}

const sentimentConfig: Record<
  Sentiment,
  { icon: React.ElementType; label: string; pill: string; iconColor: string }
> = {
  positive: {
    icon: Sun,
    label: "Bright",
    pill: "bg-amber-500/10 border-amber-500/20 text-amber-400/80",
    iconColor: "text-amber-400",
  },
  neutral: {
    icon: Cloud,
    label: "Still",
    pill: "bg-slate-500/10 border-slate-500/20 text-slate-400/80",
    iconColor: "text-slate-400",
  },
  negative: {
    icon: CloudRain,
    label: "Heavy",
    pill: "bg-rose-900/20 border-rose-700/20 text-rose-400/70",
    iconColor: "text-rose-400/80",
  },
}

interface PreviousEntriesProps {
  entries: JournalEntry[]
  onDelete: (id: number) => void
  onEdit: (id: number, newContent: string) => void
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
}

export function PreviousEntries({ entries, onDelete, onEdit, hasMore, loadingMore, onLoadMore }: PreviousEntriesProps) {
  const [openMenu, setOpenMenu] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState("")
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)

  if (entries.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 pt-10 md:px-0">
        <div className="rounded-xl border border-white/5 bg-[oklch(0.13_0.005_260/0.55)] p-8 text-center backdrop-blur-xl">
          <p className="font-mono text-xs italic tracking-wide text-muted-foreground/40">
            Your journal is empty. Begin writing to capture your thoughts.
          </p>
        </div>
      </div>
    )
  }

  const startEdit = (entry: JournalEntry) => {
    setEditingId(entry.id)
    setEditValue(entry.user_log)
    setOpenMenu(null)
  }

  const confirmEdit = (id: number) => {
    if (editValue.trim()) onEdit(id, editValue.trim())
    setEditingId(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue("")
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 pt-10 pb-16 md:px-0">
      <div className="mb-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border/30" />
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
          Previous Entries
        </span>
        <div className="h-px flex-1 bg-border/30" />
      </div>

      <div className="flex flex-col gap-3">
        {entries.map((entry) => {
          const sentiment = deriveSentimentFromScore(entry.sentiment)
          const cfg = sentimentConfig[sentiment]
          const SentimentIcon = cfg.icon
          const title = entry.title || deriveTitle(entry.user_log)
          const isEditing = editingId === entry.id
          const isMenuOpen = openMenu === entry.id
          const timestamp = new Date(entry.date)

          return (
            <article
              key={entry.id}
              className="group relative rounded-xl border border-white/5 bg-[oklch(0.13_0.005_260/0.55)] backdrop-blur-xl transition-all hover:bg-[oklch(0.15_0.005_260/0.65)] hover:border-white/10 cursor-pointer"
              onClick={() => {
                if (editingId !== entry.id) setSelectedEntry(entry)
              }}
            >
              {/* Top row: title + emotion + date + time + menu */}
              <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2">
                {/* Title */}
                <span className="flex-1 truncate font-mono text-xs font-semibold tracking-wide text-white">
                  {title}
                </span>

                {/* Emotion badge / Pending badge */}
                {entry.pending ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] tracking-wider text-amber-400/80">
                    <Clock className="h-2.5 w-2.5" />
                    Pending
                  </span>
                ) : entry.emotion ? (
                  <span className="shrink-0 font-mono text-[10px] tracking-wider text-muted-foreground/50 bg-white/5 px-2 py-0.5 rounded-full">
                    {entry.emotion}
                  </span>
                ) : null}

                {/* Date & time */}
                <span className="shrink-0 font-mono text-[10px] tracking-wider text-muted-foreground/35">
                  {format(timestamp, "MMM d")}
                </span>
                <span className="shrink-0 font-mono text-[10px] tracking-wider text-muted-foreground/25">
                  {format(timestamp, "h:mm a")}
                </span>

                {/* More menu */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setOpenMenu(isMenuOpen ? null : entry.id)}
                    className="rounded-md p-1 text-muted-foreground/25 transition-colors hover:bg-white/5 hover:text-muted-foreground/60"
                    aria-label="Entry options"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>

                  {isMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                      <div className="absolute right-0 z-20 mt-1 w-32 overflow-hidden rounded-lg border border-border/40 bg-[oklch(0.14_0.005_260)] shadow-xl">
                        <button
                          onClick={() => startEdit(entry)}
                          className="flex w-full items-center gap-2 px-3 py-2 font-mono text-xs text-muted-foreground/70 transition-colors hover:bg-white/5 hover:text-foreground/80"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => { onDelete(entry.id); setOpenMenu(null) }}
                          className="flex w-full items-center gap-2 px-3 py-2 font-mono text-xs text-rose-600/60 transition-colors hover:bg-rose-950/30 hover:text-rose-500"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Content + sentiment row */}
              <div className="flex items-center gap-3 px-4 pb-3.5">
                {isEditing ? (
                  <div className="flex w-full flex-col gap-2">
                    <textarea
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full resize-none rounded-md border border-border/30 bg-white/5 px-3 py-2 font-mono text-xs leading-relaxed text-foreground/80 outline-none focus:border-border/60"
                      rows={3}
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={cancelEdit}
                        className="flex items-center gap-1 rounded-md px-2 py-1 font-mono text-xs text-muted-foreground/50 transition-colors hover:bg-white/5 hover:text-foreground/60"
                      >
                        <X className="h-3 w-3" /> Cancel
                      </button>
                      <button
                        onClick={() => confirmEdit(entry.id)}
                        className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 font-mono text-xs text-foreground/60 transition-colors hover:bg-white/10 hover:text-foreground/80"
                      >
                        <Check className="h-3 w-3" /> Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Log preview — single line truncated */}
                    <p className="flex-1 truncate font-mono text-[11px] leading-relaxed text-muted-foreground/45">
                      {entry.user_log}
                    </p>

                    {/* Sentiment pill (hidden for pending entries) */}
                    {!entry.pending && (
                      <span
                        className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wide ${cfg.pill}`}
                        title={`Mood: ${cfg.label}`}
                      >
                        <SentimentIcon className={`h-2.5 w-2.5 ${cfg.iconColor}`} />
                        {cfg.label}
                      </span>
                    )}
                  </>
                )}
              </div>
            </article>
          )
        })}
      </div>

      {/* Load more */}
      {hasMore && onLoadMore && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="group flex items-center gap-1.5 font-mono text-xs tracking-wide text-muted-foreground/40 transition-colors hover:text-muted-foreground/70 disabled:opacity-50"
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading...
              </>
            ) : (
              "Load more"
            )}
          </button>
        </div>
      )}

      {/* Entry detail modal */}
      <EntryDetailModal
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
      />
    </div>
  )
}
