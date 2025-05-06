import { memo } from "react"
import type { LogViewerCellProps } from "./types"
import { useSelector } from "react-redux"
import type { RootState } from "@/lib/store"
import { highlightText } from "./highlightText"

/**
 * Cell component for the LogViewer
 * Renders a single cell with formatted content and text highlighting
 *
 * Performance optimized with React.memo to prevent unnecessary re-renders
 */
export const LogViewerCell = memo(
  function LogViewerCell({ column, log, timeZone }: LogViewerCellProps) {
    // Get the value from the log entry
    const value = typeof column.field === "string" ? log[column.field as keyof typeof log] : null

    // Get active filters for highlighting
    const filters = useSelector((state: RootState) => state.filters.filters)
    const activeTextFilters = filters.filter(
      (f) => f.enabled && (f.type === "text" || f.type === "regex") && f.fields?.includes(column.field as string),
    )

    // Format the value using the column formatter if available
    const formattedValue = column.formatter ? column.formatter(value, log, timeZone) : value || "-"

    // Special handling for log level column
    if (column.id === "level" && value) {
      let levelClassName = "px-2 py-0.5 rounded text-xs font-medium"

      switch (String(value).toUpperCase()) {
        case "ERROR":
        case "FATAL":
        case "CRITICAL":
          levelClassName += " bg-red-100 text-red-800"
          break
        case "WARNING":
        case "WARN":
          levelClassName += " bg-amber-100 text-amber-800"
          break
        case "INFO":
          levelClassName += " bg-teal-100 text-teal-800"
          break
        case "DEBUG":
          levelClassName += " bg-blue-100 text-blue-800"
          break
        default:
          levelClassName += " bg-gray-100 text-gray-800"
      }

      return (
        <div
          className={`px-2 py-1 truncate ${column.className || ""}`}
          style={{ width: column.width }}
          title={typeof value === "string" ? value : undefined}
          role="cell"
        >
          <span className={levelClassName}>{formattedValue}</span>
        </div>
      )
    }

    // If there are no active text filters or the value is not a string, render normally
    if (activeTextFilters.length === 0 || typeof formattedValue !== "string") {
      return (
        <div
          className={`px-2 py-1 truncate ${column.className || ""}`}
          style={{ width: column.width }}
          title={typeof value === "string" ? value : undefined}
          role="cell"
        >
          {formattedValue}
        </div>
      )
    }

    // Highlight matched text
    return (
      <div
        className={`px-2 py-1 truncate ${column.className || ""}`}
        style={{ width: column.width }}
        title={typeof value === "string" ? value : undefined}
        role="cell"
      >
        {highlightText(formattedValue, activeTextFilters)}
      </div>
    )
  },
  // Custom comparison function for memo to prevent unnecessary re-renders
  (prevProps, nextProps) => {
    // Only re-render if these props change
    return (
      prevProps.log.id === nextProps.log.id &&
      prevProps.column.id === nextProps.column.id &&
      prevProps.timeZone === nextProps.timeZone &&
      prevProps.column.width === nextProps.column.width
    )
  },
)
