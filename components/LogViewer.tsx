"use client"

import { useEffect, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import type { RootState } from "@/lib/store"
import { updateVirtualWindow } from "@/lib/slices/logsSlice"
import { formatTimestamp } from "@/lib/utils/timeUtils"
import {
  calculateVisibleItems,
  createVirtualWindow,
  calculateTotalHeight,
  calculateOffset,
} from "@/lib/utils/virtualizer"
import type { LogEntry } from "@/types/logs"

// Constants for virtualization
const ITEM_HEIGHT = 32 // Height of each log entry in pixels

export default function LogViewer() {
  const dispatch = useDispatch()
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)

  // Get data from Redux store
  const logEntries = useSelector((state: RootState) => state.logs.entries)
  const selectedFileIds = useSelector((state: RootState) => state.files.selectedFileIds)
  const virtualWindow = useSelector((state: RootState) => state.logs.virtualWindow)
  const timeZone = useSelector((state: RootState) => state.ui.timeZone)
  const viewMode = useSelector((state: RootState) => state.ui.viewMode)

  // Filter logs based on selected files
  const filteredLogs = Object.values(logEntries).filter((log) => selectedFileIds.includes(log.fileId))

  // Sort logs by timestamp
  const sortedLogs = [...filteredLogs].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  // Handle scroll events for virtualization
  const handleScroll = () => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop)
    }
  }

  // Update virtual window when scroll position or data changes
  useEffect(() => {
    if (containerRef.current) {
      const containerHeight = containerRef.current.clientHeight
      const visibleItems = calculateVisibleItems(containerHeight, ITEM_HEIGHT)
      const currentIndex = Math.floor(scrollTop / ITEM_HEIGHT)

      const { startIndex, endIndex } = createVirtualWindow(sortedLogs.length, visibleItems, currentIndex)

      dispatch(updateVirtualWindow({ startIndex, endIndex }))
    }
  }, [scrollTop, sortedLogs.length, dispatch])

  // Calculate total height for the scrollable container
  const totalHeight = calculateTotalHeight(sortedLogs.length, ITEM_HEIGHT)

  // Get visible logs based on virtual window
  const visibleLogs = sortedLogs.slice(virtualWindow.startIndex, virtualWindow.endIndex + 1)

  // Calculate offset for the visible logs
  const offsetY = calculateOffset(virtualWindow.startIndex, ITEM_HEIGHT)

  // Render log entries
  const renderLogEntry = (log: LogEntry) => {
    return (
      <div key={log.id} className="flex items-center h-8 px-2 border-b border-border hover:bg-muted/50 text-sm">
        <div className="w-48 flex-shrink-0 truncate">
          {formatTimestamp(log.timestamp.toISOString(), timeZone, "time")}
        </div>

        {viewMode === "correlated" && (
          <div className="w-32 flex-shrink-0 truncate text-muted-foreground">{log.source || "-"}</div>
        )}

        {log.level && <div className={`w-24 flex-shrink-0 truncate ${getLogLevelColor(log.level)}`}>{log.level}</div>}

        <div className="flex-1 truncate">{log.message}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center h-8 px-2 border-b border-border bg-muted/50 text-sm font-medium">
        <div className="w-48 flex-shrink-0">Timestamp</div>

        {viewMode === "correlated" && <div className="w-32 flex-shrink-0">Source</div>}

        <div className="w-24 flex-shrink-0">Level</div>
        <div className="flex-1">Message</div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto" onScroll={handleScroll}>
        {sortedLogs.length > 0 ? (
          <div style={{ height: `${totalHeight}px`, position: "relative" }}>
            <div style={{ transform: `translateY(${offsetY}px)` }}>{visibleLogs.map(renderLogEntry)}</div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {selectedFileIds.length > 0 ? "No logs found for the selected files" : "Select files to view logs"}
          </div>
        )}
      </div>
    </div>
  )
}

// Helper function to get color based on log level
function getLogLevelColor(level: string): string {
  const normalizedLevel = level.toUpperCase()

  switch (normalizedLevel) {
    case "ERROR":
    case "FATAL":
    case "CRITICAL":
      return "text-red-600"
    case "WARNING":
    case "WARN":
      return "text-amber-600"
    case "INFO":
      return "text-blue-600"
    case "DEBUG":
      return "text-green-600"
    default:
      return "text-muted-foreground"
  }
}
