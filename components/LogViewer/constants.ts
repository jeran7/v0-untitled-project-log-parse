import type { ColumnDefinition } from "./types"
import { formatTimestamp } from "@/lib/utils/timeUtils"

/**
 * Default column definitions for the log viewer
 */
export const DEFAULT_COLUMNS: ColumnDefinition[] = [
  {
    id: "timestamp",
    label: "Timestamp",
    field: "timestamp",
    width: 180,
    resizable: true,
    reorderable: true,
    visible: true,
    formatter: (value, log, timeZone) => {
      if (!value) return "-"
      return formatTimestamp(value.toISOString(), timeZone || "UTC", "full")
    },
    className: "font-mono text-xs",
  },
  {
    id: "level",
    label: "Level",
    field: "level",
    width: 100,
    resizable: true,
    reorderable: true,
    visible: true,
    formatter: (value) => {
      if (!value) return "-"

      // Apply styling based on log level
      let className = "px-2 py-0.5 rounded text-xs font-medium"

      switch (value.toUpperCase()) {
        case "ERROR":
        case "FATAL":
        case "CRITICAL":
          className += " bg-red-100 text-red-800"
          break
        case "WARNING":
        case "WARN":
          className += " bg-amber-100 text-amber-800"
          break
        case "INFO":
          className += " bg-teal-100 text-teal-800"
          break
        case "DEBUG":
          className += " bg-blue-100 text-blue-800"
          break
        default:
          className += " bg-gray-100 text-gray-800"
      }

      return <span className={className}>{value}</span>
    },
  },
  {
    id: "source",
    label: "Source",
    field: "source",
    width: 150,
    resizable: true,
    reorderable: true,
    visible: true,
    formatter: (value) => {
      if (!value) return "-"
      return <span className="truncate">{value}</span>
    },
    className: "text-gray-600",
  },
  {
    id: "message",
    label: "Message",
    field: "message",
    width: 500,
    resizable: true,
    reorderable: true,
    visible: true,
    formatter: (value, log) => {
      if (!value) return log.raw || "-"
      return <span className="truncate">{value}</span>
    },
  },
]

/**
 * Default row height for the log viewer
 */
export const DEFAULT_ROW_HEIGHT = 32

/**
 * Xage brand colors for styling
 */
export const XAGE_COLORS = {
  primary: "#0D9488", // Teal 600
  secondary: "#0369A1", // Blue 600
  error: "#DC2626", // Red 600
  warning: "#D97706", // Amber 600
  info: "#0891B2", // Cyan 600
  debug: "#2563EB", // Blue 600
  background: "#F9FAFB", // Gray 50
  border: "#E5E7EB", // Gray 200
  text: "#1F2937", // Gray 800
  textLight: "#6B7280", // Gray 500
}
