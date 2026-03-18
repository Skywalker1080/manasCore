"use client"

import { useState, useRef, forwardRef, useImperativeHandle } from "react"
import { ArrowUp, Loader2, Sparkles } from "lucide-react"
import Image from "next/image"
import { ModelSelector } from "@/components/model-selector"

interface JournalInputProps {
  onSubmit: (entry: string, modelName?: string) => void
  pendingCount?: number
  placeholder?: string
  distractionFree?: boolean
}

export interface JournalInputHandle {
  focus: () => void
  setValue: (val: string) => void
}


export const JournalInput = forwardRef<JournalInputHandle, JournalInputProps>(
  function JournalInput({ onSubmit, pendingCount = 0, placeholder, distractionFree = true }, ref) {
    const [value, setValue] = useState("")
    const [isFocused, setIsFocused] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Model selector state
    const [selectedModel, setSelectedModel] = useState("")

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

    const handleSubmit = async () => {
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
        // Small delay to prevent double-tap
        setTimeout(() => setSubmitting(false), 300)
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    }

    const handleInput = () => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
      }
    }

    const isProcessing = pendingCount > 0

    return (
      <>
        {/* Distraction-free overlay */}
        {distractionFree && (
          <div
            className={`fixed inset-0 bg-background/95 backdrop-blur-sm transition-all duration-700 ease-in-out ${
              isFocused
                ? "z-40 opacity-100 pointer-events-auto"
                : "-z-10 opacity-0 pointer-events-none"
            }`}
            aria-hidden="true"
          />
        )}

        <div className={`mx-auto w-full max-w-2xl px-6 md:px-0 relative transition-all duration-500 ${distractionFree && isFocused ? "z-50" : "z-10"}`}>
          {/* Model selector row */}
          <div className={`relative z-20 mb-2 flex items-center justify-end transition-all duration-500 ${distractionFree && isFocused ? "opacity-0 pointer-events-none translate-y-2" : "opacity-100 translate-y-0"}`}>
            <ModelSelector
              value={selectedModel}
              onChange={setSelectedModel}
              disabled={submitting}
            />
          </div>

        {/* Input container */}
        <div
          className={`relative rounded-xl border backdrop-blur-sm transition-all duration-500 border-border/40 bg-secondary/30 focus-within:border-border/70 focus-within:bg-secondary/50`}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder || "What's on your mind tonight..."}
            rows={1}
            disabled={submitting}
            className="w-full resize-none bg-transparent px-5 pt-4 pb-12 text-base leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none md:text-lg disabled:opacity-50"
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            <span className="text-xs tracking-wider text-muted-foreground/40 font-mono">
              {value.length > 0 ? `${value.length}` : ""}
            </span>
            <button
              onClick={handleSubmit}
              disabled={!value.trim() || submitting}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all bg-foreground/10 text-foreground/50 hover:bg-foreground/20 hover:text-foreground disabled:opacity-30 disabled:hover:bg-foreground/10 disabled:hover:text-foreground/50`}
              aria-label="Send journal entry"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Processing status banner — visible but non-blocking */}
        <div
          className={`overflow-hidden transition-all duration-500 ease-in-out ${
            isProcessing ? "mt-3 max-h-20 opacity-100" : "mt-0 max-h-0 opacity-0"
          }`}
        >
          <div className="flex items-center gap-3 rounded-lg border border-chart-1/20 bg-chart-1/[0.04] px-4 py-3">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-chart-1/20" />
              {selectedModel ? (
                <Image src="/ollama.svg" alt="Ollama" width={16} height={16} className="h-4 w-4 object-contain invert dark:invert-0" />
              ) : (
                <Image src="/gemini.svg" alt="Gemini" width={16} height={16} className="h-4 w-4 object-contain" />
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground/80 flex items-center gap-1.5">
                Manas is thinking
                <Sparkles className="h-3 w-3 text-chart-4/60" />
              </span>
              <span className="text-xs text-muted-foreground/50">
                {pendingCount === 1
                  ? "Extracting emotions, sentiment & insights…"
                  : `Processing ${pendingCount} entries — extracting emotions, sentiment & insights…`}
                {" "}
                <span className="text-muted-foreground/30">You can keep writing</span>
              </span>
            </div>
          </div>
        </div>
        </div>
      </>
    )
  }
)
