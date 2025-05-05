import type { Filter } from "@/types/filters"
import type { LogEntry } from "@/types/logs"

/**
 * Apply filters to a collection of logs
 * Optimized for performance with large datasets
 *
 * @param logs Array of log entries to filter
 * @param filters Array of filter definitions to apply
 * @returns Filtered array of log entries
 */
export function applyFilters(logs: LogEntry[], filters: Filter[]): LogEntry[] {
  // Short-circuit if no filters or no enabled filters
  if (!filters.length || !filters.some((f) => f.enabled)) {
    return logs
  }

  // Filter the logs
  return logs.filter((log) => {
    // A log passes if it satisfies all enabled filters
    return filters.every((filter) => {
      if (!filter.enabled) {
        return true // Skip disabled filters
      }

      switch (filter.type) {
        case "logLevel":
          return !log.level || filter.levels.includes(log.level)

        case "source":
          return !log.source || filter.sources.includes(log.source)

        case "timestamp":
          const timestamp = log.timestamp.getTime()
          return timestamp >= filter.range.start.getTime() && timestamp <= filter.range.end.getTime()

        case "text":
          const text = filter.text
          if (!text) return true

          if (filter.caseSensitive) {
            return filter.fields.some((field) => {
              const value = log[field as keyof LogEntry]
              return value && String(value).includes(text)
            })
          } else {
            const textLower = text.toLowerCase()
            return filter.fields.some((field) => {
              const value = log[field as keyof LogEntry]
              return value && String(value).toLowerCase().includes(textLower)
            })
          }

        case "regex":
          try {
            const regex = new RegExp(filter.pattern, filter.flags)
            return filter.fields.some((field) => {
              const value = log[field as keyof LogEntry]
              return value && regex.test(String(value))
            })
          } catch (e) {
            console.error("Invalid regex in filter:", e)
            return true // Ignore invalid regex
          }

        case "saved":
          // For saved filters, recursively apply the child filters
          return applyFilters([log], filter.filters).length > 0

        default:
          return true
      }
    })
  })
}

/**
 * Create an optimized index for text-based searching
 * Useful for large datasets to avoid re-scanning the entire dataset
 *
 * @param logs Array of log entries to index
 * @returns Search index for efficient text lookup
 */
export function createSearchIndex(logs: LogEntry[]) {
  const index: Record<string, Set<string>> = {}

  // Process each log entry
  logs.forEach((log) => {
    // For each searchable field
    const fields = ["message", "raw", "level", "source"]

    fields.forEach((field) => {
      const value = log[field as keyof LogEntry]
      if (!value) return

      // Tokenize the field value (split into words)
      const tokens = String(value)
        .toLowerCase()
        .split(/\s+/)
        .filter((token) => token.length > 2) // Skip very short tokens

      // Add each token to the index
      tokens.forEach((token) => {
        if (!index[token]) {
          index[token] = new Set()
        }
        index[token].add(log.id)
      })
    })
  })

  return index
}

/**
 * Search logs using a pre-built search index
 * Much faster than scanning all logs for large datasets
 *
 * @param query Search query
 * @param logs Array of all log entries
 * @param searchIndex Pre-built search index
 * @returns Filtered array of log entries matching the query
 */
export function searchWithIndex(query: string, logs: LogEntry[], searchIndex: Record<string, Set<string>>): LogEntry[] {
  if (!query.trim()) return logs

  // Tokenize the query
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0)

  if (tokens.length === 0) return logs

  // Find log IDs that match all tokens
  let matchingIds: Set<string> | null = null

  tokens.forEach((token) => {
    // Look for partial matches in the index
    const matchingTokens = Object.keys(searchIndex).filter((indexToken) => indexToken.includes(token))

    // Combine all matching log IDs for this token
    const idsForToken = new Set<string>()
    matchingTokens.forEach((t) => {
      searchIndex[t].forEach((id) => idsForToken.add(id))
    })

    // Initialize or intersect with previous matches
    if (matchingIds === null) {
      matchingIds = idsForToken
    } else {
      // Only keep IDs that are in both sets (intersection)
      matchingIds = new Set([...matchingIds].filter((id) => idsForToken.has(id)))
    }
  })

  // No matches found
  if (!matchingIds || matchingIds.size === 0) return []

  // Convert matching IDs back to log entries
  return logs.filter((log) => matchingIds!.has(log.id))
}

/**
 * Create a binned aggregation of log events for timeline visualization
 * Groups logs into time buckets for efficient rendering
 *
 * @param logs Array of log entries to aggregate
 * @param startTime Start time for the aggregation
 * @param endTime End time for the aggregation
 * @param numBuckets Number of time buckets to create
 * @returns Aggregated data in time buckets
 */
export function createTimelineAggregation(logs: LogEntry[], startTime: Date, endTime: Date, numBuckets = 100) {
  const buckets: Array<{
    timestamp: Date
    count: number
    errorCount: number
    warningCount: number
    infoCount: number
    debugCount: number
  }> = []

  // Calculate bucket size
  const startMs = startTime.getTime()
  const endMs = endTime.getTime()
  const range = endMs - startMs
  const bucketSizeMs = range / numBuckets

  // Initialize buckets
  for (let i = 0; i < numBuckets; i++) {
    const bucketTimeMs = startMs + i * bucketSizeMs
    buckets.push({
      timestamp: new Date(bucketTimeMs),
      count: 0,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      debugCount: 0,
    })
  }

  // Sort logs by timestamp
  const sortedLogs = [...logs].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  // Assign logs to buckets
  sortedLogs.forEach((log) => {
    const timestamp = log.timestamp.getTime()

    // Skip logs outside the time range
    if (timestamp < startMs || timestamp > endMs) return

    // Calculate bucket index
    const bucketIndex = Math.min(numBuckets - 1, Math.floor((timestamp - startMs) / bucketSizeMs))

    // Update bucket counts
    buckets[bucketIndex].count++

    // Update level-specific counts
    if (log.level) {
      const level = log.level.toUpperCase()
      if (level.includes("ERROR") || level.includes("FATAL") || level.includes("CRITICAL")) {
        buckets[bucketIndex].errorCount++
      } else if (level.includes("WARN")) {
        buckets[bucketIndex].warningCount++
      } else if (level.includes("INFO")) {
        buckets[bucketIndex].infoCount++
      } else if (level.includes("DEBUG") || level.includes("TRACE")) {
        buckets[bucketIndex].debugCount++
      }
    }
  })

  return buckets
}
