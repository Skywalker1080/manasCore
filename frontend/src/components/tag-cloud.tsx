"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { TagCount } from "@/lib/api"
import { Hash } from "lucide-react"

interface TagCloudProps {
  data: TagCount[]
  isLoading?: boolean
}

/**
 * Assigns a size tier based on relative frequency within the dataset.
 * Returns tailwind font-size / padding classes for small, medium, large.
 */
function getTagStyle(count: number, maxCount: number) {
  if (maxCount === 0) return { fontSize: "text-xs", padding: "px-2.5 py-0.5", opacity: "opacity-60" }
  const ratio = count / maxCount
  if (ratio > 0.66) {
    return { fontSize: "text-sm", padding: "px-3 py-1", opacity: "opacity-100" }
  } else if (ratio > 0.33) {
    return { fontSize: "text-xs", padding: "px-2.5 py-0.5", opacity: "opacity-80" }
  } else {
    return { fontSize: "text-[11px]", padding: "px-2 py-0.5", opacity: "opacity-60" }
  }
}

export function TagCloud({ data, isLoading }: TagCloudProps) {
  if (isLoading) {
    return (
      <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground/80">
            <Hash className="h-4 w-4 text-chart-4" />
            Topic Tags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[160px] items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground/60" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const tags = data.slice(0, 30) // cap at 30
  const maxCount = tags.length > 0 ? tags[0].count : 0

  return (
    <Card className="border-border/30 bg-card/60 backdrop-blur-sm transition-all duration-300 hover:border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground/80">
          <Hash className="h-4 w-4 text-chart-4" />
          Topic Tags
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tags.length === 0 ? (
          <div className="flex h-[160px] flex-col items-center justify-center gap-2 text-center">
            <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center">
              <Hash className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground/60">
              No tags extracted yet — keep journaling!
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const style = getTagStyle(tag.count, maxCount)
              return (
                <Badge
                  key={tag.tag}
                  variant="secondary"
                  className={`${style.fontSize} ${style.padding} ${style.opacity} cursor-default border-border/20 bg-secondary/80 text-secondary-foreground transition-all duration-200 hover:bg-secondary hover:opacity-100`}
                >
                  {tag.tag}
                  <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                    {tag.count}
                  </span>
                </Badge>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
