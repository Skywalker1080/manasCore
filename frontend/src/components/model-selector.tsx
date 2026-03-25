"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check, Loader2 } from "lucide-react"
import { api, type OllamaModel } from "@/lib/api"

interface ModelSelectorProps {
  value: string
  onChange: (model: string) => void
  disabled?: boolean
  /** Compact mode for inline usage (e.g. chat input bar) */
  compact?: boolean
}

const DEFAULT_MODEL_LABEL = "Gemini 2.5 Flash (Default)"

export function ModelSelector({ value, onChange, disabled, compact }: ModelSelectorProps) {
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [modelsLoading, setModelsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch Ollama models on mount
  useEffect(() => {
    async function fetchModels() {
      setModelsLoading(true)
      try {
        const models = await api.getOllamaModels()
        setOllamaModels(models)
      } catch {
        // Silently fail — Ollama might not be running
      } finally {
        setModelsLoading(false)
      }
    }
    fetchModels()
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const displayModelName = value || DEFAULT_MODEL_LABEL

  // Format file size to human-readable
  const formatSize = (bytes: number | null) => {
    if (!bytes) return ""
    const gb = bytes / (1024 * 1024 * 1024)
    if (gb >= 1) return `${gb.toFixed(1)}GB`
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(0)}MB`
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        disabled={disabled}
        className={`flex items-center gap-1.5 rounded-lg border border-border/30 bg-secondary/30 text-xs font-medium text-muted-foreground/70 transition-all hover:border-border/50 hover:bg-secondary/50 hover:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 ${
          compact ? "px-2 py-1" : "px-3 py-1.5"
        }`}
        aria-label="Select AI model"
        id="model-selector"
      >
        {value ? (
          <img src="/ollama.svg" alt="Ollama" className="h-3 w-3 object-contain invert dark:invert-0" />
        ) : (
          <img src="/gemini.svg" alt="Gemini" className="h-3 w-3 object-contain" />
        )}
        <span className={`truncate ${compact ? "max-w-[140px]" : "max-w-[180px]"}`}>{displayModelName}</span>
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {dropdownOpen && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-72 overflow-hidden rounded-xl border border-border/40 bg-popover/95 shadow-xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200">
          <div className="p-1.5">
            {/* Default Gemini option */}
            <button
              onClick={() => {
                onChange("")
                setDropdownOpen(false)
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                !value
                  ? "bg-chart-1/10 text-foreground"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              }`}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary/80">
                <img src="/gemini.svg" alt="Gemini" className="h-4 w-4 object-contain" />
              </div>
              <div className="flex flex-1 flex-col">
                <span className="font-medium text-foreground/90">Gemini 2.5 Flash</span>
                <span className="text-[11px] text-muted-foreground/60">Default · Cloud</span>
              </div>
              {!value && <Check className="h-4 w-4 text-chart-1" />}
            </button>

            {/* Divider */}
            {ollamaModels.length > 0 && (
              <div className="my-1.5 flex items-center gap-2 px-3">
                <div className="h-px flex-1 bg-border/30" />
                <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/40">
                  Ollama · Local
                </span>
                <div className="h-px flex-1 bg-border/30" />
              </div>
            )}

            {/* Loading state */}
            {modelsLoading && (
              <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground/50">
                <Loader2 className="h-3 w-3 animate-spin" />
                Fetching local models...
              </div>
            )}

            {/* Empty state */}
            {!modelsLoading && ollamaModels.length === 0 && (
              <div className="px-3 py-3 text-xs text-muted-foreground/40 text-center">
                No Ollama models found.
                <br />
                <span className="text-[10px]">Is Ollama running?</span>
              </div>
            )}

            {/* Ollama models */}
            <div className="max-h-52 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {ollamaModels.map((model) => (
                <button
                  key={model.name}
                  onClick={() => {
                    onChange(model.name)
                    setDropdownOpen(false)
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                    value === model.name
                      ? "bg-chart-1/10 text-foreground"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  }`}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary/80">
                    <img src="/ollama.svg" alt="Ollama" className="h-4 w-4 object-contain invert dark:invert-0" />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <span className="font-medium text-foreground/90">{model.name}</span>
                    <span className="text-[11px] text-muted-foreground/60">
                      {[
                        model.parameter_size,
                        model.quantization_level,
                        formatSize(model.size),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                  {value === model.name && <Check className="h-4 w-4 text-chart-1" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
