"use client"

import { useState, useMemo } from "react"
import type { LogEntry } from "@/types/logs"

/**
 * Hook for filtering logs based on text input
 *
 * @param logs Array of log entries to filter
 * @returns Object containing filtered logs and filter state
 */
export function useLogFilter(logs: LogEntry[]) {
  // State for filter text
  const [filterText, setFilterText] = useState("")

  // Memoized filtered logs
  const filteredLogs = useMemo(() => {
    if (!filterText) return logs

    const lowerFilter = filterText.toLowerCase()

    return logs.filter(
      (log) =>
        (log.message && log.message.toLowerCase().includes(lowerFilter)) ||
        (log.raw && log.raw.toLowerCase().includes(lowerFilter)) ||
        (log.level && log.level.toLowerCase().includes(lowerFilter)) ||
        (log.source && log.source.toLowerCase().includes(lowerFilter)),
    )
  }, [logs, filterText])

  return {
    filteredLogs,
    filterText,
    setFilterText,
  }
}
