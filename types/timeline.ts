import type { LogEntry } from "@/types/logs"

/**
 * Represents a data point on the timeline visualization
 */
export interface TimelineDataPoint {
  timestamp: Date
  count: number
  errorCount: number
  warningCount: number
  infoCount: number
  debugCount: number
  sources: Set<string>
}

/**
 * Represents aggregated data for timeline visualization
 */
export interface AggregatedTimelineData {
  points: TimelineDataPoint[]
  maxCount: number
  startTime: Date
  endTime: Date
  totalLogs: number
  errorCount: number
  warningCount: number
  infoCount: number
  debugCount: number
}

/**
 * Zoom level for timeline visualization
 */
export enum TimelineZoomLevel {
  SECOND = "second",
  MINUTE = "minute",
  HOUR = "hour",
  DAY = "day",
}

/**
 * Selection range on the timeline
 */
export interface TimeSelection {
  start: Date
  end: Date
}

/**
 * Props for the TimelineNavigator component
 */
export interface TimelineNavigatorProps {
  logs: LogEntry[]
  timeRange: TimeSelection | null
  onTimeRangeChanged: (range: TimeSelection) => void
  onJumpToTime: (timestamp: Date) => void
  height?: number
  className?: string
}

/**
 * Configuration for timeline aggregation
 */
export interface TimelineAggregationConfig {
  zoomLevel: TimelineZoomLevel
  bucketSizeMs: number
  bucketFormat: string
}

/**
 * Type for timeline event handlers
 */
export type TimelineEventHandler = (timestamp: Date) => void
