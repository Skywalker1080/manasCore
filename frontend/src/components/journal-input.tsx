"use client"

import { useState, useRef, forwardRef, useImperativeHandle } from "react"
import { ArrowUp } from "lucide-react"

interface JournalInputProps {
  onSubmit: (entry: string) => void
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
      onSubmit(trimmed)
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
        <div className="relative rounded-xl border border-border/40 bg-secondary/30 backdrop-blur-sm transition-colors focus-within:border-border/70 focus-within:bg-secondary/50">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            disabled={loading}
            placeholder="What's on your mind tonight..."
            rows={1}
            className="w-full resize-none bg-transparent px-5 pt-4 pb-12 text-base leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none md:text-lg"
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            <span className="text-xs tracking-wider text-muted-foreground/40 font-mono">
              {value.length > 0 ? `${value.length}` : ""}
            </span>
            <button
              onClick={handleSubmit}
              disabled={!value.trim() || loading}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/10 text-foreground/50 transition-all hover:bg-foreground/20 hover:text-foreground disabled:opacity-30 disabled:hover:bg-foreground/10 disabled:hover:text-foreground/50"
              aria-label="Send journal entry"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }
)
