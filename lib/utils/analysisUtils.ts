import { v4 as uuidv4 } from "uuid"
import type { LogEntry } from "@/types/logs"
import type {
  ErrorPattern,
  TimeSeriesDataPoint,
  StatisticalSummary,
  AnomalyData,
  AnomalyScorePoint,
} from "@/lib/slices/analysisSlice"
import { levenshteinDistance } from "./stringUtils"

/**
 * Analyze error frequency in logs
 * @param logs Array of log entries
 * @param timeWindow Time window in milliseconds
 * @returns Array of detected patterns
 */
export function analyzeErrorFrequency(logs: LogEntry[], timeWindow: number = 60 * 60 * 1000): ErrorPattern[] {
  const patterns: ErrorPattern[] = []
  const errorLogs = logs.filter((log) => log.level && ["ERROR", "FATAL", "CRITICAL"].includes(log.level.toUpperCase()))

  if (errorLogs.length === 0) return patterns

  // Sort logs by timestamp
  const sortedLogs = [...errorLogs].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  // Group errors by time windows
  const timeWindows: Record<string, LogEntry[]> = {}

  sortedLogs.forEach((log) => {
    const windowKey = Math.floor(log.timestamp.getTime() / timeWindow)
    if (!timeWindows[windowKey]) {
      timeWindows[windowKey] = []
    }
    timeWindows[windowKey].push(log)
  })

  // Analyze each time window for frequency patterns
  Object.entries(timeWindows).forEach(([windowKey, windowLogs]) => {
    if (windowLogs.length >= 5) {
      // Threshold for frequency pattern
      // Group by error message similarity
      const messageGroups = groupSimilarMessages(windowLogs)

      // Create patterns for significant groups
      Object.entries(messageGroups).forEach(([groupKey, groupLogs]) => {
        if (groupLogs.length >= 3) {
          // Threshold for group significance
          const sources = [...new Set(groupLogs.map((log) => log.source).filter(Boolean))]

          patterns.push({
            id: uuidv4(),
            type: "frequency",
            title: `Frequent Error: ${truncateMessage(groupKey, 50)}`,
            description: `${groupLogs.length} similar errors occurred within a ${timeWindow / 60000} minute window`,
            severity: getSeverityByCount(groupLogs.length),
            affectedLogs: groupLogs.map((log) => log.id),
            sources,
            timestamp: new Date(Number.parseInt(windowKey) * timeWindow),
            metadata: {
              frequency: groupLogs.length,
              timeWindow,
              sampleMessages: groupLogs.slice(0, 3).map((log) => log.message || log.raw),
            },
            isBookmarked: false,
            category: "error",
          })
        }
      })
    }
  })

  return patterns
}

/**
 * Detect correlations between logs across different files
 * @param logs Array of log entries
 * @param timeWindow Time window in milliseconds to consider for correlation
 * @returns Array of detected correlation patterns
 */
export function detectCorrelations(logs: LogEntry[], timeWindow = 5000): ErrorPattern[] {
  const patterns: ErrorPattern[] = []
  const errorLogs = logs.filter(
    (log) => log.level && ["ERROR", "FATAL", "CRITICAL", "WARNING", "WARN"].includes(log.level.toUpperCase()),
  )

  if (errorLogs.length < 2) return patterns

  // Sort logs by timestamp
  const sortedLogs = [...errorLogs].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  // Find sequences of errors that occur within the time window
  for (let i = 0; i < sortedLogs.length - 1; i++) {
    const currentLog = sortedLogs[i]
    const correlatedLogs = [currentLog]

    // Look ahead for correlated logs
    for (let j = i + 1; j < sortedLogs.length; j++) {
      const nextLog = sortedLogs[j]
      const timeDiff = nextLog.timestamp.getTime() - currentLog.timestamp.getTime()

      if (timeDiff <= timeWindow) {
        correlatedLogs.push(nextLog)
      } else {
        break // Beyond time window
      }
    }

    // Check if we have a correlation across different files
    if (correlatedLogs.length >= 2) {
      const fileIds = [...new Set(correlatedLogs.map((log) => log.fileId))]

      if (fileIds.length >= 2) {
        // Correlation across different files
        const sources = [...new Set(correlatedLogs.map((log) => log.source).filter(Boolean))]

        patterns.push({
          id: uuidv4(),
          type: "correlation",
          title: `Correlated Events Across Files`,
          description: `${correlatedLogs.length} related events detected across ${fileIds.length} files within ${timeWindow / 1000} seconds`,
          severity: "medium",
          affectedLogs: correlatedLogs.map((log) => log.id),
          sources,
          timestamp: currentLog.timestamp,
          metadata: {
            timeWindow,
            fileIds,
            timeDifferences: correlatedLogs.map((log) => log.timestamp.getTime() - currentLog.timestamp.getTime()),
            sampleMessages: correlatedLogs.map((log) => ({
              fileId: log.fileId,
              message: truncateMessage(log.message || log.raw, 100),
            })),
          },
          isBookmarked: false,
          category: "error",
        })

        // Skip ahead to avoid duplicate patterns
        i += correlatedLogs.length - 1
      }
    }
  }

  return patterns
}

/**
 * Group similar error messages
 * @param logs Array of log entries
 * @param similarityThreshold Threshold for similarity (0-1)
 * @returns Grouped logs by similar messages
 */
export function groupSimilarMessages(logs: LogEntry[], similarityThreshold = 0.7): Record<string, LogEntry[]> {
  const groups: Record<string, LogEntry[]> = {}

  logs.forEach((log) => {
    const message = log.message || log.raw || ""
    let foundGroup = false

    // Check if this message is similar to any existing group
    for (const [groupKey, groupLogs] of Object.entries(groups)) {
      const similarity = calculateStringSimilarity(message, groupKey)

      if (similarity >= similarityThreshold) {
        groupLogs.push(log)
        foundGroup = true
        break
      }
    }

    // If no similar group found, create a new one
    if (!foundGroup) {
      groups[message] = [log]
    }
  })

  return groups
}

/**
 * Calculate similarity between two strings (0-1)
 * @param str1 First string
 * @param str2 Second string
 * @returns Similarity score (0-1)
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0
  if (str1 === str2) return 1

  const distance = levenshteinDistance(str1, str2)
  const maxLength = Math.max(str1.length, str2.length)

  return 1 - distance / maxLength
}

/**
 * Detect anomalies in log patterns
 * @param logs Array of log entries
 * @param sensitivityLevel Sensitivity level for anomaly detection (0-1)
 * @returns Array of detected anomaly patterns
 */
export function detectAnomalies(logs: LogEntry[], sensitivityLevel = 0.7): ErrorPattern[] {
  const patterns: ErrorPattern[] = []

  if (logs.length < 10) return patterns // Not enough data

  // Group logs by hour
  const hourlyGroups: Record<string, LogEntry[]> = {}

  logs.forEach((log) => {
    const hour = new Date(log.timestamp).toISOString().substring(0, 13) // YYYY-MM-DDTHH
    if (!hourlyGroups[hour]) {
      hourlyGroups[hour] = []
    }
    hourlyGroups[hour].push(log)
  })

  // Calculate baseline metrics
  const hourlyMetrics = Object.entries(hourlyGroups).map(([hour, hourLogs]) => {
    const errorCount = hourLogs.filter(
      (log) => log.level && ["ERROR", "FATAL", "CRITICAL"].includes(log.level.toUpperCase()),
    ).length

    const warningCount = hourLogs.filter(
      (log) => log.level && ["WARNING", "WARN"].includes(log.level.toUpperCase()),
    ).length

    const uniqueSources = new Set(hourLogs.map((log) => log.source).filter(Boolean)).size

    return {
      hour,
      totalLogs: hourLogs.length,
      errorCount,
      warningCount,
      errorRate: hourLogs.length > 0 ? errorCount / hourLogs.length : 0,
      warningRate: hourLogs.length > 0 ? warningCount / hourLogs.length : 0,
      uniqueSources,
    }
  })

  if (hourlyMetrics.length < 2) return patterns // Not enough time periods

  // Calculate mean and standard deviation for metrics
  const metricStats = calculateMetricStats(hourlyMetrics)

  // Detect anomalies
  hourlyMetrics.forEach((hourMetric) => {
    const anomalyScores: Record<string, number> = {}

    // Check error rate anomaly
    if (metricStats.errorRate.stdDev > 0) {
      const zScore = Math.abs((hourMetric.errorRate - metricStats.errorRate.mean) / metricStats.errorRate.stdDev)
      if (zScore > 2 * sensitivityLevel) {
        anomalyScores.errorRate = zScore
      }
    }

    // Check warning rate anomaly
    if (metricStats.warningRate.stdDev > 0) {
      const zScore = Math.abs((hourMetric.warningRate - metricStats.warningRate.mean) / metricStats.warningRate.stdDev)
      if (zScore > 2 * sensitivityLevel) {
        anomalyScores.warningRate = zScore
      }
    }

    // Check log volume anomaly
    if (metricStats.totalLogs.stdDev > 0) {
      const zScore = Math.abs((hourMetric.totalLogs - metricStats.totalLogs.mean) / metricStats.totalLogs.stdDev)
      if (zScore > 2 * sensitivityLevel) {
        anomalyScores.logVolume = zScore
      }
    }

    // If anomalies detected, create a pattern
    if (Object.keys(anomalyScores).length > 0) {
      const hourLogs = hourlyGroups[hourMetric.hour]
      const sources = [...new Set(hourLogs.map((log) => log.source).filter(Boolean))]

      let anomalyType = ""
      let description = ""

      if (anomalyScores.errorRate) {
        anomalyType = hourMetric.errorRate > metricStats.errorRate.mean ? "high error rate" : "low error rate"
        description = `Unusual ${anomalyType} detected (${(hourMetric.errorRate * 100).toFixed(1)}% vs normal ${(metricStats.errorRate.mean * 100).toFixed(1)}%)`
      } else if (anomalyScores.warningRate) {
        anomalyType = hourMetric.warningRate > metricStats.warningRate.mean ? "high warning rate" : "low warning rate"
        description = `Unusual ${anomalyType} detected (${(hourMetric.warningRate * 100).toFixed(1)}% vs normal ${(metricStats.warningRate.mean * 100).toFixed(1)}%)`
      } else if (anomalyScores.logVolume) {
        anomalyType = hourMetric.totalLogs > metricStats.totalLogs.mean ? "high log volume" : "low log volume"
        description = `Unusual ${anomalyType} detected (${hourMetric.totalLogs} logs vs normal ${Math.round(metricStats.totalLogs.mean)})`
      }

      patterns.push({
        id: uuidv4(),
        type: "anomaly",
        title: `Anomaly: ${anomalyType.charAt(0).toUpperCase() + anomalyType.slice(1)}`,
        description,
        severity: "medium",
        affectedLogs: hourLogs.map((log) => log.id),
        sources,
        timestamp: new Date(hourMetric.hour),
        metadata: {
          anomalyScores,
          hourMetric,
          baselineStats: metricStats,
        },
        isBookmarked: false,
        category: "security",
      })
    }
  })

  return patterns
}

/**
 * Generate comprehensive anomaly data for visualization
 * @param logs Array of log entries
 * @param timeRange Selected time range
 * @returns AnomalyData object with different types of anomalies and scores
 */
export function generateAnomalyData(logs: LogEntry[], timeRange: { start: Date; end: Date }): AnomalyData {
  // Initialize anomaly data structure
  const anomalyData: AnomalyData = {
    timeBasedAnomalies: [],
    contentAnomalies: [],
    sequenceAnomalies: [],
    anomalyScores: [],
    totalAnomalies: 0,
  }

  if (logs.length === 0) return anomalyData

  // 1. Detect time-based anomalies
  const timeBasedAnomalies = detectTimeBasedAnomalies(logs, timeRange)
  anomalyData.timeBasedAnomalies = timeBasedAnomalies

  // 2. Detect content anomalies
  const contentAnomalies = detectContentAnomalies(logs)
  anomalyData.contentAnomalies = contentAnomalies

  // 3. Detect sequence anomalies
  const sequenceAnomalies = detectSequenceAnomalies(logs)
  anomalyData.sequenceAnomalies = sequenceAnomalies

  // 4. Generate anomaly scores over time
  anomalyData.anomalyScores = generateAnomalyScores(logs, timeRange)

  // Calculate total anomalies
  anomalyData.totalAnomalies = timeBasedAnomalies.length + contentAnomalies.length + sequenceAnomalies.length

  return anomalyData
}

/**
 * Detect time-based anomalies in logs
 * @param logs Array of log entries
 * @param timeRange Selected time range
 * @returns Array of time-based anomaly patterns
 */
function detectTimeBasedAnomalies(logs: LogEntry[], timeRange: { start: Date; end: Date }): ErrorPattern[] {
  const patterns: ErrorPattern[] = []
  const { start, end } = timeRange

  // Group logs by hour
  const hourlyGroups: Record<string, LogEntry[]> = {}

  logs.forEach((log) => {
    if (log.timestamp >= start && log.timestamp <= end) {
      const hour = new Date(log.timestamp).toISOString().substring(0, 13) // YYYY-MM-DDTHH
      if (!hourlyGroups[hour]) {
        hourlyGroups[hour] = []
      }
      hourlyGroups[hour].push(log)
    }
  })

  // Calculate hourly metrics
  const hourlyMetrics = Object.entries(hourlyGroups).map(([hour, hourLogs]) => {
    const errorCount = hourLogs.filter(
      (log) => log.level && ["ERROR", "FATAL", "CRITICAL"].includes(log.level.toUpperCase()),
    ).length

    const warningCount = hourLogs.filter(
      (log) => log.level && ["WARNING", "WARN"].includes(log.level.toUpperCase()),
    ).length

    return {
      hour,
      timestamp: new Date(hour),
      totalLogs: hourLogs.length,
      errorCount,
      warningCount,
      errorRate: hourLogs.length > 0 ? errorCount / hourLogs.length : 0,
      warningRate: hourLogs.length > 0 ? warningCount / hourLogs.length : 0,
    }
  })

  if (hourlyMetrics.length < 2) return patterns

  // Calculate mean and standard deviation for metrics
  const metricStats = calculateMetricStats(hourlyMetrics)

  // Detect anomalies
  hourlyMetrics.forEach((hourMetric) => {
    // Check log volume anomaly
    if (metricStats.totalLogs.stdDev > 0) {
      const zScore = Math.abs((hourMetric.totalLogs - metricStats.totalLogs.mean) / metricStats.totalLogs.stdDev)
      if (zScore > 2) {
        const anomalyType = hourMetric.totalLogs > metricStats.totalLogs.mean ? "high log volume" : "low log volume"

        const description = `Unusual ${anomalyType} detected (${hourMetric.totalLogs} logs vs normal ${Math.round(metricStats.totalLogs.mean)})`

        const hourLogs = hourlyGroups[hourMetric.hour]
        const sources = [...new Set(hourLogs.map((log) => log.source).filter(Boolean))]

        patterns.push({
          id: uuidv4(),
          type: "anomaly",
          title: `Time Anomaly: ${anomalyType.charAt(0).toUpperCase() + anomalyType.slice(1)}`,
          description,
          severity: "medium",
          affectedLogs: hourLogs.map((log) => log.id),
          sources,
          timestamp: new Date(hourMetric.hour),
          metadata: {
            anomalyType: "time",
            zScore,
            hourMetric,
            baselineStats: metricStats,
          },
          isBookmarked: false,
          category: "performance",
        })
      }
    }

    // Check error rate anomaly
    if (metricStats.errorRate.stdDev > 0 && hourMetric.totalLogs >= 5) {
      const zScore = Math.abs((hourMetric.errorRate - metricStats.errorRate.mean) / metricStats.errorRate.stdDev)
      if (zScore > 2) {
        const anomalyType = hourMetric.errorRate > metricStats.errorRate.mean ? "high error rate" : "low error rate"

        const description = `Unusual ${anomalyType} detected (${(hourMetric.errorRate * 100).toFixed(1)}% vs normal ${(metricStats.errorRate.mean * 100).toFixed(1)}%)`

        const hourLogs = hourlyGroups[hourMetric.hour]
        const sources = [...new Set(hourLogs.map((log) => log.source).filter(Boolean))]

        patterns.push({
          id: uuidv4(),
          type: "anomaly",
          title: `Time Anomaly: ${anomalyType.charAt(0).toUpperCase() + anomalyType.slice(1)}`,
          description,
          severity: "high",
          affectedLogs: hourLogs.map((log) => log.id),
          sources,
          timestamp: new Date(hourMetric.hour),
          metadata: {
            anomalyType: "time",
            zScore,
            hourMetric,
            baselineStats: metricStats,
          },
          isBookmarked: false,
          category: "error",
        })
      }
    }
  })

  return patterns
}

/**
 * Detect content anomalies in logs
 * @param logs Array of log entries
 * @returns Array of content anomaly patterns
 */
function detectContentAnomalies(logs: LogEntry[]): ErrorPattern[] {
  const patterns: ErrorPattern[] = []

  if (logs.length < 10) return patterns

  // Build word frequency map
  const wordFrequency: Record<string, number> = {}
  const logWordMap: Record<string, string[]> = {}

  logs.forEach((log) => {
    const content = (log.message || log.raw || "").toLowerCase()
    const words = content.split(/\s+/).filter((word) => word.length > 3)

    logWordMap[log.id] = words

    words.forEach((word) => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1
    })
  })

  // Find rare words (appearing in less than 1% of logs)
  const rareWords = Object.entries(wordFrequency)
    .filter(([word, count]) => count <= logs.length * 0.01 && count > 1)
    .map(([word]) => word)

  // Find logs with rare words
  const rareWordLogs: Record<string, LogEntry[]> = {}

  logs.forEach((log) => {
    const words = logWordMap[log.id] || []
    const rare = words.filter((word) => rareWords.includes(word))

    if (rare.length > 0) {
      rare.forEach((word) => {
        if (!rareWordLogs[word]) {
          rareWordLogs[word] = []
        }
        rareWordLogs[word].push(log)
      })
    }
  })

  // Create anomaly patterns for rare words
  Object.entries(rareWordLogs).forEach(([word, wordLogs]) => {
    if (wordLogs.length >= 2) {
      const sources = [...new Set(wordLogs.map((log) => log.source).filter(Boolean))]

      patterns.push({
        id: uuidv4(),
        type: "anomaly",
        title: `Content Anomaly: Rare Term "${word}"`,
        description: `Unusual term "${word}" appears in ${wordLogs.length} logs`,
        severity: "low",
        affectedLogs: wordLogs.map((log) => log.id),
        sources,
        timestamp: wordLogs[0].timestamp,
        metadata: {
          anomalyType: "content",
          rareWord: word,
          frequency: wordFrequency[word],
          totalLogs: logs.length,
        },
        isBookmarked: false,
        category: "other",
      })
    }
  })

  return patterns
}

/**
 * Detect sequence anomalies in logs
 * @param logs Array of log entries
 * @returns Array of sequence anomaly patterns
 */
function detectSequenceAnomalies(logs: LogEntry[]): ErrorPattern[] {
  const patterns: ErrorPattern[] = []

  if (logs.length < 20) return patterns

  // Sort logs by timestamp
  const sortedLogs = [...logs].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  // Build transition matrix for log levels
  const transitions: Record<string, Record<string, number>> = {}
  const levelCounts: Record<string, number> = {}

  // Initialize with common log levels
  const commonLevels = ["INFO", "DEBUG", "WARN", "ERROR", "TRACE", "FATAL"]
  commonLevels.forEach((level) => {
    transitions[level] = {}
    levelCounts[level] = 0
    commonLevels.forEach((nextLevel) => {
      transitions[level][nextLevel] = 0
    })
  })

  // Count transitions
  for (let i = 0; i < sortedLogs.length - 1; i++) {
    const currentLog = sortedLogs[i]
    const nextLog = sortedLogs[i + 1]

    const currentLevel = (currentLog.level || "UNKNOWN").toUpperCase()
    const nextLevel = (nextLog.level || "UNKNOWN").toUpperCase()

    // Initialize if not exists
    if (!transitions[currentLevel]) {
      transitions[currentLevel] = {}
      levelCounts[currentLevel] = 0
    }

    if (!transitions[currentLevel][nextLevel]) {
      transitions[currentLevel][nextLevel] = 0
    }

    // Count transition
    transitions[currentLevel][nextLevel]++
    levelCounts[currentLevel]++
  }

  // Calculate transition probabilities
  const transitionProbs: Record<string, Record<string, number>> = {}

  Object.entries(transitions).forEach(([fromLevel, toMap]) => {
    transitionProbs[fromLevel] = {}

    Object.entries(toMap).forEach(([toLevel, count]) => {
      const totalFromLevel = levelCounts[fromLevel] || 1
      transitionProbs[fromLevel][toLevel] = count / totalFromLevel
    })
  })

  // Find unusual transitions (probability < 0.05 but occurred at least twice)
  const unusualTransitions: Array<{ from: string; to: string; prob: number; count: number }> = []

  Object.entries(transitions).forEach(([fromLevel, toMap]) => {
    Object.entries(toMap).forEach(([toLevel, count]) => {
      const prob = transitionProbs[fromLevel][toLevel]

      if (prob < 0.05 && count >= 2) {
        unusualTransitions.push({
          from: fromLevel,
          to: toLevel,
          prob,
          count,
        })
      }
    })
  })

  // Create anomaly patterns for unusual transitions
  unusualTransitions.forEach((transition) => {
    // Find logs with this transition
    const affectedLogs: string[] = []

    for (let i = 0; i < sortedLogs.length - 1; i++) {
      const currentLog = sortedLogs[i]
      const nextLog = sortedLogs[i + 1]

      const currentLevel = (currentLog.level || "UNKNOWN").toUpperCase()
      const nextLevel = (nextLog.level || "UNKNOWN").toUpperCase()

      if (currentLevel === transition.from && nextLevel === transition.to) {
        affectedLogs.push(currentLog.id, nextLog.id)
      }
    }

    // Get unique log IDs
    const uniqueLogIds = [...new Set(affectedLogs)]

    if (uniqueLogIds.length >= 2) {
      const affectedLogEntries = uniqueLogIds
        .map((id) => logs.find((log) => log.id === id))
        .filter(Boolean) as LogEntry[]
      const sources = [...new Set(affectedLogEntries.map((log) => log.source).filter(Boolean))]

      patterns.push({
        id: uuidv4(),
        type: "anomaly",
        title: `Sequence Anomaly: ${transition.from} → ${transition.to}`,
        description: `Unusual transition from ${transition.from} to ${transition.to} (${(transition.prob * 100).toFixed(1)}% probability)`,
        severity: transition.from === "ERROR" || transition.to === "ERROR" ? "high" : "medium",
        affectedLogs: uniqueLogIds,
        sources,
        timestamp: affectedLogEntries[0]?.timestamp || new Date(),
        metadata: {
          anomalyType: "sequence",
          transition,
          transitionProbs,
        },
        isBookmarked: false,
        category: "other",
      })
    }
  })

  return patterns
}

/**
 * Generate anomaly scores over time
 * @param logs Array of log entries
 * @param timeRange Selected time range
 * @returns Array of anomaly score data points
 */
function generateAnomalyScores(logs: LogEntry[], timeRange: { start: Date; end: Date }): AnomalyScorePoint[] {
  const { start, end } = timeRange
  const scorePoints: AnomalyScorePoint[] = []

  if (logs.length === 0) return scorePoints

  // Determine time interval based on range
  const rangeMs = end.getTime() - start.getTime()
  const intervalMs = rangeMs > 86400000 ? 3600000 : 600000 // 1 hour or 10 minutes

  // Create time buckets
  const bucketCount = Math.ceil(rangeMs / intervalMs)

  for (let i = 0; i < bucketCount; i++) {
    const bucketStart = new Date(start.getTime() + i * intervalMs)
    const bucketEnd = new Date(Math.min(bucketStart.getTime() + intervalMs, end.getTime()))

    // Get logs in this bucket
    const bucketLogs = logs.filter((log) => log.timestamp >= bucketStart && log.timestamp < bucketEnd)

    // Calculate anomaly score for this bucket
    let anomalyScore = 0

    if (bucketLogs.length > 0) {
      // Factor 1: Error ratio
      const errorCount = bucketLogs.filter(
        (log) => log.level && ["ERROR", "FATAL", "CRITICAL"].includes(log.level.toUpperCase()),
      ).length
      const errorRatio = errorCount / bucketLogs.length
      anomalyScore += errorRatio * 0.5

      // Factor 2: Log volume (compared to average)
      const avgLogsPerBucket = logs.length / bucketCount
      const volumeRatio = Math.abs(bucketLogs.length - avgLogsPerBucket) / avgLogsPerBucket
      anomalyScore += Math.min(volumeRatio, 1) * 0.3

      // Factor 3: Unique sources
      const uniqueSources = new Set(bucketLogs.map((log) => log.source).filter(Boolean)).size
      const sourceRatio = uniqueSources / Math.max(1, bucketLogs.length)
      anomalyScore += sourceRatio * 0.2
    }

    scorePoints.push({
      timestamp: bucketStart,
      score: anomalyScore,
      count: bucketLogs.length,
      totalLogs: logs.length,
    })
  }

  return scorePoints
}

/**
 * Calculate statistics for metrics
 * @param metrics Array of metric objects
 * @returns Statistics for each metric
 */
function calculateMetricStats(metrics: any[]) {
  const stats: Record<string, { mean: number; stdDev: number }> = {}

  // Calculate mean for each metric
  const metricKeys = ["totalLogs", "errorCount", "warningCount", "errorRate", "warningRate", "uniqueSources"]

  metricKeys.forEach((key) => {
    const values = metrics.map((m) => m[key])
    const sum = values.reduce((acc, val) => acc + val, 0)
    const mean = sum / values.length

    // Calculate standard deviation
    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2))
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length
    const stdDev = Math.sqrt(variance)

    stats[key] = { mean, stdDev }
  })

  return stats
}

/**
 * Identify potential security issues in logs
 * @param logs Array of log entries
 * @returns Array of detected security patterns
 */
export function identifySecurityIssues(logs: LogEntry[]): ErrorPattern[] {
  const patterns: ErrorPattern[] = []

  // Security-related keywords to look for
  const securityKeywords = [
    "authentication fail",
    "login fail",
    "invalid credentials",
    "unauthorized",
    "permission denied",
    "access denied",
    "invalid token",
    "expired token",
    "csrf",
    "xss",
    "injection",
    "sql injection",
    "brute force",
    "firewall",
    "blocked",
    "suspicious",
    "malicious",
    "exploit",
    "vulnerability",
    "breach",
    "attack",
    "intrusion",
    "backdoor",
    "trojan",
    "malware",
    "ransomware",
    "phishing",
  ]

  // Check each log for security-related content
  logs.forEach((log) => {
    const content = (log.message || log.raw || "").toLowerCase()

    // Check for security keywords
    const matchedKeywords = securityKeywords.filter((keyword) => content.includes(keyword))

    if (matchedKeywords.length > 0) {
      const sources = log.source ? [log.source] : []

      patterns.push({
        id: uuidv4(),
        type: "security",
        title: `Security Issue: ${matchedKeywords[0]}`,
        description: `Potential security issue detected: ${matchedKeywords.join(", ")}`,
        severity: "high",
        affectedLogs: [log.id],
        sources,
        timestamp: log.timestamp,
        metadata: {
          matchedKeywords,
          fullContent: log.message || log.raw,
        },
        isBookmarked: false,
        category: "security",
      })
    }
  })

  return patterns
}

/**
 * Generate time series data for logs
 * @param logs Array of log entries
 * @param startTime Start time for the series
 * @param endTime End time for the series
 * @param interval Interval in milliseconds
 * @returns Array of time series data points
 */
export function generateTimeSeriesData(
  logs: LogEntry[],
  startTime: Date,
  endTime: Date,
  interval = 3600000, // 1 hour default
): TimeSeriesDataPoint[] {
  const timeSeriesData: TimeSeriesDataPoint[] = []

  if (logs.length === 0) return timeSeriesData

  // Create time buckets
  const startMs = startTime.getTime()
  const endMs = endTime.getTime()
  const bucketCount = Math.ceil((endMs - startMs) / interval)

  // Initialize buckets
  for (let i = 0; i < bucketCount; i++) {
    const bucketTime = new Date(startMs + i * interval)
    timeSeriesData.push({
      timestamp: bucketTime,
      count: 0,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      debugCount: 0,
      sources: new Set(),
    })
  }

  // Fill buckets with log data
  logs.forEach((log) => {
    const logTime = log.timestamp.getTime()

    if (logTime >= startMs && logTime <= endMs) {
      const bucketIndex = Math.floor((logTime - startMs) / interval)

      if (bucketIndex >= 0 && bucketIndex < timeSeriesData.length) {
        const bucket = timeSeriesData[bucketIndex]

        bucket.count++

        if (log.source) {
          bucket.sources.add(log.source)
        }

        if (log.level) {
          const levelUpper = log.level.toUpperCase()

          if (levelUpper.includes("ERROR") || levelUpper.includes("FATAL") || levelUpper.includes("CRITICAL")) {
            bucket.errorCount++
          } else if (levelUpper.includes("WARN")) {
            bucket.warningCount++
          } else if (levelUpper.includes("INFO")) {
            bucket.infoCount++
          } else if (levelUpper.includes("DEBUG") || levelUpper.includes("TRACE")) {
            bucket.debugCount++
          }
        }
      }
    }
  })

  return timeSeriesData
}

/**
 * Generate statistical summary for logs
 * @param logs Array of log entries
 * @returns Statistical summary
 */
export function generateStatisticalSummary(logs: LogEntry[]): StatisticalSummary {
  // Initialize summary
  const summary: StatisticalSummary = {
    totalLogs: logs.length,
    errorCount: 0,
    warningCount: 0,
    infoCount: 0,
    debugCount: 0,
    topSources: [],
    topErrors: [],
    timeDistribution: {},
    dayDistribution: {},
  }

  // Count by log level
  logs.forEach((log) => {
    if (log.level) {
      const level = log.level.toUpperCase()

      if (level.includes("ERROR") || level.includes("FATAL") || level.includes("CRITICAL")) {
        summary.errorCount++
      } else if (level.includes("WARN")) {
        summary.warningCount++
      } else if (level.includes("INFO")) {
        summary.infoCount++
      } else if (level.includes("DEBUG") || level.includes("TRACE")) {
        summary.debugCount++
      }
    }
  })

  // Calculate top sources
  const sourceCounts: Record<string, number> = {}
  logs.forEach((log) => {
    if (log.source) {
      sourceCounts[log.source] = (sourceCounts[log.source] || 0) + 1
    }
  })

  summary.topSources = Object.entries(sourceCounts)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Calculate top errors
  const errorMessages: Record<string, number> = {}
  logs
    .filter((log) => log.level && log.level.toUpperCase().includes("ERROR"))
    .forEach((log) => {
      const message = truncateMessage(log.message || log.raw || "", 100)
      errorMessages[message] = (errorMessages[message] || 0) + 1
    })

  summary.topErrors = Object.entries(errorMessages)
    .map(([message, count]) => ({ message, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Calculate time distribution (hour of day)
  logs.forEach((log) => {
    const hour = log.timestamp.getHours().toString()
    summary.timeDistribution[hour] = (summary.timeDistribution[hour] || 0) + 1
  })

  // Calculate day distribution (day of week)
  logs.forEach((log) => {
    const day = log.timestamp.getDay().toString()
    summary.dayDistribution[day] = (summary.dayDistribution[day] || 0) + 1
  })

  return summary
}

/**
 * Detect trends in time series data
 * @param data Array of time series data points
 * @param windowSize Window size for trend detection
 * @returns Object with trend information
 */
export function detectTrends(data: TimeSeriesDataPoint[], windowSize = 5) {
  if (data.length < windowSize * 2) {
    return { hasTrend: false }
  }

  // Calculate moving averages
  const movingAverages: number[] = []

  for (let i = windowSize - 1; i < data.length; i++) {
    const window = data.slice(i - windowSize + 1, i + 1)
    const sum = window.reduce((acc, point) => acc + point.count, 0)
    movingAverages.push(sum / windowSize)
  }

  // Calculate trend direction
  const firstAvg = movingAverages[0]
  const lastAvg = movingAverages[movingAverages.length - 1]

  const trendPercentage = ((lastAvg - firstAvg) / firstAvg) * 100

  return {
    hasTrend: Math.abs(trendPercentage) > 10, // 10% threshold
    direction: trendPercentage > 0 ? "increasing" : "decreasing",
    percentage: Math.abs(trendPercentage),
    startValue: firstAvg,
    endValue: lastAvg,
  }
}

/**
 * Simple clustering algorithm for log messages
 * @param logs Array of log entries
 * @param similarityThreshold Threshold for similarity (0-1)
 * @returns Array of clusters
 */
export function clusterLogMessages(logs: LogEntry[], similarityThreshold = 0.7) {
  const clusters: Array<{ clusterId: string; logIds: string[]; centroid: string }> = []

  // Group similar messages
  const groups = groupSimilarMessages(logs, similarityThreshold)

  // Convert groups to clusters
  Object.entries(groups).forEach(([message, groupLogs]) => {
    if (groupLogs.length >= 2) {
      // Only create clusters with at least 2 logs
      clusters.push({
        clusterId: uuidv4(),
        logIds: groupLogs.map((log) => log.id),
        centroid: message,
      })
    }
  })

  return clusters
}

/**
 * Detect outliers in logs
 * @param logs Array of log entries
 * @returns Array of outlier log IDs
 */
export function detectOutliers(logs: LogEntry[]) {
  const outlierIds: string[] = []

  if (logs.length < 10) return outlierIds // Not enough data

  // Group logs by hour
  const hourlyGroups: Record<string, LogEntry[]> = {}

  logs.forEach((log) => {
    const hour = new Date(log.timestamp).toISOString().substring(0, 13) // YYYY-MM-DDTHH
    if (!hourlyGroups[hour]) {
      hourlyGroups[hour] = []
    }
    hourlyGroups[hour].push(log)
  })

  // Calculate hourly statistics
  const hourlyStats = Object.values(hourlyGroups).map((hourLogs) => {
    return {
      count: hourLogs.length,
      errorCount: hourLogs.filter(
        (log) => log.level && ["ERROR", "FATAL", "CRITICAL"].includes(log.level.toUpperCase()),
      ).length,
      uniqueSources: new Set(hourLogs.map((log) => log.source).filter(Boolean)).size,
    }
  })

  // Calculate mean and standard deviation
  const countValues = hourlyStats.map((stats) => stats.count)
  const countMean = countValues.reduce((acc, val) => acc + val, 0) / countValues.length
  const countStdDev = Math.sqrt(
    countValues.map((val) => Math.pow(val - countMean, 2)).reduce((acc, val) => acc + val, 0) / countValues.length,
  )

  // Find outlier hours (Z-score > 2)
  const outlierHours: string[] = []

  Object.entries(hourlyGroups).forEach(([hour, hourLogs]) => {
    const zScore = Math.abs((hourLogs.length - countMean) / countStdDev)

    if (zScore > 2) {
      outlierHours.push(hour)

      // Add logs from outlier hours to outliers
      hourLogs.forEach((log) => {
        outlierIds.push(log.id)
      })
    }
  })

  return outlierIds
}

/**
 * Helper function to truncate a message
 * @param message Message to truncate
 * @param maxLength Maximum length
 * @returns Truncated message
 */
function truncateMessage(message: string, maxLength: number): string {
  if (!message) return ""
  if (message.length <= maxLength) return message
  return message.substring(0, maxLength) + "..."
}

/**
 * Helper function to get severity based on count
 * @param count Count value
 * @returns Severity level
 */
function getSeverityByCount(count: number): "low" | "medium" | "high" | "critical" {
  if (count >= 20) return "critical"
  if (count >= 10) return "high"
  if (count >= 5) return "medium"
  return "low"
}
