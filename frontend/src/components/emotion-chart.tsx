"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { EmotionCount } from "@/lib/api"
import { Activity, ArrowUpRight, ArrowDownRight, Minus, RefreshCw } from "lucide-react"

interface EmotionChartProps {
  data: EmotionCount[]
  isLoading?: boolean
  isRefreshing?: boolean
  onRefresh?: () => void
}

export function EmotionChart({ data, isLoading, isRefreshing, onRefresh }: EmotionChartProps) {
  if (isLoading) {
    return (
      <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-system-serif text-foreground/80">
            <Activity className="h-4 w-4 text-chart-2" />
            Pattern Detector
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

  // Limit to top 3 emotions
  const top = data.slice(0, 3)

  return (
    <Card className="border-border/30 bg-card/60 backdrop-blur-sm transition-all duration-300 hover:border-border/50 flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 rounded-full bg-chart-2/5 blur-2xl pointer-events-none" />

      <CardHeader className="pb-1.5 flex flex-row items-center justify-between space-y-0 relative z-10">
        <CardTitle className="flex items-center gap-2 text-sm serif text-foreground/80">
          <Activity className="h-4 w-4 text-chart-2" />
          Pattern Detector
        </CardTitle>
        
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border/30 bg-secondary/30 text-muted-foreground/60 transition-all hover:bg-secondary hover:text-foreground disabled:opacity-40"
            aria-label="Regenerate insights"
            title="Regenerate AI context"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col justify-center relative z-10 pt-2 pb-3">
        {top.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 text-center py-10">
            <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center">
              <Activity className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground/60">
              Keep journaling to detect emotional patterns.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 h-full">
            {top.map((item, idx) => {
              const TrendIcon = item.trend === "up" ? ArrowUpRight : item.trend === "down" ? ArrowDownRight : Minus
              const trendColor = item.trend === "up" ? "text-blue-500" : item.trend === "down" ? "text-rose-500" : "text-muted-foreground/80"
              const trendSign = item.trend === "up" ? "+" : item.trend === "down" ? "-" : ""
              
              const isFirst = idx === 0
              const delayClass = idx === 1 ? "animate-in fade-in slide-in-from-bottom-2 duration-700 delay-150 fill-mode-both" : 
                                 idx === 2 ? "animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300 fill-mode-both" : 
                                 "animate-in fade-in slide-in-from-bottom-2 duration-700"

              return (
                <div 
                  key={idx} 
                  className={`flex flex-col rounded-none border ${isFirst ? 'border-chart-2/40 bg-chart-2/5 shadow-sm' : 'border-border/40 bg-card/40'} p-3 transition-all hover:border-border/80 ${delayClass}`}
                >
                  <div className="flex items-center justify-between gap-4 mb-1.5">
                    <div className="flex items-center gap-3">
                      <span className="capitalize text-foreground/90 text-[14px] font-medium leading-[20px]">
                        {item.emotion}
                      </span>
                      <div className={`flex items-center gap-1.5 text-[10px] font-bold tracking-tight ${trendColor}`}>
                        <TrendIcon className="h-3 w-3" />
                        <span>
                          {item.trend === "stable" ? "STABLE" : `${trendSign}${item.trend_percent}%`}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-medium tracking-wider text-muted-foreground/60">
                      {item.count} ENTRIES
                    </span>
                  </div>
                  
                  <div className="border-t border-border/20 pt-1.5 relative">
                    <p className="text-xs text-foreground/70 leading-relaxed font-medium italic">
                      {isRefreshing ? (
                        <span className="flex items-center gap-1.5 opacity-60">
                          <span className="h-1 w-1 animate-pulse rounded-full bg-chart-2"></span>
                          <span className="h-1 w-1 animate-pulse rounded-full bg-chart-2 delay-75"></span>
                          <span className="h-1 w-1 animate-pulse rounded-full bg-chart-2 delay-150"></span>
                        </span>
                      ) : (
                        `"${item.insight || 'Gathering context...'}"`
                      )}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
