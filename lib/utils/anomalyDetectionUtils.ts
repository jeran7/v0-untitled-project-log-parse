import { v4 as uuidv4 } from "uuid"
import type { LogEntry } from "@/types/logs"
import type { ErrorPattern, AnomalyData } from "@/lib/slices/analysisSlice"

/**
 * Detect time-based anomalies in logs
 * @param logs Array of log entries
 * @param sensitivityLevel Sensitivity level for anomaly detection (0-1)
 * @returns Array of detected anomaly patterns
 */
export function detectTimeBasedAnomalies(logs: LogEntry[], sensitivityLevel = 0.7): ErrorPattern[] {
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
      timestamp: new Date(hour),
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
          anomalyType,
        },
        isBookmarked: false,
        category: "security",
      })
    }
  })

  return patterns
}

/**
 * Detect content-based anomalies in logs
 * @param logs Array of log entries
 * @param sensitivityLevel Sensitivity level for anomaly detection (0-1)
 * @returns Array of detected anomaly patterns
 */
export function detectContentAnomalies(logs: LogEntry[], sensitivityLevel = 0.7): ErrorPattern[] {
  const patterns: ErrorPattern[] = []

  if (logs.length < 20) return patterns // Not enough data

  // Extract common words and phrases from logs
  const contentFrequency: Record<string, number> = {}
  const wordRegex = /\b\w+\b/g

  logs.forEach((log) => {
    const content = log.message || log.raw || ""
    const words = content.match(wordRegex) || []

    // Count word frequencies
    words.forEach((word) => {
      if (word.length > 3) {
        // Ignore short words
        contentFrequency[word.toLowerCase()] = (contentFrequency[word.toLowerCase()] || 0) + 1
      }
    })
  })

  // Find rare words (potential anomalies)
  const wordEntries = Object.entries(contentFrequency)
  const totalWords = wordEntries.reduce((sum, [_, count]) => sum + count, 0)
  const meanFrequency = totalWords / wordEntries.length

  // Calculate standard deviation
  const squaredDiffs = wordEntries.map(([_, count]) => Math.pow(count - meanFrequency, 2))
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / wordEntries.length
  const stdDev = Math.sqrt(variance)

  // Find logs with rare content
  logs.forEach((log) => {
    const content = log.message || log.raw || ""
    const words = content.match(wordRegex) || []
    const rareWords: string[] = []

    words.forEach((word) => {
      if (word.length > 3) {
        const frequency = contentFrequency[word.toLowerCase()] || 0
        // Calculate z-score
        const zScore = (frequency - meanFrequency) / stdDev

        // If word is rare (negative z-score with high magnitude)
        if (zScore < -1.5 * sensitivityLevel && frequency < 5) {
          rareWords.push(word)
        }
      }
    })

    if (rareWords.length > 0) {
      patterns.push({
        id: uuidv4(),
        type: "anomaly",
        title: `Content Anomaly: Unusual Terms`,
        description: `Log contains rare terms: ${rareWords.slice(0, 3).join(", ")}${rareWords.length > 3 ? "..." : ""}`,
        severity: "low",
        affectedLogs: [log.id],
        sources: log.source ? [log.source] : [],
        timestamp: log.timestamp,
        metadata: {
          rareWords,
          fullContent: content,
          frequency: rareWords.map((word) => ({
            word,
            count: contentFrequency[word.toLowerCase()],
          })),
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
 * @param sensitivityLevel Sensitivity level for anomaly detection (0-1)
 * @returns Array of detected anomaly patterns
 */
export function detectSequenceAnomalies(logs: LogEntry[], sensitivityLevel = 0.7): ErrorPattern[] {
  const patterns: ErrorPattern[] = []

  if (logs.length < 30) return patterns // Not enough data

  // Sort logs by timestamp
  const sortedLogs = [...logs].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  // Build transition matrix (what log levels typically follow others)
  const transitions: Record<string, Record<string, number>> = {}
  const levels = ["ERROR", "WARNING", "INFO", "DEBUG", "TRACE", "UNKNOWN"]

  // Initialize transition matrix
  levels.forEach((level) => {
    transitions[level] = {}
    levels.forEach((nextLevel) => {
      transitions[level][nextLevel] = 0
    })
  })

  // Count transitions
  for (let i = 0; i < sortedLogs.length - 1; i++) {
    const currentLevel = (sortedLogs[i].level || "UNKNOWN").toUpperCase()
    const nextLevel = (sortedLogs[i + 1].level || "UNKNOWN").toUpperCase()

    const normalizedCurrentLevel = levels.includes(currentLevel) ? currentLevel : "UNKNOWN"
    const normalizedNextLevel = levels.includes(nextLevel) ? nextLevel : "UNKNOWN"

    transitions[normalizedCurrentLevel][normalizedNextLevel]++
  }

  // Calculate probabilities
  const transitionProbabilities: Record<string, Record<string, number>> = {}

  levels.forEach((level) => {
    transitionProbabilities[level] = {}
    const totalTransitions = levels.reduce((sum, nextLevel) => sum + transitions[level][nextLevel], 0)

    levels.forEach((nextLevel) => {
      transitionProbabilities[level][nextLevel] =
        totalTransitions > 0 ? transitions[level][nextLevel] / totalTransitions : 0
    })
  })

  // Detect unusual sequences
  for (let i = 0; i < sortedLogs.length - 1; i++) {
    const currentLevel = (sortedLogs[i].level || "UNKNOWN").toUpperCase()
    const nextLevel = (sortedLogs[i + 1].level || "UNKNOWN").toUpperCase()

    const normalizedCurrentLevel = levels.includes(currentLevel) ? currentLevel : "UNKNOWN"
    const normalizedNextLevel = levels.includes(nextLevel) ? nextLevel : "UNKNOWN"

    const probability = transitionProbabilities[normalizedCurrentLevel][normalizedNextLevel]

    // If this transition is very unlikely
    if (probability < 0.05 * sensitivityLevel) {
      patterns.push({
        id: uuidv4(),
        type: "anomaly",
        title: `Sequence Anomaly: Unusual Log Level Transition`,
        description: `Unusual transition from ${normalizedCurrentLevel} to ${normalizedNextLevel} (probability: ${(probability * 100).toFixed(2)}%)`,
        severity: "medium",
        affectedLogs: [sortedLogs[i].id, sortedLogs[i + 1].id],
        sources: [...new Set([sortedLogs[i].source, sortedLogs[i + 1].source].filter(Boolean))],
        timestamp: sortedLogs[i + 1].timestamp,
        metadata: {
          transitionProbability: probability,
          expectedProbabilities: transitionProbabilities[normalizedCurrentLevel],
          previousLog: {
            level: normalizedCurrentLevel,
            message: sortedLogs[i].message || sortedLogs[i].raw,
          },
          currentLog: {
            level: normalizedNextLevel,
            message: sortedLogs[i + 1].message || sortedLogs[i + 1].raw,
          },
        },
        isBookmarked: false,
        category: "other",
      })

      // Skip ahead to avoid multiple anomalies for the same sequence
      i++
    }
  }

  return patterns
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
 * Comprehensive anomaly detection that combines multiple methods
 * @param logs Array of log entries
 * @param sensitivityLevel Sensitivity level (0-1)
 * @returns Array of detected anomalies
 */
export function detectAnomalies(logs: LogEntry[], sensitivityLevel = 0.7): ErrorPattern[] {
  if (!logs || logs.length === 0) return []

  // Run all anomaly detection methods
  const timeAnomalies = detectTimeBasedAnomalies(logs, sensitivityLevel)
  const contentAnomalies = detectContentAnomalies(logs, sensitivityLevel)
  const sequenceAnomalies = detectSequenceAnomalies(logs, sensitivityLevel)

  // Combine all anomalies
  return [...timeAnomalies, ...contentAnomalies, ...sequenceAnomalies]
}

/**
 * Generate anomaly data for visualization
 * @param logs Array of log entries
 * @param timeRange Time range to analyze
 * @returns Anomaly data for visualization
 */
export function generateAnomalyData(logs: LogEntry[], timeRange: { start: Date; end: Date }): AnomalyData {
  if (!logs || logs.length === 0) {
    return {
      timeBasedAnomalies: [],
      contentAnomalies: [],
      sequenceAnomalies: [],
      anomalyScores: [],
      totalAnomalies: 0,
    }
  }

  // Filter logs by time range
  const filteredLogs = logs.filter((log) => {
    const timestamp = log.timestamp.getTime()
    return timestamp >= timeRange.start.getTime() && timestamp <= timeRange.end.getTime()
  })

  // Detect anomalies
  const timeAnomalies = detectTimeBasedAnomalies(filteredLogs, 0.7)
  const contentAnomalies = detectContentAnomalies(filteredLogs, 0.7)
  const sequenceAnomalies = detectSequenceAnomalies(filteredLogs, 0.7)

  // Generate anomaly scores over time
  const hourlyGroups: Record<string, LogEntry[]> = {}
  filteredLogs.forEach((log) => {
    const hour = new Date(log.timestamp).toISOString().substring(0, 13) // YYYY-MM-DDTHH
    if (!hourlyGroups[hour]) {
      hourlyGroups[hour] = []
    }
    hourlyGroups[hour].push(log)
  })

  const anomalyScores = Object.entries(hourlyGroups)
    .map(([hour, logs]) => {
      const hourAnomalies = [
        ...detectTimeBasedAnomalies(logs, 0.7),
        ...detectContentAnomalies(logs, 0.7),
        ...detectSequenceAnomalies(logs, 0.7),
      ]

      return {
        timestamp: new Date(hour),
        score: hourAnomalies.length > 0 ? (hourAnomalies.length / logs.length) * 100 : 0,
        count: hourAnomalies.length,
        totalLogs: logs.length,
      }
    })
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  return {
    timeBasedAnomalies,
    contentAnomalies,
    sequenceAnomalies,
    anomalyScores,
    totalAnomalies: timeAnomalies.length + contentAnomalies.length + sequenceAnomalies.length,
  }
}
