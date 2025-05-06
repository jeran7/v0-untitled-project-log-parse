import { v4 as uuidv4 } from "uuid"

/**
 * Parse a chunk of CSV data into log entries
 * @param lines Array of CSV lines
 * @param fileId ID of the file being processed
 * @param startByte Starting byte offset in the file
 */
export function parseCSVChunk(lines: string[], fileId: string, startByte: number) {
  const logEntries = []
  let headers: string[] = []

  // Process each line
  lines.forEach((line, index) => {
    // Skip empty lines
    if (!line.trim()) return

    // First line is assumed to be headers
    if (index === 0 && startByte === 0) {
      headers = parseCSVLine(line)
      return
    }

    // Parse the CSV line
    const values = parseCSVLine(line)

    // Create a record from headers and values
    const record: Record<string, string> = {}
    headers.forEach((header, i) => {
      if (i < values.length) {
        record[header] = values[i]
      }
    })

    // Extract timestamp, level, and source from the record
    const timestamp = extractTimestamp(record)
    const level = extractLogLevel(record)
    const source = extractSource(record)
    const message = extractMessage(record)

    // Create a log entry
    logEntries.push({
      id: uuidv4(),
      fileId,
      lineNumber: startByte === 0 ? index : index + 1, // Adjust for header line
      timestamp,
      level,
      source,
      message,
      raw: line,
      ...record, // Include all fields from the record
    })
  })

  return logEntries
}

/**
 * Parse a chunk of log data into log entries
 * @param lines Array of log lines
 * @param fileId ID of the file being processed
 * @param startByte Starting byte offset in the file
 */
export function parseLogChunk(lines: string[], fileId: string, startByte: number) {
  const logEntries = []

  // Process each line
  lines.forEach((line, index) => {
    // Skip empty lines
    if (!line.trim()) return

    // Parse the log line
    const parsedLog = parseLogLine(line)

    // Create a log entry
    logEntries.push({
      id: uuidv4(),
      fileId,
      lineNumber: index + 1,
      timestamp: parsedLog.timestamp,
      level: parsedLog.level,
      source: parsedLog.source,
      message: parsedLog.message,
      raw: line,
      ...parsedLog.fields, // Include all parsed fields
    })
  })

  return logEntries
}

/**
 * Parse a CSV line into an array of values
 * @param line CSV line to parse
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let currentValue = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      // Handle quotes
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        // Escaped quote
        currentValue += '"'
        i++
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === "," && !inQuotes) {
      // End of value
      values.push(currentValue)
      currentValue = ""
    } else {
      // Add character to current value
      currentValue += char
    }
  }

  // Add the last value
  values.push(currentValue)

  return values
}

/**
 * Parse a log line into structured data
 * @param line Log line to parse
 */
function parseLogLine(line: string) {
  // This is a simplified parser that tries to extract common log format elements
  // In a real implementation, you would have more sophisticated parsing based on your log format

  // Try to match common timestamp patterns
  const timestampRegex = /\b(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\b/
  const timestampMatch = line.match(timestampRegex)

  // Try to match common log level patterns
  const levelRegex = /\b(DEBUG|INFO|WARN(?:ING)?|ERROR|CRITICAL|FATAL)\b/i
  const levelMatch = line.match(levelRegex)

  // Try to extract source (often in brackets or parentheses)
  const sourceRegex = /\[([\w\-.]+)\]|$$([\w\-.]+)$$/
  const sourceMatch = line.match(sourceRegex)

  // Extract fields in key=value format
  const fields: Record<string, string> = {}
  const fieldRegex = /\b([\w\-.]+)=(["']?)([^"'\s]+|(?<=["'])[^"']*)\2/g
  let fieldMatch

  while ((fieldMatch = fieldRegex.exec(line)) !== null) {
    fields[fieldMatch[1]] = fieldMatch[3]
  }

  // Extract message (everything after timestamp, level, and source)
  let message = line
  if (timestampMatch) {
    message = message.replace(timestampMatch[0], "")
  }
  if (levelMatch) {
    message = message.replace(levelMatch[0], "")
  }
  if (sourceMatch) {
    message = message.replace(sourceMatch[0], "")
  }

  // Clean up the message
  message = message.trim()

  // If no timestamp was found, try to find a date pattern
  if (!timestampMatch) {
    const dateRegex = /\b(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4})\b/
    const dateMatch = line.match(dateRegex)

    if (dateMatch) {
      const timeRegex = /\b(\d{1,2}:\d{1,2}(?::\d{1,2})?(?:\s*[AP]M)?)\b/i
      const timeMatch = line.match(timeRegex)

      if (timeMatch) {
        const dateTimeStr = `${dateMatch[1]} ${timeMatch[1]}`
        return {
          timestamp: new Date(dateTimeStr).toISOString(),
          level: levelMatch ? levelMatch[1].toUpperCase() : undefined,
          source: sourceMatch ? sourceMatch[1] || sourceMatch[2] : undefined,
          message,
          fields,
        }
      }
    }
  }

  return {
    timestamp: timestampMatch ? timestampMatch[1] : new Date().toISOString(),
    level: levelMatch ? levelMatch[1].toUpperCase() : undefined,
    source: sourceMatch ? sourceMatch[1] || sourceMatch[2] : undefined,
    message,
    fields,
  }
}

/**
 * Extract timestamp from a record
 * @param record Record containing log data
 */
function extractTimestamp(record: Record<string, string>): string {
  // Look for common timestamp field names
  const timestampFields = [
    "timestamp",
    "time",
    "date",
    "datetime",
    "event_time",
    "log_time",
    "created_at",
    "occurred_at",
    "event_date",
  ]

  for (const field of timestampFields) {
    if (record[field]) {
      return record[field]
    }
  }

  // If no timestamp field is found, use current time
  return new Date().toISOString()
}

/**
 * Extract log level from a record
 * @param record Record containing log data
 */
function extractLogLevel(record: Record<string, string>): string | undefined {
  // Look for common log level field names
  const levelFields = ["level", "log_level", "severity", "priority", "type"]

  for (const field of levelFields) {
    if (record[field]) {
      return record[field].toUpperCase()
    }
  }

  return undefined
}

/**
 * Extract source from a record
 * @param record Record containing log data
 */
function extractSource(record: Record<string, string>): string | undefined {
  // Look for common source field names
  const sourceFields = ["source", "logger", "component", "service", "application", "app", "module", "class", "function"]

  for (const field of sourceFields) {
    if (record[field]) {
      return record[field]
    }
  }

  return undefined
}

/**
 * Extract message from a record
 * @param record Record containing log data
 */
function extractMessage(record: Record<string, string>): string {
  // Look for common message field names
  const messageFields = ["message", "msg", "description", "details", "event", "log"]

  for (const field of messageFields) {
    if (record[field]) {
      return record[field]
    }
  }

  // If no message field is found, concatenate all fields
  return Object.entries(record)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ")
}
