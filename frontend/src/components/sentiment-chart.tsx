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

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; payload: any }[]; label?: string }) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  const sentiment = data.average_sentiment
  const contextText = data.context
  const sentimentLabel = sentiment > 0 ? "Positive" : sentiment < 0 ? "Negative" : "Neutral"
  
  return (
    <div className="rounded-lg border border-border/50 bg-card px-3 py-2 shadow-xl min-w-[140px]">
      <div className="flex justify-between items-baseline gap-4 mb-1">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-xs font-semibold" style={{ color: sentiment >= 0 ? "#10b981" : "#ef4444" }}>
          {sentiment.toFixed(2)}
        </p>
      </div>
      {contextText && (
        <p className="text-sm font-medium text-foreground leading-snug whitespace-pre-wrap">
          {contextText}
        </p>
      )}
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

  const baseline = formatted.length > 0 
    ? formatted.reduce((sum, d) => sum + d.average_sentiment, 0) / formatted.length
    : 0;

  const dataMax = Math.max(...formatted.map(d => d.average_sentiment), baseline);
  const dataMin = Math.min(...formatted.map(d => d.average_sentiment), baseline);
  const H = dataMax - dataMin;
  const baselineOffset = H === 0 ? "50%" : `${((dataMax - baseline) / H) * 100}%`;

  return (
    <Card className="border-border/30 bg-card/60 backdrop-blur-sm transition-all duration-300 hover:border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground/80">
          <TrendingUp className="h-4 w-4 text-chart-1" />
          Emotional Pulse
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
            <AreaChart data={formatted} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="splitFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset={baselineOffset} stopColor="#10b981" stopOpacity={0.05} />
                  <stop offset={baselineOffset} stopColor="#ef4444" stopOpacity={0.05} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.4} />
                </linearGradient>
                <linearGradient id="splitStroke" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset={baselineOffset} stopColor="#10b981" />
                  <stop offset={baselineOffset} stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#ef4444" />
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
                minTickGap={20}
              />
              <YAxis
                domain={[-1, 1]}
                ticks={[-1, -0.5, 0, 0.5, 1]}
                tick={{ fill: "oklch(0.55 0.01 260)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <ReferenceLine
                y={baseline}
                stroke="oklch(0.45 0.01 260)"
                strokeDasharray="4 4"
                label={{ 
                  position: 'insideBottomRight', 
                  value: 'Avg',
                  fill: "oklch(0.55 0.01 260)", 
                  fontSize: 10,
                  offset: 5
                }}
              />
              <Tooltip cursor={{ stroke: "oklch(0.4 0.01 260)", strokeWidth: 1, strokeDasharray: "4 4" }} content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="average_sentiment"
                baseValue={baseline}
                stroke="url(#splitStroke)"
                strokeWidth={2.5}
                fill="url(#splitFill)"
                dot={{ r: 3, fill: "var(--background)", stroke: "oklch(0.55 0.01 260)", strokeWidth: 1.5 }}
                activeDot={{ r: 5, fill: "var(--background)", stroke: "oklch(0.8 0.01 260)", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
