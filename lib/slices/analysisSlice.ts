import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

export interface ErrorPattern {
  id: string
  type: "frequency" | "correlation" | "anomaly" | "similar" | "security"
  title: string
  description: string
  severity: "low" | "medium" | "high" | "critical"
  affectedLogs: string[] // Log IDs
  sources: string[]
  timestamp: Date
  metadata: Record<string, any>
  isBookmarked: boolean
  category: "error" | "warning" | "security" | "performance" | "other"
}

export interface TimeSeriesDataPoint {
  timestamp: Date
  count: number
  errorCount: number
  warningCount: number
  infoCount: number
  debugCount: number
  sources: Set<string>
}

export interface AnomalyScorePoint {
  timestamp: Date
  score: number
  count: number
  totalLogs: number
}

export interface AnomalyData {
  timeBasedAnomalies: ErrorPattern[]
  contentAnomalies: ErrorPattern[]
  sequenceAnomalies: ErrorPattern[]
  anomalyScores: AnomalyScorePoint[]
  totalAnomalies: number
}

export interface StatisticalSummary {
  totalLogs: number
  errorCount: number
  warningCount: number
  infoCount: number
  debugCount: number
  topSources: Array<{ source: string; count: number }>
  topErrors: Array<{ message: string; count: number }>
  timeDistribution: Record<string, number> // Hour of day -> count
  dayDistribution: Record<string, number> // Day of week -> count
}

export interface InsightFeedback {
  insightId: string
  isHelpful: boolean
  timestamp: Date
  notes?: string
}

interface AnalysisState {
  // Error Analysis
  detectedPatterns: ErrorPattern[]
  bookmarkedPatterns: string[] // Pattern IDs

  // Statistical Processing
  timeSeriesData: TimeSeriesDataPoint[]
  statisticalSummary: StatisticalSummary | null

  // Anomaly Detection
  anomalyData: AnomalyData | null
  anomalySensitivity: number

  // Insights
  insights: ErrorPattern[]
  insightFeedback: InsightFeedback[]

  // Machine Learning
  clusteringResults: Array<{ clusterId: string; logIds: string[]; centroid: string }>
  outliers: string[] // Log IDs

  // Analysis Status
  isAnalyzing: boolean
  analysisProgress: number
  lastAnalysisTime: Date | null

  // User Preferences
  alertThresholds: {
    errorFrequency: number
    anomalyScore: number
    correlationStrength: number
  }
}

const initialState: AnalysisState = {
  detectedPatterns: [],
  bookmarkedPatterns: [],

  timeSeriesData: [],
  statisticalSummary: null,

  anomalyData: null,
  anomalySensitivity: 0.7,

  insights: [],
  insightFeedback: [],

  clusteringResults: [],
  outliers: [],

  isAnalyzing: false,
  analysisProgress: 0,
  lastAnalysisTime: null,

  alertThresholds: {
    errorFrequency: 5,
    anomalyScore: 0.7,
    correlationStrength: 0.6,
  },
}

const analysisSlice = createSlice({
  name: "analysis",
  initialState,
  reducers: {
    // Error Analysis
    addDetectedPattern: (state, action: PayloadAction<ErrorPattern>) => {
      state.detectedPatterns.push(action.payload)
    },

    clearDetectedPatterns: (state) => {
      state.detectedPatterns = []
    },

    togglePatternBookmark: (state, action: PayloadAction<string>) => {
      const patternId = action.payload
      const pattern = state.detectedPatterns.find((p) => p.id === patternId)

      if (pattern) {
        pattern.isBookmarked = !pattern.isBookmarked

        if (pattern.isBookmarked) {
          state.bookmarkedPatterns.push(patternId)
        } else {
          state.bookmarkedPatterns = state.bookmarkedPatterns.filter((id) => id !== patternId)
        }
      }
    },

    // Statistical Processing
    setTimeSeriesData: (state, action: PayloadAction<TimeSeriesDataPoint[]>) => {
      state.timeSeriesData = action.payload
    },

    setStatisticalSummary: (state, action: PayloadAction<StatisticalSummary>) => {
      state.statisticalSummary = action.payload
    },

    // Anomaly Detection
    setAnomalyData: (state, action: PayloadAction<AnomalyData>) => {
      state.anomalyData = action.payload
    },

    setAnomalySensitivity: (state, action: PayloadAction<number>) => {
      state.anomalySensitivity = action.payload
    },

    // Insights
    addInsight: (state, action: PayloadAction<ErrorPattern>) => {
      state.insights.push(action.payload)
    },

    clearInsights: (state) => {
      state.insights = []
    },

    addInsightFeedback: (state, action: PayloadAction<InsightFeedback>) => {
      state.insightFeedback.push(action.payload)
    },

    // Machine Learning
    setClusteringResults: (
      state,
      action: PayloadAction<Array<{ clusterId: string; logIds: string[]; centroid: string }>>,
    ) => {
      state.clusteringResults = action.payload
    },

    setOutliers: (state, action: PayloadAction<string[]>) => {
      state.outliers = action.payload
    },

    // Analysis Status
    setIsAnalyzing: (state, action: PayloadAction<boolean>) => {
      state.isAnalyzing = action.payload

      if (!action.payload) {
        state.lastAnalysisTime = new Date()
      }
    },

    setAnalysisProgress: (state, action: PayloadAction<number>) => {
      state.analysisProgress = action.payload
    },

    // User Preferences
    updateAlertThresholds: (state, action: PayloadAction<Partial<AnalysisState["alertThresholds"]>>) => {
      state.alertThresholds = { ...state.alertThresholds, ...action.payload }
    },
  },
})

export const {
  addDetectedPattern,
  clearDetectedPatterns,
  togglePatternBookmark,
  setTimeSeriesData,
  setStatisticalSummary,
  setAnomalyData,
  setAnomalySensitivity,
  addInsight,
  clearInsights,
  addInsightFeedback,
  setClusteringResults,
  setOutliers,
  setIsAnalyzing,
  setAnalysisProgress,
  updateAlertThresholds,
} = analysisSlice.actions

export default analysisSlice.reducer
