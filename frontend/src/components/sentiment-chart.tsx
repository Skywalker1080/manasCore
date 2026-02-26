"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { format, parseISO } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { SentimentPoint } from "@/lib/api"
import { TrendingUp } from "lucide-react"

interface SentimentChartProps {
  data: SentimentPoint[]
  isLoading?: boolean
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  const sentiment = payload[0].value
  const sentimentLabel = sentiment > 0 ? "Positive" : sentiment < 0 ? "Negative" : "Neutral"
  return (
    <div className="rounded-lg border border-border/50 bg-card px-3 py-2 shadow-xl">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">
        {sentiment.toFixed(2)} · <span className="text-muted-foreground">{sentimentLabel}</span>
      </p>
    </div>
  )
}

export function SentimentChart({ data, isLoading }: SentimentChartProps) {
  if (isLoading) {
    return (
      <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground/80">
            <TrendingUp className="h-4 w-4 text-chart-1" />
            Sentiment Over Time
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

  const formatted = data.map((d) => ({
    ...d,
    label: format(parseISO(d.date), "MMM d"),
  }))

  return (
    <Card className="border-border/30 bg-card/60 backdrop-blur-sm transition-all duration-300 hover:border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground/80">
          <TrendingUp className="h-4 w-4 text-chart-1" />
          Sentiment Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        {formatted.length < 2 ? (
          <div className="flex h-[260px] flex-col items-center justify-center gap-2 text-center">
            <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground/60">
              Add a few more entries to see your sentiment trend
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={formatted} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.646 0.222 41.116)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.646 0.222 41.116)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="oklch(0.22 0.005 260 / 0.5)"
              />
              <XAxis
                dataKey="label"
                tick={{ fill: "oklch(0.55 0.01 260)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[-1, 1]}
                ticks={[-1, -0.5, 0, 0.5, 1]}
                tick={{ fill: "oklch(0.55 0.01 260)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <ReferenceLine
                y={0}
                stroke="oklch(0.55 0.01 260 / 0.3)"
                strokeDasharray="6 3"
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="average_sentiment"
                stroke="oklch(0.646 0.222 41.116)"
                strokeWidth={2}
                fill="url(#sentimentGradient)"
                dot={{ r: 3, fill: "oklch(0.646 0.222 41.116)", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "oklch(0.646 0.222 41.116)", stroke: "oklch(0.09 0.005 260)", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
