"use client"

import { useState, useCallback } from "react"

/**
 * Hook for managing log selection state
 * Supports single and multi-selection of logs
 *
 * @returns Object containing selected logs and selection handlers
 */
export function useLogSelection() {
  // State for selected log IDs
  const [selectedLogs, setSelectedLogs] = useState<string[]>([])

  // Handler for selecting a single log
  const handleLogSelect = useCallback((logId: string) => {
    setSelectedLogs([logId])
  }, [])

  // Handler for multi-selecting logs (with Ctrl/Cmd key)
  const handleLogMultiSelect = useCallback((logId: string) => {
    setSelectedLogs((prev) => {
      // If already selected, remove it
      if (prev.includes(logId)) {
        return prev.filter((id) => id !== logId)
      }
      // Otherwise add it to selection
      return [...prev, logId]
    })
  }, [])

  // Handler for range selection (with Shift key)
  const handleLogRangeSelect = useCallback((startLogId: string, endLogId: string, allLogs: string[]) => {
    const startIndex = allLogs.indexOf(startLogId)
    const endIndex = allLogs.indexOf(endLogId)

    if (startIndex === -1 || endIndex === -1) return

    const start = Math.min(startIndex, endIndex)
    const end = Math.max(startIndex, endIndex)

    const rangeSelection = allLogs.slice(start, end + 1)
    setSelectedLogs(rangeSelection)
  }, [])

  // Handler for clearing selection
  const clearSelection = useCallback(() => {
    setSelectedLogs([])
  }, [])

  return {
    selectedLogs,
    handleLogSelect,
    handleLogMultiSelect,
    handleLogRangeSelect,
    clearSelection,
  }
}
