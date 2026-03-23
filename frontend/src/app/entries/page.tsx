"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { format, subDays, isSameDay, startOfDay, parseISO } from "date-fns"
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  Sun,
  Cloud,
  CloudRain,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react"
import Link from "next/link"
import { api, type JournalEntry } from "@/lib/api"
import { EntryDetailModal } from "@/components/entry-detail-modal"
import { Skeleton } from "@/components/ui/skeleton"
import { MoreHorizontal, Pencil, Trash2, Check, X } from "lucide-react"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INITIAL_DAYS = 5
const LOAD_MORE_DAYS = 5
const FETCH_BATCH_SIZE = 50 // fetch plenty, then group client-side

// ---------------------------------------------------------------------------
// Mini calendar component
// ---------------------------------------------------------------------------

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

function MiniCalendar({
  selectedDate,
  onSelectDate,
  entryDates,
}: {
  selectedDate: Date | null
  onSelectDate: (d: Date | null) => void
  entryDates: Set<string> // formatted as yyyy-MM-dd
}) {
  const [viewMonth, setViewMonth] = useState(() => new Date())

  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const prevMonth = () => setViewMonth(new Date(year, month - 1, 1))
  const nextMonth = () => setViewMonth(new Date(year, month + 1, 1))

  const today = startOfDay(new Date())

  const cells: (Date | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))

  return (
    <div className="rounded-xl border border-border/30 bg-[oklch(0.12_0.005_260/0.6)] backdrop-blur-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="rounded-md p-1.5 text-muted-foreground/50 transition-colors hover:bg-white/5 hover:text-foreground/80"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="font-mono text-xs tracking-wider text-foreground/70">
          {format(viewMonth, "MMMM yyyy")}
        </span>
        <button
          onClick={nextMonth}
          className="rounded-md p-1.5 text-muted-foreground/50 transition-colors hover:bg-white/5 hover:text-foreground/80"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAYS_OF_WEEK.map((d) => (
          <div
            key={d}
            className="flex h-7 items-center justify-center font-mono text-[10px] tracking-widest text-muted-foreground/35 uppercase"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((date, i) => {
          if (!date)
            return <div key={`empty-${i}`} className="h-8" />

          const key = format(date, "yyyy-MM-dd")
          const hasEntries = entryDates.has(key)
          const isSelected = selectedDate ? isSameDay(date, selectedDate) : false
          const isToday = isSameDay(date, today)
          const isFuture = date > today

          return (
            <button
              key={key}
              onClick={() => {
                if (isFuture) return
                onSelectDate(isSelected ? null : date)
              }}
              disabled={isFuture}
              className={`
                relative flex h-8 items-center justify-center rounded-lg font-mono text-[11px] transition-all duration-150
                ${isFuture ? "text-muted-foreground/15 cursor-not-allowed" : "cursor-pointer"}
                ${isSelected
                  ? "bg-foreground/15 text-foreground ring-1 ring-foreground/20"
                  : isToday
                    ? "text-chart-4 font-semibold"
                    : hasEntries
                      ? "text-foreground/70 hover:bg-white/5"
                      : "text-muted-foreground/30 hover:bg-white/[0.03]"
                }
              `}
            >
              {date.getDate()}
              {/* Dot indicator for days with entries */}
              {hasEntries && !isSelected && (
                <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-chart-1/60" />
              )}
            </button>
          )
        })}
      </div>

      {/* Clear selection */}
      {selectedDate && (
        <button
          onClick={() => onSelectDate(null)}
          className="mt-3 w-full rounded-lg border border-border/20 bg-white/[0.03] py-1.5 font-mono text-[10px] tracking-wider text-muted-foreground/50 transition-colors hover:bg-white/[0.06] hover:text-foreground/60"
        >
          Clear selection
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Entry card (inline — matches previous-entries style)
// ---------------------------------------------------------------------------

function EntryCard({
  entry,
  onClick,
  onDelete,
  onEdit,
}: {
  entry: JournalEntry
  onClick: () => void
  onDelete: (id: number) => void
  onEdit: (id: number, content: string) => void
}) {
  const [openMenu, setOpenMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState("")

  const sentiment = deriveSentimentFromScore(entry.sentiment)
  const cfg = sentimentConfig[sentiment]
  const SentimentIcon = cfg.icon
  const title = entry.title || deriveTitle(entry.user_log)
  const timestamp = new Date(entry.date)

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
    setEditValue(entry.user_log)
    setOpenMenu(false)
  }

  const confirmEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (editValue.trim() && editValue.trim() !== entry.user_log) {
      onEdit(entry.id, editValue.trim())
    }
    setIsEditing(false)
  }

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(false)
    setEditValue("")
  }

  return (
    <article
      onClick={() => {
        if (!isEditing) onClick()
      }}
      className={`group relative rounded-xl border border-white/5 bg-[oklch(0.13_0.005_260/0.55)] backdrop-blur-xl transition-all hover:bg-[oklch(0.15_0.005_260/0.65)] hover:border-white/10 cursor-pointer ${
        openMenu ? "z-50" : "z-10 overflow-hidden"
      }`}
    >
      <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2">
        <span className="flex-1 truncate font-mono text-xs font-semibold tracking-wide text-white">
          {title}
        </span>

        {entry.pending ? (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-chart-1/30 bg-chart-1/10 px-2.5 py-0.5 font-mono text-[10px] tracking-wider text-chart-1/80 animate-pulse">
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
            Processing
          </span>
        ) : entry.emotion ? (
          <span className="shrink-0 font-mono text-[10px] tracking-wider text-muted-foreground/50 bg-white/5 px-2 py-0.5 rounded-full">
            {entry.emotion}
          </span>
        ) : null}

        <span className="shrink-0 font-mono text-[10px] tracking-wider text-muted-foreground/25">
          {format(timestamp, "h:mm a")}
        </span>

        {/* More menu */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setOpenMenu(!openMenu)}
            className="rounded-md p-1 text-muted-foreground/25 transition-colors hover:bg-white/5 hover:text-muted-foreground/60"
            aria-label="Entry options"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>

          {openMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(false)} />
              <div className="absolute right-0 z-20 mt-1 w-32 overflow-hidden rounded-lg border border-border/40 bg-[oklch(0.14_0.005_260)] shadow-xl">
                <button
                  onClick={startEdit}
                  className="flex w-full items-center gap-2 px-3 py-2 font-mono text-xs text-muted-foreground/70 transition-colors hover:bg-white/5 hover:text-foreground/80"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
                <button
                  onClick={() => { onDelete(entry.id); setOpenMenu(false) }}
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

      <div className="flex items-center gap-3 px-4 pb-3.5">
        {isEditing ? (
          <div className="flex w-full flex-col gap-2" onClick={(e) => e.stopPropagation()}>
            <textarea
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full resize-none rounded-md border border-border/30 bg-white/5 px-3 py-2 font-system-serif text-sm leading-relaxed text-foreground/80 outline-none focus:border-border/60"
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
                onClick={confirmEdit}
                className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 font-mono text-xs text-foreground/60 transition-colors hover:bg-white/10 hover:text-foreground/80"
              >
                <Check className="h-3 w-3" /> Save
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="flex-1 truncate font-mono text-[11px] leading-relaxed text-muted-foreground/45">
              {entry.user_log}
            </p>
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
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EntriesPage() {
  const [allEntries, setAllEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [fetchedCount, setFetchedCount] = useState(0)
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [daysToShow, setDaysToShow] = useState(INITIAL_DAYS)

  // Initial fetch — grab a big batch
  useEffect(() => {
    async function load() {
      try {
        const data = await api.getEntries(0, FETCH_BATCH_SIZE)
        setAllEntries(data)
        setFetchedCount(data.length)
        setHasMore(data.length >= FETCH_BATCH_SIZE)
      } catch (err) {
        console.error("Failed to load entries:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Fetch more from the server
  const fetchMore = useCallback(async () => {
    setLoadingMore(true)
    try {
      const data = await api.getEntries(fetchedCount, FETCH_BATCH_SIZE)
      setAllEntries((prev) => [...prev, ...data])
      setFetchedCount((prev) => prev + data.length)
      setHasMore(data.length >= FETCH_BATCH_SIZE)
    } catch (err) {
      console.error("Failed to load more entries:", err)
    } finally {
      setLoadingMore(false)
    }
  }, [fetchedCount])

  // Handlers for deleting and editing entries
  const handleDeleteEntry = useCallback(async (id: number) => {
    try {
      await api.deleteEntry(id)
      setAllEntries((prev) => prev.filter((e) => e.id !== id))
    } catch (err) {
      console.error("Error deleting entry:", err)
    }
  }, [])

  const handleEditEntry = useCallback(async (id: number, newContent: string) => {
    // Note: Pending full backend endpoint for PUT /entries/{id},
    // we use an optimistic update here to reflect UI changes instantly.
    console.log("Edit entry", id, newContent)
    setAllEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, user_log: newContent } : e))
    )
  }, [])

  // Group entries by date (yyyy-MM-dd)
  const groupedByDate = useMemo(() => {
    const groups = new Map<string, JournalEntry[]>()
    for (const entry of allEntries) {
      const key = format(new Date(entry.date), "yyyy-MM-dd")
      const existing = groups.get(key) || []
      existing.push(entry)
      groups.set(key, existing)
    }
    // Sort keys newest first
    const sorted = [...groups.entries()].sort(
      ([a], [b]) => new Date(b).getTime() - new Date(a).getTime()
    )
    return sorted
  }, [allEntries])

  // Set of dates that have entries (for calendar dots)
  const entryDateSet = useMemo(() => {
    const set = new Set<string>()
    for (const [dateKey] of groupedByDate) {
      set.add(dateKey)
    }
    return set
  }, [groupedByDate])

  // Filter: if a date is selected, only show that date; otherwise paginate by days
  const visibleGroups = useMemo(() => {
    if (selectedDate) {
      const key = format(selectedDate, "yyyy-MM-dd")
      const matched = groupedByDate.find(([k]) => k === key)
      return matched ? [matched] : []
    }
    return groupedByDate.slice(0, daysToShow)
  }, [groupedByDate, selectedDate, daysToShow])

  // Can we show more days?
  const canShowMoreDays = !selectedDate && daysToShow < groupedByDate.length

  const handleLoadMore = useCallback(async () => {
    const newDaysToShow = daysToShow + LOAD_MORE_DAYS
    setDaysToShow(newDaysToShow)

    // If we're running out of pre-fetched data, fetch more from server
    if (newDaysToShow >= groupedByDate.length && hasMore) {
      await fetchMore()
    }
  }, [daysToShow, groupedByDate.length, hasMore, fetchMore])

  return (
    <div className="relative min-h-screen bg-background">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-foreground/[0.02] blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[400px] w-[400px] rounded-full bg-chart-2/[0.03] blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6 pt-24 pb-16 md:px-10 md:pt-28">
        {/* Page header */}
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border/40 bg-secondary/40 text-foreground/60 transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Back to journal"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-system-serif text-3xl leading-6 tracking-tight text-foreground/90 md:text-3xl flex items-center gap-3">
              Journal Entries
            </h1>
            <p className="text-muted-foreground text-sm">
              Browse your Journal entries
            </p>
          </div>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="grid gap-5 lg:grid-cols-[1fr_260px] overflow-hidden">
            <div className="min-w-0 space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-4 w-40" />
                  <div className="space-y-2">
                    <div className="rounded-xl border border-border/20 bg-card/50 p-4 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-4 w-16 rounded-full" />
                        <div className="flex-1" />
                        <Skeleton className="h-3 w-12" />
                      </div>
                      <Skeleton className="h-3 w-[85%]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden lg:block">
              <Skeleton className="h-[320px] w-full rounded-xl" />
            </div>
          </div>
        ) : allEntries.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24">
            <div className="rounded-2xl border border-border/20 bg-card/50 px-10 py-12 text-center max-w-md backdrop-blur-sm">
              <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/30 mb-4" />
              <h2 className="font-serif text-xl text-foreground/80 mb-2">
                No entries yet
              </h2>
              <p className="text-sm text-muted-foreground/50 mb-6 leading-relaxed">
                Start journaling to see your entries here, organized by date.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <BookOpen className="h-4 w-4" />
                Write your first entry
              </Link>
            </div>
          </div>
        ) : (
          /* Main layout: entries + calendar sidebar */
          <div className="grid gap-8 lg:grid-cols-[1fr_260px] overflow-hidden">
            {/* Entries column */}
            <div className="min-w-0 space-y-8">
              {/* Selected date banner */}
              {selectedDate && (
                <div className="flex items-center gap-2 rounded-lg border border-chart-2/20 bg-chart-2/[0.06] px-4 py-2.5">
                  <CalendarIcon className="h-3.5 w-3.5 text-chart-2/70" />
                  <span className="font-mono text-xs text-chart-2/80">
                    Showing entries for{" "}
                    <span className="font-semibold text-chart-2">
                      {format(selectedDate, "EEEE, MMMM d, yyyy")}
                    </span>
                  </span>
                </div>
              )}

              {visibleGroups.length === 0 && selectedDate ? (
                <div className="rounded-xl border border-white/5 bg-[oklch(0.13_0.005_260/0.55)] p-8 text-center backdrop-blur-xl">
                  <p className="font-mono text-xs italic tracking-wide text-muted-foreground/40">
                    No entries found for this date.
                  </p>
                </div>
              ) : (
                visibleGroups.map(([dateKey, entries]) => {
                  const dateObj = parseISO(dateKey)
                  const isToday = isSameDay(dateObj, new Date())
                  const isYesterday = isSameDay(
                    dateObj,
                    subDays(new Date(), 1)
                  )

                  let dateLabel = format(dateObj, "EEEE, MMMM d, yyyy")
                  if (isToday) dateLabel = "Today"
                  if (isYesterday) dateLabel = "Yesterday"

                  return (
                    <div key={dateKey}>
                      {/* Date header */}
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-chart-2/50" />
                          <span className="font-mono text-xs tracking-wider text-foreground/60">
                            {dateLabel}
                          </span>
                        </div>
                        <div className="h-px flex-1 bg-border/20" />
                        <span className="font-mono text-[10px] tracking-wider text-muted-foreground/30">
                          {entries.length}{" "}
                          {entries.length === 1 ? "entry" : "entries"}
                        </span>
                      </div>

                      {/* Entry cards */}
                      <div className="flex flex-col gap-2.5">
                        {entries.map((entry) => (
                          <EntryCard
                            key={entry.id}
                            entry={entry}
                            onClick={() => setSelectedEntry(entry)}
                            onDelete={handleDeleteEntry}
                            onEdit={handleEditEntry}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })
              )}

              {/* Load more */}
              {(canShowMoreDays || (hasMore && !selectedDate)) && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="group flex items-center gap-1.5 rounded-lg border border-border/20 bg-white/[0.03] px-5 py-2.5 font-mono text-xs tracking-wide text-muted-foreground/50 transition-all hover:bg-white/[0.06] hover:text-foreground/70 hover:border-border/40 disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>Load previous entries</>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Calendar sidebar */}
            <div className="hidden lg:block">
              <div className="sticky top-28">
                <div className="mb-3 flex items-center gap-2">
                  <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground/40" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground/40">
                    Jump to date
                  </span>
                </div>
                <MiniCalendar
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  entryDates={entryDateSet}
                />

                {/* Quick stats */}
                <div className="mt-4 rounded-xl border border-border/20 bg-[oklch(0.12_0.005_260/0.4)] p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/35">
                        Total entries
                      </p>
                      <p className="mt-1 font-mono text-lg text-foreground/80">
                        {allEntries.length}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/35">
                        Days active
                      </p>
                      <p className="mt-1 font-mono text-lg text-foreground/80">
                        {entryDateSet.size}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Entry detail modal */}
      <EntryDetailModal
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
      />
    </div>
  )
}
