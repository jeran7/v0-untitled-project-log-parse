import { createAsyncThunk } from "@reduxjs/toolkit"
import type { RootState } from "@/lib/store"
import {
  setIsAnalyzing,
  setAnalysisProgress,
  addDetectedPattern,
  clearDetectedPatterns,
  setTimeSeriesData,
  setStatisticalSummary,
  setAnomalyData,
  addInsight,
  clearInsights,
  setClusteringResults,
  setOutliers,
} from "@/lib/slices/analysisSlice"
import {
  analyzeErrorFrequency,
  detectCorrelations,
  detectAnomalies,
  generateAnomalyData,
  identifySecurityIssues,
  generateTimeSeriesData,
  generateStatisticalSummary,
  clusterLogMessages,
  detectOutliers,
} from "@/lib/utils/analysisUtils"

/**
 * Thunk for running comprehensive analysis on logs
 */
export const runComprehensiveAnalysis = createAsyncThunk(
  "analysis/runComprehensiveAnalysis",
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState
    const logs = Object.values(state.logs.entries)
    const selectedFileIds = state.files.selectedFileIds
    const timeRange = state.timeline.selectedTimeRange

    if (logs.length === 0) {
      return { success: false, message: "No logs available for analysis" }
    }

    // Start analysis
    dispatch(setIsAnalyzing(true))
    dispatch(clearDetectedPatterns())
    dispatch(clearInsights())
    dispatch(setAnalysisProgress(0))

    try {
      // Filter logs by selected files if any
      const filteredLogs =
        selectedFileIds.length > 0 ? logs.filter((log) => selectedFileIds.includes(log.fileId)) : logs

      // Step 1: Error frequency analysis (15%)
      dispatch(setAnalysisProgress(10))
      const frequencyPatterns = analyzeErrorFrequency(filteredLogs)
      frequencyPatterns.forEach((pattern) => {
        dispatch(addDetectedPattern(pattern))
        dispatch(addInsight(pattern))
      })

      // Step 2: Correlation detection (30%)
      dispatch(setAnalysisProgress(25))
      const correlationPatterns = detectCorrelations(filteredLogs)
      correlationPatterns.forEach((pattern) => {
        dispatch(addDetectedPattern(pattern))
        dispatch(addInsight(pattern))
      })

      // Step 3: Anomaly detection (50%)
      dispatch(setAnalysisProgress(40))
      const anomalyPatterns = detectAnomalies(filteredLogs, state.analysis.anomalySensitivity)
      anomalyPatterns.forEach((pattern) => {
        dispatch(addDetectedPattern(pattern))
        dispatch(addInsight(pattern))
      })

      // Step 4: Generate anomaly data for visualization
      dispatch(setAnalysisProgress(60))
      if (timeRange) {
        const anomalyData = generateAnomalyData(filteredLogs, timeRange)
        dispatch(setAnomalyData(anomalyData))
      }

      // Step 5: Security issue identification (70%)
      dispatch(setAnalysisProgress(65))
      const securityPatterns = identifySecurityIssues(filteredLogs)
      securityPatterns.forEach((pattern) => {
        dispatch(addDetectedPattern(pattern))
        dispatch(addInsight(pattern))
      })

      // Step 6: Generate time series data
      dispatch(setAnalysisProgress(75))
      if (filteredLogs.length > 0) {
        // Find min and max timestamps
        const timestamps = filteredLogs.map((log) => log.timestamp.getTime())
        const minTime = new Date(Math.min(...timestamps))
        const maxTime = new Date(Math.max(...timestamps))

        // Generate time series data
        const timeSeriesData = generateTimeSeriesData(filteredLogs, minTime, maxTime)
        dispatch(setTimeSeriesData(timeSeriesData))
      }

      // Step 7: Generate statistical summary
      dispatch(setAnalysisProgress(85))
      const summary = generateStatisticalSummary(filteredLogs)
      dispatch(setStatisticalSummary(summary))

      // Step 8: Machine learning operations
      dispatch(setAnalysisProgress(95))
      const clusters = clusterLogMessages(filteredLogs)
      dispatch(setClusteringResults(clusters))

      const outliers = detectOutliers(filteredLogs)
      dispatch(setOutliers(outliers))

      // Complete analysis
      dispatch(setAnalysisProgress(100))
      dispatch(setIsAnalyzing(false))

      return {
        success: true,
        message: "Analysis completed successfully",
        patternCount:
          frequencyPatterns.length + correlationPatterns.length + anomalyPatterns.length + securityPatterns.length,
      }
    } catch (error) {
      console.error("Error during analysis:", error)
      dispatch(setIsAnalyzing(false))
      return { success: false, message: "Analysis failed: " + (error as Error).message }
    }
  },
)

/**
 * Thunk for running error analysis only
 */
export const analyzeErrors = createAsyncThunk("analysis/runErrorAnalysis", async (_, { dispatch, getState }) => {
  const state = getState() as RootState
  const logs = Object.values(state.logs.entries)
  const selectedFileIds = state.files.selectedFileIds

  if (logs.length === 0) {
    return { success: false, message: "No logs available for analysis" }
  }

  // Start analysis
  dispatch(setIsAnalyzing(true))
  dispatch(clearDetectedPatterns())
  dispatch(setAnalysisProgress(0))

  try {
    // Filter logs by selected files if any
    const filteredLogs = selectedFileIds.length > 0 ? logs.filter((log) => selectedFileIds.includes(log.fileId)) : logs

    // Run error analysis
    dispatch(setAnalysisProgress(30))
    const frequencyPatterns = analyzeErrorFrequency(filteredLogs)
    frequencyPatterns.forEach((pattern) => {
      dispatch(addDetectedPattern(pattern))
      dispatch(addInsight(pattern))
    })

    dispatch(setAnalysisProgress(60))
    const correlationPatterns = detectCorrelations(filteredLogs)
    correlationPatterns.forEach((pattern) => {
      dispatch(addDetectedPattern(pattern))
      dispatch(addInsight(pattern))
    })

    dispatch(setAnalysisProgress(100))
    dispatch(setIsAnalyzing(false))

    return {
      success: true,
      message: "Error analysis completed successfully",
      patternCount: frequencyPatterns.length + correlationPatterns.length,
    }
  } catch (error) {
    console.error("Error during analysis:", error)
    dispatch(setIsAnalyzing(false))
    return { success: false, message: "Analysis failed: " + (error as Error).message }
  }
})

/**
 * Thunk for running anomaly detection only
 */
export const runAnomalyDetection = createAsyncThunk(
  "analysis/runAnomalyDetection",
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState
    const logs = Object.values(state.logs.entries)
    const selectedFileIds = state.files.selectedFileIds
    const timeRange = state.timeline.selectedTimeRange
    const sensitivity = state.analysis.anomalySensitivity

    if (logs.length === 0) {
      return { success: false, message: "No logs available for analysis" }
    }

    // Start analysis
    dispatch(setIsAnalyzing(true))
    dispatch(setAnalysisProgress(0))

    try {
      // Filter logs by selected files if any
      const filteredLogs =
        selectedFileIds.length > 0 ? logs.filter((log) => selectedFileIds.includes(log.fileId)) : logs

      // Run anomaly detection
      dispatch(setAnalysisProgress(30))
      const anomalyPatterns = detectAnomalies(filteredLogs, sensitivity)

      // Clear previous patterns and add new ones
      dispatch(clearDetectedPatterns())
      anomalyPatterns.forEach((pattern) => {
        dispatch(addDetectedPattern(pattern))
        dispatch(addInsight(pattern))
      })

      // Generate anomaly data for visualization
      dispatch(setAnalysisProgress(70))
      if (timeRange) {
        const anomalyData = generateAnomalyData(filteredLogs, timeRange)
        dispatch(setAnomalyData(anomalyData))
      }

      dispatch(setAnalysisProgress(100))
      dispatch(setIsAnalyzing(false))

      return {
        success: true,
        message: "Anomaly detection completed successfully",
        patternCount: anomalyPatterns.length,
      }
    } catch (error) {
      console.error("Error during anomaly detection:", error)
      dispatch(setIsAnalyzing(false))
      return { success: false, message: "Analysis failed: " + (error as Error).message }
    }
  },
)

/**
 * Thunk for running security analysis only
 */
export const analyzeSecurityIssues = createAsyncThunk(
  "analysis/runSecurityAnalysis",
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState
    const logs = Object.values(state.logs.entries)
    const selectedFileIds = state.files.selectedFileIds

    if (logs.length === 0) {
      return { success: false, message: "No logs available for analysis" }
    }

    // Start analysis
    dispatch(setIsAnalyzing(true))
    dispatch(setAnalysisProgress(0))

    try {
      // Filter logs by selected files if any
      const filteredLogs =
        selectedFileIds.length > 0 ? logs.filter((log) => selectedFileIds.includes(log.fileId)) : logs

      // Run security analysis
      dispatch(setAnalysisProgress(50))
      const securityPatterns = identifySecurityIssues(filteredLogs)
      securityPatterns.forEach((pattern) => {
        dispatch(addDetectedPattern(pattern))
        dispatch(addInsight(pattern))
      })

      dispatch(setAnalysisProgress(100))
      dispatch(setIsAnalyzing(false))

      return {
        success: true,
        message: "Security analysis completed successfully",
        patternCount: securityPatterns.length,
      }
    } catch (error) {
      console.error("Error during analysis:", error)
      dispatch(setIsAnalyzing(false))
      return { success: false, message: "Analysis failed: " + (error as Error).message }
    }
  },
)

/**
 * Thunk for generating statistical reports
 */
export const generateStatisticalReport = createAsyncThunk(
  "analysis/generateStatisticalReport",
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState
    const logs = Object.values(state.logs.entries)
    const selectedFileIds = state.files.selectedFileIds

    if (logs.length === 0) {
      return { success: false, message: "No logs available for analysis" }
    }

    // Start analysis
    dispatch(setIsAnalyzing(true))
    dispatch(setAnalysisProgress(0))

    try {
      // Filter logs by selected files if any
      const filteredLogs =
        selectedFileIds.length > 0 ? logs.filter((log) => selectedFileIds.includes(log.fileId)) : logs

      // Generate statistical summary
      dispatch(setAnalysisProgress(50))
      const summary = generateStatisticalSummary(filteredLogs)
      dispatch(setStatisticalSummary(summary))

      // Generate time series data
      dispatch(setAnalysisProgress(80))
      if (filteredLogs.length > 0) {
        // Find min and max timestamps
        const timestamps = filteredLogs.map((log) => log.timestamp.getTime())
        const minTime = new Date(Math.min(...timestamps))
        const maxTime = new Date(Math.max(...timestamps))

        // Generate time series data
        const timeSeriesData = generateTimeSeriesData(filteredLogs, minTime, maxTime)
        dispatch(setTimeSeriesData(timeSeriesData))
      }

      dispatch(setAnalysisProgress(100))
      dispatch(setIsAnalyzing(false))

      return {
        success: true,
        message: "Statistical report generated successfully",
      }
    } catch (error) {
      console.error("Error generating statistical report:", error)
      dispatch(setIsAnalyzing(false))
      return { success: false, message: "Report generation failed: " + (error as Error).message }
    }
  },
)

export const generateInsights = createAsyncThunk("analysis/generateInsights", async (_, { dispatch, getState }) => {
  const state = getState() as RootState
  const logs = Object.values(state.logs.entries)
  const selectedFileIds = state.files.selectedFileIds

  if (logs.length === 0) {
    return { success: false, message: "No logs available for analysis" }
  }

  // Start analysis
  dispatch(setIsAnalyzing(true))
  dispatch(clearInsights())
  dispatch(setAnalysisProgress(0))

  try {
    // Filter logs by selected files if any
    const filteredLogs = selectedFileIds.length > 0 ? logs.filter((log) => selectedFileIds.includes(log.fileId)) : logs

    // Step 1: Error frequency analysis (20%)
    dispatch(setAnalysisProgress(25))
    const frequencyPatterns = analyzeErrorFrequency(filteredLogs)
    frequencyPatterns.forEach((pattern) => {
      dispatch(addInsight(pattern))
    })

    // Step 2: Correlation detection (40%)
    dispatch(setAnalysisProgress(50))
    const correlationPatterns = detectCorrelations(filteredLogs)
    correlationPatterns.forEach((pattern) => {
      dispatch(addInsight(pattern))
    })

    // Step 3: Anomaly detection (60%)
    dispatch(setAnalysisProgress(75))
    const anomalyPatterns = detectAnomalies(filteredLogs, state.analysis.anomalySensitivity)
    anomalyPatterns.forEach((pattern) => {
      dispatch(addInsight(pattern))
    })

    // Step 4: Security issue identification (80%)
    dispatch(setAnalysisProgress(90))
    const securityPatterns = identifySecurityIssues(filteredLogs)
    securityPatterns.forEach((pattern) => {
      dispatch(addInsight(pattern))
    })

    // Complete analysis
    dispatch(setAnalysisProgress(100))
    dispatch(setIsAnalyzing(false))

    return {
      success: true,
      message: "Insights generated successfully",
      insightCount:
        frequencyPatterns.length + correlationPatterns.length + anomalyPatterns.length + securityPatterns.length,
    }
  } catch (error) {
    console.error("Error during analysis:", error)
    dispatch(setIsAnalyzing(false))
    return { success: false, message: "Analysis failed: " + (error as Error).message }
  }
})

export const markInsightAsReviewed = createAsyncThunk(
  "analysis/markInsightAsReviewed",
  async ({ insightId, isHelpful }: { insightId: string; isHelpful: boolean }, { dispatch, getState }) => {
    // This thunk doesn't directly modify the state, but it could trigger other actions
    // based on the feedback (e.g., adjust analysis parameters).
    return { insightId, isHelpful }
  },
)
