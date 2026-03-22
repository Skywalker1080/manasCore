"use client"

import { useState, useEffect, useCallback } from "react"
import {
  api,
  type SentimentPoint,
  type EmotionCount,
  type TagDataResponse,
  type ModeCount,
  type StreakData,
} from "@/lib/api"
import { SentimentChart } from "@/components/sentiment-chart"
import { EmotionChart } from "@/components/emotion-chart"
import { TagCloud } from "@/components/tag-cloud"
import { StreakCard } from "@/components/streak-card"
import { ModeChart } from "@/components/mode-chart"
import { ArrowLeft, BarChart3, RefreshCw, BookOpen, Sparkles } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

type TimeRange = "7d" | "30d"

export default function DashboardPage() {
  const [range, setRange] = useState<TimeRange>("30d")
  const [loading, setLoading] = useState(true)
  const [insightLoading, setInsightLoading] = useState(true)
  const [emotionsLoading, setEmotionsLoading] = useState(true)
  const [tagsLoading, setTagsLoading] = useState(true)
  const [isRefreshingEmotions, setIsRefreshingEmotions] = useState(false)
  const [isRefreshingTags, setIsRefreshingTags] = useState(false)

  // Data state
  const [sentiment, setSentiment] = useState<SentimentPoint[]>([])
  const [emotions, setEmotions] = useState<EmotionCount[]>([])
  const [tags, setTags] = useState<TagDataResponse | null>(null)
  const [modes, setModes] = useState<ModeCount[]>([])
  const [streak, setStreak] = useState<StreakData | null>(null)
  const [heroInsight, setHeroInsight] = useState<string | null>(null)

  const fetchAll = useCallback(async (r: string) => {
    setLoading(true)
    try {
      const [sentimentData, modeData, streakData] =
        await Promise.all([
          api.getSentiment(r),
          api.getModes(r),
          api.getStreak(),
        ])
      setSentiment(sentimentData)
      setModes(modeData)
      setStreak(streakData)
    } catch (err) {
      console.error("Failed to load analytics:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchInsight = useCallback(async (r: string) => {
    setInsightLoading(true)
    try {
      const insightData = await api.getInsight(r).catch(() => ({ insight: "Start journaling to unlock your first insight." }))
      setHeroInsight(insightData.insight)
    } catch (err) {
      console.error("Failed to fetch insight:", err)
    } finally {
      setInsightLoading(false)
    }
  }, [])

  const fetchEmotions = useCallback(async (r: string, force = false) => {
    if (force) {
      setIsRefreshingEmotions(true)
    } else {
      setEmotionsLoading(true)
    }
    
    try {
      const emotionData = await api.getEmotions(r, force)
      setEmotions(emotionData)
    } catch (err) {
      console.error("Failed to fetch emotions:", err)
    } finally {
      setIsRefreshingEmotions(false)
      setEmotionsLoading(false)
    }
  }, [])

  const fetchTags = useCallback(async (r: string, force = false) => {
    if (force) {
      setIsRefreshingTags(true)
    } else {
      setTagsLoading(true)
    }
    
    try {
      const tagData = await api.getTags(r, force)
      setTags(tagData)
    } catch (err) {
      console.error("Failed to fetch tags:", err)
    } finally {
      setIsRefreshingTags(false)
      setTagsLoading(false)
    }
  }, [])

  const refreshEmotions = useCallback(() => {
    fetchEmotions(range, true)
  }, [range, fetchEmotions])

  const refreshTags = useCallback(() => {
    fetchTags(range, true)
  }, [range, fetchTags])

  useEffect(() => {
    fetchAll(range)
    fetchInsight(range)
    fetchEmotions(range)
    fetchTags(range)
  }, [range, fetchAll, fetchInsight, fetchEmotions, fetchTags])

  const hasData =
    sentiment.length > 0 ||
    emotions.length > 0 ||
    (tags && tags.top_tags.length > 0) ||
    modes.length > 0 ||
    (streak && streak.total_entries > 0)

  return (
    <div className="relative min-h-screen bg-background">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-foreground/[0.02] blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[400px] w-[400px] rounded-full bg-chart-1/[0.03] blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6 pt-24 pb-16 md:px-10 md:pt-28">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border/40 bg-secondary/40 text-foreground/60 transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Back to journal"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="font-serif text-3xl tracking-tight text-foreground/90 md:text-4xl flex items-center gap-3">
                <BarChart3 className="h-7 w-7 text-chart-1/80" />
                Dashboard
              </h1>
              <p className="mt-1 text-xs tracking-wide text-muted-foreground/50">
                Insights from your journal
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Time range toggle */}
            <div className="flex rounded-lg border border-border/30 bg-secondary/30 p-0.5">
              {(["7d", "30d"] as TimeRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                    range === r
                      ? "bg-foreground/10 text-foreground shadow-sm"
                      : "text-muted-foreground/60 hover:text-foreground/80"
                  }`}
                >
                  {r === "7d" ? "7 Days" : "30 Days"}
                </button>
              ))}
            </div>

            {/* Refresh */}
            <button
              onClick={() => { fetchAll(range); fetchInsight(range); }}
              disabled={loading || insightLoading}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/30 bg-secondary/30 text-muted-foreground/60 transition-all hover:bg-secondary hover:text-foreground disabled:opacity-40"
              aria-label="Refresh data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Loading skeletons */}
        {loading ? (
          <div className="grid gap-5 md:grid-cols-2">
            {/* Hero Insight Skeleton */}
            <div className="md:col-span-2 rounded-xl border border-primary/20 bg-primary/5 p-6 flex flex-col gap-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-8 w-full max-w-2xl" />
            </div>
            
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-border/20 bg-card/50 p-6 space-y-4"
              >
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-[200px] w-full rounded-lg" />
              </div>
            ))}
            <div className="md:col-span-2 rounded-xl border border-border/20 bg-card/50 p-6 space-y-4">
              <Skeleton className="h-5 w-36" />
              <div className="flex gap-6">
                <Skeleton className="h-16 w-24" />
                <Skeleton className="h-16 w-24" />
                <Skeleton className="h-16 w-24" />
              </div>
            </div>
          </div>
        ) : !hasData ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24">
            <div className="rounded-2xl border border-border/20 bg-card/50 px-10 py-12 text-center max-w-md backdrop-blur-sm">
              <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground/30 mb-4" />
              <h2 className="font-serif text-xl text-foreground/80 mb-2">
                No data yet
              </h2>
              <p className="text-sm text-muted-foreground/50 mb-6 leading-relaxed">
                Start journaling to see your emotional patterns, sentiment trends, and topic insights here.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <BookOpen className="h-4 w-4" />
                Write your first entry
              </Link>
            </div>
          </div>
        ) : (
          /* Grid layout */
          <div className="grid gap-5 md:grid-cols-2">
            {/* Hero Insight Card */}
            {insightLoading ? (
              <div className="md:col-span-2 rounded-xl border border-primary/20 bg-primary/5 p-6 flex flex-col gap-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-8 w-full max-w-2xl" />
              </div>
            ) : heroInsight && (
              <div className="md:col-span-2 rounded-xl border border-primary/20 bg-primary/5 p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 rounded-full bg-primary/10 blur-xl transition-transform duration-700 group-hover:scale-150" />
                <div className="relative z-10 flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
                      <Sparkles className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-primary/80 mb-1 flex items-center gap-2">
                      manasCore Insight
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase font-bold text-primary tracking-wider">
                        The &quot;So What?&quot;
                      </span>
                    </h3>
                    <p className="text-lg md:text-xl font-serif text-foreground/90 leading-relaxed">
                      &quot;{heroInsight}&quot;
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Row 1 */}
            <SentimentChart data={sentiment} isLoading={loading} />
            <EmotionChart 
              data={emotions} 
              isLoading={emotionsLoading} 
              isRefreshing={isRefreshingEmotions}
              onRefresh={refreshEmotions} 
            />

            {/* Row 2 */}
            <ModeChart data={modes} isLoading={loading} />
            <TagCloud 
              data={tags} 
              isLoading={tagsLoading} 
              isRefreshing={isRefreshingTags}
              onRefresh={refreshTags}
            />

            {/* Row 3 — full width */}
            <div className="md:col-span-2">
              <StreakCard data={streak} isLoading={loading} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

