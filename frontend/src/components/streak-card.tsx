"use client"

import { Card } from "@/components/ui/card"
import type { StreakData } from "@/lib/api"
import { Flame, Trophy, BookOpen } from "lucide-react"

interface StreakCardProps {
  data: StreakData | null
  isLoading?: boolean
}

export function StreakCard({ data, isLoading }: StreakCardProps) {
  if (isLoading) {
    return (
      <Card className="flex items-center justify-center h-16 border-border/30 bg-card/60 backdrop-blur-sm">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground/60" />
      </Card>
    )
  }

  const streak = data ?? { current_streak: 0, longest_streak: 0, total_entries: 0 }

  return (
    <Card className="border-border/20 bg-card/40 backdrop-blur-sm transition-all duration-300 hover:border-border/40 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3.5">
        {/* Current Streak */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/10 transition-colors group-hover:bg-orange-500/15">
            <Flame className="h-4 w-4 text-orange-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-serif tabular-nums text-foreground/90 leading-none">
              {streak.current_streak}
            </span>
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50 mt-1 font-mono">
              Current
            </span>
          </div>
        </div>

        <div className="h-8 w-px bg-white/5" />

        {/* Longest Streak */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500/10">
            <Trophy className="h-4 w-4 text-yellow-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-serif tabular-nums text-foreground/90 leading-none">
              {streak.longest_streak}
            </span>
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50 mt-1 font-mono">
              Longest
            </span>
          </div>
        </div>

        <div className="h-8 w-px bg-white/5" />

        {/* Total Entries */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
            <BookOpen className="h-4 w-4 text-blue-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-serif tabular-nums text-foreground/90 leading-none">
              {streak.total_entries}
            </span>
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50 mt-1 font-mono">
              Entries
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}
