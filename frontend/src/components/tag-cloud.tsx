"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TagDataResponse } from "@/lib/api"
import { TrendingUp, RefreshCw, Sprout, ArchiveRestore } from "lucide-react"

interface TagCloudProps {
  data: TagDataResponse | null
  isLoading?: boolean
  isRefreshing?: boolean
  onRefresh?: () => void
}

function ProgressionBar({ active, total }: { active: number; total: number }) {
  // Normalize to 10 blocks for visual consistency
  const ratio = Math.max(0, Math.min(1, active / (total || 1)))
  const activeBlocks = Math.round(ratio * 10)
  
  return (
    <div className="flex items-center gap-[3px]" aria-hidden="true" title={`${active} out of ${total} days`}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div 
          key={i} 
          className={`h-3 w-1.5 rounded-[1px] ${i < activeBlocks ? 'bg-primary' : 'bg-primary/10'}`} 
        />
      ))}
    </div>
  )
}

export function TagCloud({ data, isLoading, isRefreshing, onRefresh }: TagCloudProps) {
  if (isLoading) {
    return (
      <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground/80">
            <TrendingUp className="h-4 w-4 text-primary" />
            Growth Signals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground/60" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const topTags = data?.top_tags || []
  const emerging = data?.insight?.emerging
  const dormant = data?.insight?.dormant

  return (
    <Card className="border-border/30 bg-card/60 backdrop-blur-sm transition-all duration-300 hover:border-border/50 flex flex-col relative overflow-hidden">
      <CardHeader className="pb-1.5 flex flex-row items-center justify-between space-y-0 relative z-10">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground/80">
          <TrendingUp className="h-4 w-4 text-primary" />
          Growth Signals
        </CardTitle>
        
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border/30 bg-secondary/30 text-muted-foreground/60 transition-all hover:bg-secondary hover:text-foreground disabled:opacity-40"
            aria-label="Regenerate tag insights"
            title="Refresh Growth Signals"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col justify-between relative z-10 pt-2 pb-3">
        {topTags.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center py-6">
            <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground/60 max-w-[200px]">
              Use tags to track your core topics over time.
            </p>
          </div>
        ) : (
          <div className="flex flex-col h-full gap-5">
            
            {/* Heatmap Section */}
            <div className="flex flex-col gap-3 flex-1">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-0.5">Topic Consistency</h4>
              {topTags.map((t, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm group gap-4">
                  <span className="font-medium text-foreground/90 capitalize" title={t.tag}>
                    {t.tag}
                  </span>
                  
                  <div className="flex items-center gap-3">
                    <ProgressionBar active={t.days_active} total={t.total_days} />
                    <span className="text-[10px] font-mono font-medium text-muted-foreground/70 min-w-[50px] text-right tracking-tight">
                      {t.days_active}/{t.total_days}d
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* AI Insights Section */}
            {(emerging || dormant) && (
              <div className="border-t border-border/20 pt-4 flex flex-col gap-3">
                {emerging && (
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 rounded-full bg-emerald-500/10 p-1 flex-shrink-0">
                      <Sprout className="h-3 w-3 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-wider mb-0.5">Emerging</p>
                      <p className="text-xs text-foreground/80 leading-relaxed font-medium max-w-[95%]">
                        {isRefreshing ? <span className="animate-pulse">Analyzing emerging tags...</span> : emerging}
                      </p>
                    </div>
                  </div>
                )}
                
                {dormant && (
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 rounded-full bg-muted p-1 flex-shrink-0">
                      <ArchiveRestore className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Dormant</p>
                      <p className="text-xs text-foreground/70 leading-relaxed font-medium italic max-w-[95%]">
                        {isRefreshing ? <span className="animate-pulse">Scanning past trends...</span> : dormant}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
          </div>
        )}
      </CardContent>
    </Card>
  )
}
