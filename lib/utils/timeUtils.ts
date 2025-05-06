/**
 * Utility functions for working with timestamps and time ranges
 */

/**
 * Format a timestamp string according to the specified format
 * @param timestamp ISO timestamp string
 * @param timeZone Time zone to use for formatting
 * @param format Format to use (datetime, date, time)
 * @returns Formatted timestamp string
 */
export function formatTimestamp(
  timestamp: string | undefined | null,
  timeZone = "UTC",
  format: "datetime" | "date" | "time" = "datetime",
): string {
  if (!timestamp) {
    console.warn("Received undefined or null timestamp in formatTimestamp")
    return "Invalid Date"
  }

  try {
    const date = new Date(timestamp)

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn("Invalid timestamp for formatting:", timestamp)
      return "Invalid Date"
    }

    const options: Intl.DateTimeFormatOptions = {
      timeZone,
    }

    switch (format) {
      case "datetime":
        options.year = "numeric"
        options.month = "short"
        options.day = "numeric"
        options.hour = "2-digit"
        options.minute = "2-digit"
        options.second = "2-digit"
        break
      case "date":
        options.year = "numeric"
        options.month = "short"
        options.day = "numeric"
        break
      case "time":
        options.hour = "2-digit"
        options.minute = "2-digit"
        options.second = "2-digit"
        break
    }

    return new Intl.DateTimeFormat("en-US", options).format(date)
  } catch (error) {
    console.error("Error formatting timestamp:", error)
    return "Invalid Date"
  }
}

/**
 * Normalize a timestamp to a standard format
 * @param timestamp Timestamp to normalize
 * @returns Normalized timestamp
 */
export function normalizeTimestamp(timestamp: string | Date | undefined | null): string | null {
  if (!timestamp) return null

  try {
    if (typeof timestamp === "string") {
      // Try to parse the string as a date
      const date = new Date(timestamp)

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn("Invalid string timestamp for normalization:", timestamp)
        return null
      }

      return date.toISOString()
    } else if (timestamp instanceof Date) {
      // Check if date is valid
      if (isNaN(timestamp.getTime())) {
        console.warn("Invalid Date object for normalization")
        return null
      }

      return timestamp.toISOString()
    }

    // If we get here, the timestamp is not a string or Date
    console.warn("Timestamp is neither string nor Date:", typeof timestamp)
    return null
  } catch (error) {
    console.error("Error normalizing timestamp:", error)
    return null
  }
}

/**
 * Parse a timestamp string into a Date object
 * @param timestamp Timestamp string to parse
 * @returns Date object or null if parsing fails
 */
export function parseTimestamp(timestamp: string | undefined | null): Date | null {
  if (!timestamp) return null

  try {
    const date = new Date(timestamp)

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn("Invalid timestamp for parsing:", timestamp)
      return null
    }

    return date
  } catch (error) {
    console.error("Error parsing timestamp:", error)
    return null
  }
}
