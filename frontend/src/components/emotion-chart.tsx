"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { EmotionCount } from "@/lib/api"
import { Smile } from "lucide-react"

interface EmotionChartProps {
  data: EmotionCount[]
  isLoading?: boolean
}

// Curated palette for up to 8 emotion bars — vibrant but harmonious
const BAR_COLORS = [
  "oklch(0.646 0.222 41.116)",   // warm coral
  "oklch(0.6 0.118 184.704)",    // teal
  "oklch(0.828 0.189 84.429)",   // golden
  "oklch(0.769 0.188 70.08)",    // amber
  "oklch(0.398 0.07 227.392)",   // deep blue
  "oklch(0.65 0.15 320)",        // purple
  "oklch(0.7 0.14 150)",         // green
  "oklch(0.55 0.12 30)",         // burnt orange
]

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: EmotionCount }[] }) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  return (
    <div className="rounded-lg border border-border/50 bg-card px-3 py-2 shadow-xl">
      <p className="text-sm font-medium text-foreground">{item.emotion}</p>
      <p className="text-xs text-muted-foreground">{item.count} {item.count === 1 ? "entry" : "entries"}</p>
    </div>
  )
}

export function EmotionChart({ data, isLoading }: EmotionChartProps) {
  if (isLoading) {
    return (
      <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground/80">
            <Smile className="h-4 w-4 text-chart-2" />
            Emotion Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[260px] items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground/60" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Limit to top 8 emotions
  const top = data.slice(0, 8)

  return (
    <Card className="border-border/30 bg-card/60 backdrop-blur-sm transition-all duration-300 hover:border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground/80">
          <Smile className="h-4 w-4 text-chart-2" />
          Emotion Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        {top.length === 0 ? (
          <div className="flex h-[260px] flex-col items-center justify-center gap-2 text-center">
            <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center">
              <Smile className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground/60">
              No emotion data yet — start journaling!
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={top} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="oklch(0.22 0.005 260 / 0.5)"
              />
              <XAxis
                type="number"
                tick={{ fill: "oklch(0.55 0.01 260)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                dataKey="emotion"
                type="category"
                tick={{ fill: "oklch(0.75 0.01 80)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={90}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "oklch(0.18 0.005 260 / 0.4)" }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={28}>
                {top.map((_, idx) => (
                  <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
