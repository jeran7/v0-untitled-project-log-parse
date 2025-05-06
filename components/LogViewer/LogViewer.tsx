"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FixedSizeList as List, type ListChildComponentProps } from "react-window"
import AutoSizer from "react-virtualized-auto-sizer"
import { useDispatch, useSelector } from "react-redux"
import { createSelector } from "@reduxjs/toolkit"
import { ErrorBoundary } from "react-error-boundary"
import { DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import "react-resizable/css/styles.css"

import type { RootState } from "@/lib/store"
import type { LogEntry } from "@/types/logs"
import { setActiveLogEntry, updateColumnPreferences } from "@/lib/slices/logsSlice"
import { LogViewerHeader } from "./LogViewerHeader"
import { LogViewerRow } from "./LogViewerRow"
import { LogViewerPlaceholder } from "./LogViewerPlaceholder"
import { LogViewerError } from "./LogViewerError"
import { LogViewerContext } from "./LogViewerContext"
import type { LogViewerProps } from "./types"
import { useLogSelection } from "./hooks/useLogSelection"
import { useColumnResize } from "./hooks/useColumnResize"
import { useColumnReorder } from "./hooks/useColumnReorder"
import { useSynchronizedScroll } from "./hooks/useSynchronizedScroll"
import { useLogFilter } from "./hooks/useLogFilter"
import { DEFAULT_COLUMNS } from "./constants"

/**
 * LogViewer Component
 *
 * A high-performance virtualized log viewer component that supports:
 * - Virtualized rendering for handling large log datasets
 * - Synchronized scrolling between multiple log files
 * - Resizable, reorderable columns
 * - Advanced filtering and highlighting
 * - Optimized Redux integration
 *
 * Performance optimizations:
 * - Uses react-window for efficient virtualization
 * - Implements memoization to prevent unnecessary re-renders
 * - Uses createSelector for efficient Redux state derivation
 * - Employs virtualized rendering to handle millions of log entries
 * - Implements synchronized scrolling with minimal overhead
 */
export function LogViewer({ fileId, height = "100%" }: LogViewerProps) {
  const dispatch = useDispatch()
  const listRef = useRef<List>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // =========================================================================
  // Optimized Redux Selectors
  // =========================================================================

  // Create memoized selectors for better performance
  const selectLogEntries = useMemo(
    () =>
      createSelector(
        (state: RootState) => state.logs.entries,
        (state: RootState) => state.logs.timeRange,
        (state: RootState) => state.logs.filters,
        (state: RootState) => state.files.files[fileId]?.logCount || 0,
        (entries, timeRange, filters, logCount) => {
          // Log for debugging
          console.log("Entries in store:", Object.keys(entries).length)
          console.log("File log count:", logCount)

          // Early return if no logs
          if (logCount === 0) return []

          // Filter logs by file ID
          const fileEntries = Object.values(entries).filter((entry) => entry.fileId === fileId)
          console.log("Filtered entries for file:", fileEntries.length)

          // Apply time range filter if present
          let filteredEntries = fileEntries
          if (timeRange) {
            filteredEntries = filteredEntries.filter(
              (entry) => entry.timestamp >= timeRange.start && entry.timestamp <= timeRange.end,
            )
          }

          // Apply text search filter if present
          if (filters.search) {
            const searchLower = filters.search.toLowerCase()
            filteredEntries = filteredEntries.filter(
              (entry) =>
                entry.raw.toLowerCase().includes(searchLower) ||
                (entry.message && entry.message.toLowerCase().includes(searchLower)),
            )
          }

          // Apply log level filter if present
          if (filters.logLevel.length > 0) {
            filteredEntries = filteredEntries.filter((entry) =>
              entry.level ? filters.logLevel.includes(entry.level) : false,
            )
          }

          // Apply source filter if present
          if (filters.source.length > 0) {
            filteredEntries = filteredEntries.filter((entry) =>
              entry.source ? filters.source.includes(entry.source) : false,
            )
          }

          // Sort by timestamp
          return filteredEntries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        },
      ),
    [fileId],
  )

  // Select column preferences from Redux store
  const selectColumnPreferences = useMemo(
    () =>
      createSelector(
        (state: RootState) => state.logs.columnPreferences[fileId],
        (preferences) => preferences || DEFAULT_COLUMNS,
      ),
    [fileId],
  )

  // Use the memoized selectors
  const logs = useSelector((state: RootState) => selectLogEntries(state))
  const columnPreferences = useSelector((state: RootState) => selectColumnPreferences(state))
  const timeZone = useSelector((state: RootState) => state.ui.timeZone)
  const activeLogId = useSelector((state: RootState) => state.logs.activeLogEntry)
  const isLoading = useSelector((state: RootState) => state.files.processingStatus[fileId] === "processing")
  const processingError = useSelector((state: RootState) => state.files.processingError[fileId])

  // =========================================================================
  // Custom Hooks for Feature Implementation
  // =========================================================================

  // Hook for log selection functionality
  const { selectedLogs, handleLogSelect, handleLogMultiSelect } = useLogSelection()

  // Hook for column resizing functionality
  const { columns, handleColumnResize } = useColumnResize(columnPreferences)

  // Hook for column reordering functionality
  const { handleColumnReorder } = useColumnReorder(columns, (newColumns) => {
    dispatch(updateColumnPreferences({ fileId, columns: newColumns }))
  })

  // Hook for synchronized scrolling
  const { syncScrollState, setSyncScrollState, handleSyncScroll, findTimestampIndex } = useSynchronizedScroll(logs)

  // Hook for filtering logs
  const { filteredLogs, filterText, setFilterText } = useLogFilter(logs)

  // =========================================================================
  // Event Handlers
  // =========================================================================

  // Handle row click to select a log entry
  const handleRowClick = useCallback(
    (log: LogEntry, event: React.MouseEvent) => {
      // Set active log in Redux store
      dispatch(setActiveLogEntry(log.id))

      // Handle selection with multi-select support
      if (event.ctrlKey || event.metaKey) {
        handleLogMultiSelect(log.id)
      } else {
        handleLogSelect(log.id)
      }
    },
    [dispatch, handleLogSelect, handleLogMultiSelect],
  )

  // Handle scrolling to a specific timestamp
  const scrollToTimestamp = useCallback(
    (timestamp: Date) => {
      if (!listRef.current || logs.length === 0) return

      const index = findTimestampIndex(logs, timestamp)
      if (index !== -1) {
        listRef.current.scrollToItem(index, "center")
      }
    },
    [logs, findTimestampIndex],
  )

  // Handle scroll events for synchronization
  const handleScroll = useCallback(
    ({ scrollOffset, scrollUpdateWasRequested }: { scrollOffset: number; scrollUpdateWasRequested: boolean }) => {
      // Only trigger sync if this is a user-initiated scroll, not a programmatic one
      if (!scrollUpdateWasRequested && logs.length > 0) {
        // Calculate the visible index based on scroll position
        const rowHeight = 32 // Same as itemSize in the List component
        const visibleIndex = Math.floor(scrollOffset / rowHeight)

        // Get the timestamp of the log entry at this index
        const currentLog = logs[Math.min(visibleIndex, logs.length - 1)]

        if (currentLog) {
          // Update sync scroll state with current timestamp and source
          setSyncScrollState({
            timestamp: currentLog.timestamp,
            sourceFileId: fileId,
            isScrolling: true,
          })
        }
      }
    },
    [logs, fileId, setSyncScrollState],
  )

  // =========================================================================
  // Effects
  // =========================================================================

  // Effect to handle synchronized scrolling from other log viewers
  useEffect(() => {
    if (syncScrollState.isScrolling && syncScrollState.sourceFileId !== fileId && syncScrollState.timestamp) {
      scrollToTimestamp(syncScrollState.timestamp)
    }
  }, [syncScrollState, fileId, scrollToTimestamp])

  // Effect to find and scroll to active log entry
  useEffect(() => {
    if (activeLogId && listRef.current) {
      const activeIndex = logs.findIndex((log) => log.id === activeLogId)
      if (activeIndex !== -1) {
        listRef.current.scrollToItem(activeIndex, "center")
      }
    }
  }, [activeLogId, logs])

  // Effect to set component as ready after initial load
  useEffect(() => {
    setIsReady(true)
  }, [])

  // =========================================================================
  // Memoized Render Functions
  // =========================================================================

  // Memoized row renderer for optimal performance
  const rowRenderer = useCallback(
    ({ index, style }: ListChildComponentProps) => {
      const log = filteredLogs[index]
      if (!log) return null

      return (
        <LogViewerRow
          log={log}
          style={style}
          columns={columns}
          isSelected={selectedLogs.includes(log.id)}
          isActive={activeLogId === log.id}
          onClick={handleRowClick}
          timeZone={timeZone}
        />
      )
    },
    [filteredLogs, columns, selectedLogs, activeLogId, handleRowClick, timeZone],
  )

  // =========================================================================
  // Error Handling
  // =========================================================================

  // Error fallback component
  const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
    <LogViewerError error={error} onReset={resetErrorBoundary} message="An error occurred while rendering logs" />
  )

  // Handle error boundary reset
  const handleErrorReset = () => {
    setError(null)
  }

  // =========================================================================
  // Context Provider Value
  // =========================================================================

  // Create context value for LogViewerContext
  const contextValue = useMemo(
    () => ({
      fileId,
      columns,
      handleColumnResize,
      handleColumnReorder,
      selectedLogs,
      handleLogSelect,
      filterText,
      setFilterText,
    }),
    [
      fileId,
      columns,
      handleColumnResize,
      handleColumnReorder,
      selectedLogs,
      handleLogSelect,
      filterText,
      setFilterText,
    ],
  )

  // =========================================================================
  // Render
  // =========================================================================

  // Show loading state
  if (isLoading) {
    return <LogViewerPlaceholder message="Processing log file..." />
  }

  // Show error state
  if (processingError) {
    return <LogViewerError error={new Error(processingError)} onReset={() => {}} message="Error processing log file" />
  }

  // Show empty state
  if (logs.length === 0 && isReady) {
    return <LogViewerPlaceholder message="No logs found for the selected criteria" />
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={handleErrorReset}>
      <LogViewerContext.Provider value={contextValue}>
        <DndProvider backend={HTML5Backend}>
          <div className="flex flex-col h-full w-full overflow-hidden border border-gray-200 rounded-md bg-white">
            {/* Header with column titles */}
            <LogViewerHeader />

            {/* Virtualized log list */}
            <div className="flex-1 overflow-hidden">
              <AutoSizer>
                {({ width, height }) => (
                  <List
                    ref={listRef}
                    width={width}
                    height={height}
                    itemCount={filteredLogs.length}
                    itemSize={32} // Fixed row height for optimal performance
                    overscanCount={20} // Overscan for smoother scrolling
                    onScroll={handleScroll}
                  >
                    {rowRenderer}
                  </List>
                )}
              </AutoSizer>
            </div>
          </div>
        </DndProvider>
      </LogViewerContext.Provider>
    </ErrorBoundary>
  )
}
