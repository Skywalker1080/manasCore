"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { JournalInput, type JournalInputHandle } from "@/components/journal-input"
import { PreviousEntries } from "@/components/previous-entries"
import { PromptSuggestions } from "@/components/prompt-suggestions"
import { api, type JournalEntry } from "@/lib/api"
import { CheckCircle2, XCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

const PAGE_SIZE = 5

type Notification = {
  type: "success" | "error"
  message: string
} | null

const TAGLINES = [
  "Player One, ready?",
  "Directed by you",
  "The glitch in your matrix",
  "What lingers within you?",
]

export default function Home() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [notification, setNotification] = useState<Notification>(null)
  const journalInputRef = useRef<JournalInputHandle>(null)
  const [tagline] = useState(() => TAGLINES[Math.floor(Math.random() * TAGLINES.length)])
  const dismissTimer = useRef<ReturnType<typeof setTimeout>>(null)

  // Fetch entries on mount
  useEffect(() => {
    fetchEntries()
  }, [])

  // Auto-dismiss notification
  useEffect(() => {
    if (notification) {
      if (dismissTimer.current) clearTimeout(dismissTimer.current)
      dismissTimer.current = setTimeout(() => setNotification(null), 4000)
    }
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current)
    }
  }, [notification])

  async function fetchEntries() {
    try {
      const data = await api.getEntries(0, PAGE_SIZE)
      setEntries(data)
      setHasMore(data.length >= PAGE_SIZE)
    } catch (error) {
      console.error("Error fetching entries:", error)
    } finally {
      setInitialLoading(false)
    }
  }

  async function loadMore() {
    setLoadingMore(true)
    try {
      const data = await api.getEntries(entries.length, PAGE_SIZE)
      setEntries((prev) => [...prev, ...data])
      setHasMore(data.length >= PAGE_SIZE)
    } catch (error) {
      console.error("Error loading more entries:", error)
    } finally {
      setLoadingMore(false)
    }
  }

  const handleNewEntry = useCallback(async (content: string, modelName?: string) => {
    setLoading(true)
    setNotification(null)
    try {
      const created = await api.createEntry(content, modelName)
      fetchEntries() // Refresh list
      if (created.pending) {
        setNotification({ type: "success", message: "Entry saved — AI is unavailable, it will be processed later 🕐" })
      } else {
        setNotification({ type: "success", message: "Entry saved — emotions & insights extracted ✨" })
      }
    } catch (error) {
      console.error("Error creating entry:", error)
      setNotification({ type: "error", message: "Something went wrong. Please try again." })
    } finally {
      setLoading(false)
    }
  }, [])

  const handleDelete = useCallback(async (id: number) => {
    try {
      await api.deleteEntry(id)
      fetchEntries() // Refresh list
    } catch (error) {
      console.error("Error deleting entry:", error)
    }
  }, [])

  const handleEdit = useCallback(async (id: number, newContent: string) => {
    // For now, log the edit — backend update endpoint can be added later
    console.log("Edit entry", id, newContent)
    // Optimistic update
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, user_log: newContent } : e))
    )
  }, [])

  const handlePromptSelect = useCallback((prompt: string) => {
    if (journalInputRef.current) {
      journalInputRef.current.setValue(prompt + "\n")
      journalInputRef.current.focus()
    }
  }, [])

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
                : "border-red-500/20 bg-red-500/[0.08] text-red-600 dark:text-red-300"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            <span className="text-sm font-medium">{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-2 text-current/50 hover:text-current transition-colors text-xs"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      <div className="relative z-10">
        <main className="flex flex-col items-center pt-24 md:pt-32">
          {/* Hero text */}
          <div className="mb-10 flex flex-col items-center gap-2 px-6 text-center">
            <h1 className="font-serif text-4xl leading-tight tracking-tight text-foreground/90 text-balance md:text-5xl">
              {tagline}
            </h1>
          </div>

          {/* Prompt suggestions */}
          <PromptSuggestions onSelectPrompt={handlePromptSelect} />

          {/* Journal input */}
          <JournalInput onSubmit={handleNewEntry} loading={loading} ref={journalInputRef} />

          {/* Loading skeletons for entry list */}
          {initialLoading ? (
            <div className="mx-auto w-full max-w-2xl px-6 pt-10 md:px-0">
              <div className="mb-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border/30" />
                <Skeleton className="h-3 w-28" />
                <div className="h-px flex-1 bg-border/30" />
              </div>
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border/20 bg-card/50 p-4 space-y-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-4 w-16 rounded-full" />
                      <div className="flex-1" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                    <Skeleton className="h-3 w-[85%]" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <PreviousEntries
              entries={entries}
              onDelete={handleDelete}
              onEdit={handleEdit}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={loadMore}
            />
          )}
        </main>
      </div>
    </div>
  )
}

