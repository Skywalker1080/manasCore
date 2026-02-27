'use client'

import { Lightbulb, Heart, Compass, Moon } from 'lucide-react'

interface PromptSuggestionsProps {
  onSelectPrompt: (prompt: string) => void
}

export function PromptSuggestions({ onSelectPrompt }: PromptSuggestionsProps) {
  const prompts = [
    {
      text: 'Reflect on your day',
      icon: Lightbulb,
      color: 'from-amber-500/20 to-amber-600/10',
      borderColor: 'border-amber-400/20 hover:border-amber-400/40',
      textColor: 'text-amber-200/70 hover:text-amber-100',
    },
    {
      text: 'Where does your mind wander?',
      icon: Compass,
      color: 'from-cyan-500/20 to-cyan-600/10',
      borderColor: 'border-cyan-400/20 hover:border-cyan-400/40',
      textColor: 'text-cyan-200/70 hover:text-cyan-100',
    },
    {
      text: 'How would you describe your current mood?',
      icon: Heart,
      color: 'from-rose-500/20 to-rose-600/10',
      borderColor: 'border-rose-400/20 hover:border-rose-400/40',
      textColor: 'text-rose-200/70 hover:text-rose-100',
    },
    {
      text: 'What did you learn tonight?',
      icon: Moon,
      color: 'from-violet-500/20 to-violet-600/10',
      borderColor: 'border-violet-400/20 hover:border-violet-400/40',
      textColor: 'text-violet-200/70 hover:text-violet-100',
    },
  ]

  return (
    <div className="mx-auto w-full max-w-2xl px-6 md:px-0 mb-8">
      <p className="text-xs uppercase tracking-widest text-muted-foreground/40 mb-4">
        Start with a thought
      </p>
      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt, index) => {
          const IconComponent = prompt.icon
          return (
            <button
              key={index}
              onClick={() => onSelectPrompt(prompt.text)}
              className={`group relative overflow-hidden rounded-lg border transition-all duration-300 px-3 py-2 backdrop-blur-sm ${prompt.borderColor}`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${prompt.color} transition-opacity duration-300`}
              />
              <div className="relative z-10 flex items-center gap-2">
                <IconComponent className="h-3.5 w-3.5 shrink-0 transition-transform duration-300 group-hover:scale-110" />
                <span className={`text-xs transition-colors duration-300 ${prompt.textColor} font-mono whitespace-nowrap`}>
                  {prompt.text}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
