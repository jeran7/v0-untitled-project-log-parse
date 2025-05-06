"use client"

import { useMemo } from "react"
import { useSelector } from "react-redux"
import type { RootState } from "@/lib/store"
import PieChart from "@/components/Charts/PieChart"

export default function SourceDistributionChart() {
  const logs = useSelector((state: RootState) => Object.values(state.logs.entries))

  const sourceData = useMemo(() => {
    if (logs.length === 0) return []

    // Count logs by source
    const sourceCounts: Record<string, number> = {}

    logs.forEach((log) => {
      const source = log.source || "Unknown"
      sourceCounts[source] = (sourceCounts[source] || 0) + 1
    })

    // Convert to array and sort by count
    return Object.entries(sourceCounts)
      .map(([source, count]) => ({
        name: source,
        value: count,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8) // Top 8 sources
  }, [logs])

  if (sourceData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No source data available</p>
      </div>
    )
  }

  // Generate colors for the pie chart
  const colors = [
    "#0891B2", // teal
    "#0D9488", // cyan
    "#14B8A6", // light teal
    "#06B6D4", // light cyan
    "#0EA5E9", // sky
    "#3B82F6", // blue
    "#8B5CF6", // violet
    "#A855F7", // purple
  ]

  const dataWithColors = sourceData.map((item, index) => ({
    ...item,
    color: colors[index % colors.length],
  }))

  return (
    <div className="h-full">
      <PieChart data={dataWithColors} />
    </div>
  )
}
