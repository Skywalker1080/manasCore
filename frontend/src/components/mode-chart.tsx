"use client"

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ModeCount } from "@/lib/api"
import { Target, AlertCircle } from "lucide-react"

interface ModeChartProps {
  data: ModeCount[]
  isLoading?: boolean
}

const CORE_MODES = ["Personal", "Work", "Relationships", "Health", "Hobbies"]

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: any; value: number; name: string }[] }) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  return (
    <div className="rounded-lg border border-border/50 bg-card px-3 py-2 shadow-xl min-w-[140px]">
      <p className="text-sm font-medium text-foreground mb-2">{item.mode}</p>
      <div className="space-y-1">
        <p className="text-xs font-semibold text-[#10b981]">Your Focus: {item.count} entries</p>
        <p className="text-xs text-muted-foreground">Ideal Balance: ~{item.ideal} entries</p>
      </div>
    </div>
  )
}

export function ModeChart({ data, isLoading }: ModeChartProps) {
  if (isLoading) {
    return (
      <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-weight-600 text-foreground/80">
            <Target className="h-4 w-4 text-chart-3" />
            Life Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground/60" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const dataModesMap = new Map(data.map((d) => [d.mode.toLowerCase(), d.count]))
  const totalCount = data.reduce((sum, d) => sum + d.count, 0)

  const radarData = CORE_MODES.map((mode) => ({
    mode,
    count: dataModesMap.get(mode.toLowerCase()) || 0,
    ideal: 0
  }))

  const coreLower = CORE_MODES.map(m => m.toLowerCase())
  data.forEach((d) => {
    if (!coreLower.includes(d.mode.toLowerCase())) {
      radarData.push({ mode: d.mode, count: d.count, ideal: 0 })
    }
  })

  // Dynamic ideal based on user engagement level (roughly equal balance)
  const idealValue = Math.max(2, Math.ceil(totalCount / radarData.length))
  radarData.forEach((d) => (d.ideal = idealValue))

  const neglectedModes = radarData.filter((d) => d.count === 0).map((d) => d.mode)
  const neglectedAlert =
    neglectedModes.length > 0
      ? `You haven't journaled about ${neglectedModes[0]} recently.`
      : null

  return (
    <Card className="border-border/30 bg-card/60 backdrop-blur-sm transition-all duration-300 hover:border-border/50 flex flex-col h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground/80">
          <Target className="h-4 w-4 text-[#10b981]" />
          Life Balance
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between pb-4">
        {radarData.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center">
              <Target className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground/60">
              No mode data yet — keep journaling!
            </p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex-1 min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                  <PolarGrid stroke="oklch(0.22 0.005 260 / 0.5)" />
                  <PolarAngleAxis
                    dataKey="mode"
                    tick={{ fill: "oklch(0.65 0.01 260)", fontSize: 11, fontWeight: 500 }}
                  />
                  <PolarRadiusAxis
                    domain={[0, 'auto']}
                    tick={false}
                    axisLine={false}
                  />
                  <Radar
                    name="Ideal Balance"
                    dataKey="ideal"
                    stroke="oklch(0.4 0.01 260)"
                    fill="oklch(0.4 0.01 260)"
                    fillOpacity={0.15}
                    strokeDasharray="4 4"
                  />
                  <Radar
                    name="Your Focus"
                    dataKey="count"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.35}
                  />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {neglectedAlert && (
              <div className="mt-2 flex items-center gap-2.5 rounded-md bg-orange-500/10 px-3 py-2.5 text-xs border border-orange-500/20">
                <AlertCircle className="h-4 w-4 text-orange-500 shrink-0" />
                <p className="text-orange-600 dark:text-orange-400 font-medium">{neglectedAlert}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
