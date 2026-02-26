"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { StreakData } from "@/lib/api"
import { Flame, Trophy, BookOpen } from "lucide-react"

interface StreakCardProps {
  data: StreakData | null
  isLoading?: boolean
}

function StatBlock({
  icon,
  label,
  value,
  accentColor,
}: {
  icon: React.ReactNode
  label: string
  value: number
  accentColor: string
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full ${accentColor}`}
      >
        {icon}
      </div>
      <span className="font-serif text-3xl tabular-nums text-foreground/90">
        {value}
      </span>
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground/60">
        {label}
      </span>
    </div>
  )
}

export function StreakCard({ data, isLoading }: StreakCardProps) {
  if (isLoading) {
    return (
      <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground/80">
            <Flame className="h-4 w-4 text-chart-1" />
            Journaling Streak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[120px] items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground/60" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const streak = data ?? { current_streak: 0, longest_streak: 0, total_entries: 0 }

  return (
    <Card className="border-border/30 bg-card/60 backdrop-blur-sm transition-all duration-300 hover:border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground/80">
          <Flame className="h-4 w-4 text-chart-1" />
          Journaling Streak
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-around py-4">
          <StatBlock
            icon={<Flame className="h-5 w-5 text-orange-400" />}
            label="Current"
            value={streak.current_streak}
            accentColor="bg-orange-500/10"
          />
          <div className="h-12 w-px bg-border/30" />
          <StatBlock
            icon={<Trophy className="h-5 w-5 text-yellow-400" />}
            label="Longest"
            value={streak.longest_streak}
            accentColor="bg-yellow-500/10"
          />
          <div className="h-12 w-px bg-border/30" />
          <StatBlock
            icon={<BookOpen className="h-5 w-5 text-blue-400" />}
            label="Total"
            value={streak.total_entries}
            accentColor="bg-blue-500/10"
          />
        </div>
      </CardContent>
    </Card>
  )
}
