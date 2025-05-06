import type { ErrorPattern, TimeSeriesDataPoint, StatisticalSummary, AnomalyData } from "@/lib/slices/analysisSlice"

export interface ErrorAnalysisProps {
  logs: Record<string, any>
  selectedFileIds: string[]
  onPatternDetected: (pattern: ErrorPattern) => void
  className?: string
}

export interface FrequencyAnalysisProps {
  logs: Record<string, any>
  timeRange: { start: Date; end: Date } | null
  groupBy: "minute" | "hour" | "day" | "week"
  className?: string
}

export interface CorrelationAnalysisProps {
  logs: Record<string, any>
  selectedFileIds: string[]
  timeWindow: number // in milliseconds
  className?: string
}

export interface ErrorDistributionProps {
  logs: Record<string, any>
  selectedFileIds: string[]
  className?: string
}

export interface SimilarErrorGroupingProps {
  logs: Record<string, any>
  similarityThreshold: number
  className?: string
}

export interface AnomalyDetectionProps {
  logs: Record<string, any>
  timeRange: { start: Date; end: Date } | null
  sensitivityLevel: number
  className?: string
  onAnomalyDetected?: (anomaly: ErrorPattern) => void
}

export interface TimeSeriesAnalysisProps {
  data: TimeSeriesDataPoint[]
  timeRange: { start: Date; end: Date } | null
  className?: string
}

export interface StatisticalDashboardProps {
  summary: StatisticalSummary
  className?: string
}

export interface ComparativeAnalysisProps {
  fileIds: string[]
  logs: Record<string, any>
  className?: string
}

export interface TrendDetectionProps {
  data: TimeSeriesDataPoint[]
  timeRange: { start: Date; end: Date } | null
  className?: string
}

export interface ActivityHeatmapProps {
  logs: Record<string, any>
  timeRange: { start: Date; end: Date } | null
  className?: string
}

export interface InsightsPanelProps {
  insights: ErrorPattern[]
  onBookmark: (id: string) => void
  onFeedback: (id: string, isHelpful: boolean, notes?: string) => void
  className?: string
}

export interface ClusteringResultsProps {
  clusters: Array<{ clusterId: string; logIds: string[]; centroid: string }>
  logs: Record<string, any>
  className?: string
}

export interface OutlierDetectionProps {
  outliers: string[]
  logs: Record<string, any>
  className?: string
}

export interface AnalysisDashboardProps {
  className?: string
}

export interface AnomalyDetectionPanelProps {
  anomalyData: AnomalyData | null
  sensitivity: number
  onSensitivityChange: (value: number) => void
  onRunAnalysis: () => void
  isAnalyzing: boolean
  className?: string
}
