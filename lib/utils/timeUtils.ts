/**
 * Normalize a timestamp string to a UTC Date object
 * @param timestamp Timestamp string in various formats
 */
export function normalizeTimestamp(timestamp: string): string {
  try {
    // Handle common timestamp formats
    let date: Date

    // Check if timestamp is already a valid ISO string
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/.test(timestamp)) {
      date = new Date(timestamp)
    }
    // Handle "YYYY-MM-DD HH:MM:SS" format
    else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(timestamp)) {
      date = new Date(timestamp.replace(" ", "T") + "Z")
    }
    // Handle Unix timestamp (seconds)
    else if (/^\d{10}$/.test(timestamp)) {
      date = new Date(Number.parseInt(timestamp) * 1000)
    }
    // Handle Unix timestamp (milliseconds)
    else if (/^\d{13}$/.test(timestamp)) {
      date = new Date(Number.parseInt(timestamp))
    }
    // Handle MM/DD/YYYY format
    else if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(timestamp)) {
      date = new Date(timestamp)
    }
    // Default fallback
    else {
      date = new Date(timestamp)
    }

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn(`Invalid timestamp format: ${timestamp}`)
      return new Date().toISOString()
    }

    // Return ISO string in UTC
    return date.toISOString()
  } catch (error) {
    console.error(`Error normalizing timestamp: ${timestamp}`, error)
    return new Date().toISOString()
  }
}

/**
 * Format a timestamp for display based on the user's timezone preference
 * @param timestamp ISO timestamp string
 * @param timeZone Target timezone (default: UTC)
 * @param format Display format (default: 'full')
 */
export function formatTimestamp(
  timestamp: string,
  timeZone = "UTC",
  format: "full" | "date" | "time" | "datetime" = "full",
): string {
  try {
    const date = new Date(timestamp)

    // Options for different formats
    let options: Intl.DateTimeFormatOptions

    switch (format) {
      case "date":
        options = {
          year: "numeric",
          month: "short",
          day: "numeric",
          timeZone,
        }
        break
      case "time":
        options = {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          fractionalSecondDigits: 3,
          timeZone,
        }
        break
      case "datetime":
        options = {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone,
        }
        break
      case "full":
      default:
        options = {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          fractionalSecondDigits: 3,
          timeZone,
        }
    }

    return new Intl.DateTimeFormat("en-US", options).format(date)
  } catch (error) {
    console.error(`Error formatting timestamp: ${timestamp}`, error)
    return timestamp
  }
}

/**
 * Calculate the time range for a set of logs
 * @param timestamps Array of ISO timestamp strings
 */
export function calculateTimeRange(timestamps: string[]): { start: string; end: string } {
  if (!timestamps.length) {
    return {
      start: new Date().toISOString(),
      end: new Date().toISOString(),
    }
  }

  // Convert all timestamps to Date objects
  const dates = timestamps.map((ts) => new Date(ts))

  // Find min and max dates
  const start = new Date(Math.min(...dates.map((d) => d.getTime())))
  const end = new Date(Math.max(...dates.map((d) => d.getTime())))

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}
