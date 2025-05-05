"use client"

import type React from "react"
import { memo } from "react"
import type { LogViewerRowProps } from "./types"
import { LogViewerCell } from "./LogViewerCell"

/**
 * Row component for the LogViewer
 * Renders a single log entry with cells for each column
 *
 * Performance optimized with React.memo to prevent unnecessary re-renders
 */
export const LogViewerRow = memo(
  function LogViewerRow({ log, style, columns, isSelected, isActive, onClick, timeZone }: LogViewerRowProps) {
    // Handle row click
    const handleClick = (event: React.MouseEvent) => {
      onClick(log, event)
    }

    // Determine row class names based on state
    const rowClassNames = `
      flex items-center border-b border-gray-100 
      ${isSelected ? "bg-teal-50" : "hover:bg-gray-50"} 
      ${isActive ? "ring-1 ring-teal-500" : ""}
      ${log.level?.toUpperCase() === "ERROR" ? "bg-red-50 hover:bg-red-100" : ""}
      ${log.level?.toUpperCase() === "WARNING" ? "bg-amber-50 hover:bg-amber-100" : ""}
    `

    return (
      <div style={style} className={rowClassNames} onClick={handleClick} data-log-id={log.id} role="row">
        {columns
          .filter((column) => column.visible !== false)
          .map((column) => (
            <LogViewerCell key={column.id} column={column} log={log} timeZone={timeZone} />
          ))}
      </div>
    )
  },
  // Custom comparison function for memo to prevent unnecessary re-renders
  (prevProps, nextProps) => {
    // Only re-render if these props change
    return (
      prevProps.log.id === nextProps.log.id &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.isActive === nextProps.isActive &&
      prevProps.style.top === nextProps.style.top &&
      prevProps.timeZone === nextProps.timeZone &&
      prevProps.columns.length === nextProps.columns.length
    )
  },
)
