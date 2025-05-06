"use client"

import { useMemo } from "react"
import { useSelector } from "react-redux"
import type { RootState } from "@/lib/store"
import { groupSimilarMessages } from "@/lib/utils/analysisUtils"
import BarChart from "@/components/Charts/BarChart"

export default function LogPatternVisualization() {
  const logs = useSelector((state: RootState) => Object.values(state.logs.entries))

  const patternData = useMemo(() => {
    if (logs.length === 0) return []

    // Group logs by similar messages
    const groups = groupSimilarMessages(logs, 0.7)

    // Convert to array and sort by count
    return Object.entries(groups)
      .map(([pattern, groupLogs]) => ({
        name: pattern.length > 30 ? pattern.substring(0, 30) + "..." : pattern,
        value: groupLogs.length,
        fullPattern: pattern,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10) // Top 10 patterns
  }, [logs])

  if (patternData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Not enough data to generate pattern visualization</p>
      </div>
    )
  }

  return (
    <div className="h-full">
      <BarChart
        data={patternData}
        color="#0891B2"
        tooltipFormatter={(item) => (
          <div className="p-2 max-w-md">
            <div className="font-medium">{item.value} occurrences</div>
            <div className="text-xs mt-1 text-muted-foreground break-words">{item.fullPattern}</div>
          </div>
        )}
      />
    </div>
  )
}
