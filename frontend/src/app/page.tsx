"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { api } from "@/lib/api"
import { JournalPaper, type JournalPaperHandle } from "@/components/journal-paper"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

const POLL_INTERVAL_MS = 3000

type Notification = {
  type: "success" | "error" | "processing"
  message: string
} | null

function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return "th"
  switch (day % 10) {
    case 1: return "st"
    case 2: return "nd"
    case 3: return "rd"
    default: return "th"
  }
}

function formatJournalDate(date: Date): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]
  const dayName = days[date.getDay()]
  const monthName = months[date.getMonth()]
  const day = date.getDate()
  const year = date.getFullYear()
  return `${dayName}, ${monthName} ${day}${getOrdinalSuffix(day)}, ${year}`
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
}

export default function Home() {
  const [notification, setNotification] = useState<Notification>(null)
  const [entryNumber, setEntryNumber] = useState<number | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const journalRef = useRef<JournalPaperHandle>(null)
  const dismissTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const pendingPolls = useRef<Map<number, ReturnType<typeof setInterval>>>(new Map())

  const now = new Date()
  const formattedDate = formatJournalDate(now)
  const formattedTime = formatTime(now)

  // Fetch total entry count on mount
  useEffect(() => {
    async function fetchEntryCount() {
      try {
        const streak = await api.getStreak()
        setEntryNumber(streak.total_entries + 1)
      } catch {
        setEntryNumber(1)
      }
    }
    fetchEntryCount()

    return () => {
      pendingPolls.current.forEach((interval) => clearInterval(interval))
      pendingPolls.current.clear()
    }
  }, [])

  // Auto-dismiss non-processing notifications
  useEffect(() => {
    if (notification && notification.type !== "processing") {
      if (dismissTimer.current) clearTimeout(dismissTimer.current)
      dismissTimer.current = setTimeout(() => setNotification(null), 4000)
    }
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current)
    }
  }, [notification])

  // Update processing notification
  useEffect(() => {
    if (pendingCount > 0) {
      setNotification({
        type: "processing",
        message:
          pendingCount === 1
            ? "Manas is analyzing your entry…"
            : `Manas is analyzing ${pendingCount} entries…`,
      })
    } else {
      setNotification((prev) => (prev?.type === "processing" ? null : prev))
    }
  }, [pendingCount])

  const startPolling = useCallback((entryId: number) => {
    if (pendingPolls.current.has(entryId)) return

    const interval = setInterval(async () => {
      try {
        const updated = await api.getEntry(entryId)
        if (!updated.pending) {
          clearInterval(interval)
          pendingPolls.current.delete(entryId)
          setPendingCount((c) => Math.max(0, c - 1))
          setNotification({
            type: "success",
            message: "Entry processed — emotions & insights extracted ✨",
          })
        }
      } catch (err) {
        console.error(`Polling error for entry ${entryId}:`, err)
      }
    }, POLL_INTERVAL_MS)

    pendingPolls.current.set(entryId, interval)
  }, [])

  const handleNewEntry = useCallback(
    async (content: string, modelName?: string) => {
      setNotification(null)
      try {
        const created = await api.createEntry(content, modelName)
        setPendingCount((c) => c + 1)
        startPolling(created.id)
        setEntryNumber((prev) => (prev ? prev + 1 : 2))
      } catch (error) {
        console.error("Error creating entry:", error)
        setNotification({
          type: "error",
          message: "Something went wrong. Please try again.",
        })
      }
    },
    [startPolling]
  )

  return (
    <div className="relative min-h-screen bg-background">
      {/* Subtle ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-foreground/[0.02] blur-[120px]" />
      </div>

      {/* Toast notification */}
      <div
        className={`fixed top-5 left-1/2 z-50 -translate-x-1/2 transition-all duration-500 ease-in-out ${
          notification
            ? "translate-y-0 opacity-100"
            : "-translate-y-4 opacity-0 pointer-events-none"
        }`}
      >
        {notification && (
          <div
            className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 shadow-lg backdrop-blur-md ${
              notification.type === "success"
                ? "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-600 dark:text-emerald-300"
                : notification.type === "processing"
                ? "border-chart-1/20 bg-chart-1/[0.06] text-chart-1 dark:text-chart-4"
                : "border-red-500/20 bg-red-500/[0.08] text-red-600 dark:text-red-300"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : notification.type === "processing" ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            <span className="text-sm font-medium">{notification.message}</span>
            {notification.type !== "processing" && (
              <button
                onClick={() => setNotification(null)}
                className="ml-2 text-current/50 hover:text-current transition-colors text-xs"
                aria-label="Dismiss"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      <div className="relative z-10">
        <main className="flex flex-col items-center pt-24 md:pt-28 pb-16">
          {/* ─── Journal Page Header ─── */}
          <div className="flex flex-col items-center gap-3 mb-8 px-6">
            {/* Entry Badge */}
            <div className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-secondary/30 px-4 py-1.5 backdrop-blur-sm">
              <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground/60">
                Entry #{entryNumber !== null ? entryNumber.toLocaleString() : "—"}
              </span>
            </div>

            {/* Date — Large elegant serif */}
            <h1 className="font-serif text-4xl leading-tight tracking-tight text-foreground/90 text-center md:text-5xl lg:text-[3.5rem]">
              {formattedDate}
            </h1>

            {/* Metadata row */}
            <div className="flex items-center gap-3 text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground/40">
              <span>{formattedTime}</span>
            </div>
          </div>

          {/* ─── Journal Paper ─── */}
          <div className="w-full max-w-3xl px-6">
            <JournalPaper
              ref={journalRef}
              onSubmit={handleNewEntry}
              pendingCount={pendingCount}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
