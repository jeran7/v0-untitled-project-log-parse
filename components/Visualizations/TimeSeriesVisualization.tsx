"use client"

import { useMemo } from "react"
import { useSelector } from "react-redux"
import type { RootState } from "@/lib/store"
import { formatTimestamp } from "@/lib/utils/timeUtils"
import LineChart from "@/components/Charts/LineChart"

export default function TimeSeriesVisualization() {
  const logs = useSelector((state: RootState) => Object.values(state.logs.entries))

  const timeSeriesData = useMemo(() => {
    if (logs.length === 0) return []

    // Group logs by hour
    const hourlyGroups: Record<string, number> = {}
    const errorGroups: Record<string, number> = {}
    const warningGroups: Record<string, number> = {}
    const infoGroups: Record<string, number> = {}

    logs.forEach((log) => {
      const hour = new Date(log.timestamp).toISOString().substring(0, 13) // YYYY-MM-DDTHH

      // Count total logs per hour
      hourlyGroups[hour] = (hourlyGroups[hour] || 0) + 1

      // Count by log level
      if (log.level) {
        const level = log.level.toUpperCase()
        if (level.includes("ERROR") || level.includes("FATAL") || level.includes("CRITICAL")) {
          errorGroups[hour] = (errorGroups[hour] || 0) + 1
        } else if (level.includes("WARN")) {
          warningGroups[hour] = (warningGroups[hour] || 0) + 1
        } else if (level.includes("INFO")) {
          infoGroups[hour] = (infoGroups[hour] || 0) + 1
        }
      }
    })

    // Convert to array and sort by time
    const hours = Object.keys(hourlyGroups).sort()

    return hours.map((hour) => {
      const date = new Date(hour)
      return {
        name: formatTimestamp(date.toISOString(), "UTC", "time"),
        total: hourlyGroups[hour] || 0,
        errors: errorGroups[hour] || 0,
        warnings: warningGroups[hour] || 0,
        info: infoGroups[hour] || 0,
      }
    })
  }, [logs])

  if (timeSeriesData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Not enough data to generate time series visualization</p>
      </div>
    )
  }

  return (
    <LineChart
      data={timeSeriesData}
      lines={[
        { key: "total", color: "#64748b", name: "All Logs" },
        { key: "errors", color: "#DC2626", name: "Errors" },
        { key: "warnings", color: "#D97706", name: "Warnings" },
        { key: "info", color: "#0891B2", name: "Info" },
      ]}
    />
  )
}
