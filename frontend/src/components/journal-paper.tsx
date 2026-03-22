"use client"

import { useState, useRef, forwardRef, useImperativeHandle, useCallback } from "react"
import { ArrowUp, Loader2, Sparkles } from "lucide-react"
import Image from "next/image"
import { ModelSelector } from "@/components/model-selector"

// ─── Types ───────────────────────────────────────────────────────────────────

interface JournalPaperProps {
  onSubmit: (entry: string, modelName?: string) => void
  pendingCount?: number
}

export interface JournalPaperHandle {
  focus: () => void
  setValue: (val: string) => void
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MIN_LINE_COUNT = 8 // 40% of 20 lines, makes it initially smaller
const MAX_RENDERED_LINES = 100 // Pre-render plenty of lines for when it expands

// ─── Component ───────────────────────────────────────────────────────────────

export const JournalPaper = forwardRef<JournalPaperHandle, JournalPaperProps>(
  function JournalPaper({ onSubmit, pendingCount = 0 }, ref) {
    const [value, setValue] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [selectedModel, setSelectedModel] = useState("")
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      setValue: (val: string) => {
        setValue(val)
        if (textareaRef.current) {
          textareaRef.current.value = val
          textareaRef.current.style.height = "auto"
          textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
          textareaRef.current.focus()
        }
      },
    }))

    const handleSubmit = useCallback(async () => {
      const trimmed = value.trim()
      if (!trimmed || submitting) return
      setSubmitting(true)
      try {
        onSubmit(trimmed, selectedModel || undefined)
        setValue("")
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto"
        }
      } finally {
        setTimeout(() => setSubmitting(false), 300)
      }
    }, [value, submitting, selectedModel, onSubmit])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    }

    const handleInput = () => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
        textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, textareaRef.current.offsetHeight)}px`
      }
    }

    const isProcessing = pendingCount > 0

    return (
      <div className="journal-paper relative rounded-xl border border-border/30 bg-card/40 backdrop-blur-sm flex flex-col">
        {/* ── Paper content area ── */}
        <div className="relative px-8 py-6 md:px-10 md:py-8 flex-1 min-h-0 font-system-serif text-lg md:text-xl">
          {/* Horizontal ruled lines */}
          <div className="pointer-events-none absolute inset-0 px-8 md:px-10 overflow-hidden" aria-hidden="true">
            <div className="relative h-full pt-6 md:pt-8 w-full">
              {Array.from({ length: MAX_RENDERED_LINES }).map((_, i) => (
                <div
                  key={i}
                  className="journal-rule w-full box-border"
                  style={{ height: "2em" }}
                />
              ))}
            </div>
          </div>

          {/* Textarea — sits on top of the ruled lines */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            disabled={submitting}
            placeholder="Wake up, Neo..."
            className="relative z-10 w-full resize-none bg-transparent p-0 m-0 border-none leading-[2em] text-foreground/90 placeholder:text-muted-foreground/30 focus:outline-none focus:ring-0"
            style={{ height: `${MIN_LINE_COUNT * 2}em`, minHeight: `${MIN_LINE_COUNT * 2}em` }}
            id="journal-textarea"
          />
        </div>

        {/* ── Bottom bar (inside the paper) ── */}
        <div className="relative z-10 flex items-center justify-between px-8 py-4 md:px-10 border-t border-border/20 bg-card/30">
          {/* Left: model selector */}
          <ModelSelector
            value={selectedModel}
            onChange={setSelectedModel}
            disabled={submitting}
            compact
          />

          {/* Right: char count + submit */}
          <div className="flex items-center gap-3">
            {/* Character count */}
            <span className="text-xs font-mono text-muted-foreground/30 tracking-wide">
              {value.length > 0 ? `${value.length}` : ""}
            </span>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={!value.trim() || submitting}
              className="flex h-9 w-9 items-center justify-center rounded-lg transition-all bg-foreground/10 text-foreground/60 hover:bg-foreground/20 hover:text-foreground disabled:opacity-20 disabled:hover:bg-foreground/10"
              aria-label="Submit journal entry"
              id="submit-entry"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }
)
