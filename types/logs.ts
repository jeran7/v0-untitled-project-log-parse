export interface LogEntry {
  id: string
  fileId: string
  lineNumber: number
  timestamp: Date
  level?: string
  source?: string
  message: string
  raw: string
  // Additional parsed fields specific to log format
  [key: string]: any
}

export interface LogIndex {
  [timestamp: number]: string[] // Array of log entry IDs
}

export interface TimeRange {
  start: Date
  end: Date
}

export interface LogFilter {
  field: string
  operator: "equals" | "contains" | "startsWith" | "endsWith" | "regex"
  value: string | string[]
}
