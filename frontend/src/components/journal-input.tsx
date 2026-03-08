"use client"

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react"
import Image from "next/image"
import { ArrowUp, Loader2, Brain, Sparkles } from "lucide-react"
import { ModelSelector } from "@/components/model-selector"

interface JournalInputProps {
  onSubmit: (entry: string, modelName?: string) => void
  loading?: boolean
}

export interface JournalInputHandle {
  focus: () => void
  setValue: (val: string) => void
}


export const JournalInput = forwardRef<JournalInputHandle, JournalInputProps>(
  function JournalInput({ onSubmit, loading }, ref) {
    const [value, setValue] = useState("")
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

    const handleSubmit = () => {
      const trimmed = value.trim()
      if (!trimmed) return
      onSubmit(trimmed, selectedModel || undefined)
      setValue("")
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
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

    return (
      <div className="mx-auto w-full max-w-2xl px-6 md:px-0">
        {/* Model selector row */}
        <div className="mb-2 flex items-center justify-end">
          <ModelSelector
            value={selectedModel}
            onChange={setSelectedModel}
            disabled={loading}
          />
        </div>

        {/* Input container — glowing border animation while processing */}
        <div
          className={`relative rounded-xl border backdrop-blur-sm transition-all duration-500 ${
            loading
              ? "border-chart-1/40 bg-secondary/40 shadow-[0_0_20px_-5px] shadow-chart-1/10"
              : "border-border/40 bg-secondary/30 focus-within:border-border/70 focus-within:bg-secondary/50"
          }`}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            disabled={loading}
            placeholder={loading ? "Processing your entry..." : "What's on your mind tonight..."}
            rows={1}
            className="w-full resize-none bg-transparent px-5 pt-4 pb-12 text-base leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:cursor-not-allowed md:text-lg"
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            <span className="text-xs tracking-wider text-muted-foreground/40 font-mono">
              {!loading && value.length > 0 ? `${value.length}` : ""}
            </span>
            <button
              onClick={handleSubmit}
              disabled={!value.trim() || loading}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                loading
                  ? "bg-chart-1/15 text-chart-1/70"
                  : "bg-foreground/10 text-foreground/50 hover:bg-foreground/20 hover:text-foreground disabled:opacity-30 disabled:hover:bg-foreground/10 disabled:hover:text-foreground/50"
              }`}
              aria-label={loading ? "Processing..." : "Send journal entry"}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Processing status banner */}
        <div
          className={`overflow-hidden transition-all duration-500 ease-in-out ${
            loading ? "mt-3 max-h-20 opacity-100" : "mt-0 max-h-0 opacity-0"
          }`}
        >
          <div className="flex items-center gap-3 rounded-lg border border-chart-1/20 bg-chart-1/[0.04] px-4 py-3">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-chart-1/20" />
              {selectedModel ? (
                <img src="/ollama.svg" alt="Ollama" className="h-4 w-4 object-contain invert dark:invert-0" />
              ) : (
                <img src="/gemini.svg" alt="Gemini" className="h-4 w-4 object-contain" />
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground/80 flex items-center gap-1.5">
                {selectedModel ? "Ollama is thinking" : "Gemini is thinking"}
                <Sparkles className="h-3 w-3 text-chart-4/60" />
              </span>
              <span className="text-xs text-muted-foreground/50">
                {selectedModel
                  ? `Using ${selectedModel} · Extracting emotions, sentiment & insights...`
                  : "Extracting emotions, sentiment & insights..."}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }
)
