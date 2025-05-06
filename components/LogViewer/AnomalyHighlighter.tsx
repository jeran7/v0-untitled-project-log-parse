"use client"

import type React from "react"

import { useSelector } from "react-redux"
import { AlertTriangle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { RootState } from "@/lib/store"

interface AnomalyHighlighterProps {
  logId: string
  children: React.ReactNode
}

export default function AnomalyHighlighter({ logId, children }: AnomalyHighlighterProps) {
  const anomalyData = useSelector((state: RootState) => state.analysis.anomalyData)

  if (!anomalyData) {
    return <>{children}</>
  }

  // Check if this log is part of any anomaly
  const allAnomalies = [
    ...anomalyData.timeBasedAnomalies,
    ...anomalyData.contentAnomalies,
    ...anomalyData.sequenceAnomalies,
  ]

  const relatedAnomalies = allAnomalies.filter((anomaly) => anomaly.affectedLogs.includes(logId))

  if (relatedAnomalies.length === 0) {
    return <>{children}</>
  }

  // Get the highest severity anomaly
  const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
  const highestSeverityAnomaly = relatedAnomalies.reduce((highest, current) => {
    const currentSeverity = severityOrder[current.severity as keyof typeof severityOrder] || 0
    const highestSeverity = severityOrder[highest.severity as keyof typeof severityOrder] || 0
    return currentSeverity > highestSeverity ? current : highest
  }, relatedAnomalies[0])

  // Get color based on severity
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-500 border-red-500"
      case "high":
        return "text-orange-500 border-orange-500"
      case "medium":
        return "text-yellow-500 border-yellow-500"
      case "low":
        return "text-blue-500 border-blue-500"
      default:
        return "text-gray-500 border-gray-500"
    }
  }

  const severityColor = getSeverityColor(highestSeverityAnomaly.severity)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`relative border-l-2 pl-1 ${severityColor}`}>
            <div className="absolute -left-4 top-1/2 -translate-y-1/2">
              <AlertTriangle className={`h-3 w-3 ${severityColor.split(" ")[0]}`} />
            </div>
            {children}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-md">
          <div className="space-y-1">
            <p className="font-medium">{highestSeverityAnomaly.title}</p>
            <p className="text-sm">{highestSeverityAnomaly.description}</p>
            {relatedAnomalies.length > 1 && (
              <p className="text-xs text-muted-foreground">+{relatedAnomalies.length - 1} more anomalies</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
