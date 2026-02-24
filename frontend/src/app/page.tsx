"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { JournalInput, type JournalInputHandle } from "@/components/journal-input"
import { PreviousEntries } from "@/components/previous-entries"
import { PromptSuggestions } from "@/components/prompt-suggestions"
import { api, type JournalEntry } from "@/lib/api"

export default function Home() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(false)
  const journalInputRef = useRef<JournalInputHandle>(null)

  // Fetch entries on mount
  useEffect(() => {
    fetchEntries()
  }, [])

  async function fetchEntries() {
    try {
      const data = await api.getEntries()
      setEntries(data)
    } catch (error) {
      console.error("Error fetching entries:", error)
    }
  }

  const handleNewEntry = useCallback(async (content: string) => {
    setLoading(true)
    try {
      await api.createEntry(content)
      fetchEntries() // Refresh list
    } catch (error) {
      console.error("Error creating entry:", error)
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

      <div className="relative z-10">
        <main className="flex flex-col items-center pt-24 md:pt-32">
          {/* Hero text */}
          <div className="mb-10 flex flex-col items-center gap-2 px-6 text-center">
            <h1 className="font-serif text-4xl leading-tight tracking-tight text-foreground/90 text-balance md:text-5xl">
              What lingers within you?
            </h1>
            <p className="max-w-md text-sm leading-relaxed tracking-wide text-muted-foreground/50">
              A quiet space for the thoughts that need to exist somewhere.
            </p>
          </div>

          {/* Prompt suggestions */}
          <PromptSuggestions onSelectPrompt={handlePromptSelect} />

          {/* Journal input */}
          <JournalInput onSubmit={handleNewEntry} loading={loading} ref={journalInputRef} />

          {/* Previous entries */}
          <PreviousEntries entries={entries} onDelete={handleDelete} onEdit={handleEdit} />
        </main>
      </div>
    </div>
  )
}
