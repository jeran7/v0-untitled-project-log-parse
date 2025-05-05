import { memo } from "react"
import type { LogViewerCellProps } from "./types"

/**
 * Cell component for the LogViewer
 * Renders a single cell with formatted content
 *
 * Performance optimized with React.memo to prevent unnecessary re-renders
 */
export const LogViewerCell = memo(
  function LogViewerCell({ column, log, timeZone }: LogViewerCellProps) {
    // Get the value from the log entry
    const value = typeof column.field === "string" ? log[column.field as keyof typeof log] : null

    // Format the value using the column formatter if available
    const formattedValue = column.formatter ? column.formatter(value, log, timeZone) : value || "-"

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
